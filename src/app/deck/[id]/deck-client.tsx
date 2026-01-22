'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DeckRecord } from '@/lib/types';
import Flashcard from '@/components/flashcard';
import StudyMode from '@/components/study-mode';

interface DeckClientProps {
  deck: DeckRecord;
}

export default function DeckClient({ deck }: DeckClientProps) {
  const [isStudyMode, setIsStudyMode] = useState(false);

  if (isStudyMode) {
    return <StudyMode cards={deck.cards} onExit={() => setIsStudyMode(false)} />;
  }

  return (
    <div style={{ 
      padding: '2rem', 
      maxWidth: '1400px', 
      margin: '0 auto',
      minHeight: '100vh',
      position: 'relative',
      zIndex: 1,
    }}>
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '3rem' 
      }}>
        <Link 
          href="/dashboard" 
          className="back-link"
          style={{ 
            padding: '0.75rem 1.5rem', 
            textDecoration: 'none', 
            color: '#667eea',
            fontWeight: '600',
            borderRadius: '8px',
            transition: 'all 0.2s',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          ← Back to Dashboard
        </Link>
      </header>

      <div style={{ 
        marginBottom: '3rem',
        padding: '2rem',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '20px',
        color: '#fff',
        boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)',
        position: 'relative',
      }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: '800', 
          marginBottom: '0.75rem',
          letterSpacing: '-0.02em',
        }}>
          {deck.title}
        </h1>
        <p style={{ 
          fontSize: '1.125rem',
          opacity: 0.95, 
          marginBottom: '1rem' 
        }}>
          {deck.topic}
        </p>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <p style={{ 
            fontSize: '0.9375rem',
            opacity: 0.85,
            margin: 0,
          }}>
            {deck.cards.length} cards • Created {new Date(deck.created_at).toLocaleDateString()}
          </p>
          <button
            onClick={() => setIsStudyMode(true)}
            style={{
              padding: '0.875rem 2rem',
              background: '#fff',
              border: 'none',
              borderRadius: '12px',
              color: '#667eea',
              fontWeight: '700',
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.15)';
            }}
          >
            📚 Start Study Mode
          </button>
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gap: '2rem',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
      }}>
        {deck.cards.map((card, index) => (
          <Flashcard key={index} card={card} index={index} />
        ))}
      </div>
    </div>
  );
}
