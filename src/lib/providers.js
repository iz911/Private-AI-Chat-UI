// Registry of known OpenAI-compatible providers.
//
// Used by src/lib/openai.js: setting OPENAI_PROVIDER=<key> auto-fills the base URL
// (and any provider-specific headers) so users don't have to remember URLs.
// An explicit OPENAI_BASE_URL always overrides the preset.

export const OPENAI_PROVIDERS = {
  openai:     { baseUrl: 'https://api.openai.com/v1' },
  groq:       { baseUrl: 'https://api.groq.com/openai/v1' },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    // Optional but recommended by OpenRouter for attribution; harmless elsewhere.
    headers: { 'HTTP-Referer': 'http://localhost:3005', 'X-Title': 'Private AI Chat UI' },
  },
  together:   { baseUrl: 'https://api.together.xyz/v1' },
  deepseek:   { baseUrl: 'https://api.deepseek.com/v1' },
  mistral:    { baseUrl: 'https://api.mistral.ai/v1' },
  xai:        { baseUrl: 'https://api.x.ai/v1' },
  perplexity: { baseUrl: 'https://api.perplexity.ai' },
  // Local runners (also selectable via preset for convenience):
  ollama:     { baseUrl: 'http://localhost:11434/v1' },
  lmstudio:   { baseUrl: 'http://localhost:1234/v1' },
};

// Returns the preset object for a provider key, or null if unknown/empty.
export function getProviderPreset(name) {
  if (!name) return null;
  return OPENAI_PROVIDERS[name.toLowerCase()] || null;
}
