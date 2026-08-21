# AGENTS.md — System Architecture, Functions & Privacy Specification

This document provides a comprehensive technical overview of the **Private AI Chat UI** codebase for developers, AI coding assistants, and open-source contributors.

---

## 1. Overview & Purpose

The **Private AI Chat UI** is a minimalist, self-hosted, **bring-your-own-key** AI chat interface for **Google Gemini**, **Anthropic Claude**, and any **OpenAI-compatible or local model** (Ollama, LM Studio, Groq, OpenRouter, DeepSeek, and more). It is built for researchers, academics, and privacy-conscious developers who want their ideas, research drafts, and intellectual property to stay on their own machine — never used to train foundation models, and never retained by a third-party chat service.

> **Scope note — three backends.** The app ships with a pluggable **LLM backend** (`LLM_BACKEND` env var):
> - `gemini` (default) — sends messages to Google's Vertex AI / Gemini API using your key. Private in the data-governance sense (no training on your inputs, per Google Cloud's Vertex AI Express Mode terms), but **not offline**: requests leave your machine for Google.
> - `anthropic` — sends messages to Anthropic's native Messages API for Claude models using your Anthropic key.
> - `openai` — targets any OpenAI-compatible endpoint, including hosted providers (**OpenRouter, Groq, DeepSeek, Mistral, xAI, Perplexity, Together**) and local runners (**Ollama, LM Studio, llama.cpp, vLLM, Jan, LocalAI**). Pointed at a local runner, inference is **fully offline/air-gapped** and no data leaves the machine.
>
> Storage is independently pluggable via `STORAGE_BACKEND` (`local` files by default, or `supabase`).

---

## 🤖 Instructions for AI Coding Assistants

If you are an AI coding assistant (Claude Code, Cursor, GitHub Copilot, Aider, Devin, …) modifying this repository, follow these rules. They match the architecture and keep the codebase consistent:

1. **Model I/O goes through [`src/lib/llm.js`](src/lib/llm.js).** Call `streamChat`, `generateText`, and `resolveModel` from there — never import a concrete backend (`genai.js`, `openai.js`, `anthropic.js`) directly from routes or components. To add a provider, write **one** file exporting those three functions and register it in `llm.js`.
2. **Storage goes through [`src/lib/db.js`](src/lib/db.js).** Route all conversation/message/prompt reads and writes through this façade — never touch the filesystem or Supabase directly from route handlers. To add a store, mirror `localDb.js`'s exported functions in a new adapter.
3. **Styling is vanilla CSS variables in [`src/app/globals.css`](src/app/globals.css).** Do **not** add Tailwind, shadcn/ui, MUI, or any UI/component library — the no-framework design is intentional. Re-theme by editing the `:root` variables.
4. **Keep it dependency-light.** The Anthropic and OpenAI backends use the built-in `fetch` (no provider SDKs). Storage stays on `fs`/JSON unless the user explicitly opts into Supabase.
5. **Never hardcode API keys or pin model versions.** Keys live in `.env` (git-ignored). Model lists are discovered at runtime via `/api/models` — don't hard-code point-version model ids in code or docs, as they go stale.
6. **Never commit `./data/` or `.env`.** They hold personal conversations and secrets, and are already git-ignored.

---

## 2. Design Philosophy: Bare-Bones & Customization-First

The UI is intentionally built as a **bare-bones, minimalist scaffold** rather than a heavily opinionated, rigid product. 

### Why Bare-Bones?
* **Zero UI Bloat:** No massive design framework dependencies (e.g. Tailwind, shadcn/ui, MUI, or heavy icon libraries) that add build bloat or make custom styling difficult to override.
* **Blank Canvas for Developers:** The codebase is designed as a clean, hackable foundation. You can easily re-skin, re-theme, or adapt the components into your own personal research suite, custom agent interface, or internal corporate tool.
* **Instant Theming via CSS Variables:** All styling is managed in [`src/app/globals.css`](src/app/globals.css) via centralized `:root` variables:
  ```css
  :root {
    --bg-primary: #121214;        /* Main background */
    --bg-secondary: #1a1a1e;      /* Panels & input background */
    --bg-sidebar: #0e0e10;        /* Sidebar background */
    --accent-primary: #3b82f6;    /* Primary highlight color */
    --accent-hover: #2563eb;      /* Button hover state */
    --text-primary: #f3f4f6;      /* Primary typography */
    --text-secondary: #9ca3af;    /* Subtitles & metadata */
    --text-muted: #6b7280;        /* Subtle timestamps & borders */
    --border-color: #27272a;      /* Dividers and borders */
    --sidebar-width: 280px;       /* Sidebar panel width */
  }
  ```
  Modifying just these few lines in `globals.css` instantly changes the entire look, feel, and color scheme of the application.

---

## 3. Privacy & Data Governance Model

