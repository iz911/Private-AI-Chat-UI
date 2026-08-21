import { NextResponse } from 'next/server';
import { generateMarkdownTranscript, getConversation } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/export/[conversationId]
// Downloads the conversation as a formatted .md markdown file
export async function GET(request, { params }) {
  try {
    const { conversationId } = params;
    const conversation = await getConversation(conversationId);

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const markdown = await generateMarkdownTranscript(conversationId);

    if (!markdown) {
      return NextResponse.json({ error: 'Failed to generate markdown' }, { status: 500 });
    }

    const safeTitle = (conversation.title || 'chat-transcript')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .slice(0, 50);

    return new Response(markdown, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeTitle}.md"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
