'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/lib/types';

interface StudyModeProps {
  cards: Card[];
  onExit: () => void;
}

export default function StudyMode({ cards, onExit }: StudyModeProps) {
  const [shuffledCards, setShuffledCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  // Initialize with shuffled cards
  useEffect(() => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setShuffledCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowAnswer(false);
  }, [cards]);

  const currentCard = shuffledCards[currentIndex];
  const progress = shuffledCards.length > 0 ? ((currentIndex + 1) / shuffledCards.length) * 100 : 0;

  const shuffle = () => {
    const shuffled = [...shuffledCards].sort(() => Math.random() - 0.5);
    setShuffledCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowAnswer(false);
  };

  const nextCard = () => {
    if (currentIndex < shuffledCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
      setShowAnswer(false);
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
      setShowAnswer(false);
    }
  };

  const flipCard = () => {
    setIsFlipped(!isFlipped);
    setShowAnswer(!showAnswer);
  };

  if (!currentCard) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      {/* Header controls */}
      <div style={{
        position: 'absolute',
        top: '2rem',
        left: '2rem',
        right: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
      }}>
        <button
          onClick={onExit}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '12px',
            color: '#fff',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '0.9375rem',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          ← Exit Study Mode
        </button>

        <div style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
        }}>
          <button
            onClick={shuffle}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '12px',
              color: '#fff',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '0.9375rem',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            🔀 Shuffle
          </button>
          <div style={{
            color: '#fff',
            fontWeight: '600',
            fontSize: '0.9375rem',
          }}>
            {currentIndex + 1} / {shuffledCards.length}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        position: 'absolute',
        top: '5rem',
        left: '2rem',
        right: '2rem',
        height: '4px',
        background: 'rgba(255, 255, 255, 0.2)',
        borderRadius: '2px',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: '#fff',
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Card */}
      <div
        style={{
          perspective: '1000px',
          width: '100%',
          maxWidth: '600px',
          height: '400px',
          cursor: 'pointer',
        }}
        onClick={flipCard}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.6s',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front of card */}
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              backfaceVisibility: 'hidden',
              background: 'linear-gradient(135deg, #fff 0%, #f8f9fa 100%)',
              borderRadius: '24px',
              padding: '3rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <div style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#667eea',
              marginBottom: '1.5rem',
            }}>
              Question
            </div>
            <p style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#1a1a1a',
              textAlign: 'center',
              lineHeight: '1.4',
              margin: 0,
            }}>
              {currentCard.front}
            </p>
            <div style={{
              marginTop: '2rem',
              fontSize: '0.875rem',
              color: '#666',
              textAlign: 'center',
            }}>
              Click to reveal answer
            </div>
          </div>

          {/* Back of card */}
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '24px',
              padding: '3rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              color: '#fff',
            }}
          >
            <div style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              opacity: 0.9,
              marginBottom: '1.5rem',
            }}>
              Answer
            </div>
            <p style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              textAlign: 'center',
              lineHeight: '1.6',
              margin: 0,
              opacity: 0.95,
            }}>
              {currentCard.back}
            </p>
            <div style={{
              marginTop: '2rem',
              fontSize: '0.875rem',
              opacity: 0.8,
              textAlign: 'center',
            }}>
              Click to flip back
            </div>
          </div>
        </div>
      </div>

      {/* Navigation buttons */}
      <div style={{
        position: 'absolute',
        bottom: '3rem',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
      }}>
        <button
          onClick={prevCard}
          disabled={currentIndex === 0}
          style={{
            padding: '1rem 2rem',
            background: currentIndex === 0 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '12px',
            color: '#fff',
            fontWeight: '600',
            cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            transition: 'all 0.2s',
            opacity: currentIndex === 0 ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (currentIndex > 0) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            if (currentIndex > 0) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            }
          }}
        >
          ← Previous
        </button>

        <button
          onClick={flipCard}
          style={{
            padding: '1rem 2rem',
            background: 'rgba(255, 255, 255, 0.9)',
            border: 'none',
            borderRadius: '12px',
            color: '#667eea',
            fontWeight: '700',
            cursor: 'pointer',
            fontSize: '1rem',
            transition: 'all 0.2s',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.15)';
          }}
        >
          {isFlipped ? '🔄 Flip Back' : '👁️ Show Answer'}
        </button>

        <button
          onClick={nextCard}
          disabled={currentIndex === shuffledCards.length - 1}
          style={{
            padding: '1rem 2rem',
            background: currentIndex === shuffledCards.length - 1 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '12px',
            color: '#fff',
            fontWeight: '600',
            cursor: currentIndex === shuffledCards.length - 1 ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            transition: 'all 0.2s',
            opacity: currentIndex === shuffledCards.length - 1 ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (currentIndex < shuffledCards.length - 1) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            if (currentIndex < shuffledCards.length - 1) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            }
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
