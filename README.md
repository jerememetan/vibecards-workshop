# VibeCards - AI-Powered Flashcards App

VibeCards is an authenticated web application that generates flashcards from topics using OpenAI's Responses API with structured outputs. Built with Next.js, Clerk authentication, Supabase, and deployed on Vercel.

## Features

- 🔐 User authentication with Clerk
- 🤖 AI-powered flashcard generation using OpenAI GPT-5.2
- 📚 Deck management with Supabase
- 🎯 Structured outputs ensuring consistent card format
- 🔒 Secure user data isolation (users can only see their own decks)

## Tech Stack

- **Framework**: Next.js 16.1.1 (App Router)
- **Language**: TypeScript
- **Authentication**: Clerk
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI Responses API with Structured Outputs
- **Schema Validation**: Zod
- **Deployment**: Vercel

## Prerequisites

- Node.js 18+ and npm
- Clerk account ([sign up](https://clerk.com))
- Supabase account ([sign up](https://supabase.com))
- OpenAI API key ([get one](https://platform.openai.com))

## Setup Instructions

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd vibecards-workshop
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required environment variables:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI
OPENAI_API_KEY=sk-...
```

#### Getting Your Keys

**Clerk:**
1. Create a new application at [clerk.com](https://clerk.com)
2. Copy the Publishable Key and Secret Key from the dashboard

**Supabase:**
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API
3. Copy the Project URL, `anon` public key, and `service_role` secret key

**OpenAI:**
1. Go to [platform.openai.com](https://platform.openai.com)
2. Navigate to API Keys section
3. Create a new secret key

### 3. Database Setup

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Run the schema from `supabase/schema.sql`:

```sql
-- Create decks table
CREATE TABLE IF NOT EXISTS decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  cards JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_decks_owner_id ON decks(owner_id);
CREATE INDEX IF NOT EXISTS idx_decks_created_at ON decks(created_at DESC);
```

4. (Optional) For additional security, run `supabase/level2-rls.sql` to enable Row Level Security policies

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
vibecards-workshop/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── generate-deck/     # API endpoint for deck generation
│   │   ├── dashboard/              # Protected dashboard page
│   │   ├── deck/
│   │   │   └── [id]/               # Deck detail page
│   │   ├── sign-in/                # Clerk sign-in page
│   │   ├── sign-up/                # Clerk sign-up page
│   │   ├── layout.tsx              # Root layout with ClerkProvider
│   │   └── page.tsx                # Home page
│   ├── components/
│   │   └── providers.tsx           # ClerkProvider wrapper
│   └── lib/
│       ├── supabase.ts             # Supabase client utilities
│       └── types.ts                # Zod schemas and TypeScript types
├── supabase/
│   ├── schema.sql                  # Database schema
│   └── level2-rls.sql              # Optional RLS policies
├── middleware.ts                   # Clerk authentication middleware
└── .env.example                    # Environment variables template
```

## Usage

1. **Sign Up/In**: Create an account or sign in with Clerk
2. **Generate Deck**: Go to Dashboard and enter a topic (e.g., "Photosynthesis", "World War II")
3. **View Deck**: Click on any deck to see all flashcards
4. **Study**: Use the flashcards to study the topic

## API Endpoints

### `POST /api/generate-deck`

Generates a new flashcard deck from a topic.

**Request:**
```json
{
  "topic": "Photosynthesis process"
}
```

**Response:**
```json
{
  "deckId": "uuid-here"
}
```

**Guardrails:**
- Topic must be 1-500 characters
- Generates 8-12 cards per deck
- Max output tokens: 2000

## Deployment on Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository
4. Add all environment variables from your `.env.local`:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
5. Click "Deploy"

### 3. Configure Clerk for Production

1. In Clerk dashboard, add your Vercel deployment URL to allowed origins
2. Update redirect URLs if needed

### 4. Verify Deployment

Once deployed, visit your Vercel URL and test:
- Sign up/in flow
- Deck generation
- Deck viewing

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Security Notes

- All protected routes are secured by Clerk middleware
- Dashboard queries filter by `owner_id` to prevent cross-user access
- API endpoints verify authentication before processing
- Deck detail pages verify ownership before display
- Service role key is only used server-side (never exposed to client)

## Troubleshooting

**Build errors:**
- Ensure all environment variables are set
- Check that Supabase schema is applied
- Verify Clerk keys are correct

**Deck generation fails:**
- Check OpenAI API key is valid
- Verify you have API credits
- Check topic length (max 500 chars)

**Authentication issues:**
- Verify Clerk keys in `.env.local`
- Check Clerk dashboard for allowed origins
- Ensure middleware.ts is in the root directory

## License

MIT
