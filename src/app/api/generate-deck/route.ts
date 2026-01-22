import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { deckSchema } from '@/lib/types';
import { createServerClient } from '@/lib/supabase';

// Instantiate OpenAI client inside handler (not module level)
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY');
  }
  return new OpenAI({ apiKey });
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { topic } = body;

    // Validate topic
    if (!topic || typeof topic !== 'string') {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const trimmedTopic = topic.trim();
    if (trimmedTopic.length === 0) {
      return NextResponse.json({ error: 'Topic cannot be empty' }, { status: 400 });
    }

    if (trimmedTopic.length > 500) {
      return NextResponse.json({ error: 'Topic must be 500 characters or less' }, { status: 400 });
    }

    // Generate deck using OpenAI Responses API
    const openai = getOpenAIClient();
    const response = await openai.responses.parse({
      model: 'gpt-5.2',
      input: [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates educational flashcards. Generate a deck of flashcards based on the given topic. Create 8-12 cards that cover key concepts, facts, and important information about the topic.',
        },
        {
          role: 'user',
          content: `Create a flashcard deck about: ${trimmedTopic}`,
        },
      ],
      text: {
        format: zodTextFormat(deckSchema, 'deck'),
      },
      max_output_tokens: 2000,
    });

    const deck = response.output_parsed;
    if (!deck) {
      throw new Error('Failed to parse deck from OpenAI response');
    }

    // Validate deck structure
    const validatedDeck = deckSchema.parse(deck);

    // Save to Supabase
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('decks')
      .insert({
        owner_id: userId,
        title: validatedDeck.title,
        topic: validatedDeck.topic,
        cards: validatedDeck.cards,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error saving deck to Supabase:', error);
      return NextResponse.json({ error: 'Failed to save deck' }, { status: 500 });
    }

    return NextResponse.json({ deckId: data.id });
  } catch (error) {
    console.error('Error generating deck:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
