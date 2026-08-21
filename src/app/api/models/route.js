import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/models
// Returns the model list for the active LLM backend so the UI dropdown reflects
// what's actually available (Gemini catalogue, or the local runner's installed models).
export async function GET() {
  const backend = (process.env.LLM_BACKEND || 'gemini').toLowerCase();

  try {
    if (backend === 'openai') {
      const { listModels } = await import('@/lib/openai');
      const ids = await listModels();
      const models = ids.map((id) => ({ id, label: id }));
      return NextResponse.json({ backend, models, default: models[0]?.id || '' });
    }

    if (backend === 'anthropic') {
      const { listModels } = await import('@/lib/anthropic');
      const ids = await listModels();
      const models = ids.map((id) => ({ id, label: id }));
      return NextResponse.json({ backend, models, default: models[0]?.id || '' });
    }

    const { GEMINI_MODELS } = await import('@/lib/genai');
    return NextResponse.json({ backend, models: GEMINI_MODELS, default: 'gemini-flash-latest' });
  } catch (err) {
    // Never hard-fail the UI over model discovery; return an empty list it can cope with.
    return NextResponse.json({ backend, models: [], default: '', error: err.message });
  }
}
