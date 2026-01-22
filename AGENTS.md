# VibeCards - Architecture & Implementation Guide

This document provides detailed information about the VibeCards architecture, implementation decisions, and data flow for AI agents and developers.

## Architecture Overview

VibeCards is built as a server-rendered Next.js application with the following key components:

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│      Next.js App Router         │
│  ┌───────────────────────────┐  │
│  │   Clerk Middleware        │  │  ← Authentication
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │   Route Handlers          │  │  ← Pages & API Routes
│  └───────────────────────────┘  │
└──────┬──────────────────┬───────┘
       │                  │
       ▼                  ▼
┌─────────────┐    ┌──────────────┐
│   Clerk     │    │   Supabase   │
│  (Auth)     │    │  (Database)  │
└─────────────┘    └──────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   OpenAI     │
                   │  (AI API)    │
                   └──────────────┘
```

## Data Flow

### Deck Generation Flow

1. **User Input**: User enters topic in dashboard form
2. **Client Request**: Form submits POST to `/api/generate-deck`
3. **Authentication**: Middleware verifies Clerk session
4. **Validation**: API validates topic (length, format)
5. **AI Generation**: 
   - Instantiate OpenAI client
   - Call `responses.parse()` with Zod schema
   - Model: `gpt-5.2`
   - Format: `zodTextFormat` for structured outputs
6. **Database Save**: Store deck in Supabase with `owner_id`
7. **Response**: Return `deckId` to client
8. **Redirect**: Client navigates to deck detail page

### Deck Retrieval Flow

1. **User Request**: Navigate to `/dashboard` or `/deck/[id]`
2. **Authentication**: Middleware verifies Clerk session
3. **Database Query**: 
   - Fetch decks filtered by `owner_id = userId`
   - Use service role key for server-side operations
4. **Render**: Server renders page with user's decks
5. **Display**: Client receives HTML with deck data

## Key Implementation Decisions

### 1. Authentication: Clerk

**Why Clerk?**
- Managed authentication service
- Easy Next.js integration
- Built-in user management
- Secure session handling

**Implementation:**
- `middleware.ts` protects routes using `clerkMiddleware`
- `Providers` component wraps app with `ClerkProvider`
- Server-side auth via `auth()` from `@clerk/nextjs/server`
- Client-side auth via `SignedIn`/`SignedOut` components

### 2. Database: Supabase

**Why Supabase?**
- PostgreSQL with real-time capabilities
- Easy REST API and client libraries
- Row Level Security (RLS) support
- Free tier for development

**Implementation:**
- Service role key for server-side operations (bypasses RLS)
- Anon key for client-side (if needed in future)
- All queries filter by `owner_id` for security
- JSONB column for flexible card storage

**Schema:**
```sql
decks (
  id UUID PRIMARY KEY,
  owner_id TEXT NOT NULL,  -- Clerk userId
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  cards JSONB NOT NULL,     -- Array of {front, back}
  created_at TIMESTAMPTZ
)
```

### 3. AI: OpenAI Responses API

**Why Responses API?**
- New unified endpoint for model interactions
- Built-in structured outputs support
- Better for agentic workflows
- Supports GPT-5.2 model

**Implementation:**
- Use `openai.responses.parse()` instead of `chat.completions.create()`
- Zod schema with `zodTextFormat` helper
- Structured outputs ensure consistent format
- No need for prompt engineering to enforce structure

**Schema:**
```typescript
deckSchema = z.object({
  title: z.string().min(1).max(200),
  topic: z.string().min(1).max(500),
  cards: z.array(cardSchema).min(8).max(12),
});

cardSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
});
```

### 4. Next.js 16 Compatibility

**Key Considerations:**
- Use `'use client'` for ClerkProvider wrapper (client component)
- Add `export const dynamic = 'force-dynamic'` to auth-dependent pages
- Instantiate OpenAI client inside route handlers (not module level)
- Use `async` params in dynamic routes: `params: Promise<{ id: string }>`

## Security Model

### Authentication
- All protected routes verified by Clerk middleware
- API routes check `auth().userId` before processing
- Unauthenticated users redirected to sign-in

### Authorization
- Dashboard queries filter by `owner_id = userId`
- Deck detail pages verify ownership before display
- API endpoints only save decks with authenticated user's `owner_id`

### Data Isolation
- Service role key used server-side only (never exposed)
- Client never receives other users' deck data
- Database queries always include `owner_id` filter

### Input Validation
- Topic length: 1-500 characters
- Zod schema validation on AI output
- TypeScript types for type safety

## File Structure Details

### `/src/app/api/generate-deck/route.ts`
- Protected POST endpoint
- Validates topic input
- Calls OpenAI Responses API
- Saves to Supabase
- Returns deckId

### `/src/app/dashboard/page.tsx`
- Server component
- Fetches user's decks
- Renders deck list
- Includes generate form

### `/src/app/dashboard/generate-deck-form.tsx`
- Client component (needs interactivity)
- Handles form submission
- Calls API endpoint
- Redirects to deck detail

### `/src/app/deck/[id]/page.tsx`
- Server component
- Fetches deck by ID
- Verifies ownership
- Renders flashcards

### `/src/lib/supabase.ts`
- Exports client instances
- `createServerClient()` uses service role key
- `supabase` uses anon key (for future client-side use)

### `/src/lib/types.ts`
- Zod schemas for validation
- TypeScript types for type safety
- Shared across app and API

## Environment Variables

### Required
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Public Clerk key (safe to expose)
- `CLERK_SECRET_KEY`: Server-side Clerk key (never expose)
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key (safe to expose)
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role (never expose)
- `OPENAI_API_KEY`: OpenAI API key (never expose)

### Security Notes
- `NEXT_PUBLIC_*` variables are exposed to client
- Non-public variables are server-only
- Never commit `.env.local` to git
- Use Vercel environment variables for production

## API Contract

### POST /api/generate-deck

**Request:**
```typescript
{
  topic: string;  // 1-500 characters
}
```

**Response (Success):**
```typescript
{
  deckId: string;  // UUID
}
```

**Response (Error):**
```typescript
{
  error: string;
}
```

**Status Codes:**
- `200`: Success
- `400`: Bad request (invalid topic)
- `401`: Unauthorized (not authenticated)
- `500`: Server error

## Testing Checklist

1. **Authentication**
   - [ ] Sign up creates new user
   - [ ] Sign in works with existing user
   - [ ] Protected routes redirect when not authenticated
   - [ ] User button shows correct user info

2. **Deck Generation**
   - [ ] Form validates topic length
   - [ ] API generates deck with 8-12 cards
   - [ ] Deck saved to database with correct owner_id
   - [ ] Redirect to deck detail page works

3. **Dashboard**
   - [ ] Shows only current user's decks
   - [ ] Decks sorted by created_at (newest first)
   - [ ] Empty state shows when no decks
   - [ ] Links to deck detail pages work

4. **Deck Detail**
   - [ ] Shows all cards with front/back
   - [ ] Cannot access other users' decks
   - [ ] 404 for non-existent decks
   - [ ] Back to dashboard link works

5. **Security**
   - [ ] Users cannot see others' decks in dashboard
   - [ ] Direct URL access to others' decks returns 404
   - [ ] API rejects requests without authentication

## Future Enhancements

- Client-side deck editing
- Deck sharing (with permissions)
- Study mode with spaced repetition
- Export decks to PDF/Anki
- Rate limiting on API endpoint
- Caching for frequently accessed decks
- Analytics on deck generation

## Troubleshooting

### Common Issues

**"Missing Supabase environment variables"**
- Check `.env.local` has all Supabase keys
- Verify keys are correct in Supabase dashboard

**"Missing OPENAI_API_KEY"**
- Add OpenAI API key to `.env.local`
- Verify key is valid and has credits

**"Unauthorized" errors**
- Check Clerk keys are correct
- Verify user is signed in
- Check middleware.ts is protecting routes

**Deck generation fails**
- Check OpenAI API key has credits
- Verify topic is within length limits
- Check network connectivity

**Build errors**
- Ensure all dependencies installed: `npm install`
- Check TypeScript errors: `npm run build`
- Verify environment variables are set

## References

- [OpenAI Responses API Docs](https://platform.openai.com/docs/api-reference/responses)
- [Clerk Next.js Docs](https://clerk.com/docs/nextjs/getting-started/quickstart)
- [Supabase Next.js Docs](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Next.js App Router Docs](https://nextjs.org/docs/app)
