import { GoogleGenAI } from '@google/genai';

const isVertex = process.env.USE_VERTEX_AI === 'true';

// Lazily construct the client so this module can be imported even when the
// active backend is a local LLM and no Google key is configured.
let _client = null;
function getClient() {
  if (!_client) {
    _client = new GoogleGenAI({
      apiKey: process.env.GOOGLE_VERTEX_API_KEY || process.env.GEMINI_API_KEY,
      vertexai: isVertex ? true : undefined,
      project: undefined,
      location: undefined,
    });
  }
  return _client;
}

// Back-compat export: `ai.models.*` still works, but the client is only
// constructed on first access.
export const ai = {
  get models() {
    return getClient().models;
  },
};

export const LATEST_FLASH_MODEL = process.env.LATEST_FLASH_MODEL || 'gemini-3.7-flash';

// Model catalogue surfaced to the UI via /api/models when LLM_BACKEND=gemini.
export const GEMINI_MODELS = [
  { id: 'gemini-flash-latest', label: 'Latest Gemini Flash (Auto-Updated)', group: 'Auto (Always Latest Flash)' },
  { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash', group: 'Gemini 3.7 / 3.5' },
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash', group: 'Gemini 3.7 / 3.5' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Reasoning/Writing)', group: 'Gemini 2.5 / 2.0 / 1.5' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', group: 'Gemini 2.5 / 2.0 / 1.5' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', group: 'Gemini 2.5 / 2.0 / 1.5' },
  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', group: 'Gemini 2.5 / 2.0 / 1.5' },
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', group: 'Gemini 2.5 / 2.0 / 1.5' },
];

/**
 * Resolves model aliases to their actual API model identifiers.
 * 'gemini-flash-latest' or 'gemini-flash' automatically maps to the current latest Flash release.
 */
export function resolveModel(modelName) {
  if (!modelName || modelName === 'gemini-flash-latest' || modelName === 'gemini-flash' || modelName === 'latest-flash' || modelName === 'latest') {
    return LATEST_FLASH_MODEL;
  }
  return modelName;
}

/**
 * Streams a chat response from Gemini.
 *
 * @param {Object} params
 * @param {string} params.model - e.g. "gemini-3.7-flash", "gemini-flash-latest"
 * @param {string} params.systemPrompt - system instruction text
 * @param {Array} params.history - array of {role, content} from local storage
 * @param {string} params.newMessage - the new user message text
 * @param {Array} params.files - array of {mimeType, data} for inline file uploads (base64)
 * @returns {AsyncGenerator<string, void, unknown>} - stream of text chunks
 */
export async function* streamChat({ model, systemPrompt, history, newMessage, files }) {
  // Map the stored conversation history to the Gemini SDK content parts format.
  // Gemini expects: { role: 'user'|'model', parts: [{ text: '...' }] }
  const contents = history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }],
  }));

  // Build the parts for the new message. It can contain text and files.
  const newParts = [];

  // Add files if any were uploaded and passed along with this request.
  if (files && files.length > 0) {
    for (const file of files) {
      newParts.push({
        inlineData: {
          mimeType: file.mimeType,
          data: file.data, // base64 encoded string
        },
      });
    }
  }

  // Add the actual text input from the user
  newParts.push({ text: newMessage });

  // Append the new user message to the contents array
  contents.push({ role: 'user', parts: newParts });

  // Resolve model identifier (e.g. gemini-flash-latest -> gemini-3.7-flash)
  const targetModel = resolveModel(model);

  // Call the Gemini models service using stream generation
  const responseStream = await getClient().models.generateContentStream({
    model: targetModel,
    contents: contents,
    config: {
      systemInstruction: systemPrompt || undefined,
    },
  });

  // Yield text chunks as they are received from the API stream
  for await (const chunk of responseStream) {
    if (chunk.text) {
      yield chunk.text;
    }
  }
}

/**
 * One-shot, non-streaming text generation (used for auto-titling conversations).
 * @param {Object} params
 * @param {string} params.model
 * @param {string} params.prompt
 * @returns {Promise<string>}
 */
export async function generateText({ model, prompt }) {
  const res = await getClient().models.generateContent({
    model: resolveModel(model),
    contents: prompt,
  });
  return (res.text || '').trim();
}
