import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import FlappyBirdGame from '@/components/flappy-bird-game';
import GameButtons from '@/components/game-buttons';

export default function Home() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      zIndex: 1,
    }}>
      <header style={{
        padding: '1.5rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: '1200px',
        width: '100%',
        margin: '0 auto',
      }}>
        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: '700',
          color: '#fff',
          letterSpacing: '-0.02em',
        }}>VibeCards</h1>
        <div>
          <SignedOut>
            <SignInButton mode="modal">
              Sign In
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
      </header>

      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}>
        <SignedOut>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3rem',
            maxWidth: '1200px',
            width: '100%',
          }}>
            <div style={{
              textAlign: 'center',
              color: '#fff',
            }}>
              <h2 style={{
                fontSize: '3.5rem',
                fontWeight: '800',
                marginBottom: '1.5rem',
                lineHeight: '1.1',
                letterSpacing: '-0.03em',
              }}>
                AI-Powered<br />Flashcards
              </h2>
              <p style={{
                fontSize: '1.25rem',
                marginBottom: '2.5rem',
                opacity: 0.95,
                lineHeight: '1.6',
              }}>
                Transform any topic into a beautiful deck of flashcards. 
                Powered by AI to help you learn faster and smarter.
              </p>
              <SignInButton mode="modal">
                Get Started Free
              </SignInButton>
            </div>
            
            <div style={{
              textAlign: 'center',
              color: '#fff',
              width: '100%',
            }}>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                marginBottom: '1.5rem',
              }}>
                🎮 Play Games!
              </h3>
              <GameButtons />
              <FlappyBirdGame />
            </div>
          </div>
        </SignedOut>

        <SignedIn>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3rem',
            maxWidth: '1200px',
            width: '100%',
          }}>
            <div style={{
              textAlign: 'center',
              color: '#fff',
            }}>
              <h2 style={{
                fontSize: '3rem',
                fontWeight: '800',
                marginBottom: '1.5rem',
                lineHeight: '1.1',
                letterSpacing: '-0.03em',
              }}>
                Welcome back!
              </h2>
              <p style={{
                fontSize: '1.25rem',
                marginBottom: '2rem',
                opacity: '0.95',
                lineHeight: '1.6',
              }}>
                Ready to create your next flashcard deck? 
                Start learning something new today.
              </p>
              <Link 
                href="/dashboard" 
                className="dashboard-link"
                style={{
                  padding: '1rem 2.5rem',
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  backgroundColor: '#fff',
                  color: '#667eea',
                  textDecoration: 'none',
                  borderRadius: '12px',
                  display: 'inline-block',
                  boxShadow: '0 4px 14px 0 rgba(0, 0, 0, 0.15)',
                  transition: 'all 0.2s',
                }}
              >
                Go to Dashboard
              </Link>
            </div>

            <div style={{
              textAlign: 'center',
              color: '#fff',
              width: '100%',
            }}>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                marginBottom: '1.5rem',
              }}>
                🎮 Play Games!
              </h3>
              <GameButtons />
              <FlappyBirdGame />
            </div>
          </div>
        </SignedIn>
      </main>
    </div>
  );
}
