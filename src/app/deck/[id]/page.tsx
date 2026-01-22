import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase';
import { DeckRecord } from '@/lib/types';
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import DeckClient from './deck-client';

export const dynamic = 'force-dynamic';

async function getDeck(deckId: string, ownerId: string): Promise<DeckRecord | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('decks')
    .select('*')
    .eq('id', deckId)
    .eq('owner_id', ownerId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    ...data,
    cards: data.cards as DeckRecord['cards'],
  };
}

export default async function DeckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const { id } = await params;
  const deck = await getDeck(id, userId);

  if (!deck) {
    notFound();
  }

  return <DeckClient deck={deck} />;
}
