-- VibeCards Database Schema
-- Run this in your Supabase SQL Editor

-- Create decks table
CREATE TABLE IF NOT EXISTS decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  cards JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on owner_id for faster queries
CREATE INDEX IF NOT EXISTS idx_decks_owner_id ON decks(owner_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_decks_created_at ON decks(created_at DESC);
