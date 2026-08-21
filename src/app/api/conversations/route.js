import { NextResponse } from 'next/server';
import { getConversations, createConversation } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/conversations
// List all conversations sorted by updated_at desc
export async function GET() {
  try {
    const conversations = await getConversations();
    return NextResponse.json({ conversations });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/conversations
// Create a new empty conversation
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { title = 'New Chat', model = 'gemini-flash-latest', systemPrompt = '' } = body;

    const conversation = await createConversation({
      title,
      model,
      systemPrompt,
    });

    return NextResponse.json({ conversation });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
