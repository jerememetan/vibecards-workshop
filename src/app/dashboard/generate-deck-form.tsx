'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GenerateDeckForm() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/generate-deck', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic: topic.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate deck');
      }

      const { deckId } = await response.json();
      router.push(`/deck/${deckId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <label htmlFor="topic" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Topic or Notes
        </label>
        <textarea
          id="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g., Photosynthesis process, World War II timeline, JavaScript closures..."
          required
          maxLength={500}
          rows={4}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '1rem',
            fontFamily: 'inherit',
          }}
        />
        <p style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: '#666' }}>
          {topic.length}/500 characters
        </p>
      </div>
      {error && (
        <div style={{ padding: '0.75rem', backgroundColor: '#fee', color: '#c00', borderRadius: '4px' }}>
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={loading || !topic.trim()}
        style={{
          padding: '0.75rem 2rem',
          fontSize: '1rem',
          backgroundColor: loading ? '#ccc' : '#000',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          alignSelf: 'flex-start',
        }}
      >
        {loading ? 'Generating...' : 'Generate Deck'}
      </button>
    </form>
  );
}
