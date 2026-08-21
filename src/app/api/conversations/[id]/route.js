import { NextResponse } from 'next/server';
import { getConversation, updateConversation, deleteConversation } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/conversations/[id]
// Retrieve a single conversation's details
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const conversation = await getConversation(id);

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({ conversation });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/conversations/[id]
// Update conversation details (title, model, system_prompt)
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const updateData = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.model !== undefined) updateData.model = body.model;
    if (body.systemPrompt !== undefined) updateData.system_prompt = body.systemPrompt;

    const conversation = await updateConversation(id, updateData);

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({ conversation });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/conversations/[id]
// Delete a conversation and its messages
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    await deleteConversation(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
