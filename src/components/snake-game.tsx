'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type Direction = 'up' | 'down' | 'left' | 'right';

interface Position {
  x: number;
  y: number;
}

type SnakeColor = 'default' | 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'pink';

interface Cosmetic {
  id: string;
  name: string;
  color: SnakeColor;
  price: number;
  unlocked: boolean;
}

type BuffType = 'permanent' | 'temporary';

interface Buff {
  id: string;
  name: string;
  description: string;
  type: BuffType;
  price: number;
  icon: string;
    effect?: {
      extraShield?: number; // Permanent: extra shield charges per level
      bombImmunity?: boolean; // Permanent: immune to bomb explosions
      shield?: boolean; // Temporary: next hit doesn't kill
      slowTime?: number; // Temporary: duration in seconds
      doubleCoins?: number; // Temporary: duration in seconds
      clearBombs?: number; // Temporary: clear all bombs and disable spawning for X seconds
    };
}

interface ActiveBuff {
  id: string;
  type: BuffType;
  expiresAt?: number; // For temporary buffs
  effect: Buff['effect'];
}

interface Bomb {
  x: number;
  y: number;
  timer: number; // Time until explosion (in frames)
  exploded: boolean;
  isRed?: boolean; // Red bombs ignore bomb immunity and have 5x5 explosion
  isT?: boolean; // T bombs ignore bomb immunity and affect entire row and column
}

interface Wall {
  x: number;
  y: number;
}

interface Flashbang {
  x: number;
  y: number;
  timer: number; // Time until activation (in frames)
  activated: boolean;
}

interface EnemySnake {
  body: Position[];
  direction: Direction;
  nextDirection: Direction;
  moveTimer: number; // Frames until next move
  moveInterval: number; // Frames between moves
  color: string;
  pattern: 'horizontal' | 'vertical' | 'square'; // Movement pattern
  patternStep: number; // Current step in pattern
  turnCounter: number; // Counter for pattern turns
}

interface BossFood {
  x: number;
  y: number;
  id: string; // Unique ID for tracking
}

interface GiantBossSnake {
  body: Position[];
  direction: Direction;
  moveTimer: number;
  moveInterval: number;
  phase: 1 | 2 | 3; // Boss phase
  health: number; // Boss food eaten (0-5)
  maxHealth: number; // Total boss food needed (5)
  splitSnakes: EnemySnake[]; // Smaller snakes after phase 3 split
  patternStep?: number; // For phase 2 movement pattern
}

