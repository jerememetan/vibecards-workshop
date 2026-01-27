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
        justifyContent: 'center',
        alignItems: 'center',
        maxWidth: '1200px',
        width: '100%',
        margin: '0 auto',
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '800',
          color: '#fff',
          letterSpacing: '-0.02em',
        }}>🎮 Game Hub</h1>
      </header>

      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}>
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
              Play Classic Games
            </h2>
            <p style={{
              fontSize: '1.25rem',
              marginBottom: '2.5rem',
              opacity: 0.95,
              lineHeight: '1.6',
            }}>
              Enjoy Flappy Bird and Snake - two classic games with modern twists!
            </p>
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
              🎮 Choose Your Game
            </h3>
            <GameButtons />
            <FlappyBirdGame />
          </div>
        </div>
      </main>
    </div>
  );
}