```
┌─────────────────────────┐          ┌──────────────────────────┐          ┌──────────────────────────┐
│   Browser / Client UI   │  ──────> │ Local Next.js API Server │  ──────> │  Google Vertex AI API    │
│   (No 3rd-party scripts)│          │  (Port 3005 on 127.0.0.1)│          │  (Enterprise / Zero-Train│
└─────────────────────────┘          └─────────────┬────────────┘          └──────────────────────────┘
                                                   │
                                                   ▼
                                     ┌──────────────────────────┐
                                     │  Local Disk Storage      │
                                     │  (./data/*.json, *.md)   │
                                     └──────────────────────────┘
```

### Key Privacy Pillars:
1. **Zero Model Training (Vertex AI Express Mode):**
   * The application connects to Google Cloud's Vertex AI Express Mode endpoint via a project-scoped API key. Under Google Cloud's commercial terms of service, customer inputs and generated outputs are **strictly excluded from foundation model training**.
2. **Local Data Residency by Default:**
   * Out of the box (`STORAGE_BACKEND=local`), no external database is required — all conversation history, message transcripts, and custom system prompts are stored locally inside the project's `./data/` directory.
   * Opting into `STORAGE_BACKEND=supabase` is the one case where data leaves for a cloud Postgres instance you control; it stays off unless you set it.
3. **Zero Telemetry & Zero External Analytics:**
   * No tracking pixels, analytics SDKs, or external monitoring dependencies are loaded in the frontend.
4. **Local In-Memory Document Extraction:**
   * Attached PDFs, text files, and Markdown documents are parsed in-memory on your local machine using `pdf-parse` and encoded inline for API transmission. Files are not uploaded to public storage buckets.

---

## 4. System Architecture & Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | **Next.js 14 (App Router)** | Full-stack React framework utilizing Route Handlers and Server-Sent Events (SSE). |
| **Frontend** | **React 18** | Custom UI inspired by Gemini/ChatGPT, optimized with `memo` for high-speed typing and streaming. |
| **Styling** | **Vanilla CSS Variables / Global CSS** | Clean, unbloated dark-mode theme utilizing pure CSS variables for easy restyling. |
| **LLM Backend** | **Pluggable (`src/lib/llm.js`)** | Dispatches to `genai.js` (Google `@google/genai`), `anthropic.js` (Anthropic Claude Messages API), or `openai.js` (OpenAI-compatible `fetch`, incl. hosted presets & local runners) based on `LLM_BACKEND`. |
| **Storage Backend** | **Pluggable (`src/lib/db.js`)** | Dispatches to `localDb.js` (file-based JSON, default) or `supabaseDb.js` (Supabase Postgres) based on `STORAGE_BACKEND`. Lazy-loaded so local-only installs never require `@supabase/supabase-js`. |
| **Web Search** | **Serper API (`serper.dev`)** | Live web search, news retrieval, and **Google Scholar** scraping for academic papers. |

---

## 5. Core Functional Modules

### 5.1. Local Storage Engine (`src/lib/localDb.js`)
* **Atomic File Writes:** Writes all data to temporary files before renaming (`fs.rename`), preventing file corruption on abrupt process terminations.
* **Directory Structure (`./data/`):**
  * `data/conversations.json` — Master conversation index (ID, title, model, system prompt, timestamps).
  * `data/messages/{conversationId}.json` — Individual chat message records with role, text, and file metadata.
  * `data/prompts.json` — User-created reusable system prompt presets.
  * `data/exports/{conversationId}.md` — Automatically updated Markdown transcript files.

### 5.2. LLM Backends & Streaming (`src/lib/llm.js` → `genai.js` / `anthropic.js` / `openai.js`)
* **Backend dispatch (`src/lib/llm.js`):** Re-exports `streamChat`, `generateText`, and `resolveModel` from whichever backend `LLM_BACKEND` selects (`gemini`, `anthropic`, or `openai`). Every route imports model I/O from here, never from a concrete backend.
* **Anthropic backend (`src/lib/anthropic.js`):** Talks to `${ANTHROPIC_BASE_URL}/v1/messages` using plain `fetch`. Streams SSE delta chunks, places system prompts in the top-level `system` field, and maps role identifiers. `listModels()` reads `/v1/models`.
* **OpenAI-compatible backend (`src/lib/openai.js` & `src/lib/providers.js`):** Talks to `${BASE_URL}/chat/completions` with `fetch`. Automatically maps provider presets via `OPENAI_PROVIDER` (Groq, OpenRouter, DeepSeek, Mistral, xAI, Perplexity, Together, Ollama, LM Studio). Maps stored history (`role: 'model'` → `assistant`), inlines extracted file text, and parses the streaming SSE `delta.content`. `listModels()` reads the server's `/v1/models`.
* **Gemini backend (`src/lib/genai.js`) — Dynamic Model Resolver (`resolveModel`):**
  * Maps `gemini-flash-latest` dynamically to the frontier Flash model (**`gemini-3.7-flash`**).
  * Supports direct model targeting: `gemini-3.7-flash`, `gemini-3.5-flash`, `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-pro`, `gemini-1.5-flash`.
* **Streaming Generator (`streamChat`):**
  * Streams chunks asynchronously via SSE (`ReadableStream`), handling chat history, base64 files, and system instructions.

