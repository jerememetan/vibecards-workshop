'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Pipe {
  x: number;
  topHeight: number;
  bottomHeight: number;
  gap: number;
  passed: boolean;
}

export default function FlappyBirdGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [highScore, setHighScore] = useState(0);

  const birdRef = useRef({
    x: 100,
    y: 250,
    velocity: 0,
    radius: 15,
  });

  const pipesRef = useRef<Pipe[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const gameSpeedRef = useRef(2);

  const canvasWidth = 400;
  const canvasHeight = 600;
  const gravity = 0.5;
  const jumpStrength = -8;
  const pipeWidth = 60;
  const pipeGap = 150;
  const minPipeDistance = 250; // Minimum distance between pipes (in pixels)

  // Initialize game
  const initGame = useCallback(() => {
    birdRef.current = {
      x: 100,
      y: canvasHeight / 2,
      velocity: 0,
      radius: 15,
    };
    pipesRef.current = [];
    gameSpeedRef.current = 2;
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
  }, []);

  // Create new pipe
  const createPipe = useCallback(() => {
    const minHeight = 50;
    const maxHeight = canvasHeight - pipeGap - minHeight;
    const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
    
    pipesRef.current.push({
      x: canvasWidth,
      topHeight,
      bottomHeight: canvasHeight - topHeight - pipeGap,
      gap: pipeGap,
      passed: false,
    });
  }, []);

  // Handle jump
  const handleJump = useCallback(() => {
    if (!gameStarted) {
      initGame();
      return;
    }
    if (gameOver) {
      initGame();
      return;
    }
    birdRef.current.velocity = jumpStrength;
  }, [gameStarted, gameOver, initGame]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      if (!gameStarted || gameOver) {
        animationFrameRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      // Clear canvas
      ctx.fillStyle = 'rgba(102, 126, 234, 0.1)';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Draw gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Update bird
      birdRef.current.velocity += gravity;
      birdRef.current.y += birdRef.current.velocity;

      // Bird boundaries
      if (birdRef.current.y < birdRef.current.radius) {
        birdRef.current.y = birdRef.current.radius;
        birdRef.current.velocity = 0;
      }
      if (birdRef.current.y > canvasHeight - birdRef.current.radius) {
        birdRef.current.y = canvasHeight - birdRef.current.radius;
        setGameOver(true);
        if (score > highScore) {
          setHighScore(score);
        }
      }

      // Create pipes - ensure they don't overlap by checking position
      const lastPipe = pipesRef.current[pipesRef.current.length - 1];
      
      // Only create a new pipe if there's no pipe, or the last pipe has moved far enough
      if (!lastPipe || (canvasWidth - lastPipe.x) >= minPipeDistance) {
        createPipe();
      }

      // Update and draw pipes
      pipesRef.current = pipesRef.current.filter((pipe) => {
        pipe.x -= gameSpeedRef.current;
        
        // Remove pipes that are off screen
        if (pipe.x + pipeWidth < 0) {
          return false;
        }

        // Check collision
        if (
          birdRef.current.x + birdRef.current.radius > pipe.x &&
          birdRef.current.x - birdRef.current.radius < pipe.x + pipeWidth
        ) {
          if (
            birdRef.current.y - birdRef.current.radius < pipe.topHeight ||
            birdRef.current.y + birdRef.current.radius > canvasHeight - pipe.bottomHeight
          ) {
            setGameOver(true);
            if (score > highScore) {
              setHighScore(score);
            }
          }
        }

        // Score
        if (!pipe.passed && pipe.x + pipeWidth < birdRef.current.x) {
          pipe.passed = true;
          setScore((prev) => prev + 1);
          gameSpeedRef.current += 0.1;
        }

        return pipe.x + pipeWidth > 0;
      });

      // Draw pipes
      pipesRef.current.forEach((pipe) => {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
        ctx.fillRect(
          pipe.x,
          canvasHeight - pipe.bottomHeight,
          pipeWidth,
          pipe.bottomHeight
        );

        // Pipe borders
        ctx.strokeStyle = 'rgba(102, 126, 234, 0.5)';
        ctx.lineWidth = 3;
        ctx.strokeRect(pipe.x, 0, pipeWidth, pipe.topHeight);
        ctx.strokeRect(
          pipe.x,
          canvasHeight - pipe.bottomHeight,
          pipeWidth,
          pipe.bottomHeight
        );
      });

      // Draw bird
      ctx.save();
      ctx.translate(birdRef.current.x, birdRef.current.y);
      ctx.rotate(Math.min(birdRef.current.velocity * 0.1, 0.5));

      // Bird body (circle)
      const birdGradient = ctx.createRadialGradient(-5, -5, 0, 0, 0, birdRef.current.radius);
      birdGradient.addColorStop(0, '#fff');
      birdGradient.addColorStop(1, '#f0f0f0');
      ctx.fillStyle = birdGradient;
      ctx.beginPath();
      ctx.arc(0, 0, birdRef.current.radius, 0, Math.PI * 2);
      ctx.fill();

      // Bird eye
      ctx.fillStyle = '#667eea';
      ctx.beginPath();
      ctx.arc(5, -3, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameStarted, gameOver, score, highScore, createPipe]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleJump();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleJump]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1rem',
    }}>
      <div style={{
        position: 'relative',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        border: '2px solid rgba(255, 255, 255, 0.2)',
      }}>
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          onClick={handleJump}
          style={{
            cursor: 'pointer',
            display: 'block',
          }}
        />
        
        {/* Game overlay */}
        {!gameStarted && !gameOver && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(102, 126, 234, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            textAlign: 'center',
            padding: '2rem',
          }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '1rem' }}>
              🐦 Flappy Cards
            </h3>
            <p style={{ marginBottom: '1.5rem', opacity: 0.9 }}>
              Click or press SPACE to fly!
            </p>
            <button
              onClick={initGame}
              style={{
                padding: '0.75rem 2rem',
                background: '#fff',
                color: '#667eea',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
              }}
            >
              Start Game
            </button>
          </div>
        )}

        {gameOver && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            textAlign: 'center',
            padding: '2rem',
          }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.5rem' }}>
              Game Over!
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
              Score: {score}
            </p>
            {highScore > 0 && (
              <p style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '1.5rem' }}>
                High Score: {highScore}
              </p>
            )}
            <button
              onClick={initGame}
              style={{
                padding: '0.75rem 2rem',
                background: '#fff',
                color: '#667eea',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
              }}
            >
              Play Again
            </button>
          </div>
        )}

        {/* Score display */}
        {gameStarted && !gameOver && (
          <div style={{
            position: 'absolute',
            top: '1rem',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            padding: '0.5rem 1.5rem',
            borderRadius: '20px',
            color: '#fff',
            fontWeight: '700',
            fontSize: '1.25rem',
          }}>
            {score}
          </div>
        )}
      </div>

      <p style={{
        color: '#fff',
        fontSize: '0.875rem',
        opacity: 0.8,
        textAlign: 'center',
        maxWidth: '400px',
      }}>
        Click or press SPACE to make the bird fly. Avoid the pipes!
      </p>
    </div>
  );
}
