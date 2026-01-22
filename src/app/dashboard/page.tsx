import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase';
import { DeckRecord } from '@/lib/types';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import GenerateDeckForm from './generate-deck-form';

export const dynamic = 'force-dynamic';

async function getDecks(ownerId: string): Promise<DeckRecord[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('decks')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching decks:', error);
    return [];
  }

  return (data || []).map((deck) => ({
    ...deck,
    cards: deck.cards as DeckRecord['cards'],
  }));
}

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const decks = await getDecks(userId);

  return (
    <div style={{ 
      padding: '2rem', 
      maxWidth: '1000px', 
      margin: '0 auto',
      position: 'relative',
      zIndex: 1,
    }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>My Decks</h1>
        <Link href="/" style={{ padding: '0.5rem 1rem', textDecoration: 'none', color: '#666' }}>
          Home
        </Link>
      </header>

      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Generate New Deck</h2>
        <GenerateDeckForm />
      </div>

      <div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Your Decks ({decks.length})</h2>
        {decks.length === 0 ? (
          <p style={{ color: '#666' }}>No decks yet. Generate your first deck above!</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {decks.map((deck) => (
              <Link
                key={deck.id}
                href={`/deck/${deck.id}`}
                className="deck-link"
                style={{
                  padding: '1.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'block',
                  transition: 'background-color 0.2s',
                }}
              >
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>{deck.title}</h3>
                <p style={{ margin: '0 0 0.5rem 0', color: '#666' }}>Topic: {deck.topic}</p>
                <p style={{ margin: 0, color: '#999', fontSize: '0.9rem' }}>
                  {deck.cards.length} cards • Created {new Date(deck.created_at).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
