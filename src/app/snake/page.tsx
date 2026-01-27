import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import SnakeGame from '@/components/snake-game';

export default function SnakePage() {
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
        <div style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
        }}>
          <Link href="/" style={{
            padding: '0.5rem 1rem',
            textDecoration: 'none',
            color: '#fff',
            opacity: 0.8,
            fontSize: '0.875rem',
          }}>
            Home
          </Link>
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
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        maxWidth: '1200px',
        width: '100%',
        margin: '0 auto',
      }}>
        <SignedOut>
          <div style={{
            textAlign: 'center',
            color: '#fff',
            padding: '3rem',
          }}>
            <h2 style={{
              fontSize: '2rem',
              fontWeight: '700',
              marginBottom: '1rem',
            }}>
              Sign in to play Snake!
            </h2>
            <p style={{
              fontSize: '1.125rem',
              opacity: 0.8,
              marginBottom: '2rem',
            }}>
              Create an account or sign in to enjoy the Snake game.
            </p>
            <SignInButton mode="modal">
              <button style={{
                padding: '0.75rem 2rem',
                background: '#fff',
                color: '#667eea',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
              }}>
                Sign In
              </button>
            </SignInButton>
          </div>
        </SignedOut>

        <SignedIn>
          <div style={{
            textAlign: 'center',
            color: '#fff',
          }}>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              marginBottom: '1rem',
            }}>
              🐍 Play Snake!
            </h3>
            <SnakeGame />
          </div>
        </SignedIn>
      </main>
    </div>
  );
}
