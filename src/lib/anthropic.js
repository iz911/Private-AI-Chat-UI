// Anthropic (Claude) backend — native Messages API.
//
// Enabled with LLM_BACKEND=anthropic. Uses plain fetch (no SDK).
// Configure via .env:
//   ANTHROPIC_API_KEY=sk-ant-...
//   ANTHROPIC_MODEL=claude-3-5-sonnet-latest   (set a CURRENT id; see Anthropic docs)
//   ANTHROPIC_MODELS=id1,id2                    (optional dropdown list)
//   ANTHROPIC_MAX_TOKENS=4096
//   ANTHROPIC_BASE_URL / ANTHROPIC_VERSION      (rarely changed)

const BASE_URL = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/+$/, '');
const API_KEY = process.env.ANTHROPIC_API_KEY || '';
const VERSION = process.env.ANTHROPIC_VERSION || '2023-06-01';
const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest';
const MAX_TOKENS = Number(process.env.ANTHROPIC_MAX_TOKENS || 4096);

function headers() {
  return {
    'content-type': 'application/json',
    'x-api-key': API_KEY,
    'anthropic-version': VERSION,
  };
}

export function resolveModel(model) {
  // The stored model id may be a Gemini alias if the user switched backends; fall back.
  if (!model || model.startsWith('gemini')) return DEFAULT_MODEL;
  return model;
}

function buildBody({ model, systemPrompt, history, newMessage, files, stream, maxTokens }) {
  const messages = [];
  for (const m of history || []) {
    messages.push({
      role: m.role === 'user' ? 'user' : 'assistant', // map our 'model' -> 'assistant'
      content: m.content,
    });
  }

  // Text-only inlining of extracted file content (same approach as openai.js).
  let text = newMessage || '';
  if (files && files.length > 0) {
    for (const f of files) {
      if (f.extractedText) text += `\n\n[FILE: ${f.name || 'attachment'}]\n${f.extractedText}`;
    }
  }
  messages.push({ role: 'user', content: text });

  const body = {
    model: resolveModel(model),
    max_tokens: maxTokens || MAX_TOKENS, // REQUIRED by the Messages API
    messages,
    stream: !!stream,
  };
  if (systemPrompt) body.system = systemPrompt; // Anthropic takes system as a top-level field
  return body;
}

export async function* streamChat({ model, systemPrompt, history, newMessage, files }) {
  const res = await fetch(`${BASE_URL}/v1/messages`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(buildBody({ model, systemPrompt, history, newMessage, files, stream: true })),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Anthropic error ${res.status}: ${detail}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue; // ignore "event:" and blank lines
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') return;
      try {
        const json = JSON.parse(data);
        if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
          if (json.delta.text) yield json.delta.text;
        }
        if (json.type === 'message_stop') return;
      } catch {
        // ignore ping / partial frames
      }
    }
  }
}

export async function generateText({ model, prompt }) {
  const res = await fetch(`${BASE_URL}/v1/messages`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      model: resolveModel(model),
      max_tokens: 64,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) return '';
  const json = await res.json().catch(() => null);
  const blocks = json?.content || [];
  return blocks.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
}

export async function listModels() {
  try {
    const res = await fetch(`${BASE_URL}/v1/models`, { headers: headers() });
    if (res.ok) {
      const json = await res.json();
      const ids = (json?.data || []).map((m) => m.id).filter(Boolean);
      if (ids.length) return ids;
    }
  } catch {
    // fall through to env / default
  }
  const envModels = (process.env.ANTHROPIC_MODELS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (envModels.length) return envModels;
  return [DEFAULT_MODEL];
}
