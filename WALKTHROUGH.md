# Setup & Walkthrough

A practical guide to getting the chatbot running and picking the backends that fit you. For the deep architecture, see [AGENTS.md](AGENTS.md).

## Prerequisites

- **Node.js** v18.17+ or v20+
- One of: a **Google Gemini API key**, *or* a **local LLM runner** (e.g. Ollama), *or* any hosted OpenAI-compatible API key.

## Install

```bash
git clone <repo-url>
cd <repo-folder>
npm install
```

---

## Choosing a backend

The app has **two independent switches**, both set in your env file. Pick one option from each column — any combination works.

| | **Where the model runs** (`LLM_BACKEND`) | **Where chats are stored** (`STORAGE_BACKEND`) |
| :-- | :-- | :-- |
| **Default** | `gemini` — Google's API | `local` — JSON files in `./data/` |
| **Alternatives** | `openai` — any OpenAI-compatible endpoint (hosted or local), or `anthropic` — native Claude | `supabase` — Supabase Postgres |

**Quick guidance:**

- **Want it fully private / offline?** `LLM_BACKEND=openai` pointed at a local runner + `STORAGE_BACKEND=local`. Nothing leaves your machine. (Preset: [`.env.local.example`](.env.local.example).)
- **Want the strongest models, minimal setup?** `LLM_BACKEND=gemini` + `STORAGE_BACKEND=local`. Your prompts aren't trained on (Vertex AI Express terms), but requests do go to Google.
- **Want a specific cloud model by API key?** `LLM_BACKEND=openai` with an `OPENAI_PROVIDER` preset (Groq, OpenRouter, DeepSeek, …), or `LLM_BACKEND=anthropic` for Claude. See the provider table below.
- **Want to share history across devices / a team?** Add `STORAGE_BACKEND=supabase`. Combine with any model backend.

Start from a template:

```bash
cp .env.example .env             # full, documented template (all options)
# or, for the local-Ollama + local-files preset:
cp .env.local.example .env.local
```

Then configure whichever backends you chose, below.

---

## LLM backends

### Option A — Gemini (default)

```env
LLM_BACKEND=gemini
USE_VERTEX_AI=true
GOOGLE_VERTEX_API_KEY=your_key    # from Google AI Studio or Vertex AI Express Mode
GOOGLE_CLOUD_LOCATION=global
```

The model dropdown shows the Gemini catalogue; `gemini-flash-latest` auto-tracks the newest Flash release.

### Option B — Local / OpenAI-compatible

Works with **Ollama, LM Studio, llama.cpp, vLLM, Jan, LocalAI**, and hosted OpenAI-compatible APIs (OpenAI, Groq, Together…).

```env
LLM_BACKEND=openai
OPENAI_BASE_URL=http://localhost:11434/v1   # Ollama; LM Studio=1234, llama.cpp=8080, OpenAI=https://api.openai.com/v1
OPENAI_API_KEY=ollama                        # any non-empty value locally; real key for hosted APIs
OPENAI_MODEL=llama3.1                         # default model
# OPENAI_MODELS=llama3.1,qwen2.5,mistral      # optional manual dropdown list
```

Example with Ollama:

```bash
ollama pull llama3.1
# ollama serve runs automatically on :11434
```

The model dropdown auto-populates from the server's `/v1/models`. If that endpoint isn't reachable, it falls back to `OPENAI_MODELS`, then to `OPENAI_MODEL`.

**Hosted provider presets.** Instead of memorizing base URLs, set `OPENAI_PROVIDER` and the base URL is filled in for you (an explicit `OPENAI_BASE_URL` still wins):

| `OPENAI_PROVIDER` | Base URL | Notes |
| :-- | :-- | :-- |
| `openai` | `https://api.openai.com/v1` | GPT models |
| `groq` | `https://api.groq.com/openai/v1` | Fast Llama / Mixtral |
| `openrouter` | `https://openrouter.ai/api/v1` | **One key → Claude, Gemini, Llama, hundreds** |
| `together` | `https://api.together.xyz/v1` | Open models |
| `deepseek` | `https://api.deepseek.com/v1` | DeepSeek |
| `mistral` | `https://api.mistral.ai/v1` | Mistral |
| `xai` | `https://api.x.ai/v1` | Grok |
| `perplexity` | `https://api.perplexity.ai` | Sonar (web-grounded) |
| `ollama` / `lmstudio` | local defaults | convenience shortcuts |

```env
LLM_BACKEND=openai
OPENAI_PROVIDER=groq
OPENAI_API_KEY=your_groq_key
OPENAI_MODEL=llama-3.1-70b-versatile
```

> Big gateways (OpenRouter, OpenAI) can return hundreds of models. Set `OPENAI_MODELS=id1,id2,…` to curate the dropdown.

### Option C — Anthropic (Claude), native

For an Anthropic key directly (rather than via OpenRouter):

```env
LLM_BACKEND=anthropic
ANTHROPIC_API_KEY=your_anthropic_key
ANTHROPIC_MODEL=claude-3-5-sonnet-latest   # set a CURRENT model id — check Anthropic's docs
# ANTHROPIC_MODELS=id1,id2                  # optional dropdown list
# ANTHROPIC_MAX_TOKENS=4096                 # response length cap (required by the API)
```

The dropdown populates from Anthropic's `/v1/models`; `ANTHROPIC_MODEL` is the fallback/default.

---

## Storage backends

### Option A — Local files (default)

```env
STORAGE_BACKEND=local
```

Everything is written to `./data/` as plain `.json` and `.md`. No setup. **Reset everything** by deleting the `./data/` folder. This folder is git-ignored, so your conversations never get committed.

### Option B — Supabase (Postgres)

```bash
npm install @supabase/supabase-js
```

1. In your [Supabase Dashboard](https://supabase.com/dashboard) → **SQL Editor** → **New query**, paste the contents of [`supabase_schema.sql`](supabase_schema.sql) and **Run**. This creates the `conversations`, `messages`, and `system_prompts` tables.
2. In **Settings → API**, copy your project URL and `service_role` key.
3. Set:

```env
STORAGE_BACKEND=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
```

> The `service_role` key bypasses row-level security and must stay server-side only. It lives in `.env` (git-ignored) and is only ever read by server route handlers — never exposed to the browser.

---

## Run

```bash
npm run dev
```

Open **http://localhost:3005**. That's it.

## Switching later

Backends are chosen at startup from the env file — change `LLM_BACKEND` / `STORAGE_BACKEND` and restart `npm run dev`. Note the two storage backends are separate stores: switching from `local` to `supabase` starts empty (it doesn't migrate your `./data/` history).
