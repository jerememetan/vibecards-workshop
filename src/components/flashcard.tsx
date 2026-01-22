'use client';

import { Card } from '@/lib/types';

// Array of beautiful gradient combinations
const gradients = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  'linear-gradient(135deg, #ff8a80 0%, #ea6100 100%)',
  'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
  'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
];

interface FlashcardProps {
  card: Card;
  index: number;
}

export default function Flashcard({ card, index }: FlashcardProps) {
  const gradient = gradients[index % gradients.length];

  return (
    <div
      className="flashcard"
      style={{
        position: 'relative',
        padding: '2rem',
        borderRadius: '16px',
        background: gradient,
        color: '#fff',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s ease',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
        e.currentTarget.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.25), 0 8px 20px rgba(0, 0, 0, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.1)';
      }}
    >
      {/* Decorative overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
          pointerEvents: 'none',
        }}
      />

      {/* Card number badge */}
      <div
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          background: 'rgba(255, 255, 255, 0.25)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '0.25rem 0.75rem',
          fontSize: '0.75rem',
          fontWeight: '600',
          color: '#fff',
        }}
      >
        #{index + 1}
      </div>

      {/* Front section */}
      <div style={{ marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}>
        <div
          style={{
            fontSize: '0.75rem',
            fontWeight: '700',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '0.75rem',
            opacity: 0.9,
          }}
        >
          Front
        </div>
        <p
          style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            margin: 0,
            lineHeight: '1.4',
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
          }}
        >
          {card.front}
        </p>
      </div>

      {/* Divider */}
      <div
        style={{
          height: '2px',
          background: 'rgba(255, 255, 255, 0.3)',
          margin: '1.5rem 0',
          borderRadius: '1px',
          position: 'relative',
          zIndex: 1,
        }}
      />

      {/* Back section */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            fontSize: '0.75rem',
            fontWeight: '700',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '0.75rem',
            opacity: 0.9,
          }}
        >
          Back
        </div>
        <p
          style={{
            fontSize: '1.125rem',
            margin: 0,
            lineHeight: '1.6',
            opacity: 0.95,
            textShadow: '0 1px 5px rgba(0, 0, 0, 0.1)',
          }}
        >
          {card.back}
        </p>
      </div>
    </div>
  );
}
