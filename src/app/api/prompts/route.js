import { NextResponse } from 'next/server';
import { getPrompts, createPrompt } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/prompts
// List all saved system prompts
export async function GET() {
  try {
    const prompts = await getPrompts();
    return NextResponse.json({ prompts: prompts || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/prompts
// Create a new saved system prompt
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, content } = body;

    if (!name || !content) {
      return NextResponse.json({ error: 'Name and content are required' }, { status: 400 });
    }

    const prompt = await createPrompt({ name, content });
    return NextResponse.json({ prompt });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
