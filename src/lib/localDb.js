import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.join(process.cwd(), 'data');
const CONVERSATIONS_FILE = path.join(DATA_DIR, 'conversations.json');
const PROMPTS_FILE = path.join(DATA_DIR, 'prompts.json');
const MESSAGES_DIR = path.join(DATA_DIR, 'messages');
const EXPORTS_DIR = path.join(DATA_DIR, 'exports');

/**
 * Ensures the data directory and required JSON files exist.
 */
async function ensureDbInit() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(MESSAGES_DIR, { recursive: true });
    await fs.mkdir(EXPORTS_DIR, { recursive: true });

    try {
      await fs.access(CONVERSATIONS_FILE);
    } catch {
      await fs.writeFile(CONVERSATIONS_FILE, JSON.stringify([], null, 2), 'utf-8');
    }

    try {
      await fs.access(PROMPTS_FILE);
    } catch {
      await fs.writeFile(PROMPTS_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('Error initializing local database directory:', err);
  }
}

/**
 * Safely reads JSON from a file with a fallback default.
 */
async function readJsonFile(filePath, defaultValue = []) {
  await ensureDbInit();
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    return defaultValue;
  }
}

/**
 * Safely writes JSON to a file atomically via a temporary file.
 */
async function writeJsonFile(filePath, data) {
  await ensureDbInit();
  const tempPath = `${filePath}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  await fs.rename(tempPath, filePath);
}

// -------------------------------------------------------------
// CONVERSATIONS
// -------------------------------------------------------------

export async function getConversations() {
  const convs = await readJsonFile(CONVERSATIONS_FILE, []);
  return convs.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
}

export async function getConversation(id) {
  const convs = await getConversations();
  return convs.find((c) => c.id === id) || null;
}

export async function createConversation({ title = 'New Chat', model = 'gemini-flash-latest', systemPrompt = '', id = null }) {
  const convs = await getConversations();
  const newConv = {
    id: id || crypto.randomUUID(),
    title,
    model,
    system_prompt: systemPrompt,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  convs.unshift(newConv);
  await writeJsonFile(CONVERSATIONS_FILE, convs);

  // Initialize empty messages file
  const msgFile = path.join(MESSAGES_DIR, `${newConv.id}.json`);
  await writeJsonFile(msgFile, []);

  return newConv;
}

export async function updateConversation(id, updates = {}) {
  const convs = await getConversations();
  const index = convs.findIndex((c) => c.id === id);

  if (index === -1) {
    return null;
  }

  const updatedConv = {
    ...convs[index],
    ...updates,
    updated_at: updates.updated_at || new Date().toISOString(),
  };

  convs[index] = updatedConv;
  await writeJsonFile(CONVERSATIONS_FILE, convs);

  // Auto-export updated markdown transcript
  exportConversationMarkdown(id).catch(() => {});

  return updatedConv;
}

export async function deleteConversation(id) {
  const convs = await getConversations();
  const filtered = convs.filter((c) => c.id !== id);
  await writeJsonFile(CONVERSATIONS_FILE, filtered);

  // Delete message file
  try {
    const msgFile = path.join(MESSAGES_DIR, `${id}.json`);
    await fs.unlink(msgFile);
  } catch (err) {}

  // Delete export file if exists
  try {
    const exportFile = path.join(EXPORTS_DIR, `${id}.md`);
    await fs.unlink(exportFile);
  } catch (err) {}

  return true;
}

// -------------------------------------------------------------
// MESSAGES
// -------------------------------------------------------------

export async function getMessages(conversationId) {
  await ensureDbInit();
  const msgFile = path.join(MESSAGES_DIR, `${conversationId}.json`);
  const messages = await readJsonFile(msgFile, []);
  return messages.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
}

export async function addMessage({ conversation_id, role, content, files = [] }) {
  await ensureDbInit();
  const msgFile = path.join(MESSAGES_DIR, `${conversation_id}.json`);
  const messages = await getMessages(conversation_id);

  const newMsg = {
    id: crypto.randomUUID(),
    conversation_id,
    role,
    content,
    files: files || [],
    created_at: new Date().toISOString(),
  };

  messages.push(newMsg);
  await writeJsonFile(msgFile, messages);

  // Update conversation's updated_at timestamp
  await updateConversation(conversation_id, { updated_at: new Date().toISOString() });

  return newMsg;
}

// -------------------------------------------------------------
// SYSTEM PROMPTS
// -------------------------------------------------------------

export async function getPrompts() {
  const prompts = await readJsonFile(PROMPTS_FILE, []);
  return prompts.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

export async function createPrompt({ name, content }) {
  const prompts = await getPrompts();
  const newPrompt = {
    id: crypto.randomUUID(),
    name,
    content,
    created_at: new Date().toISOString(),
  };

  prompts.unshift(newPrompt);
  await writeJsonFile(PROMPTS_FILE, prompts);
  return newPrompt;
}

export async function updatePrompt(id, updates = {}) {
  const prompts = await getPrompts();
  const index = prompts.findIndex((p) => p.id === id);

  if (index === -1) {
    return null;
  }

  const updatedPrompt = {
    ...prompts[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };

  prompts[index] = updatedPrompt;
  await writeJsonFile(PROMPTS_FILE, prompts);

  return updatedPrompt;
}

export async function deletePrompt(id) {
  const prompts = await getPrompts();
  const filtered = prompts.filter((p) => p.id !== id);
  await writeJsonFile(PROMPTS_FILE, filtered);
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

export async function exportConversationMarkdown(conversationId) {
  try {
    const md = await generateMarkdownTranscript(conversationId);
    if (!md) return null;
    await ensureDbInit();
    const exportPath = path.join(EXPORTS_DIR, `${conversationId}.md`);
    await fs.writeFile(exportPath, md, 'utf-8');
    return exportPath;
  } catch (err) {
    console.error('Failed to export markdown:', err);
    return null;
  }
}
