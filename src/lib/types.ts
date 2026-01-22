import { z } from 'zod';

// Zod schema for deck structure
export const cardSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
});

export const deckSchema = z.object({
  title: z.string().min(1).max(200),
  topic: z.string().min(1).max(500),
  cards: z.array(cardSchema).min(8).max(12),
});

export type Card = z.infer<typeof cardSchema>;
export type Deck = z.infer<typeof deckSchema>;

// Database deck type (includes id, owner_id, created_at)
export interface DeckRecord {
  id: string;
  owner_id: string;
  title: string;
  topic: string;
  cards: Card[];
  created_at: string;
}