interface BombMasterBoss {
  x: number;
  y: number;
  spawnTimer: number;
  spawnInterval: number;
  active: boolean;
}

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [gold, setGold] = useState(0);
  const [showShop, setShowShop] = useState(false);
  const [selectedColor, setSelectedColor] = useState<SnakeColor>('default');
  const [gameSpeed, setGameSpeed] = useState(100); // milliseconds per move
  
  // Roguelike system
  const [level, setLevel] = useState(1);
  const [foodEatenThisLevel, setFoodEatenThisLevel] = useState(0);
  const [foodNeededForLevel, setFoodNeededForLevel] = useState(5);
  const [levelComplete, setLevelComplete] = useState(false);
  const [showBuffShop, setShowBuffShop] = useState(false);
  const [permanentBuffs, setPermanentBuffs] = useState<ActiveBuff[]>([]);
  const permanentBuffsRef = useRef<ActiveBuff[]>([]);
  const [temporaryBuffs, setTemporaryBuffs] = useState<ActiveBuff[]>([]);
  const [shieldCount, setShieldCount] = useState(0);
  
  // Keep refs in sync with state
  useEffect(() => {
    permanentBuffsRef.current = permanentBuffs;
  }, [permanentBuffs]);

  const [slowTimeActive, setSlowTimeActive] = useState(false);
  const [doubleCoinsActive, setDoubleCoinsActive] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  // Boss battle state
  const [bossFood, setBossFood] = useState<BossFood[]>([]);
  const [giantBossSnake, setGiantBossSnake] = useState<GiantBossSnake | null>(null);
  const [bombMasterBoss, setBombMasterBoss] = useState<BombMasterBoss | null>(null);
  const giantBossSnakeRef = useRef<GiantBossSnake | null>(null);
  const bombMasterBossRef = useRef<BombMasterBoss | null>(null);
  const bossFoodRef = useRef<BossFood[]>([]);
  
  // Keep boss refs in sync with state
  useEffect(() => {
    giantBossSnakeRef.current = giantBossSnake;
  }, [giantBossSnake]);
  
  useEffect(() => {
    bombMasterBossRef.current = bombMasterBoss;
  }, [bombMasterBoss]);
  
  useEffect(() => {
    bossFoodRef.current = bossFood;
  }, [bossFood]);
  
  

  // Handle countdown
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            setGameStarted(true);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    } else if (countdown === 0) {
      setGameStarted(true);
      setCountdown(null);
    }
  }, [countdown]);
  
  const FINAL_LEVEL = 20;
  const BOSS_LEVEL_10 = 10;
  const BOSS_LEVEL_20 = 20;
  
  // Get food needed for a specific level
  const getFoodNeededForLevel = useCallback((levelNum: number): number => {
    if (levelNum === 1) return 5;
    if (levelNum === 2) return 7;
    if (levelNum === 3) return 7;
    if (levelNum === 4) return 10;
    if (levelNum === 5) return 9;
    if (levelNum === 6) return 12;
    if (levelNum === 7) return 15;
    if (levelNum === 8) return 17;
    if (levelNum === 9) return 20;
    if (levelNum === 10) return 20;
    if (levelNum === 11) return 27;
    if (levelNum === 12) return 28;
    if (levelNum >= 13 && levelNum <= 15) return 30;
    if (levelNum >= 16 && levelNum <= 19) return 33;
    if (levelNum === 20) return 35;
    return 35; // Default for any unexpected levels
  }, []);

  const gridSize = 20;
  const tileCount = 20;
  const canvasWidth = gridSize * tileCount;
  const canvasHeight = gridSize * tileCount;

  const snakeRef = useRef<Position[]>([{ x: 10, y: 10 }]);
  const directionRef = useRef<Direction>('right');
  const nextDirectionRef = useRef<Direction>('right');
  const foodRef = useRef<Position>({ x: 15, y: 15 });
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastMoveTimeRef = useRef<number>(0);
  const baseGameSpeedRef = useRef(100);
  
  // Bombs and enemies
  const bombsRef = useRef<Bomb[]>([]);
  const enemySnakesRef = useRef<EnemySnake[]>([]);
  const wallsRef = useRef<Wall[]>([]);
  const flashbangsRef = useRef<Flashbang[]>([]);
  const bombSpawnTimerRef = useRef<number>(0);
  const enemySpawnTimerRef = useRef<number>(0);
  const flashbangSpawnTimerRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const [bombSpawnDisabled, setBombSpawnDisabled] = useState(false);
  const [blinded, setBlinded] = useState(false);
  
  // Available buffs
  const availableBuffs: Buff[] = [
    {
      id: 'extra_shield',
      name: 'Extra Shield',
      description: 'Start each level with an extra shield charge',
      type: 'permanent',
      price: 35,
      icon: '🛡️',
      effect: { extraShield: 1 },
    },
    {
      id: 'bomb_immunity',
      name: 'Bomb Immunity',
      description: 'Immune to bomb explosions (permanent)',
      type: 'permanent',
      price: 100,
      icon: '💣',
      effect: { bombImmunity: true },
    },
    {
      id: 'shield',
      name: 'Shield',
      description: 'Next hit won\'t kill you (one-time use)',
      type: 'temporary',
      price: 5,
      icon: '🛡️',
      effect: { shield: true },
    },
    {
      id: 'slow_time',
      name: 'Slow Time',
      description: 'Slow down movement for 30 seconds',
      type: 'temporary',
      price: 30,
      icon: '⏱️',
      effect: { slowTime: 30 },
    },
    {
      id: 'double_coins',
      name: 'Double Coins',
      description: 'Earn double coins for 20 seconds',
      type: 'temporary',
      price: 20,
      icon: '💰',
      effect: { doubleCoins: 20 },
    },
    {
      id: 'clear_bombs',
      name: 'Clear Bombs',
      description: 'Remove all active bombs and disable spawning for 20 seconds',
      type: 'temporary',
      price: 20,
      icon: '🧹',
      effect: { clearBombs: 20 },
    },
  ];

  // Cosmetics - using state to track unlocked items
  const [cosmetics, setCosmetics] = useState<Cosmetic[]>([
    { id: 'default', name: 'Default', color: 'default', price: 0, unlocked: true },
    { id: 'red', name: 'Red Snake', color: 'red', price: 10, unlocked: false },
    { id: 'blue', name: 'Blue Snake', color: 'blue', price: 15, unlocked: false },
    { id: 'green', name: 'Green Snake', color: 'green', price: 20, unlocked: false },
    { id: 'yellow', name: 'Yellow Snake', color: 'yellow', price: 25, unlocked: false },
    { id: 'purple', name: 'Purple Snake', color: 'purple', price: 30, unlocked: false },
    { id: 'orange', name: 'Orange Snake', color: 'orange', price: 35, unlocked: false },
    { id: 'pink', name: 'Pink Snake', color: 'pink', price: 40, unlocked: false },
  ]);

  // Load saved data from localStorage
  useEffect(() => {
    const savedGold = localStorage.getItem('snakeGameGold');
    const savedColor = localStorage.getItem('snakeGameColor') as SnakeColor;
    const savedCosmetics = localStorage.getItem('snakeGameCosmetics');
    const savedHighScore = localStorage.getItem('snakeGameHighScore');
    const savedPermanentBuffs = localStorage.getItem('snakeGamePermanentBuffs');
    
    if (savedGold) setGold(parseInt(savedGold, 10));
    if (savedColor) setSelectedColor(savedColor);
    if (savedHighScore) setHighScore(parseInt(savedHighScore, 10));
    if (savedCosmetics) {
      const unlocked = JSON.parse(savedCosmetics);
      setCosmetics(prev => prev.map(cosmetic => ({
        ...cosmetic,
        unlocked: unlocked.includes(cosmetic.id) || cosmetic.id === 'default'
      })));
    }
    if (savedPermanentBuffs) {
      setPermanentBuffs(JSON.parse(savedPermanentBuffs));
    }
  }, []);

  // Save gold to localStorage
  useEffect(() => {
    localStorage.setItem('snakeGameGold', gold.toString());
  }, [gold]);

  // Save selected color to localStorage
  useEffect(() => {
    localStorage.setItem('snakeGameColor', selectedColor);
  }, [selectedColor]);

  // Save high score to localStorage
  useEffect(() => {
    if (highScore > 0) {
      localStorage.setItem('snakeGameHighScore', highScore.toString());
    }
  }, [highScore]);

  // Initialize game
  const initGame = useCallback(() => {
    // Create snake with starting length (always 1)
    const startPos = { x: 10, y: 10 };
    const snake: Position[] = [startPos];
    
    snakeRef.current = snake;
    directionRef.current = 'right';
    nextDirectionRef.current = 'right';
    foodRef.current = { x: 15, y: 15 };
    lastMoveTimeRef.current = Date.now();
    setScore(0);
    setGameOver(false);
    setGameStarted(false); // Don't start immediately
    setLevel(1);
    setFoodEatenThisLevel(0);
    setFoodNeededForLevel(getFoodNeededForLevel(1));
    setLevelComplete(false);
    setShowBuffShop(false);
    setTemporaryBuffs([]);
    setShieldCount(0);
    setSlowTimeActive(false);
    setDoubleCoinsActive(false);
    
    // Give extra shields based on permanent buffs
    const extraShieldCount = permanentBuffsRef.current
      .filter(b => b.effect?.extraShield)
      .reduce((sum, b) => sum + (b.effect?.extraShield || 0), 0);
    setShieldCount(extraShieldCount);
    
    // Reset bombs, enemies, walls, and flashbangs
    bombsRef.current = [];
    enemySnakesRef.current = [];
    wallsRef.current = [];
    flashbangsRef.current = [];
    bombSpawnTimerRef.current = 0;
    enemySpawnTimerRef.current = 0;
    flashbangSpawnTimerRef.current = 0;
    frameCountRef.current = 0;
    setBombSpawnDisabled(false);
    setBlinded(false);
    
    // Reset boss state
    setGiantBossSnake(null);
    setBombMasterBoss(null);
    setBossFood([]);
    giantBossSnakeRef.current = null;
    bombMasterBossRef.current = null;
    bossFoodRef.current = [];
    
    // Set base speed
    baseGameSpeedRef.current = 100;
    setGameSpeed(baseGameSpeedRef.current);
    
    // Start countdown
    setCountdown(3);
  }, [getFoodNeededForLevel]);

  // Generate new food position
  const generateFood = useCallback(() => {
    let newFood: Position;
    let attempts = 0;
    do {
      newFood = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount),
      };
      attempts++;
    } while (
      (snakeRef.current.some(segment => segment.x === newFood.x && segment.y === newFood.y) ||
       bombsRef.current.some(bomb => bomb.x === newFood.x && bomb.y === newFood.y) ||
       enemySnakesRef.current.some(enemy => enemy.body.some(seg => seg.x === newFood.x && seg.y === newFood.y)) ||
       wallsRef.current.some(wall => wall.x === newFood.x && wall.y === newFood.y) ||
       flashbangsRef.current.some(fb => fb.x === newFood.x && fb.y === newFood.y)) &&
      attempts < 100
    );
    foodRef.current = newFood;
  }, []);

  // Generate bomb position
  const generateBomb = useCallback((isRed: boolean = false, isT: boolean = false) => {
    let newBomb: Position;
    let attempts = 0;
    do {
      newBomb = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount),
      };
      attempts++;
    } while (
      (snakeRef.current.some(segment => segment.x === newBomb.x && segment.y === newBomb.y) ||
       foodRef.current.x === newBomb.x && foodRef.current.y === newBomb.y ||
       bombsRef.current.some(bomb => bomb.x === newBomb.x && bomb.y === newBomb.y) ||
       enemySnakesRef.current.some(enemy => enemy.body.some(seg => seg.x === newBomb.x && seg.y === newBomb.y)) ||
       wallsRef.current.some(wall => wall.x === newBomb.x && wall.y === newBomb.y) ||
       flashbangsRef.current.some(fb => fb.x === newBomb.x && fb.y === newBomb.y)) &&
      attempts < 100
    );
    
    if (attempts < 100) {
      bombsRef.current.push({
        x: newBomb.x,
        y: newBomb.y,
        timer: 300, // 300 frames = ~5 seconds at 60fps
        exploded: false,
        isRed: isRed,
        isT: isT,
      });
    }
  }, []);

  // Generate flashbang (from level 7+)
  const generateFlashbang = useCallback(() => {
    let newFlashbang: Position;
    let attempts = 0;
    do {
      newFlashbang = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount),
      };
      attempts++;
    } while (
      (snakeRef.current.some(segment => segment.x === newFlashbang.x && segment.y === newFlashbang.y) ||
       foodRef.current.x === newFlashbang.x && foodRef.current.y === newFlashbang.y ||
       bombsRef.current.some(bomb => bomb.x === newFlashbang.x && bomb.y === newFlashbang.y) ||
       enemySnakesRef.current.some(enemy => enemy.body.some(seg => seg.x === newFlashbang.x && seg.y === newFlashbang.y)) ||
       wallsRef.current.some(wall => wall.x === newFlashbang.x && wall.y === newFlashbang.y) ||
       flashbangsRef.current.some(fb => fb.x === newFlashbang.x && fb.y === newFlashbang.y)) &&
      attempts < 100
    );
    
    if (attempts < 100) {
      flashbangsRef.current.push({
        x: newFlashbang.x,
        y: newFlashbang.y,
        timer: 300, // 300 frames = ~5 seconds at 60fps
        activated: false,
      });
    }
  }, []);

  // Generate walls (from level 5+)
  const generateWalls = useCallback((currentLevel: number) => {
    if (currentLevel < 5) return;
    
    wallsRef.current = [];
    const wallCount = Math.min(5 + Math.floor((currentLevel - 5) / 2), 15);
    
    for (let i = 0; i < wallCount; i++) {
      let wall: Position;
      let attempts = 0;
      do {
        wall = {
          x: Math.floor(Math.random() * tileCount),
          y: Math.floor(Math.random() * tileCount),
        };
        attempts++;
      } while (
        (snakeRef.current.some(segment => segment.x === wall.x && segment.y === wall.y) ||
         foodRef.current.x === wall.x && foodRef.current.y === wall.y ||
       bombsRef.current.some(bomb => bomb.x === wall.x && bomb.y === wall.y) ||
       enemySnakesRef.current.some(enemy => enemy.body.some(seg => seg.x === wall.x && seg.y === wall.y)) ||
       wallsRef.current.some(w => w.x === wall.x && w.y === wall.y) ||
       flashbangsRef.current.some(fb => fb.x === wall.x && fb.y === wall.y) ||
         // Avoid edges to keep paths open
         wall.x < 2 || wall.x >= tileCount - 2 || wall.y < 2 || wall.y >= tileCount - 2) &&
        attempts < 100
      );
      
      if (attempts < 100) {
        wallsRef.current.push(wall);
      }
    }
  }, []);

  // Generate enemy snake
  const generateEnemySnake = useCallback((currentLevel?: number) => {
    const levelToUse = currentLevel ?? level;
    const enemyLength = Math.min(3 + Math.floor(levelToUse / 2), 8);
    let startPos: Position;
    let attempts = 0;
    
    do {
      startPos = {
        x: Math.floor(Math.random() * (tileCount - 5)) + 2,
        y: Math.floor(Math.random() * (tileCount - 5)) + 2,
      };
      attempts++;
    } while (
      (snakeRef.current.some(segment => 
        Math.abs(segment.x - startPos.x) < 5 && Math.abs(segment.y - startPos.y) < 5) ||
       foodRef.current.x === startPos.x && foodRef.current.y === startPos.y ||
       bombsRef.current.some(bomb => bomb.x === startPos.x && bomb.y === startPos.y) ||
       wallsRef.current.some(wall => wall.x === startPos.x && wall.y === startPos.y)) &&
      attempts < 100
    );
    
    if (attempts < 100) {
      const directions: Direction[] = ['up', 'down', 'left', 'right'];
      const direction = directions[Math.floor(Math.random() * directions.length)];
      const body: Position[] = [startPos];
      
      // Create body segments
      for (let i = 1; i < enemyLength; i++) {
        let nextPos: Position;
        switch (direction) {
          case 'up':
            nextPos = { x: startPos.x, y: startPos.y + i };
            break;
          case 'down':
            nextPos = { x: startPos.x, y: startPos.y - i };
            break;
          case 'left':
            nextPos = { x: startPos.x + i, y: startPos.y };
            break;
          case 'right':
            nextPos = { x: startPos.x - i, y: startPos.y };
            break;
        }
        body.push(nextPos);
      }
      
      const colors = ['#ff6b6b', '#ff8c42', '#ffd93d', '#a78bfa'];
      const patterns: Array<'horizontal' | 'vertical' | 'square'> = ['horizontal', 'vertical', 'square'];
      const pattern = patterns[Math.floor(Math.random() * patterns.length)];
      
      enemySnakesRef.current.push({
        body,
        direction,
        nextDirection: direction,
        moveTimer: 0,
        moveInterval: Math.max(3, 8 - Math.floor(levelToUse / 2)), // Faster at higher levels
        color: colors[Math.floor(Math.random() * colors.length)],
        pattern,
        patternStep: 0,
        turnCounter: 0,
      });
    }
  }, [level]);

  // Pattern-based enemy snake movement (no AI, just fixed patterns)
  const moveEnemySnake = useCallback((enemy: EnemySnake) => {
    const head = { ...enemy.body[0] };
    const oppositeDirections: Record<Direction, Direction> = {
      up: 'down',
      down: 'up',
      left: 'right',
      right: 'left',
    };
    
    let chosenDirection = enemy.direction;
    let newHead: Position;
    
    // Pattern-based movement
    if (enemy.pattern === 'horizontal') {
      // Move horizontally, turn at walls
      if (head.x <= 0 && enemy.direction === 'left') {
        chosenDirection = 'right';
      } else if (head.x >= tileCount - 1 && enemy.direction === 'right') {
        chosenDirection = 'left';
      }
    } else if (enemy.pattern === 'vertical') {
      // Move vertically, turn at walls
      if (head.y <= 0 && enemy.direction === 'up') {
        chosenDirection = 'down';
      } else if (head.y >= tileCount - 1 && enemy.direction === 'down') {
        chosenDirection = 'up';
      }
    } else if (enemy.pattern === 'square') {
      // Move in a square/rectangle pattern - turn after moving a certain distance
      enemy.patternStep++;
      const stepSize = 6; // Steps before turning
      
      // Turn at corners
      if (enemy.patternStep >= stepSize) {
        enemy.patternStep = 0;
        // Turn clockwise: right -> down -> left -> up -> right
        const turnOrder: Record<Direction, Direction> = {
          'right': 'down',
          'down': 'left',
          'left': 'up',
          'up': 'right',
        };
        chosenDirection = turnOrder[enemy.direction];
      }
      
      // Also turn at walls
      if (head.x <= 0 && enemy.direction === 'left') {
        chosenDirection = 'up';
        enemy.patternStep = 0;
      } else if (head.x >= tileCount - 1 && enemy.direction === 'right') {
        chosenDirection = 'down';
        enemy.patternStep = 0;
      } else if (head.y <= 0 && enemy.direction === 'up') {
        chosenDirection = 'right';
        enemy.patternStep = 0;
      } else if (head.y >= tileCount - 1 && enemy.direction === 'down') {
        chosenDirection = 'left';
        enemy.patternStep = 0;
      }
    }
    
    // Calculate new head position
    switch (chosenDirection) {
      case 'up':
        newHead = { x: head.x, y: head.y - 1 };
        break;
      case 'down':
        newHead = { x: head.x, y: head.y + 1 };
        break;
      case 'left':
        newHead = { x: head.x - 1, y: head.y };
        break;
      case 'right':
        newHead = { x: head.x + 1, y: head.y };
        break;
    }
    
    // Safety check: if new position is out of bounds, turn around
    if (newHead.x < 0 || newHead.x >= tileCount || newHead.y < 0 || newHead.y >= tileCount) {
      chosenDirection = oppositeDirections[enemy.direction];
      switch (chosenDirection) {
        case 'up':
          newHead = { x: head.x, y: head.y - 1 };
          break;
        case 'down':
          newHead = { x: head.x, y: head.y + 1 };
          break;
        case 'left':
          newHead = { x: head.x - 1, y: head.y };
          break;
        case 'right':
          newHead = { x: head.x + 1, y: head.y };
          break;
      }
    }
    
    // Safety check: if new position has a bomb, try to avoid it (but don't use AI)
    if (bombsRef.current.some(bomb => bomb.x === newHead.x && bomb.y === newHead.y && !bomb.exploded)) {
      // Just turn around if hitting a bomb
      chosenDirection = oppositeDirections[enemy.direction];
      switch (chosenDirection) {
        case 'up':
          newHead = { x: head.x, y: head.y - 1 };
          break;
        case 'down':
          newHead = { x: head.x, y: head.y + 1 };
          break;
        case 'left':
          newHead = { x: head.x - 1, y: head.y };
          break;
        case 'right':
          newHead = { x: head.x + 1, y: head.y };
          break;
      }
    }
    
    enemy.direction = chosenDirection;
    enemy.body.unshift(newHead);
    enemy.body.pop(); // Don't grow, just move
  }, []);

  // Check collision
  const checkCollision = useCallback((head: Position, body: Position[], checkBombImmunity: boolean = false): { collided: boolean; hitWall?: Wall; hitBomb?: Bomb } => {
    // Check wall collision
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
      return { collided: true };
    }
    // Check self collision
    if (body.some(segment => segment.x === head.x && segment.y === head.y)) {
      return { collided: true };
    }
    // Check wall obstacle collision (from level 5+)
    const hitWall = wallsRef.current.find(wall => wall.x === head.x && wall.y === head.y);
    if (hitWall) {
      return { collided: true, hitWall };
    }
        // Check bomb collision (skip if bomb immunity, but red bombs and T bombs always hit)
        const hitBomb = bombsRef.current.find(bomb => bomb.x === head.x && bomb.y === head.y && !bomb.exploded);
        if (hitBomb) {
          // Red bombs and T bombs ignore bomb immunity
          if (hitBomb.isRed || hitBomb.isT || !checkBombImmunity) {
            return { collided: true, hitBomb };
          }
        }
    // Check enemy snake collision
    for (const enemy of enemySnakesRef.current) {
      if (enemy.body.some(segment => segment.x === head.x && segment.y === head.y)) {
        return { collided: true };
      }
    }
    
    return { collided: false };
  }, [level]);

  // Handle direction change
  const changeDirection = useCallback((newDirection: Direction) => {
    const oppositeDirections: Record<Direction, Direction> = {
      up: 'down',
      down: 'up',
      left: 'right',
      right: 'left',
    };

    // Prevent moving in opposite direction
    if (newDirection !== oppositeDirections[directionRef.current]) {
      nextDirectionRef.current = newDirection;
    }
  }, []);

  // Buy cosmetic
  const buyCosmetic = useCallback((cosmetic: Cosmetic) => {
    if (gold >= cosmetic.price && !cosmetic.unlocked) {
      setGold((prev) => {
        const newGold = prev - cosmetic.price;
        localStorage.setItem('snakeGameGold', newGold.toString());
        return newGold;
      });
      setCosmetics(prev => {
        const updated = prev.map(c => 
          c.id === cosmetic.id ? { ...c, unlocked: true } : c
        );
        const unlocked = updated.filter(c => c.unlocked).map(c => c.id);
        localStorage.setItem('snakeGameCosmetics', JSON.stringify(unlocked));
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

  // Buy buff
  const buyBuff = useCallback((buff: Buff) => {
    if (gold >= buff.price) {
      setGold((prev) => {
        const newGold = prev - buff.price;
        localStorage.setItem('snakeGameGold', newGold.toString());
        return newGold;
      });
      
      if (buff.type === 'permanent') {
        // Check if already owned (stackable buffs can be bought multiple times)
        if (buff.id === 'extra_shield') {
          // Stackable - add to existing or create new
          setPermanentBuffs(prev => {
            const existing = prev.find(b => b.id === buff.id);
            let updated;
            if (existing && buff.effect?.extraShield) {
              // Stack extra shield
              updated = prev.map(b => 
                b.id === buff.id 
                  ? { ...b, effect: { ...b.effect, extraShield: (b.effect?.extraShield || 0) + (buff.effect?.extraShield || 0) } }
                  : b
              );
            } else {
              updated = [...prev, { id: buff.id, type: 'permanent', effect: buff.effect }];
            }
            localStorage.setItem('snakeGamePermanentBuffs', JSON.stringify(updated));
            return updated;
          });
        } else {
          // Non-stackable permanent buffs (bomb_immunity)
          setPermanentBuffs(prev => {
            const updated = [...prev, { id: buff.id, type: 'permanent', effect: buff.effect }];
            localStorage.setItem('snakeGamePermanentBuffs', JSON.stringify(updated));
            return updated;
          });
        }
      } else {
        // Temporary buff
        const activeBuff: ActiveBuff = {
          id: buff.id,
          type: 'temporary',
          expiresAt: buff.effect?.slowTime ? Date.now() + (buff.effect.slowTime * 1000) : undefined,
          effect: buff.effect,
        };
        
        setTemporaryBuffs(prev => [...prev, activeBuff]);
        
        // Apply immediate effects
        if (buff.effect?.shield) {
          setShieldCount(prev => prev + 1);
        }
        if (buff.effect?.slowTime) {
          setSlowTimeActive(true);
          setTimeout(() => {
            setSlowTimeActive(false);
            setTemporaryBuffs(prev => prev.filter(b => b.id !== buff.id));
          }, buff.effect.slowTime * 1000);
        }
        if (buff.effect?.doubleCoins) {
          setDoubleCoinsActive(true);
          setTimeout(() => {
            setDoubleCoinsActive(false);
            setTemporaryBuffs(prev => prev.filter(b => b.id !== buff.id));
          }, buff.effect.doubleCoins * 1000);
        }
        if (buff.effect?.clearBombs) {
          // Clear all bombs and disable spawning
          bombsRef.current = [];
          setBombSpawnDisabled(true);
          setTimeout(() => {
            setBombSpawnDisabled(false);
            setTemporaryBuffs(prev => prev.filter(b => b.id !== buff.id));
          }, (buff.effect.clearBombs || 20) * 1000);
        }
      }
    }
  }, [gold]);

  // Initialize Giant Boss Snake (Level 10)
  const initGiantBossSnake = useCallback(() => {
    const bossBody: Position[] = [];
    const startX = Math.floor(tileCount / 2);
    const startY = Math.floor(tileCount / 2);
    const bossLength = 12;
    
    // Create boss snake body (horizontal line)
    for (let i = 0; i < bossLength; i++) {
      bossBody.push({ x: startX - Math.floor(bossLength / 2) + i, y: startY });
    }
    
    const boss: GiantBossSnake = {
      body: bossBody,
      direction: 'right',
      moveTimer: 0,
      moveInterval: 8, // Slower movement
      phase: 1,
      health: 0,
      maxHealth: 50,
      splitSnakes: [],
    };
    
    setGiantBossSnake(boss);
    giantBossSnakeRef.current = boss;
    
    // Generate initial boss food
    generateBossFood();
  }, []);

  // Initialize Bomb Master Boss (Level 20)
  const initBombMasterBoss = useCallback(() => {
    const boss: BombMasterBoss = {
      x: Math.floor(tileCount / 2),
      y: Math.floor(tileCount / 2),
      spawnTimer: 0,
      spawnInterval: 60, // Spawn bombs every 60 frames (1 second)
      active: true,
    };
    
    setBombMasterBoss(boss);
    bombMasterBossRef.current = boss;
    
    // Spawn initial wave of bombs
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        const isRed = Math.random() < 0.3;
        const isT = Math.random() < 0.2;
        generateBomb(isRed, isT);
      }, i * 200);
    }
  }, [generateBomb]);

  // Generate boss food for Giant Boss Snake
  const generateBossFood = useCallback(() => {
    const newBossFood: BossFood[] = [];
    const foodCount = 2; // Always have 2 boss food items on screen
    
    for (let i = 0; i < foodCount; i++) {
      let attempts = 0;
      let newFood: Position;
      do {
        newFood = {
          x: Math.floor(Math.random() * tileCount),
          y: Math.floor(Math.random() * tileCount),
        };
        attempts++;
      } while (
        (snakeRef.current.some(segment => segment.x === newFood.x && segment.y === newFood.y) ||
         bombsRef.current.some(bomb => bomb.x === newFood.x && bomb.y === newFood.y) ||
         enemySnakesRef.current.some(enemy => enemy.body.some(seg => seg.x === newFood.x && seg.y === newFood.y)) ||
         wallsRef.current.some(wall => wall.x === newFood.x && wall.y === newFood.y) ||
         flashbangsRef.current.some(fb => fb.x === newFood.x && fb.y === newFood.y) ||
         (giantBossSnakeRef.current?.body.some(seg => seg.x === newFood.x && seg.y === newFood.y)) ||
         (giantBossSnakeRef.current?.splitSnakes.some(splitSnake => splitSnake.body.some(seg => seg.x === newFood.x && seg.y === newFood.y))) ||
         bossFoodRef.current.some(bf => bf.x === newFood.x && bf.y === newFood.y)) &&
        attempts < 100
      );
      
      if (attempts < 100) {
        newBossFood.push({
          x: newFood.x,
          y: newFood.y,
          id: `boss-food-${Date.now()}-${i}`,
        });
      }
    }
    
    setBossFood(newBossFood);
    bossFoodRef.current = newBossFood;
  }, []);

  // Move Giant Boss Snake
  const moveGiantBossSnake = useCallback((boss: GiantBossSnake) => {
    const head = { ...boss.body[0] };
    let newDirection = boss.direction;
    let newHead: Position;
    
    // Phase-based movement patterns
    if (boss.phase === 1) {
      // Phase 1: Slow, predictable horizontal movement
      if (head.x <= 2 && boss.direction === 'left') {
        newDirection = 'right';
      } else if (head.x >= tileCount - 3 && boss.direction === 'right') {
        newDirection = 'left';
      }
    } else if (boss.phase === 2) {
      // Phase 2: Faster, more aggressive - moves in a square pattern
      boss.patternStep = (boss.patternStep || 0) + 1;
      const stepSize = 8;
      
      if (boss.patternStep >= stepSize) {
        boss.patternStep = 0;
        const turnOrder: Record<Direction, Direction> = {
          'right': 'down',
          'down': 'left',
          'left': 'up',
          'up': 'right',
        };
        newDirection = turnOrder[boss.direction];
      }
      
      // Also turn at walls
      if (head.x <= 0 && boss.direction === 'left') {
        newDirection = 'up';
        boss.patternStep = 0;
      } else if (head.x >= tileCount - 1 && boss.direction === 'right') {
        newDirection = 'down';
        boss.patternStep = 0;
      } else if (head.y <= 0 && boss.direction === 'up') {
        newDirection = 'right';
        boss.patternStep = 0;
      } else if (head.y >= tileCount - 1 && boss.direction === 'down') {
        newDirection = 'left';
        boss.patternStep = 0;
      }
    } else if (boss.phase === 3) {
      // Phase 3: Already split, individual snakes move independently
      // This is handled separately
      return;
    }
    
    // Calculate new head position
    switch (newDirection) {
      case 'up':
        newHead = { x: head.x, y: head.y - 1 };
        break;
      case 'down':
        newHead = { x: head.x, y: head.y + 1 };
        break;
      case 'left':
        newHead = { x: head.x - 1, y: head.y };
        break;
      case 'right':
        newHead = { x: head.x + 1, y: head.y };
        break;
    }
    
    // Safety check
    if (newHead.x < 0 || newHead.x >= tileCount || newHead.y < 0 || newHead.y >= tileCount) {
      newDirection = boss.direction === 'left' ? 'right' : boss.direction === 'right' ? 'left' : boss.direction === 'up' ? 'down' : 'up';
      switch (newDirection) {
        case 'up':
          newHead = { x: head.x, y: head.y - 1 };
          break;
        case 'down':
          newHead = { x: head.x, y: head.y + 1 };
          break;
        case 'left':
          newHead = { x: head.x - 1, y: head.y };
          break;
        case 'right':
          newHead = { x: head.x + 1, y: head.y };
          break;
      }
    }
    
    boss.direction = newDirection;
    boss.body.unshift(newHead);
    boss.body.pop();
    
    setGiantBossSnake({ ...boss });
    giantBossSnakeRef.current = { ...boss };
  }, []);

  // Continue to next level
  const continueToNextLevel = useCallback(() => {
    const nextLevel = level + 1;
    setLevel(nextLevel);
    setFoodEatenThisLevel(0);
    setFoodNeededForLevel(getFoodNeededForLevel(nextLevel));
    setLevelComplete(false);
    setShowBuffShop(false);
    setGameStarted(false); // Don't start immediately
    
    // Clear bombs, enemies, and flashbangs
    bombsRef.current = [];
    enemySnakesRef.current = [];
    flashbangsRef.current = [];
    bombSpawnTimerRef.current = 0;
    enemySpawnTimerRef.current = 0;
    flashbangSpawnTimerRef.current = 0;
    setBlinded(false);
    
    // Reset boss state
    setGiantBossSnake(null);
    setBombMasterBoss(null);
    setBossFood([]);
    giantBossSnakeRef.current = null;
    bombMasterBossRef.current = null;
    bossFoodRef.current = [];
    
    // Reset snake position (always start with length 1)
    const startPos = { x: 10, y: 10 };
    const snake: Position[] = [startPos];
    snakeRef.current = snake;
    
    // Give extra shields based on permanent buffs
    const extraShieldCount = permanentBuffsRef.current
      .filter(b => b.effect?.extraShield)
      .reduce((sum, b) => sum + (b.effect?.extraShield || 0), 0);
    setShieldCount(extraShieldCount);
    directionRef.current = 'right';
    nextDirectionRef.current = 'right';
    
    // Initialize bosses for specific levels
    if (nextLevel === BOSS_LEVEL_10) {
      // Boss will be initialized after countdown completes
      // Don't generate normal food for boss level
    } else if (nextLevel === BOSS_LEVEL_20) {
      initBombMasterBoss();
      generateFood(); // Normal food for bomb master boss
    } else {
      generateFood();
    }
    
    // Generate walls from level 5+ (but not for boss levels)
    if (nextLevel >= 5 && nextLevel !== BOSS_LEVEL_10 && nextLevel !== BOSS_LEVEL_20) {
      generateWalls(nextLevel);
    } else {
      wallsRef.current = [];
    }
    
    // Spawn initial bombs and enemies based on next level (after countdown)
    // Skip for boss levels (they handle their own spawning)
    if (nextLevel !== BOSS_LEVEL_10 && nextLevel !== BOSS_LEVEL_20) {
      const bombCount = Math.min(Math.floor(nextLevel / 2), 5);
      for (let i = 0; i < bombCount; i++) {
        // From level 15+, only red bombs and T bombs spawn
        if (nextLevel >= 15) {
          const isRed = Math.random() < 0.5;
          const isT = !isRed;
          setTimeout(() => generateBomb(isRed, isT), 3000 + (i * 500)); // Wait for countdown
        } else {
          // From level 11+, T bombs can spawn
          // From level 3+, red bombs can spawn
          const isRed = nextLevel >= 3 && Math.random() < 0.3;
          const isT = nextLevel >= 11 && !isRed && Math.random() < 0.3;
          setTimeout(() => generateBomb(isRed, isT), 3000 + (i * 500)); // Wait for countdown
        }
      }
      
      // Spawn initial flashbangs (from level 7+)
      if (nextLevel >= 7) {
        const flashbangCount = Math.min(1, 2);
        for (let i = 0; i < flashbangCount; i++) {
          setTimeout(() => generateFlashbang(), 3000 + (i * 1000)); // Wait for countdown
        }
      }
      
      const enemyCount = Math.min(Math.floor(nextLevel / 3), 3);
      for (let i = 0; i < enemyCount; i++) {
        setTimeout(() => generateEnemySnake(nextLevel), 3000 + (i * 1000)); // Wait for countdown
      }
    }
    
    // Increase base speed slightly each level
    baseGameSpeedRef.current = Math.max(50, baseGameSpeedRef.current - 2);
    setGameSpeed(baseGameSpeedRef.current);
    
    // Start countdown
    setCountdown(3);
  }, [generateFood, generateBomb, generateFlashbang, generateEnemySnake, generateWalls, level, getFoodNeededForLevel, initBombMasterBoss]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      const now = Date.now();

      if (!gameStarted || gameOver || levelComplete || countdown !== null) {
        animationFrameRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      frameCountRef.current++;
      
      // Update direction
      directionRef.current = nextDirectionRef.current;

      // Calculate current game speed (with slow time effect - makes it slower)
      const currentSpeed = slowTimeActive ? gameSpeed * 2 : gameSpeed;
      
      // Boss battle logic - Bomb Master Boss (Level 20)
      if (level === BOSS_LEVEL_20 && bombMasterBossRef.current?.active) {
        bombMasterBossRef.current.spawnTimer++;
        if (bombMasterBossRef.current.spawnTimer >= bombMasterBossRef.current.spawnInterval) {
          // Spawn bombs around the boss
          const bombCount = 2;
          for (let i = 0; i < bombCount; i++) {
            const isRed = Math.random() < 0.4;
            const isT = !isRed && Math.random() < 0.3;
            generateBomb(isRed, isT);
          }
          bombMasterBossRef.current.spawnTimer = 0;
        }
      }
      
      // Spawn bombs periodically (more frequent at higher levels) - skip for boss levels
      if (!bombSpawnDisabled && level !== BOSS_LEVEL_10 && level !== BOSS_LEVEL_20) {
        bombSpawnTimerRef.current++;
        const bombSpawnInterval = Math.max(300, 600 - (level * 30));
        if (bombSpawnTimerRef.current >= bombSpawnInterval && bombsRef.current.length < Math.min(3 + level, 8)) {
          // From level 15+, only red bombs and T bombs spawn
          if (level >= 15) {
            const isRed = Math.random() < 0.5;
            const isT = !isRed;
            generateBomb(isRed, isT);
          } else {
            // From level 11+, T bombs can spawn
            // From level 3+, red bombs can spawn
            const isRed = level >= 3 && Math.random() < 0.3;
            const isT = level >= 11 && !isRed && Math.random() < 0.3;
            generateBomb(isRed, isT);
          }
          bombSpawnTimerRef.current = 0;
        }
      }
      
      // Boss battle logic - Giant Boss Snake (Level 10)
      if (level === BOSS_LEVEL_10 && giantBossSnakeRef.current) {
        const boss = giantBossSnakeRef.current;
        boss.moveTimer++;
        
        // Adjust move interval based on phase
        const moveInterval = boss.phase === 1 ? 8 : boss.phase === 2 ? 5 : 4;
        
        if (boss.moveTimer >= moveInterval) {
          if (boss.phase === 3 && boss.splitSnakes.length > 0) {
            // Phase 3: Move split snakes
            boss.splitSnakes.forEach(splitSnake => {
              moveEnemySnake(splitSnake);
            });
          } else {
            // Phase 1 and 2: Move main boss
            moveGiantBossSnake(boss);
          }
          boss.moveTimer = 0;
        }
        
        // Check phase transitions
        // Phase 2 starts when boss has 30 health remaining (20 damage taken)
        if (boss.health >= 20 && boss.phase === 1) {
          boss.phase = 2;
          boss.moveInterval = 5;
        } 
        // Phase 3 starts when boss has 15 health remaining (35 damage taken)
        else if (boss.health >= 35 && boss.phase === 2) {
          boss.phase = 3;
          // Split into 2-3 smaller snakes
          const splitCount = 2;
          boss.splitSnakes = [];
          for (let i = 0; i < splitCount; i++) {
            const startPos = {
              x: Math.floor(Math.random() * (tileCount - 5)) + 2,
              y: Math.floor(Math.random() * (tileCount - 5)) + 2,
            };
            const directions: Direction[] = ['up', 'down', 'left', 'right'];
            const direction = directions[Math.floor(Math.random() * directions.length)];
            const splitBody: Position[] = [startPos];
            for (let j = 1; j < 5; j++) {
              let nextPos: Position;
              switch (direction) {
                case 'up':
                  nextPos = { x: startPos.x, y: startPos.y + j };
                  break;
                case 'down':
                  nextPos = { x: startPos.x, y: startPos.y - j };
                  break;
                case 'left':
                  nextPos = { x: startPos.x + j, y: startPos.y };
                  break;
                case 'right':
                  nextPos = { x: startPos.x - j, y: startPos.y };
                  break;
              }
              splitBody.push(nextPos);
            }
            boss.splitSnakes.push({
              body: splitBody,
              direction,
              nextDirection: direction,
              moveTimer: 0,
              moveInterval: 4,
              color: '#ff6b6b',
              pattern: 'square',
              patternStep: 0,
              turnCounter: 0,
            });
          }
        }
        
        setGiantBossSnake({ ...boss });
        giantBossSnakeRef.current = { ...boss };
        
        // Spawn boss food if needed
        if (bossFoodRef.current.length < 2) {
          generateBossFood();
        }
      }
      
      // Spawn enemy snakes periodically
      enemySpawnTimerRef.current++;
      const enemySpawnInterval = Math.max(600, 1200 - (level * 50));
      if (enemySpawnTimerRef.current >= enemySpawnInterval && enemySnakesRef.current.length < Math.min(1 + Math.floor(level / 2), 4)) {
        generateEnemySnake(level);
        enemySpawnTimerRef.current = 0;
      }
      
      // Spawn flashbangs periodically (from level 7+)
      if (level >= 7) {
        flashbangSpawnTimerRef.current++;
        const flashbangSpawnInterval = Math.max(600, 1200 - (level * 40));
        if (flashbangSpawnTimerRef.current >= flashbangSpawnInterval && flashbangsRef.current.length < Math.min(2, 3)) {
          generateFlashbang();
          flashbangSpawnTimerRef.current = 0;
        }
      }
      
      // Update flashbangs (countdown timers)
      flashbangsRef.current = flashbangsRef.current.filter(flashbang => {
        if (!flashbang.activated) {
          flashbang.timer--;
          if (flashbang.timer <= 0) {
            flashbang.activated = true;
            // Blind the player for 0.5 seconds
            setBlinded(true);
            setTimeout(() => {
              setBlinded(false);
            }, 500);
            // Remove flashbang after activation
            return false;
          }
          return true;
        }
        return false;
      });
      
      // Update bombs (countdown timers)
      bombsRef.current = bombsRef.current.filter(bomb => {
        if (!bomb.exploded) {
          bomb.timer--;
          if (bomb.timer <= 0) {
            bomb.exploded = true;
            bomb.timer = 30; // Explosion animation frames
            
            // Determine explosion pattern
            const explosionTiles: Position[] = [];
            if (bomb.isT) {
              // T bomb: entire row and column
              for (let i = 0; i < tileCount; i++) {
                // Entire row
                explosionTiles.push({ x: bomb.x, y: i });
                // Entire column
                explosionTiles.push({ x: i, y: bomb.y });
              }
            } else {
              // Normal or red bomb: radius-based explosion
              const explosionRadius = bomb.isRed ? 2 : 1;
              for (let dx = -explosionRadius; dx <= explosionRadius; dx++) {
                for (let dy = -explosionRadius; dy <= explosionRadius; dy++) {
                  explosionTiles.push({ x: bomb.x + dx, y: bomb.y + dy });
                }
              }
            }
            
        // Check bomb immunity
        const hasBombImmunity = permanentBuffsRef.current.some(b => b.effect?.bombImmunity);
            const ignoresImmunity = bomb.isRed || bomb.isT;
            
            // Check if any part of player snake is in explosion area
            const playerHit = snakeRef.current.some(segment => 
              explosionTiles.some(tile => tile.x === segment.x && tile.y === segment.y)
            );
            
            if (playerHit && (ignoresImmunity || !hasBombImmunity)) {
              // Player hit by explosion (only if not immune)
              if (shieldCount > 0) {
                // Use a shield
                setShieldCount(prev => prev - 1);
                // Remove one temporary shield buff if any exist
                setTemporaryBuffs(prev => {
                  const shieldIndex = prev.findIndex(b => b.id === 'shield');
                  if (shieldIndex !== -1) {
                    return prev.filter((_, i) => i !== shieldIndex);
                  }
                  return prev;
                });
                // Remove the bomb that exploded
                bombsRef.current = bombsRef.current.filter(b => b !== bomb);
              } else {
                setGameOver(true);
                if (score > highScore) {
                  const newHighScore = score;
                  setHighScore(newHighScore);
                  localStorage.setItem('snakeGameHighScore', newHighScore.toString());
                }
              }
            }
            
            // Check if enemy snakes are in explosion radius
            enemySnakesRef.current = enemySnakesRef.current.filter(enemy => {
              // Check if any part of enemy snake is in explosion area
              return !enemy.body.some(segment =>
                explosionTiles.some(tile => tile.x === segment.x && tile.y === segment.y)
              );
            });
          }
          return true;
        } else {
          // Explosion animation
          bomb.timer--;
          return bomb.timer > 0;
        }
      });
      
      // Move enemy snakes
      enemySnakesRef.current.forEach(enemy => {
        enemy.moveTimer++;
        if (enemy.moveTimer >= enemy.moveInterval) {
          moveEnemySnake(enemy);
          enemy.moveTimer = 0;
        }
      });
      
      // Move snake at intervals
      if (now - lastMoveTimeRef.current >= currentSpeed) {
        const head = { ...snakeRef.current[0] };

        // Move head based on direction
        switch (directionRef.current) {
          case 'up':
            head.y -= 1;
            break;
          case 'down':
            head.y += 1;
            break;
          case 'left':
            head.x -= 1;
            break;
          case 'right':
            head.x += 1;
            break;
        }

        // Check bomb immunity
        const hasBombImmunity = permanentBuffsRef.current.some(b => b.effect?.bombImmunity);
        
        // Check collision (pass bomb immunity flag to skip bomb collision check)
        const collisionResult = checkCollision(head, snakeRef.current, hasBombImmunity);
        
        // Check boss snake collision (Level 10) - check here since level might not be in closure
        if (level === BOSS_LEVEL_10 && giantBossSnakeRef.current) {
          const boss = giantBossSnakeRef.current;
          // Check main boss body
          if (boss.body.some(segment => segment.x === head.x && segment.y === head.y)) {
            // Boss collision - check if shield is active
            if (shieldCount > 0) {
              // Use a shield
              setShieldCount(prev => prev - 1);
              // Remove one temporary shield buff if any exist
              setTemporaryBuffs(prev => {
                const shieldIndex = prev.findIndex(b => b.id === 'shield');
                if (shieldIndex !== -1) {
                  return prev.filter((_, i) => i !== shieldIndex);
                }
                return prev;
              });
              // Don't die, just continue
            } else {
              setGameOver(true);
              if (score > highScore) {
                const newHighScore = score;
                setHighScore(newHighScore);
                localStorage.setItem('snakeGameHighScore', newHighScore.toString());
              }
              animationFrameRef.current = requestAnimationFrame(gameLoop);
              return;
            }
          }
          // Check split snakes (phase 3)
          if (boss.phase === 3) {
            for (const splitSnake of boss.splitSnakes) {
              if (splitSnake.body.some(segment => segment.x === head.x && segment.y === head.y)) {
                // Split snake collision - check if shield is active
                if (shieldCount > 0) {
                  // Use a shield
                  setShieldCount(prev => prev - 1);
                  // Remove one temporary shield buff if any exist
                  setTemporaryBuffs(prev => {
                    const shieldIndex = prev.findIndex(b => b.id === 'shield');
                    if (shieldIndex !== -1) {
                      return prev.filter((_, i) => i !== shieldIndex);
                    }
                    return prev;
                  });
                  // Remove the split snake that was hit
                  boss.splitSnakes = boss.splitSnakes.filter(s => s !== splitSnake);
                  setGiantBossSnake({ ...boss });
                  giantBossSnakeRef.current = { ...boss };
                  // Don't die, just continue
                } else {
                  setGameOver(true);
                  if (score > highScore) {
                    const newHighScore = score;
                    setHighScore(newHighScore);
                    localStorage.setItem('snakeGameHighScore', newHighScore.toString());
                  }
                  animationFrameRef.current = requestAnimationFrame(gameLoop);
                  return;
                }
              }
            }
          }
        }
        
        if (collisionResult.collided) {
          // Check if shield is active
          if (shieldCount > 0) {
            // Handle wall collision (consumes 3 shields)
            if (collisionResult.hitWall) {
              if (shieldCount >= 3) {
                // Consume 3 shields and destroy wall
                setShieldCount(prev => prev - 3);
                wallsRef.current = wallsRef.current.filter(w => w !== collisionResult.hitWall);
              } else {
                // Not enough shields, die
                setGameOver(true);
                if (score > highScore) {
                  const newHighScore = score;
                  setHighScore(newHighScore);
                  localStorage.setItem('snakeGameHighScore', newHighScore.toString());
                }
                animationFrameRef.current = requestAnimationFrame(gameLoop);
                return;
              }
            } else {
              // Regular collision (bomb or enemy) - use 1 shield
              setShieldCount(prev => prev - 1);
              // Remove one temporary shield buff if any exist
              setTemporaryBuffs(prev => {
                const shieldIndex = prev.findIndex(b => b.id === 'shield');
                if (shieldIndex !== -1) {
                  return prev.filter((_, i) => i !== shieldIndex);
                }
                return prev;
              });
              
              // Remove the bomb or enemy that was hit
              if (collisionResult.hitBomb) {
                bombsRef.current = bombsRef.current.filter(b => b !== collisionResult.hitBomb);
              }
              
              // Check if it was an enemy snake
              enemySnakesRef.current = enemySnakesRef.current.filter(enemy => {
                const hitEnemy = enemy.body.some(segment => segment.x === head.x && segment.y === head.y);
                return !hitEnemy;
              });
            }
            
            // Don't die, just continue
          } else {
            setGameOver(true);
            if (score > highScore) {
              const newHighScore = score;
              setHighScore(newHighScore);
              localStorage.setItem('snakeGameHighScore', newHighScore.toString());
            }
            animationFrameRef.current = requestAnimationFrame(gameLoop);
            return;
          }
        }

        snakeRef.current.unshift(head);

        // Check if boss food eaten (Level 10 - Giant Boss Snake)
        if (level === BOSS_LEVEL_10 && giantBossSnakeRef.current) {
          const bossFoodEaten = bossFoodRef.current.findIndex(bf => bf.x === head.x && bf.y === head.y);
          if (bossFoodEaten !== -1) {
            // Remove eaten boss food
            const newBossFood = bossFoodRef.current.filter((_, i) => i !== bossFoodEaten);
            setBossFood(newBossFood);
            bossFoodRef.current = newBossFood;
            
            // Increase boss health (damage boss)
            const boss = giantBossSnakeRef.current;
            boss.health++;
            setGiantBossSnake({ ...boss });
            giantBossSnakeRef.current = { ...boss };
            
            // Award score and coins
            setScore((prev) => prev + 5); // Boss food worth more
            const coinAmount = (doubleCoinsActive ? 2 : 1) * 3; // Boss food gives 3 coins
            setGold((prev) => {
              const newGold = prev + coinAmount;
              localStorage.setItem('snakeGameGold', newGold.toString());
              return newGold;
            });
            
            // Check if boss defeated
            if (boss.health >= boss.maxHealth) {
              // Boss defeated!
              setLevelComplete(true);
              setShowBuffShop(true);
            } else {
              // Generate new boss food
              generateBossFood();
            }
            
            snakeRef.current.pop();
            lastMoveTimeRef.current = now;
            animationFrameRef.current = requestAnimationFrame(gameLoop);
            return;
          }
        }

        // Check if food eaten (normal levels and Level 20)
        if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
          const newFoodEaten = foodEatenThisLevel + 1;
          setFoodEatenThisLevel(newFoodEaten);
          
          setScore((prev) => {
            const newScore = prev + 1;
            return newScore;
          });
          
          // Award coins (double if buff active)
          const coinAmount = doubleCoinsActive ? 2 : 1;
          setGold((prev) => {
            const newGold = prev + coinAmount;
            localStorage.setItem('snakeGameGold', newGold.toString());
            return newGold;
          });
          
          // Check if level is complete
          if (newFoodEaten >= foodNeededForLevel) {
            if (level >= FINAL_LEVEL) {
              // Final level complete - victory!
              setLevelComplete(true);
              setGameOver(true);
            } else {
              // Level complete - show buff shop (pause game)
              setLevelComplete(true);
              setShowBuffShop(true);
            }
            // Don't generate new food if level is complete
          } else {
            generateFood();
          }
        } else {
          snakeRef.current.pop();
        }

        lastMoveTimeRef.current = now;
      }

      // Clear canvas
      const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Draw grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= tileCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridSize, 0);
        ctx.lineTo(i * gridSize, canvasHeight);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * gridSize);
        ctx.lineTo(canvasWidth, i * gridSize);
        ctx.stroke();
      }

      // Draw walls (from level 5+)
      if (level >= 5) {
        wallsRef.current.forEach(wall => {
          const x = wall.x * gridSize;
          const y = wall.y * gridSize;
          
          // Draw wall (dark gray/black block)
          ctx.fillStyle = '#2d2d2d';
          ctx.fillRect(x, y, gridSize, gridSize);
          
          // Draw wall border
          ctx.strokeStyle = '#1a1a1a';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, gridSize, gridSize);
          
          // Draw wall pattern
          ctx.strokeStyle = '#404040';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + 2, y + 2);
          ctx.lineTo(x + gridSize - 2, y + gridSize - 2);
          ctx.moveTo(x + gridSize - 2, y + 2);
          ctx.lineTo(x + 2, y + gridSize - 2);
          ctx.stroke();
        });
      }

      // Draw flashbangs (from level 7+)
      if (level >= 7) {
        flashbangsRef.current.forEach(flashbang => {
          if (!flashbang.activated) {
            const pulse = Math.sin(frameCountRef.current / 8) * 0.3 + 0.7;
            const flashbangSize = (gridSize / 2 - 2) * pulse;
            
            // Draw flashbang body (white/light gray)
            ctx.fillStyle = '#f0f0f0';
            ctx.beginPath();
            ctx.arc(
              flashbang.x * gridSize + gridSize / 2,
              flashbang.y * gridSize + gridSize / 2,
              flashbangSize,
              0,
              Math.PI * 2
            );
            ctx.fill();
            
            // Draw flashbang border
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(
              flashbang.x * gridSize + gridSize / 2,
              flashbang.y * gridSize + gridSize / 2,
              flashbangSize,
              0,
              Math.PI * 2
            );
            ctx.stroke();
            
            // Draw timer indicator
            const timerPercent = flashbang.timer / 300;
            ctx.strokeStyle = timerPercent > 0.5 ? '#87ceeb' : timerPercent > 0.25 ? '#ffd700' : '#ffa500';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(
              flashbang.x * gridSize + gridSize / 2,
              flashbang.y * gridSize + gridSize / 2,
              flashbangSize + 2,
              -Math.PI / 2,
              -Math.PI / 2 + (Math.PI * 2 * (1 - timerPercent))
            );
            ctx.stroke();
            
            // Draw flashbang icon (lightning bolt)
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            const centerX = flashbang.x * gridSize + gridSize / 2;
            const centerY = flashbang.y * gridSize + gridSize / 2;
            ctx.moveTo(centerX - 3, centerY - 6);
            ctx.lineTo(centerX + 2, centerY - 2);
            ctx.lineTo(centerX - 1, centerY);
            ctx.lineTo(centerX + 3, centerY + 6);
            ctx.lineTo(centerX - 2, centerY + 2);
            ctx.lineTo(centerX + 1, centerY);
            ctx.closePath();
            ctx.fill();
          }
        });
      }

      // Draw bombs
      bombsRef.current.forEach(bomb => {
        if (!bomb.exploded) {
          const pulse = Math.sin(frameCountRef.current / 5) * 0.2 + 0.8;
          const bombSize = (gridSize / 2 - 2) * pulse;
          const isRed = bomb.isRed || false;
          const isT = bomb.isT || false;
          
          // Draw bomb body (red for red bombs, teal for T bombs, black for normal)
          if (isT) {
            ctx.fillStyle = '#4ecdc4'; // Teal for T bombs
          } else {
            ctx.fillStyle = isRed ? '#8b0000' : '#333';
          }
          ctx.beginPath();
          ctx.arc(
            bomb.x * gridSize + gridSize / 2,
            bomb.y * gridSize + gridSize / 2,
            bombSize,
            0,
            Math.PI * 2
          );
          ctx.fill();
          
          // Draw fuse
          if (isT) {
            ctx.strokeStyle = '#00ffff'; // Cyan fuse for T bombs
          } else {
            ctx.strokeStyle = isRed ? '#ff0000' : '#ff6b6b';
          }
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(bomb.x * gridSize + gridSize / 2, bomb.y * gridSize + gridSize / 2 - bombSize);
          ctx.lineTo(bomb.x * gridSize + gridSize / 2, bomb.y * gridSize + gridSize / 2 - bombSize - 5);
          ctx.stroke();
          
          // Draw timer indicator
          const timerPercent = bomb.timer / 300;
          if (isT) {
            ctx.strokeStyle = timerPercent > 0.5 ? '#4ecdc4' : timerPercent > 0.25 ? '#00ffff' : '#00cccc';
          } else {
            ctx.strokeStyle = isRed 
              ? (timerPercent > 0.5 ? '#ff6b6b' : timerPercent > 0.25 ? '#ff3333' : '#ff0000')
              : (timerPercent > 0.5 ? '#51cf66' : timerPercent > 0.25 ? '#ffd93d' : '#ff6b6b');
          }
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(
            bomb.x * gridSize + gridSize / 2,
            bomb.y * gridSize + gridSize / 2,
            bombSize + 2,
            -Math.PI / 2,
            -Math.PI / 2 + (Math.PI * 2 * (1 - timerPercent))
          );
          ctx.stroke();
          
          // Draw warning indicator (red for red bombs, teal for T bombs)
          if (isRed) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(
              bomb.x * gridSize + gridSize / 2,
              bomb.y * gridSize + gridSize / 2,
              bombSize + 4,
              0,
              Math.PI * 2
            );
            ctx.fill();
          } else if (isT) {
            ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(
              bomb.x * gridSize + gridSize / 2,
              bomb.y * gridSize + gridSize / 2,
              bombSize + 4,
              0,
              Math.PI * 2
            );
            ctx.fill();
            // Draw "T" letter on T bomb
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('T', bomb.x * gridSize + gridSize / 2, bomb.y * gridSize + gridSize / 2);
          }
        } else {
          // Draw explosion
          const explosionProgress = 1 - (bomb.timer / 30);
          const isRed = bomb.isRed || false;
          const isT = bomb.isT || false;
          
          if (isT) {
            // T bomb: draw entire row and column
            const opacity = 0.8 * (1 - explosionProgress);
            ctx.fillStyle = `rgba(0, 255, 255, ${opacity})`;
            
            // Draw entire row
            for (let x = 0; x < tileCount; x++) {
              ctx.fillRect(
                x * gridSize,
                bomb.y * gridSize,
                gridSize,
                gridSize
              );
            }
            
            // Draw entire column
            for (let y = 0; y < tileCount; y++) {
              ctx.fillRect(
                bomb.x * gridSize,
                y * gridSize,
                gridSize,
                gridSize
              );
            }
            
            // Draw center effect
            const centerSize = (gridSize / 2) * (1 + explosionProgress);
            const centerX = bomb.x * gridSize + gridSize / 2;
            const centerY = bomb.y * gridSize + gridSize / 2;
            ctx.fillStyle = `rgba(0, 200, 200, ${opacity})`;
            ctx.beginPath();
            ctx.arc(centerX, centerY, centerSize, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Normal or red bomb: radius-based explosion
            const explosionRadius = bomb.isRed ? 2 : 1;
            
            // Draw explosion tiles
            for (let dx = -explosionRadius; dx <= explosionRadius; dx++) {
              for (let dy = -explosionRadius; dy <= explosionRadius; dy++) {
                const tileX = bomb.x + dx;
                const tileY = bomb.y + dy;
                
                // Skip if out of bounds
                if (tileX < 0 || tileX >= tileCount || tileY < 0 || tileY >= tileCount) {
                  continue;
                }
                
                const tileCenterX = tileX * gridSize + gridSize / 2;
                const tileCenterY = tileY * gridSize + gridSize / 2;
                
                // Draw explosion tile with fade effect (red for red bombs)
                const opacity = 0.8 * (1 - explosionProgress);
                ctx.fillStyle = isRed ? `rgba(255, 0, 0, ${opacity})` : `rgba(255, 107, 107, ${opacity})`;
                ctx.fillRect(
                  tileX * gridSize,
                  tileY * gridSize,
                  gridSize,
                  gridSize
                );
                
                // Draw fire effect in center
                if (dx === 0 && dy === 0) {
                  const centerSize = (gridSize / 2) * (1 + explosionProgress);
                  ctx.fillStyle = isRed ? `rgba(255, 100, 0, ${opacity})` : `rgba(255, 215, 0, ${opacity})`;
                  ctx.beginPath();
                  ctx.arc(tileCenterX, tileCenterY, centerSize, 0, Math.PI * 2);
                  ctx.fill();
                }
                
                // Draw particles at edges
                if (Math.abs(dx) === explosionRadius || Math.abs(dy) === explosionRadius) {
                  const particleCount = 4;
                  for (let i = 0; i < particleCount; i++) {
                    const angle = (i / particleCount) * Math.PI * 2;
                    const distance = (gridSize / 2) * explosionProgress;
                    const particleX = tileCenterX + Math.cos(angle) * distance;
                    const particleY = tileCenterY + Math.sin(angle) * distance;
                    ctx.fillStyle = isRed ? `rgba(255, 150, 0, ${opacity})` : `rgba(255, 215, 0, ${opacity})`;
                    ctx.beginPath();
                    ctx.arc(particleX, particleY, 2, 0, Math.PI * 2);
                    ctx.fill();
                  }
                }
              }
            }
          }
        }
      });

      // Draw boss food (Level 10 - Giant Boss Snake)
      if (level === BOSS_LEVEL_10 && bossFoodRef.current.length > 0) {
        bossFoodRef.current.forEach(bf => {
          const x = bf.x * gridSize + gridSize / 2;
          const y = bf.y * gridSize + gridSize / 2;
          const size = gridSize / 2 - 2;
          
          // Draw glowing boss food (golden/star-like)
          const glow = Math.sin(frameCountRef.current / 8) * 0.3 + 0.7;
          ctx.fillStyle = `rgba(255, 215, 0, ${glow})`;
          ctx.beginPath();
          ctx.arc(x, y, size + 2, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#ffd700';
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
          
          // Draw star shape
          ctx.fillStyle = '#fff';
          ctx.strokeStyle = '#ffd700';
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const radius = size * 0.6;
            const px = x + Math.cos(angle) * radius;
            const py = y + Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        });
      }

      // Draw Giant Boss Snake (Level 10)
      if (level === BOSS_LEVEL_10 && giantBossSnakeRef.current) {
        const boss = giantBossSnakeRef.current;
        
        // Draw main boss body
        boss.body.forEach((segment, index) => {
          const isHead = index === 0;
          const x = segment.x * gridSize;
          const y = segment.y * gridSize;
          
          // Boss is larger and glows
          const pulse = Math.sin(frameCountRef.current / 10) * 0.1 + 0.9;
          const segmentSize = gridSize * 1.2 * pulse;
          const offset = (gridSize - segmentSize) / 2;
          
          // Glow effect
          const glowGradient = ctx.createRadialGradient(
            x + gridSize / 2, y + gridSize / 2, 0,
            x + gridSize / 2, y + gridSize / 2, segmentSize
          );
          glowGradient.addColorStop(0, isHead ? 'rgba(255, 0, 0, 0.5)' : 'rgba(200, 0, 0, 0.3)');
          glowGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
          ctx.fillStyle = glowGradient;
          ctx.beginPath();
          ctx.arc(x + gridSize / 2, y + gridSize / 2, segmentSize, 0, Math.PI * 2);
          ctx.fill();
          
          // Boss body (dark red/purple)
          ctx.fillStyle = isHead ? '#8b0000' : '#4b0000';
          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(x + gridSize / 2, y + gridSize / 2, segmentSize * 0.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          // Draw eyes on head
          if (isHead) {
            ctx.fillStyle = '#fff';
            const eyeSize = 4;
            ctx.beginPath();
            ctx.arc(x + gridSize / 2 - 5, y + gridSize / 2, eyeSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x + gridSize / 2 + 5, y + gridSize / 2, eyeSize, 0, Math.PI * 2);
            ctx.fill();
          }
        });
        
        // Draw split snakes (Phase 3)
        if (boss.phase === 3) {
          boss.splitSnakes.forEach(splitSnake => {
            splitSnake.body.forEach((segment, index) => {
              const isHead = index === 0;
              const x = segment.x * gridSize;
              const y = segment.y * gridSize;
              
              ctx.fillStyle = isHead ? splitSnake.color : `${splitSnake.color}80`;
              ctx.strokeStyle = splitSnake.color;
              ctx.lineWidth = 2;
              
              const radius = gridSize / 2 - 2;
              const segmentX = x + 2;
              const segmentY = y + 2;
              const segmentSize = gridSize - 4;
              
              ctx.beginPath();
              ctx.moveTo(segmentX + radius, segmentY);
              ctx.lineTo(segmentX + segmentSize - radius, segmentY);
              ctx.quadraticCurveTo(segmentX + segmentSize, segmentY, segmentX + segmentSize, segmentY + radius);
              ctx.lineTo(segmentX + segmentSize, segmentY + segmentSize - radius);
              ctx.quadraticCurveTo(segmentX + segmentSize, segmentY + segmentSize, segmentX + segmentSize - radius, segmentY + segmentSize);
              ctx.lineTo(segmentX + radius, segmentY + segmentSize);
              ctx.quadraticCurveTo(segmentX, segmentY + segmentSize, segmentX, segmentY + segmentSize - radius);
              ctx.lineTo(segmentX, segmentY + radius);
              ctx.quadraticCurveTo(segmentX, segmentY, segmentX + radius, segmentY);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            });
          });
        }
        
        // Draw boss health bar
        const healthBarWidth = 200;
        const healthBarHeight = 20;
        const healthBarX = (canvasWidth - healthBarWidth) / 2;
        const healthBarY = 20;
        const healthPercent = boss.health / boss.maxHealth;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
        
        // Health
        ctx.fillStyle = healthPercent > 0.5 ? '#51cf66' : healthPercent > 0.25 ? '#ffd93d' : '#ff6b6b';
        ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercent, healthBarHeight);
        
        // Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
        
        // Text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`BOSS: ${boss.health}/${boss.maxHealth}`, canvasWidth / 2, healthBarY + 35);
      }

      // Draw Bomb Master Boss (Level 20)
      if (level === BOSS_LEVEL_20 && bombMasterBossRef.current?.active) {
        const boss = bombMasterBossRef.current;
        const x = boss.x * gridSize + gridSize / 2;
        const y = boss.y * gridSize + gridSize / 2;
        const size = gridSize * 1.5;
        const pulse = Math.sin(frameCountRef.current / 8) * 0.2 + 0.8;
        
        // Glow effect
        const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, size * 1.5);
        glowGradient.addColorStop(0, 'rgba(255, 100, 0, 0.6)');
        glowGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(x, y, size * 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Boss core (orange/red)
        ctx.fillStyle = '#ff6600';
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x, y, size * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Inner core
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(x, y, size * 0.6 * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        // Bomb icon
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💣', x, y);
        
        // Label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('BOMB MASTER', x, y - size - 10);
      }

      // Draw enemy snakes
      enemySnakesRef.current.forEach(enemy => {
        enemy.body.forEach((segment, index) => {
          const isHead = index === 0;
          const x = segment.x * gridSize;
          const y = segment.y * gridSize;

          ctx.fillStyle = isHead ? enemy.color : `${enemy.color}80`; // Lighter for body
          ctx.strokeStyle = enemy.color;
          ctx.lineWidth = 2;

          const radius = gridSize / 2 - 2;
          const segmentX = x + 2;
          const segmentY = y + 2;
          const segmentSize = gridSize - 4;
          
          ctx.beginPath();
          ctx.moveTo(segmentX + radius, segmentY);
          ctx.lineTo(segmentX + segmentSize - radius, segmentY);
          ctx.quadraticCurveTo(segmentX + segmentSize, segmentY, segmentX + segmentSize, segmentY + radius);
          ctx.lineTo(segmentX + segmentSize, segmentY + segmentSize - radius);
          ctx.quadraticCurveTo(segmentX + segmentSize, segmentY + segmentSize, segmentX + segmentSize - radius, segmentY + segmentSize);
          ctx.lineTo(segmentX + radius, segmentY + segmentSize);
          ctx.quadraticCurveTo(segmentX, segmentY + segmentSize, segmentX, segmentY + segmentSize - radius);
          ctx.lineTo(segmentX, segmentY + radius);
          ctx.quadraticCurveTo(segmentX, segmentY, segmentX + radius, segmentY);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          
          // Draw eyes on head
          if (isHead) {
            ctx.fillStyle = '#fff';
            const eyeSize = 2;
            const eyeOffset = 4;
            
            let eye1X = x + gridSize / 2;
            let eye1Y = y + gridSize / 2;
            let eye2X = x + gridSize / 2;
            let eye2Y = y + gridSize / 2;

            switch (enemy.direction) {
              case 'up':
                eye1X -= eyeOffset;
                eye1Y -= eyeOffset;
                eye2X += eyeOffset;
                eye2Y -= eyeOffset;
                break;
              case 'down':
                eye1X -= eyeOffset;
                eye1Y += eyeOffset;
                eye2X += eyeOffset;
                eye2Y += eyeOffset;
                break;
              case 'left':
                eye1X -= eyeOffset;
                eye1Y -= eyeOffset;
                eye2X -= eyeOffset;
                eye2Y += eyeOffset;
                break;
              case 'right':
                eye1X += eyeOffset;
                eye1Y -= eyeOffset;
                eye2X += eyeOffset;
                eye2Y += eyeOffset;
                break;
            }

            ctx.beginPath();
            ctx.arc(eye1X, eye1Y, eyeSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(eye2X, eye2Y, eyeSize, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      });

      // Draw food
      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.arc(
        foodRef.current.x * gridSize + gridSize / 2,
        foodRef.current.y * gridSize + gridSize / 2,
        gridSize / 2 - 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Get snake color based on selected cosmetic
      const getSnakeColor = (color: SnakeColor) => {
        const colors: Record<SnakeColor, { light: string; dark: string; head: string }> = {
          default: { light: '#51cf66', dark: '#40c057', head: '#2f9e44' },
          red: { light: '#ff6b6b', dark: '#ee5a5a', head: '#c92a2a' },
          blue: { light: '#4ecdc4', dark: '#45b7b8', head: '#0c8599' },
          green: { light: '#51cf66', dark: '#40c057', head: '#2f9e44' },
          yellow: { light: '#ffd93d', dark: '#f6c23e', head: '#f59f00' },
          purple: { light: '#a78bfa', dark: '#8b5cf6', head: '#6d28d9' },
          orange: { light: '#ff8c42', dark: '#ff7b35', head: '#fd7e14' },
          pink: { light: '#ff9ff3', dark: '#f368e0', head: '#d63384' },
        };
        return colors[color];
      };

      const snakeColor = getSnakeColor(selectedColor);

      // Draw snake
      snakeRef.current.forEach((segment, index) => {
        const isHead = index === 0;
        const x = segment.x * gridSize;
        const y = segment.y * gridSize;

        ctx.fillStyle = isHead ? snakeColor.head : snakeColor.light;
        ctx.strokeStyle = isHead ? snakeColor.dark : snakeColor.dark;
        ctx.lineWidth = 2;

        // Draw rounded rectangle for each segment
        const radius = gridSize / 2 - 2;
        const segmentX = x + 2;
        const segmentY = y + 2;
        const segmentSize = gridSize - 4;
        
        ctx.beginPath();
        ctx.moveTo(segmentX + radius, segmentY);
        ctx.lineTo(segmentX + segmentSize - radius, segmentY);
        ctx.quadraticCurveTo(segmentX + segmentSize, segmentY, segmentX + segmentSize, segmentY + radius);
        ctx.lineTo(segmentX + segmentSize, segmentY + segmentSize - radius);
        ctx.quadraticCurveTo(segmentX + segmentSize, segmentY + segmentSize, segmentX + segmentSize - radius, segmentY + segmentSize);
        ctx.lineTo(segmentX + radius, segmentY + segmentSize);
        ctx.quadraticCurveTo(segmentX, segmentY + segmentSize, segmentX, segmentY + segmentSize - radius);
        ctx.lineTo(segmentX, segmentY + radius);
        ctx.quadraticCurveTo(segmentX, segmentY, segmentX + radius, segmentY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw eyes on head
        if (isHead) {
          ctx.fillStyle = '#fff';
          const eyeSize = 3;
          const eyeOffset = 5;
          
          // Determine eye positions based on direction
          let eye1X = x + gridSize / 2;
          let eye1Y = y + gridSize / 2;
          let eye2X = x + gridSize / 2;
          let eye2Y = y + gridSize / 2;

          switch (directionRef.current) {
            case 'up':
              eye1X -= eyeOffset;
              eye1Y -= eyeOffset;
              eye2X += eyeOffset;
              eye2Y -= eyeOffset;
              break;
            case 'down':
              eye1X -= eyeOffset;
              eye1Y += eyeOffset;
              eye2X += eyeOffset;
              eye2Y += eyeOffset;
              break;
            case 'left':
              eye1X -= eyeOffset;
              eye1Y -= eyeOffset;
              eye2X -= eyeOffset;
              eye2Y += eyeOffset;
              break;
            case 'right':
              eye1X += eyeOffset;
              eye1Y -= eyeOffset;
              eye2X += eyeOffset;
              eye2Y += eyeOffset;
              break;
          }

          ctx.beginPath();
          ctx.arc(eye1X, eye1Y, eyeSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(eye2X, eye2Y, eyeSize, 0, Math.PI * 2);
          ctx.fill();
          
          // Draw shield effect around head if shield is active
          if (shieldCount > 0) {
            const shieldRadius = gridSize / 2 + 4;
            const shieldCenterX = x + gridSize / 2;
            const shieldCenterY = y + gridSize / 2;
            const pulse = Math.sin(frameCountRef.current / 8) * 0.15 + 0.85;
            
            // Draw shield glow
            const shieldGradient = ctx.createRadialGradient(
              shieldCenterX, shieldCenterY, 0,
              shieldCenterX, shieldCenterY, shieldRadius * pulse
            );
            shieldGradient.addColorStop(0, 'rgba(100, 200, 255, 0.4)');
            shieldGradient.addColorStop(0.5, 'rgba(100, 200, 255, 0.2)');
            shieldGradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
            ctx.fillStyle = shieldGradient;
            ctx.beginPath();
            ctx.arc(shieldCenterX, shieldCenterY, shieldRadius * pulse, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw shield border
            ctx.strokeStyle = `rgba(100, 200, 255, ${0.6 + pulse * 0.4})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(shieldCenterX, shieldCenterY, shieldRadius * pulse, 0, Math.PI * 2);
            ctx.stroke();
            
            // Draw shield count indicator (small number)
            if (shieldCount > 1) {
              ctx.fillStyle = 'rgba(100, 200, 255, 0.9)';
              ctx.font = 'bold 10px Arial';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(shieldCount.toString(), shieldCenterX, shieldCenterY - shieldRadius * pulse - 8);
            }
          }
        }
      });

      // Draw white overlay if blinded
      if (blinded) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameStarted, gameOver, score, highScore, gameSpeed, selectedColor, checkCollision, generateFood, generateBomb, generateFlashbang, generateEnemySnake, moveEnemySnake, level, foodEatenThisLevel, foodNeededForLevel, shieldCount, slowTimeActive, doubleCoinsActive, bombSpawnDisabled, blinded, countdown, giantBossSnake, bombMasterBoss, bossFood, moveGiantBossSnake, generateBossFood]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!gameStarted && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ')) {
        initGame();
        return;
      }
      if (gameOver && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ')) {
        initGame();
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          changeDirection('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          changeDirection('down');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          changeDirection('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          changeDirection('right');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameStarted, gameOver, initGame, changeDirection]);

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
          style={{
            cursor: 'pointer',
            display: 'block',
          }}
        />
        
        {/* Game overlay */}
        {!gameStarted && !gameOver && countdown === null && (
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
              🐍 Snake Game
            </h3>
            <p style={{ marginBottom: '1.5rem', opacity: 0.9 }}>
              Use arrow keys to move!
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

        {/* Countdown overlay */}
        {countdown !== null && countdown > 0 && (
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
            zIndex: 100,
          }}>
            <div style={{
              fontSize: '8rem',
              fontWeight: '900',
              textShadow: '0 0 20px rgba(255, 255, 255, 0.5)',
              animation: 'pulse 0.5s ease-in-out',
            }}>
              {countdown}
            </div>
            <p style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              marginTop: '1rem',
              opacity: 0.9,
            }}>
              Level {level} Starting...
            </p>
          </div>
        )}

        {gameOver && !levelComplete && (
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
            <p style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
              Reached Level {level}
            </p>
            <p style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
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

        {levelComplete && level >= FINAL_LEVEL && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            textAlign: 'center',
            padding: '2rem',
          }}>
            <h3 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '1rem' }}>
              🎉 Victory! 🎉
            </h3>
            <p style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
              You completed all {FINAL_LEVEL} levels!
            </p>
            <p style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>
              Final Score: {score}
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
              Play Again
            </button>
          </div>
        )}

        {/* Score display */}
        {gameStarted && !gameOver && !levelComplete && countdown === null && (
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
              {level === BOSS_LEVEL_10 && giantBossSnake ? (
                <>BOSS BATTLE - Health: {giantBossSnake.health}/{giantBossSnake.maxHealth}</>
              ) : level === BOSS_LEVEL_20 ? (
                <>BOSS BATTLE - Level {level} - {foodEatenThisLevel}/{foodNeededForLevel}</>
              ) : (
                <>Level {level} - {foodEatenThisLevel}/{foodNeededForLevel}</>
              )}
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
            {/* Active buffs display */}
            {(shieldCount > 0 || slowTimeActive || doubleCoinsActive || permanentBuffs.some(b => b.effect?.bombImmunity)) && (
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
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                {shieldCount > 0 && `🛡️ ${shieldCount > 1 ? shieldCount : ''}`} {slowTimeActive && '⏱️'} {doubleCoinsActive && '💰'} {permanentBuffs.some(b => b.effect?.bombImmunity) && '💣'}
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
          Use arrow keys to control the snake. Eat the red food to grow!
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

      {/* Buff Shop Modal (after level completion) */}
      {showBuffShop && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }} onClick={() => {}}>
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '20px',
            padding: '2rem',
            maxWidth: '600px',
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
              <div>
                <h2 style={{
                  fontSize: '1.75rem',
                  fontWeight: '800',
                  color: '#fff',
                  margin: 0,
                  marginBottom: '0.5rem',
                }}>
                  🎯 Level {level} Complete!
                </h2>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.875rem',
                  margin: 0,
                }}>
                  Choose buffs for the next level
                </p>
              </div>
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
            </div>

            <div style={{
              display: 'grid',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}>
              {availableBuffs.map((buff) => {
                const canAfford = gold >= buff.price;
                const isPermanent = buff.type === 'permanent';
                const isStackable = buff.id === 'extra_shield';
                const owned = isPermanent 
                  ? permanentBuffs.some(b => b.id === buff.id)
                  : false;
                const canBuy = canAfford && (!owned || isStackable);

                return (
                  <div
                    key={buff.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
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
                        fontSize: '2rem',
                      }}>
                        {buff.icon}
                      </div>
                      <div>
                        <div style={{
                          color: '#fff',
                          fontWeight: '700',
                          fontSize: '1rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}>
                          {buff.name}
                          {isPermanent && owned && (
                            <span style={{
                              fontSize: '0.75rem',
                              background: 'rgba(255, 255, 255, 0.2)',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '8px',
                            }}>
                              Owned
                            </span>
                          )}
                          {!isPermanent && (
                            <span style={{
                              fontSize: '0.75rem',
                              background: 'rgba(255, 200, 0, 0.3)',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '8px',
                            }}>
                              Temporary
                            </span>
                          )}
                        </div>
                        <div style={{
                          color: 'rgba(255, 255, 255, 0.7)',
                          fontSize: '0.875rem',
                          marginTop: '0.25rem',
                        }}>
                          {buff.description}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => buyBuff(buff)}
                      disabled={!canBuy}
                      style={{
                        padding: '0.5rem 1rem',
                        background: canBuy
                          ? 'rgba(255, 215, 0, 0.5)' 
                          : 'rgba(255, 255, 255, 0.2)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontWeight: '700',
                        fontSize: '0.875rem',
                        cursor: canBuy ? 'pointer' : 'not-allowed',
                        opacity: canBuy ? 1 : 0.5,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      🪙 {buff.price}
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={continueToNextLevel}
              style={{
                width: '100%',
                padding: '1rem',
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
              Continue to Level {level + 1}
            </button>
          </div>
        </div>
      )}

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

                const getColorPreview = (color: SnakeColor) => {
                  const colors: Record<SnakeColor, string> = {
                    default: '#51cf66',
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
