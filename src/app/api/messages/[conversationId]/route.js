import { NextResponse } from 'next/server';
import { getMessages } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/messages/[conversationId]
// Retrieve all messages for a specific conversation sorted by time
export async function GET(request, { params }) {
  try {
    const { conversationId } = params;
    const messages = await getMessages(conversationId);
    return NextResponse.json({ messages: messages || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