### 5.3. API Endpoints Map

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/api/chat` | `POST` | Primary chat endpoint; streams SSE response chunks, saves messages, and triggers automatic title summarization. |
| `/api/conversations` | `GET`, `POST` | Lists all local chats or creates a new conversation entry. |
| `/api/conversations/[id]` | `GET`, `PATCH`, `DELETE` | Retrieves, renames, updates model/prompts, or deletes a specific conversation and its files. |
| `/api/messages/[conversationId]` | `GET` | Retrieves full chronologically sorted message history for a chat. |
| `/api/prompts` | `GET`, `POST` | Lists and saves custom system instruction presets. |
| `/api/models` | `GET` | Returns the model list for the active LLM backend (Gemini catalogue, or the local runner's installed models) so the UI dropdown stays accurate. |
| `/api/upload` | `POST` | Accepts `.pdf`, `.txt`, `.md`, `.csv` file uploads and extracts raw text for LLM context. |
| `/api/search` | `POST` | Proxies queries to Serper API (supports Web, News, and Google Scholar). |
| `/api/export/[conversationId]` | `GET` | Generates and triggers browser download of a clean `.md` conversation transcript. |

---

## 6. UI Features & User Experience

1. **Slash Command Autocomplete (`/`):**
   * Typing `/` as the first character in the chat input opens an interactive dropdown above the chatbox.
   * Supported commands:
     * `/search` — Trigger Google Web Search
     * `/news` — Search Google News articles
     * `/scholar` — Search academic papers on Google Scholar
   * Full keyboard navigation (Arrow Up/Down, Enter/Tab to select, Escape to dismiss).
2. **Message Copy Buttons:**
   * Hovering over any user message or assistant response displays an instant copy button with visual checkmark feedback.
   * Individual code blocks inside responses include dedicated code copy buttons.
3. **Collapsible Sidebar:**
   * One-click toggle button on the top navigation bar slides the past conversations panel in and out smoothly.
4. **One-Click Markdown Export:**
   * Download button on the top bar allows immediate export of the active conversation to a standalone `.md` document.
5. **Inline Conversation Renaming:**
   * Pencil icon on sidebar items enables instant inline editing of chat titles.

---

## 7. Directory Layout

```
.
├── data/                         # Local database (auto-generated)
│   ├── conversations.json        # Index of all conversations
│   ├── prompts.json              # Saved system prompts
│   ├── messages/                 # Message history per conversation ({id}.json)
│   └── exports/                  # Markdown exports ({id}.md)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/             # SSE streaming route
│   │   │   ├── conversations/    # Chat list & CRUD
│   │   │   ├── export/           # Markdown download endpoint
│   │   │   ├── messages/         # Message retrieval
│   │   │   ├── models/           # Model list for the active LLM backend
│   │   │   ├── prompts/          # System prompts CRUD
│   │   │   ├── search/           # Serper & Scholar proxy
│   │   │   └── upload/           # PDF/Text parser
│   │   ├── globals.css           # Pure CSS variables, theme styles & animations
│   │   ├── layout.js             # Root layout
│   │   └── page.js               # Entry point
│   ├── components/
│   │   ├── ChatApp.js            # Master state coordinator
│   │   ├── ChatArea.js           # Chat message view & input form
│   │   ├── FileUpload.js         # File attachment handler
│   │   ├── MessageBubble.js      # Memoized markdown message bubble
│   │   ├── ModelSelector.js      # Frontier model dropdown
│   │   ├── SearchPanel.js        # Google / Scholar search overlay
│   │   ├── Sidebar.js            # Conversations & saved prompts sidebar
│   │   └── SystemPromptPanel.js  # System instructions editor
│   └── lib/
│       ├── llm.js                # LLM backend dispatcher (gemini | anthropic | openai)
│       ├── genai.js              # Google Gemini backend
│       ├── anthropic.js          # Anthropic Claude Messages API backend
│       ├── openai.js             # OpenAI-compatible / local-LLM backend
│       ├── providers.js          # OpenAI provider presets (Groq, OpenRouter, DeepSeek, ...)
│       ├── db.js                 # Storage backend dispatcher (local | supabase)
│       ├── localDb.js            # File-based local storage engine
│       └── supabaseDb.js         # Supabase Postgres storage adapter
├── supabase_schema.sql           # Tables for STORAGE_BACKEND=supabase
├── .env.example                  # Template environment variables
├── package.json                  # Dependencies & scripts (port 3005)
└── AGENTS.md                     # This architecture & specification guide
```

---

## 8. Setup & Execution for Developers

### Prerequisites:
* Node.js v18.17+ or v20+
* Google Cloud Vertex AI API Key or Google AI Studio Gemini API Key
* Serper API Key (optional, for web/scholar search)

### Quickstart:
```bash
# 1. Clone repository
git clone <repo-url>
cd <repo-folder>

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env and paste your GOOGLE_VERTEX_API_KEY and SERPER_API_KEY

# 4. Start local development server (runs on port 3005)
npm run dev
```

Open `http://localhost:3005` in your browser. All conversations will be persisted strictly on your local disk.
