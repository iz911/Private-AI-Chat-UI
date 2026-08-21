// Supabase (Postgres) storage backend.
//
// Enabled with STORAGE_BACKEND=supabase. This module is only ever imported by
// src/lib/db.js when that flag is set, so local-only installs never load it.
//
// Requires the optional peer package and two env vars:
//   npm install @supabase/supabase-js
//   SUPABASE_URL=https://<project>.supabase.co
//   SUPABASE_SERVICE_KEY=<service_role key>
//
// Run supabase_schema.sql in your project's SQL editor first to create the
// conversations / messages / system_prompts tables.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'STORAGE_BACKEND=supabase requires SUPABASE_URL and SUPABASE_SERVICE_KEY in your environment.'
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function unwrap({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

// -------------------------------------------------------------
// CONVERSATIONS
// -------------------------------------------------------------

export async function getConversations() {
  const res = await supabase
    .from('conversations')
    .select('*')
    .order('updated_at', { ascending: false });
  return unwrap(res) || [];
}

export async function getConversation(id) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data || null;
}

export async function createConversation({ title = 'New Chat', model = 'gemini-flash-latest', systemPrompt = '', id = null }) {
  const row = { title, model, system_prompt: systemPrompt };
  if (id) row.id = id;

  const res = await supabase
    .from('conversations')
    .insert(row)
    .select()
    .single();
  return unwrap(res);
}

export async function updateConversation(id, updates = {}) {
  const patch = { ...updates, updated_at: updates.updated_at || new Date().toISOString() };

  const { data, error } = await supabase
    .from('conversations')
    .update(patch)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data || null;
}

export async function deleteConversation(id) {
  // messages are removed automatically via ON DELETE CASCADE (see supabase_schema.sql)
  const { error } = await supabase.from('conversations').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
}

// -------------------------------------------------------------
// MESSAGES
// -------------------------------------------------------------

export async function getMessages(conversationId) {
  const res = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  return unwrap(res) || [];
}

export async function addMessage({ conversation_id, role, content, files = [] }) {
  const res = await supabase
    .from('messages')
    .insert({ conversation_id, role, content, files: files || [] })
    .select()
    .single();
  const message = unwrap(res);

  // Bump the parent conversation's updated_at so it sorts to the top.
  await updateConversation(conversation_id, { updated_at: new Date().toISOString() });

  return message;
}

// -------------------------------------------------------------
// SYSTEM PROMPTS
// -------------------------------------------------------------

export async function getPrompts() {
  const res = await supabase
    .from('system_prompts')
    .select('*')
    .order('created_at', { ascending: false });
  return unwrap(res) || [];
}

export async function createPrompt({ name, content }) {
  const res = await supabase
    .from('system_prompts')
    .insert({ name, content })
    .select()
    .single();
  return unwrap(res);
}

export async function updatePrompt(id, updates = {}) {
  const patch = { ...updates, updated_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from('system_prompts')
    .update(patch)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data || null;
}

export async function deletePrompt(id) {
  const { error } = await supabase.from('system_prompts').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
}

// -------------------------------------------------------------
// MARKDOWN TRANSCRIPT EXPORT
// -------------------------------------------------------------

export async function generateMarkdownTranscript(conversationId) {
  const conv = await getConversation(conversationId);
  if (!conv) return null;

  const messages = await getMessages(conversationId);

  let md = `# ${conv.title || 'Conversation Transcript'}\n\n`;
  md += `- **Date:** ${new Date(conv.created_at).toLocaleString()}\n`;
  md += `- **Model:** \`${conv.model || 'gemini-flash-latest'}\`\n`;
  if (conv.system_prompt) {
    md += `\n### System Instruction\n> ${conv.system_prompt.replace(/\n/g, '\n> ')}\n\n`;
  }
  md += `---\n\n`;

  for (const msg of messages) {
    const speaker = msg.role === 'user' ? '👤 **User**' : '🤖 **Assistant**';
    md += `### ${speaker} *(${new Date(msg.created_at).toLocaleTimeString()})*\n\n`;

    if (msg.files && msg.files.length > 0) {
      md += `*Attached Files:* ${msg.files.map((f) => `\`${f.name}\``).join(', ')}\n\n`;
    }

    md += `${msg.content}\n\n---\n\n`;
  }

  return md;
}

// Cloud storage has no local export file; the /api/export route builds the
// transcript in memory via generateMarkdownTranscript. This is a no-op stub so
// the storage contract stays uniform.
export async function exportConversationMarkdown() {
  return null;
}
