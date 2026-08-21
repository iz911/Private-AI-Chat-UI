// LLM backend dispatcher.
//
//   LLM_BACKEND=gemini    (default) -> Google Gemini            [src/lib/genai.js]
//   LLM_BACKEND=openai              -> OpenAI-compatible / local [src/lib/openai.js]
//   LLM_BACKEND=anthropic           -> Anthropic Claude          [src/lib/anthropic.js]
//
// Every backend exports the same contract: streamChat(), generateText(), resolveModel().

import * as gemini from './genai.js';
import * as openai from './openai.js';
import * as anthropic from './anthropic.js';

export const LLM_BACKEND = (process.env.LLM_BACKEND || 'gemini').toLowerCase();

const backends = { gemini, openai, anthropic };
const impl = backends[LLM_BACKEND] || gemini;

export const streamChat = impl.streamChat;
export const generateText = impl.generateText;
export const resolveModel = impl.resolveModel;
