import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { query, type = 'search' } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'SERPER_API_KEY is not configured on the server' }, { status: 500 });
    }

    // Determine endpoint based on search type
    let endpoint = 'search';
    if (type === 'news') {
      endpoint = 'news';
    } else if (type === 'scholar') {
      endpoint = 'scholar';
    }

    const response = await fetch(`https://google.serper.dev/${endpoint}`, {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        num: 10,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: `Serper API error: ${errorText}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ results: data });
  } catch (err) {
    console.error('Search api error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
