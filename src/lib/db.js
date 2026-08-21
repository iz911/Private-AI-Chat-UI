// Storage backend dispatcher.
//
// Selects the persistence layer at runtime from the STORAGE_BACKEND env var:
//   STORAGE_BACKEND=local   (default) -> flat JSON/Markdown files in ./data  [src/lib/localDb.js]
//   STORAGE_BACKEND=supabase          -> Supabase Postgres                    [src/lib/supabaseDb.js]
//
// The chosen module is loaded lazily via dynamic import, so a local-only install
// never touches Supabase and the '@supabase/supabase-js' package is only required
// when you actually opt in. Both modules expose the same async function contract,
// and every API route imports storage from here (never from a concrete backend).

const useSupabase = (process.env.STORAGE_BACKEND || 'local').toLowerCase() === 'supabase';

let _modulePromise = null;
function backend() {
  if (!_modulePromise) {
    _modulePromise = useSupabase ? import('./supabaseDb.js') : import('./localDb.js');
  }
  return _modulePromise;
}

async function call(fnName, ...args) {
  const mod = await backend();
  const fn = mod[fnName];
  if (typeof fn !== 'function') {
    throw new Error(`Storage backend is missing '${fnName}'`);
  }
  return fn(...args);
}

// Conversations
export const getConversations = (...a) => call('getConversations', ...a);
export const getConversation = (...a) => call('getConversation', ...a);
export const createConversation = (...a) => call('createConversation', ...a);
export const updateConversation = (...a) => call('updateConversation', ...a);
export const deleteConversation = (...a) => call('deleteConversation', ...a);

// Messages
export const getMessages = (...a) => call('getMessages', ...a);
export const addMessage = (...a) => call('addMessage', ...a);

// System prompts
export const getPrompts = (...a) => call('getPrompts', ...a);
export const createPrompt = (...a) => call('createPrompt', ...a);
export const updatePrompt = (...a) => call('updatePrompt', ...a);
export const deletePrompt = (...a) => call('deletePrompt', ...a);

// Markdown transcript export
export const generateMarkdownTranscript = (...a) => call('generateMarkdownTranscript', ...a);
export const exportConversationMarkdown = (...a) => call('exportConversationMarkdown', ...a);
