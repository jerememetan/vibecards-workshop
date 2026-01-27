# Game Hub - Flappy Bird & Snake

A web platform featuring two classic games: Flappy Bird and Snake. Built with Next.js and deployed on Vercel.

## Features

- 🐦 **Flappy Bird** - Classic flapping game with powerups, coins, and cosmetics
- 🐍 **Snake** - Roguelike snake game with 20 levels, boss battles, and powerups
- 🎮 Both games feature:
  - High score tracking
  - Gold/currency system
  - Cosmetic customization
  - Progressive difficulty

## Tech Stack

- **Framework**: Next.js 16.1.1 (App Router)
- **Language**: TypeScript
- **Deployment**: Vercel

## Prerequisites

- Node.js 18+ and npm

## Setup Instructions

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd vibecards-workshop
npm install
```

### 2. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to play the games!

## Game Features

### Flappy Bird
- Classic flapping mechanics
- Powerups (Shield, Clone)
- Coin collection system
- Cosmetic customization
- High score tracking

### Snake
- 20 levels with increasing difficulty
- Boss battles at levels 10 and 20
- Roguelike progression system
- Permanent and temporary powerups
- Multiple bomb types (normal, red, T-bombs)
- Enemy snakes, walls, flashbangs
- Shield system
- Gold/currency for upgrades

## Deployment

The app is ready to deploy on Vercel:

1. Push your code to GitHub
2. Import the repository in Vercel
3. Deploy (no environment variables required for basic functionality)

## Project Structure

```
vibecards-workshop/
├── src/
│   ├── app/
│   │   ├── snake/              # Snake game page
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Home page with game selection
│   └── components/
│       ├── flappy-bird-game.tsx
│       ├── snake-game.tsx
│       └── game-buttons.tsx
└── package.json
```

## License

MIT
