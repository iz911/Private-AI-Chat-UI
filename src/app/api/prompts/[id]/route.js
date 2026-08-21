import { NextResponse } from 'next/server';
import { updatePrompt, deletePrompt } from '@/lib/db';

// PATCH /api/prompts/[id]
// Update a saved system prompt
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const updates = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.content !== undefined) updates.content = body.content;

    const prompt = await updatePrompt(id, updates);

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    return NextResponse.json({ prompt });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/prompts/[id]
// Delete a saved system prompt
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    await deletePrompt(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
