'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Pipe {
  x: number;
  topHeight: number;
  bottomHeight: number;
  gap: number;
  passed: boolean;
}

type PowerupType = 'shield' | 'clone';

interface Powerup {
  x: number;
  y: number;
  type: PowerupType;
  width: number;
  height: number;
  collected: boolean;
}

interface Clone {
  x: number;
  y: number;
  velocity: number;
  radius: number;
  offsetY: number; // Height offset from main bird
}

interface Coin {
  x: number;
  y: number;
  radius: number;
  collected: boolean;
  rotation: number;
}

type BirdColor = 'default' | 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'pink';

interface Cosmetic {
  id: string;
  name: string;
  color: BirdColor;
  price: number;
  unlocked: boolean;
}

export default function FlappyBirdGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [gold, setGold] = useState(0);
  const [showShop, setShowShop] = useState(false);
  const [selectedColor, setSelectedColor] = useState<BirdColor>('default');

  const birdRef = useRef({
    x: 100,
    y: 250,
    velocity: 0,
    radius: 15,
  });

  const pipesRef = useRef<Pipe[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const gameSpeedRef = useRef(2);

  // Powerup state
  const powerupsRef = useRef<Powerup[]>([]);
  const hasShieldRef = useRef<boolean>(false);
  const clonesRef = useRef<Clone[]>([]);
  const powerupSpawnTimerRef = useRef<number>(0);

  // Coin state
  const coinsRef = useRef<Coin[]>([]);

  const canvasWidth = 400;
  const canvasHeight = 600;
  const gravity = 0.5;
  const jumpStrength = -8;
  const pipeWidth = 60;
  const pipeGap = 150;
  const minPipeDistance = 250; // Minimum distance between pipes (in pixels)
  
  // Powerup constants
  const powerupWidth = 30;
  const powerupHeight = 30;
  const powerupSpawnInterval = 400; // frames
  const powerupMinDistance = 300; // pixels from last powerup
  const cloneOffsetY = 40; // pixels offset for clones
  const shieldRadius = 25; // visual shield size

  // Coin constants
  const coinRadius = 12;
  const coinValue = 1;

  // Cosmetics - using state to track unlocked items
  const [cosmetics, setCosmetics] = useState<Cosmetic[]>([
    { id: 'default', name: 'Default', color: 'default', price: 0, unlocked: true },
    { id: 'red', name: 'Red Bird', color: 'red', price: 10, unlocked: false },
    { id: 'blue', name: 'Blue Bird', color: 'blue', price: 15, unlocked: false },
    { id: 'green', name: 'Green Bird', color: 'green', price: 20, unlocked: false },
    { id: 'yellow', name: 'Yellow Bird', color: 'yellow', price: 25, unlocked: false },
    { id: 'purple', name: 'Purple Bird', color: 'purple', price: 30, unlocked: false },
    { id: 'orange', name: 'Orange Bird', color: 'orange', price: 35, unlocked: false },
    { id: 'pink', name: 'Pink Bird', color: 'pink', price: 40, unlocked: false },
  ]);

  // Load saved data from localStorage
  useEffect(() => {
    const savedGold = localStorage.getItem('flappyBirdGold');
    const savedColor = localStorage.getItem('flappyBirdColor') as BirdColor;
    const savedCosmetics = localStorage.getItem('flappyBirdCosmetics');
    
    if (savedGold) setGold(parseInt(savedGold, 10));
    if (savedColor) setSelectedColor(savedColor);
    if (savedCosmetics) {
      const unlocked = JSON.parse(savedCosmetics);
      setCosmetics(prev => prev.map(cosmetic => ({
        ...cosmetic,
        unlocked: unlocked.includes(cosmetic.id) || cosmetic.id === 'default'
      })));
    }
  }, []);

  // Save gold to localStorage
  useEffect(() => {
    localStorage.setItem('flappyBirdGold', gold.toString());
  }, [gold]);

  // Save selected color to localStorage
  useEffect(() => {
    localStorage.setItem('flappyBirdColor', selectedColor);
  }, [selectedColor]);

  // Initialize game
  const initGame = useCallback(() => {
    birdRef.current = {
      x: 100,
      y: canvasHeight / 2,
      velocity: 0,
      radius: 15,
    };
    pipesRef.current = [];
    powerupsRef.current = [];
    coinsRef.current = [];
    hasShieldRef.current = false;
    clonesRef.current = [];
    powerupSpawnTimerRef.current = 0;
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

  // Create new powerup
  const createPowerup = useCallback(() => {
    const types: PowerupType[] = ['shield', 'clone'];
    const type = types[Math.floor(Math.random() * types.length)];
    const y = Math.random() * (canvasHeight - 100) + 50; // Random Y, avoiding edges
    
    powerupsRef.current.push({
      x: canvasWidth,
      y,
      type,
      width: powerupWidth,
      height: powerupHeight,
      collected: false,
    });
  }, []);

  // Create coin in pipe gap
  const createCoin = useCallback((pipe: Pipe) => {
    const gapCenterY = pipe.topHeight + pipe.gap / 2;
    coinsRef.current.push({
      x: pipe.x + pipeWidth / 2,
      y: gapCenterY,
      radius: coinRadius,
      collected: false,
      rotation: 0,
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
    // Also jump all clones
    clonesRef.current.forEach((clone) => {
      clone.velocity = jumpStrength;
    });
  }, [gameStarted, gameOver, initGame]);

  // Buy cosmetic
  const buyCosmetic = useCallback((cosmetic: Cosmetic) => {
    if (gold >= cosmetic.price && !cosmetic.unlocked) {
      setGold((prev) => {
        const newGold = prev - cosmetic.price;
        localStorage.setItem('flappyBirdGold', newGold.toString());
        return newGold;
      });
      setCosmetics(prev => {
        const updated = prev.map(c => 
          c.id === cosmetic.id ? { ...c, unlocked: true } : c
        );
        const unlocked = updated.filter(c => c.unlocked).map(c => c.id);
        localStorage.setItem('flappyBirdCosmetics', JSON.stringify(unlocked));
        return updated;
      });
    }
  }, [gold]);

  // Equip cosmetic
  const equipCosmetic = useCallback((cosmetic: Cosmetic) => {
    if (cosmetic.unlocked) {
      setSelectedColor(cosmetic.color);
    }
  }, []);

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
        const minHeight = 50;
        const maxHeight = canvasHeight - pipeGap - minHeight;
        const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
        
        const newPipe: Pipe = {
          x: canvasWidth,
          topHeight,
          bottomHeight: canvasHeight - topHeight - pipeGap,
          gap: pipeGap,
          passed: false,
        };
        pipesRef.current.push(newPipe);
        
        // Spawn coin in the gap (70% chance)
        if (Math.random() > 0.3) {
          createCoin(newPipe);
        }
      }

      // Spawn powerups
      powerupSpawnTimerRef.current += 1;
      const lastPowerup = powerupsRef.current[powerupsRef.current.length - 1];
      if (
        powerupSpawnTimerRef.current >= powerupSpawnInterval &&
        (!lastPowerup || (canvasWidth - lastPowerup.x) >= powerupMinDistance)
      ) {
        createPowerup();
        powerupSpawnTimerRef.current = 0;
      }

      // Update and draw pipes
      let collidedPipe: Pipe | null = null;
      pipesRef.current = pipesRef.current.filter((pipe) => {
        pipe.x -= gameSpeedRef.current;
        
        // Remove pipes that are off screen
        if (pipe.x + pipeWidth < 0) {
          return false;
        }

        // Check collision with main bird
        if (
          birdRef.current.x + birdRef.current.radius > pipe.x &&
          birdRef.current.x - birdRef.current.radius < pipe.x + pipeWidth
        ) {
          if (
            birdRef.current.y - birdRef.current.radius < pipe.topHeight ||
            birdRef.current.y + birdRef.current.radius > canvasHeight - pipe.bottomHeight
          ) {
            // Check if shield is active
            if (hasShieldRef.current) {
              hasShieldRef.current = false;
              collidedPipe = pipe;
              // Don't set gameOver, just remove the pipe
            } else {
              setGameOver(true);
              if (score > highScore) {
                setHighScore(score);
              }
            }
          }
        }

        // Check collision with clones
        clonesRef.current = clonesRef.current.filter((clone) => {
          if (
            clone.x + clone.radius > pipe.x &&
            clone.x - clone.radius < pipe.x + pipeWidth
          ) {
            if (
              clone.y - clone.radius < pipe.topHeight ||
              clone.y + clone.radius > canvasHeight - pipe.bottomHeight
            ) {
              return false; // Remove clone on collision
            }
          }
          return true;
        });

        // Score
        if (!pipe.passed && pipe.x + pipeWidth < birdRef.current.x) {
          pipe.passed = true;
          setScore((prev) => prev + 1);
          gameSpeedRef.current += 0.1;
        }

        // Remove collided pipe if shield was used
        if (collidedPipe === pipe) {
          return false;
        }

        return pipe.x + pipeWidth > 0;
      });

      // Update powerups
      powerupsRef.current = powerupsRef.current.filter((powerup) => {
        powerup.x -= gameSpeedRef.current;
        
        // Check collision with bird
        const distance = Math.sqrt(
          Math.pow(birdRef.current.x - (powerup.x + powerup.width / 2), 2) +
          Math.pow(birdRef.current.y - (powerup.y + powerup.height / 2), 2)
        );
        
        if (distance < birdRef.current.radius + powerup.width / 2 && !powerup.collected) {
          powerup.collected = true;
          
          if (powerup.type === 'shield') {
            hasShieldRef.current = true;
          } else if (powerup.type === 'clone') {
            // Create 2 clones
            clonesRef.current.push({
              x: birdRef.current.x,
              y: birdRef.current.y - cloneOffsetY,
              velocity: birdRef.current.velocity,
              radius: birdRef.current.radius,
              offsetY: -cloneOffsetY,
            });
            clonesRef.current.push({
              x: birdRef.current.x,
              y: birdRef.current.y + cloneOffsetY,
              velocity: birdRef.current.velocity,
              radius: birdRef.current.radius,
              offsetY: cloneOffsetY,
            });
          }
        }
        
        // Remove collected or off-screen powerups
        if (powerup.collected || powerup.x + powerup.width < 0) {
          return false;
        }
        
        return true;
      });

      // Update clones
      clonesRef.current = clonesRef.current.filter((clone) => {
        clone.velocity += gravity;
        clone.y += clone.velocity;
        clone.x = birdRef.current.x; // Keep same X as main bird
        
        // Check boundaries
        if (clone.y < clone.radius) {
          clone.y = clone.radius;
          clone.velocity = 0;
        }
        if (clone.y > canvasHeight - clone.radius) {
          return false; // Remove clone if hits bottom
        }
        
        return true;
      });

      // Update coins
      coinsRef.current = coinsRef.current.filter((coin) => {
        coin.x -= gameSpeedRef.current;
        coin.rotation += 0.1; // Rotate coin
        
        // Check collision with bird
        if (!coin.collected) {
          const distance = Math.sqrt(
            Math.pow(birdRef.current.x - coin.x, 2) +
            Math.pow(birdRef.current.y - coin.y, 2)
          );
          
          if (distance < birdRef.current.radius + coin.radius) {
            coin.collected = true;
            setGold((prev) => {
              const newGold = prev + coinValue;
              localStorage.setItem('flappyBirdGold', newGold.toString());
              return newGold;
            });
          }
        }
        
        // Remove collected or off-screen coins
        if (coin.collected || coin.x + coin.radius < 0) {
          return false;
        }
        
        return true;
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

      // Draw coins
      coinsRef.current.forEach((coin) => {
        ctx.save();
        ctx.translate(coin.x, coin.y);
        ctx.rotate(coin.rotation);
        
        // Draw coin (golden circle)
        const coinGradient = ctx.createRadialGradient(-3, -3, 0, 0, 0, coin.radius);
        coinGradient.addColorStop(0, '#FFD700');
        coinGradient.addColorStop(0.5, '#FFA500');
        coinGradient.addColorStop(1, '#FF8C00');
        ctx.fillStyle = coinGradient;
        ctx.beginPath();
        ctx.arc(0, 0, coin.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Coin border
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Coin shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(-3, -3, coin.radius / 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      });

      // Draw powerups
      powerupsRef.current.forEach((powerup) => {
        const pulse = Math.sin(Date.now() / 200) * 0.2 + 0.8; // Pulsing animation
        
        ctx.save();
        ctx.translate(powerup.x + powerup.width / 2, powerup.y + powerup.height / 2);
        ctx.scale(pulse, pulse);
        
        if (powerup.type === 'shield') {
          // Draw shield icon (circle with border)
          ctx.strokeStyle = 'rgba(100, 200, 255, 0.9)';
          ctx.fillStyle = 'rgba(100, 200, 255, 0.3)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, powerup.width / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          // Draw shield symbol (star shape)
          ctx.strokeStyle = 'rgba(100, 200, 255, 1)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const radius = i % 2 === 0 ? powerup.width / 3 : powerup.width / 6;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();
        } else if (powerup.type === 'clone') {
          // Draw clone icon (multiple bird silhouettes)
          ctx.fillStyle = 'rgba(200, 100, 255, 0.9)';
          ctx.strokeStyle = 'rgba(200, 100, 255, 1)';
          ctx.lineWidth = 2;
          
          // Draw 3 overlapping circles
          for (let i = 0; i < 3; i++) {
            const offsetX = (i - 1) * 6;
            ctx.beginPath();
            ctx.arc(offsetX, 0, powerup.width / 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        }
        
        ctx.restore();
      });

      // Draw shield if active
      if (hasShieldRef.current) {
        ctx.save();
        ctx.translate(birdRef.current.x, birdRef.current.y);
        
        // Draw shield glow effect
        const shieldGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, shieldRadius);
        shieldGradient.addColorStop(0, 'rgba(100, 200, 255, 0.4)');
        shieldGradient.addColorStop(0.5, 'rgba(100, 200, 255, 0.2)');
        shieldGradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
        ctx.fillStyle = shieldGradient;
        ctx.beginPath();
        ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw shield border
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
      }

      // Draw clones
      clonesRef.current.forEach((clone) => {
        ctx.save();
        ctx.globalAlpha = 0.75; // Slightly transparent
        ctx.translate(clone.x, clone.y);
        ctx.rotate(Math.min(clone.velocity * 0.1, 0.5));

        // Clone body (circle)
        const cloneGradient = ctx.createRadialGradient(-5, -5, 0, 0, 0, clone.radius);
        cloneGradient.addColorStop(0, '#fff');
        cloneGradient.addColorStop(1, '#f0f0f0');
        ctx.fillStyle = cloneGradient;
        ctx.beginPath();
        ctx.arc(0, 0, clone.radius, 0, Math.PI * 2);
        ctx.fill();

        // Clone eye
        ctx.fillStyle = '#764ba2'; // Different color to distinguish
        ctx.beginPath();
        ctx.arc(5, -3, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // Get bird color based on selected cosmetic
      const getBirdColor = (color: BirdColor) => {
        const colors: Record<BirdColor, { light: string; dark: string; eye: string }> = {
          default: { light: '#fff', dark: '#f0f0f0', eye: '#667eea' },
          red: { light: '#ff6b6b', dark: '#ee5a5a', eye: '#8b0000' },
          blue: { light: '#4ecdc4', dark: '#45b7b8', eye: '#003366' },
          green: { light: '#51cf66', dark: '#40c057', eye: '#004d00' },
          yellow: { light: '#ffd93d', dark: '#f6c23e', eye: '#cc9900' },
          purple: { light: '#a78bfa', dark: '#8b5cf6', eye: '#4c1d95' },
          orange: { light: '#ff8c42', dark: '#ff7b35', eye: '#cc5500' },
          pink: { light: '#ff9ff3', dark: '#f368e0', eye: '#8b0066' },
        };
        return colors[color];
      };

      // Draw bird
      ctx.save();
      ctx.translate(birdRef.current.x, birdRef.current.y);
      ctx.rotate(Math.min(birdRef.current.velocity * 0.1, 0.5));

      const birdColor = getBirdColor(selectedColor);
      
      // Bird body (circle)
      const birdGradient = ctx.createRadialGradient(-5, -5, 0, 0, 0, birdRef.current.radius);
      birdGradient.addColorStop(0, birdColor.light);
      birdGradient.addColorStop(1, birdColor.dark);
      ctx.fillStyle = birdGradient;
      ctx.beginPath();
      ctx.arc(0, 0, birdRef.current.radius, 0, Math.PI * 2);
      ctx.fill();

      // Bird eye
      ctx.fillStyle = birdColor.eye;
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
  }, [gameStarted, gameOver, score, highScore, createPipe, createPowerup, createCoin, selectedColor]);

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
          <>
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
            {/* Gold display */}
            <div style={{
              position: 'absolute',
              top: '1rem',
              left: '1rem',
              background: 'rgba(255, 215, 0, 0.3)',
              backdropFilter: 'blur(10px)',
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              color: '#fff',
              fontWeight: '700',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              🪙 {gold}
            </div>
            {/* Shield indicator */}
            {hasShieldRef.current && (
              <div style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'rgba(100, 200, 255, 0.3)',
                backdropFilter: 'blur(10px)',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                color: '#fff',
                fontWeight: '700',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                🛡️ Shield
              </div>
            )}
          </>
        )}
      </div>

      <div style={{
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
      }}>
        <p style={{
          color: '#fff',
          fontSize: '0.875rem',
          opacity: 0.8,
          textAlign: 'center',
          maxWidth: '400px',
        }}>
          Click or press SPACE to make the bird fly. Avoid the pipes!
        </p>
        <button
          onClick={() => setShowShop(true)}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'rgba(255, 215, 0, 0.3)',
            border: '2px solid rgba(255, 215, 0, 0.5)',
            borderRadius: '12px',
            color: '#fff',
            fontWeight: '700',
            fontSize: '0.875rem',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 215, 0, 0.5)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 215, 0, 0.3)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          🛒 Shop
        </button>
      </div>

      {/* Shop Modal */}
      {showShop && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }} onClick={() => setShowShop(false)}>
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '20px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '800',
                color: '#fff',
                margin: 0,
              }}>
                🛒 Shop
              </h2>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(255, 215, 0, 0.3)',
                padding: '0.5rem 1rem',
                borderRadius: '12px',
                color: '#fff',
                fontWeight: '700',
              }}>
                🪙 {gold}
              </div>
              <button
                onClick={() => setShowShop(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  color: '#fff',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>

            <div style={{
              display: 'grid',
              gap: '1rem',
            }}>
              {cosmetics.map((cosmetic) => {
                const isSelected = selectedColor === cosmetic.color;
                const canAfford = gold >= cosmetic.price;
                const isUnlocked = cosmetic.unlocked;

                const getColorPreview = (color: BirdColor) => {
                  const colors: Record<BirdColor, string> = {
                    default: '#fff',
                    red: '#ff6b6b',
                    blue: '#4ecdc4',
                    green: '#51cf66',
                    yellow: '#ffd93d',
                    purple: '#a78bfa',
                    orange: '#ff8c42',
                    pink: '#ff9ff3',
                  };
                  return colors[color];
                };

                return (
                  <div
                    key={cosmetic.id}
                    style={{
                      background: isSelected 
                        ? 'rgba(255, 255, 255, 0.3)' 
                        : 'rgba(255, 255, 255, 0.1)',
                      border: isSelected 
                        ? '2px solid rgba(255, 255, 255, 0.8)' 
                        : '2px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '12px',
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: getColorPreview(cosmetic.color),
                        border: '2px solid rgba(255, 255, 255, 0.5)',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                      }} />
                      <div>
                        <div style={{
                          color: '#fff',
                          fontWeight: '700',
                          fontSize: '1rem',
                        }}>
                          {cosmetic.name}
                        </div>
                        {isUnlocked ? (
                          <div style={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontSize: '0.875rem',
                          }}>
                            {isSelected ? '✓ Equipped' : 'Unlocked'}
                          </div>
                        ) : (
                          <div style={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontSize: '0.875rem',
                          }}>
                            🪙 {cosmetic.price} coins
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: '0.5rem',
                    }}>
                      {isUnlocked ? (
                        <button
                          onClick={() => equipCosmetic(cosmetic)}
                          disabled={isSelected}
                          style={{
                            padding: '0.5rem 1rem',
                            background: isSelected 
                              ? 'rgba(255, 255, 255, 0.2)' 
                              : 'rgba(255, 255, 255, 0.3)',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#fff',
                            fontWeight: '700',
                            fontSize: '0.875rem',
                            cursor: isSelected ? 'not-allowed' : 'pointer',
                            opacity: isSelected ? 0.5 : 1,
                          }}
                        >
                          {isSelected ? 'Equipped' : 'Equip'}
                        </button>
                      ) : (
                        <button
                          onClick={() => buyCosmetic(cosmetic)}
                          disabled={!canAfford}
                          style={{
                            padding: '0.5rem 1rem',
                            background: canAfford 
                              ? 'rgba(255, 215, 0, 0.5)' 
                              : 'rgba(255, 255, 255, 0.2)',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#fff',
                            fontWeight: '700',
                            fontSize: '0.875rem',
                            cursor: canAfford ? 'pointer' : 'not-allowed',
                            opacity: canAfford ? 1 : 0.5,
                          }}
                        >
                          Buy
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
