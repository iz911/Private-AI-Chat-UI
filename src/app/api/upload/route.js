import { NextResponse } from 'next/server';
import pdf from 'pdf-parse';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let extractedText = '';
    const mimeType = file.type || 'application/octet-stream';
    const name = file.name || 'document';

    // Extract text based on file type
    if (mimeType === 'application/pdf') {
      try {
        const parsedPdf = await pdf(buffer);
        extractedText = parsedPdf.text || '';
      } catch (pdfErr) {
        console.error('Failed to parse PDF:', pdfErr);
        return NextResponse.json({ error: `Failed to parse PDF: ${pdfErr.message}` }, { status: 500 });
      }
    } else if (
      mimeType === 'text/plain' ||
      mimeType === 'text/markdown' ||
      mimeType === 'text/csv' ||
      mimeType === 'text/html' ||
      name.endsWith('.txt') ||
      name.endsWith('.md') ||
      name.endsWith('.csv')
    ) {
      extractedText = buffer.toString('utf-8');
    } else {
      // For images or unsupported files, we don't extract text but still allow sending base64 to Gemini
      extractedText = `[File: ${name} (${mimeType}) - binary content]`;
    }

    // Convert raw bytes to base64 for inlineData in Gemini
    const base64Data = buffer.toString('base64');

    return NextResponse.json({
      name,
      mimeType,
      size: file.size,
      extractedText,
      data: base64Data,
    });
  } catch (err) {
    console.error('File upload api error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
