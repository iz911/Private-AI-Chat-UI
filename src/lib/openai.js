// OpenAI-compatible chat backend.
//
// Works with any server that speaks the OpenAI /chat/completions API, including
// local LLM runners — Ollama, LM Studio, llama.cpp (server), vLLM, Jan,
// LocalAI — as well as hosted OpenAI-compatible APIs (OpenAI, Groq, Together, etc.).
//
// Configure via .env:
//   LLM_BACKEND=openai
//   OPENAI_BASE_URL=http://localhost:11434/v1   (Ollama default shown)
//   OPENAI_API_KEY=ollama                        (any non-empty value; real key for hosted APIs)
//   OPENAI_MODEL=llama3.1                         (default model if the client doesn't pick one)
//   OPENAI_MODELS=llama3.1,qwen2.5,mistral        (optional manual list for the dropdown)

import { getProviderPreset } from './providers.js';

const PROVIDER = (process.env.OPENAI_PROVIDER || '').toLowerCase();
const preset = getProviderPreset(PROVIDER);

// Precedence: explicit OPENAI_BASE_URL > preset base URL > local Ollama default.
const BASE_URL = (process.env.OPENAI_BASE_URL || preset?.baseUrl || 'http://localhost:11434/v1').replace(/\/+$/, '');
const API_KEY = process.env.OPENAI_API_KEY || 'not-needed';
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'llama3.1';
const PROVIDER_HEADERS = preset?.headers || {};

// Exposed so /api/models can label the active provider (optional to consume).
export const PROVIDER_NAME = PROVIDER || 'custom';

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${API_KEY}`, ...PROVIDER_HEADERS, ...extra };
}

/**
 * Local backends don't use Gemini aliases. Pass the model through, but fall back
 * to the configured default if a Gemini id leaks in (e.g. after switching backends
 * while an older conversation still records a gemini-* model).
 */
export function resolveModel(model) {
  if (!model || model.startsWith('gemini')) return DEFAULT_MODEL;
  return model;
}

function buildMessages({ systemPrompt, history, newMessage, files }) {
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });

  for (const m of history || []) {
    messages.push({
      role: m.role === 'model' ? 'assistant' : 'user',
      content: m.content,
    });
  }

  // Most local models are text-only, so inline any extracted file text rather
  // than sending base64 blobs. (Images arrive as a placeholder note from /api/upload.)
  let text = newMessage || '';
  if (files && files.length > 0) {
    for (const f of files) {
      if (f.extractedText) {
        text += `\n\n[FILE: ${f.name || 'attachment'}]\n${f.extractedText}`;
      }
    }
  }
  messages.push({ role: 'user', content: text });

  return messages;
}

/**
 * Streams a chat response from an OpenAI-compatible endpoint.
 * Same signature/contract as genai.js#streamChat.
 */
export async function* streamChat({ model, systemPrompt, history, newMessage, files }) {
  const messages = buildMessages({ systemPrompt, history, newMessage, files });

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ model: resolveModel(model), messages, stream: true }),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`LLM backend error ${res.status} from ${BASE_URL}: ${detail}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // keep the trailing partial line

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') return;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // ignore keep-alive comments / partial JSON
      }
    }
  }
}

/**
 * One-shot, non-streaming completion (used for auto-titling conversations).
 * Same signature/contract as genai.js#generateText.
 */
export async function generateText({ model, prompt }) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      model: resolveModel(model),
      messages: [{ role: 'user', content: prompt }],
      stream: false,
    }),
  });
  if (!res.ok) return '';
  const json = await res.json().catch(() => null);
  return (json?.choices?.[0]?.message?.content || '').trim();
}

/**
 * Lists available models for the dropdown. Tries the OpenAI-compatible
 * GET /models endpoint first (Ollama, LM Studio, etc. all support it), then
 * falls back to the OPENAI_MODELS env list, then to the single default model.
 * @returns {Promise<string[]>}
 */
export async function listModels() {
  try {
    const res = await fetch(`${BASE_URL}/models`, { headers: authHeaders() });
    if (res.ok) {
      const json = await res.json();
      const ids = (json?.data || []).map((m) => m.id).filter(Boolean);
      if (ids.length) return ids;
    }
  } catch {
    // endpoint unreachable — fall through to env / default
  }

  const envModels = (process.env.OPENAI_MODELS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (envModels.length) return envModels;

  return [DEFAULT_MODEL];
}
