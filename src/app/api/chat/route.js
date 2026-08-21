import { NextResponse } from 'next/server';
import { createConversation, getMessages, addMessage, updateConversation } from '@/lib/db';
import { streamChat, generateText } from '@/lib/llm';

export async function POST(request) {
  try {
    const body = await request.json();
    const { message, model, systemPrompt, files = [] } = body;
    let { conversationId } = body;

    if (!message && files.length === 0) {
      return NextResponse.json({ error: 'Message content or files are required' }, { status: 400 });
    }

    // 1. Create conversation if it doesn't exist
    let isNewChat = false;
    if (!conversationId) {
      isNewChat = true;
      const conv = await createConversation({
        title: 'New Chat',
        model: model || 'gemini-flash-latest',
        systemPrompt: systemPrompt || '',
      });
      conversationId = conv.id;
    }

    // 2. Load conversation history
    const history = await getMessages(conversationId);

    // 3. Format message content. If there are file attachments, prepend their text context.
    let dbContent = '';
    const fileMetadataList = [];

    if (files && files.length > 0) {
      for (const file of files) {
        dbContent += `[FILE: ${file.name}]\n${file.extractedText || ''}\n\n`;
        fileMetadataList.push({
          name: file.name,
          mimeType: file.mimeType,
          size: file.size,
        });
      }
      dbContent += `--- USER MESSAGE ---\n`;
    }
    dbContent += message || '';

    // 4. Save user message to local database
    await addMessage({
      conversation_id: conversationId,
      role: 'user',
      content: dbContent,
      files: fileMetadataList,
    });

    // Prepare files for the model. Gemini uses the base64 `data` (inline);
    // OpenAI-compatible backends use `extractedText`. Both fields are passed so
    // the active backend can pick what it supports.
    const apiFiles = files.map((file) => ({
      name: file.name,
      mimeType: file.mimeType,
      data: file.data, // base64 encoded content
      extractedText: file.extractedText || '',
    }));

    // Setup Server-Sent Events stream
    const encoder = new TextEncoder();
    const customStream = new ReadableStream({
      async start(controller) {
        try {
          // Send metadata event containing conversation ID
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'meta', conversationId })}\n\n`));

          let fullResponseText = '';

          // Stream chunks from Gemini
          const stream = streamChat({
            model: model || 'gemini-flash-latest',
            systemPrompt,
            history: history || [],
            newMessage: message || '',
            files: apiFiles,
          });

          for await (const chunk of stream) {
            fullResponseText += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`));
          }

          // Save AI's response to local database
          await addMessage({
            conversation_id: conversationId,
            role: 'model',
            content: fullResponseText,
          });

          // If this is a new conversation, auto-generate a title in the background
          if (isNewChat || (history && history.length === 0)) {
            try {
              const promptText = `Summarize the following user request in 3-5 words to make a title for a chat conversation. Do not use quotes or markdown in your response. Just the title text. If there is no text, use the file name.\n\nRequest: "${message || (files[0] ? files[0].name : 'New Chat')}"`;
              let title = await generateText({
                model: model || 'gemini-flash-latest',
                prompt: promptText,
              });
              title = (title || 'New Chat').replace(/^["']|["']$/g, '');

              await updateConversation(conversationId, { title });
            } catch (titleErr) {
              console.error('Title generation failed:', titleErr);
            }
          }

          // Send done event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
        } catch (streamErr) {
          console.error('Streaming error inside start:', streamErr);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: streamErr.message })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(customStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    console.error('Chat api main error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
