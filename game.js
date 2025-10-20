"use strict";
// ===== GAME CONSTANTS =====
const GRAVITY = 0.25;
const INITIAL_LIVES = 4;
const MAX_LEVEL = 40;
const FRUIT_RADIUS = 44.1; // 50% larger than 29.4
const TRAIL_FADE_SPEED = 0.35;
const MAX_TRAIL_POINTS = 30;
const WALL_BOUNCE_DAMPING = 0.7;
const MAX_FRUITS = 7;
const FRUIT_TYPES = [
    { emoji: '🍎', color: '#ff6b6b', cutEmoji: '🍎' }, // Red apple - will show as half
    { emoji: '🍊', color: '#ffa500', cutEmoji: '🍊' }, // Orange - will show as half
    { emoji: '🍋', color: '#ffd93d', cutEmoji: '🍋' }, // Lemon - will show as half
    { emoji: '🍌', color: '#ffe66d', cutEmoji: '🍌' }, // Banana - will show as half
    { emoji: '🍉', color: '#ff6b9d', cutEmoji: '🍉' }, // Watermelon - will show as half
    { emoji: '🍇', color: '#c471f5', cutEmoji: '🍇' }, // Grapes - will show as half
    { emoji: '🍓', color: '#ff4757', cutEmoji: '🍓' }, // Strawberry - will show as half
    { emoji: '🥝', color: '#6bcf7f', cutEmoji: '🥝' }, // Kiwi - already looks cut
];
const SCORE_TABLE = [0, 10, 30, 135, 200, 375, 675, 1200];
// ===== GAME STATE =====
class GameState {
    constructor() {
        // Game state
        this.isPlaying = false;
        this.score = 0;
        this.level = 1;
        this.lives = INITIAL_LIVES;
        // Game objects
        this.fruits = [];
        this.fruitHalves = [];
        this.trails = [];
        this.particles = [];
        this.scorePopups = [];
        this.fireworks = [];
        // Input
        this.currentTrail = [];
        this.isDrawing = false;
        this.slicedThisSwipe = [];
        // Combo system
        this.comboFruits = [];
        this.comboTimer = null;
        this.comboTimeoutDuration = 250; // 0.25 seconds in milliseconds
        // Bomb explosion effects
        this.screenShake = 0;
        this.redFlash = 0;
        this.isPaused = false;
        // Level management
        this.allFruitsLaunched = false;
        this.showingMilestone = false;
        // Animation
        this.lastFrameTime = 0;
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.width = 0;
        this.height = 0;
        this.resize();
        // Load audio files
        this.swooshSound = new Audio('sounds/swoosh.mp3');
        this.sliceSound = new Audio('sounds/slice.mp3');
        this.explosionSound = new Audio('sounds/explosion.mp3');
        this.fuseSound = new Audio('sounds/fuse.mp3');
        this.fallSound = new Audio('sounds/fall.mp3');
        this.excellentSound = new Audio('sounds/excellent.mp3');
        this.amazingSound = new Audio('sounds/amazing.mp3');
        this.legendarySound = new Audio('sounds/legendary.mp3');
        // Set volume levels
        this.swooshSound.volume = 0.3;
        this.sliceSound.volume = 0.4;
        this.explosionSound.volume = 0.5;
        this.fuseSound.volume = 0.5;
        this.fuseSound.loop = true;
        this.fallSound.volume = 0.4;
        this.excellentSound.volume = 0.6;
        this.amazingSound.volume = 0.6;
        this.legendarySound.volume = 0.6;
        // Load watermelon images
        this.watermelonImg = new Image();
        this.watermelonImg.src = 'images/watermelon.png';
        this.halfWatermelonImg = new Image();
        this.halfWatermelonImg.src = 'images/half_watermelon.png';
        window.addEventListener('resize', () => this.resize());
    }
    resize() {
        const container = this.canvas.parentElement;
        this.width = container.clientWidth;
        this.height = container.clientHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }
}
// ===== GAME LOGIC =====
class FruitSliceGame {
    constructor() {
        this.state = new GameState();
        this.setupEventListeners();
        this.showStartScreen();
    }
    setupEventListeners() {
        // Start button
        const startButton = document.getElementById('start-button');
        console.log('Start button found:', startButton);
        if (startButton) {
            startButton.addEventListener('click', () => {
                console.log('Start button clicked!');
                this.startGame();
            });
        }
        // Restart button
        document.getElementById('restart-button').addEventListener('click', () => {
            this.startGame();
        });
        // Mouse events
        this.state.canvas.addEventListener('mousedown', (e) => this.handleInputStart(e.clientX, e.clientY));
        this.state.canvas.addEventListener('mousemove', (e) => this.handleInputMove(e.clientX, e.clientY));
        this.state.canvas.addEventListener('mouseup', () => this.handleInputEnd());
        this.state.canvas.addEventListener('mouseleave', () => this.handleInputEnd());
        // Touch events
        this.state.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleInputStart(touch.clientX, touch.clientY);
        }, { passive: false });
        this.state.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleInputMove(touch.clientX, touch.clientY);
        }, { passive: false });
        this.state.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleInputEnd();
        }, { passive: false });
    }
    showStartScreen() {
        document.getElementById('start-screen').classList.remove('hidden');
        document.getElementById('game-hud').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
    }
    showGameOver() {
        this.state.isPlaying = false;
        // Stop all fuse sounds
        for (const fruit of this.state.fruits) {
            if (fruit.isBomb && fruit.fuseSound) {
                fruit.fuseSound.pause();
                fruit.fuseSound.currentTime = 0;
            }
        }
        // Update global score for leaderboard
        currentScore = this.state.score;
        document.getElementById('final-score').textContent = this.state.score.toString();
        document.getElementById('final-level').textContent = this.state.level.toString();
        document.getElementById('game-over-screen').classList.remove('hidden');
        document.getElementById('game-hud').classList.add('hidden');
    }
    showMilestoneMessage(wave) {
        this.state.showingMilestone = true;
        // Determine message based on wave
        let mainText = '';
        let subText = '';
        if (wave === 10) {
            mainText = 'Congratulations!';
            subText = 'You have completed the first 10 waves. You gained 1 life';
        }
        else if (wave === 20) {
            mainText = 'Congratulations!';
            subText = 'You have completed the second 10 waves. You gained 1 life';
        }
        else if (wave === 30) {
            mainText = 'Congratulations!';
            subText = 'You have completed the third 10 waves. You gained 1 life';
        }
        else if (wave === 40) {
            mainText = 'Congratulations!';
            subText = `You finished the game! Final Score: ${this.state.score}`;
        }
        // Update milestone message elements
        document.getElementById('milestone-text').textContent = mainText;
        document.getElementById('milestone-subtext').textContent = subText;
        document.getElementById('milestone-message').classList.remove('hidden');
        // Hide milestone message after 2 seconds
        setTimeout(() => {
            document.getElementById('milestone-message').classList.add('hidden');
            this.state.showingMilestone = false;
            // If wave 40, show game over screen
            if (wave === 40) {
                this.showGameOver();
            }
            else {
                // Otherwise, advance to next wave
                this.state.level++;
                this.updateUI();
                this.launchFruits();
            }
        }, 2000);
    }
    startGame() {
        console.log('startGame() called');
        // Stop all fuse sounds from previous game
        for (const fruit of this.state.fruits) {
            if (fruit.isBomb && fruit.fuseSound) {
                fruit.fuseSound.pause();
                fruit.fuseSound.currentTime = 0;
            }
        }
        // Reset state
        this.state.score = 0;
        this.state.level = 1;
        this.state.lives = INITIAL_LIVES;
        this.state.fruits = [];
        this.state.fruitHalves = [];
        this.state.trails = [];
        this.state.particles = [];
        this.state.scorePopups = [];
        this.state.fireworks = [];
        this.state.isPlaying = true;
        // Clear combo state
        if (this.state.comboTimer !== null) {
            clearTimeout(this.state.comboTimer);
        }
        this.state.comboFruits = [];
        this.state.comboTimer = null;
        // Clear input/drawing state
        this.state.isDrawing = false;
        this.state.currentTrail = [];
        this.state.slicedThisSwipe = [];
        // Clear explosion effects
        this.state.screenShake = 0;
        this.state.redFlash = 0;
        // Update UI
        this.updateUI();
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('game-hud').classList.remove('hidden');
        // Launch first level
        this.launchFruits();
        // Start game loop
        this.gameLoop(performance.now());
    }
    launchFruits() {
        const wave = this.state.level;
        let fruitCount = 7; // Default to 7 fruits
        // Determine fruit count based on wave
        if (wave <= 2) {
            fruitCount = 1;
        }
        else if (wave <= 4) {
            fruitCount = 2;
        }
        else if (wave === 5) {
            fruitCount = 3;
        }
        else if (wave === 6) {
            fruitCount = 4;
        }
        else if (wave === 7) {
            fruitCount = 5;
        }
        else if (wave === 8) {
            fruitCount = 6;
        }
        else {
            fruitCount = 7; // Waves 9+
        }
        this.state.fruits = [];
        this.state.allFruitsLaunched = false;
        const launchFruitsNow = () => {
            // Launch fruits with staggered timing (0-500ms spread)
            let launchedCount = 0;
            for (let i = 0; i < fruitCount; i++) {
                // Random delay between 0 and 500ms
                const launchDelay = Math.random() * 500;
                setTimeout(() => {
                    if (!this.state.isPlaying)
                        return;
                    const fruitType = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
                    // Random launch position along bottom (more centered)
                    const x = this.state.width * (0.3 + Math.random() * 0.4);
                    // Random angle (75-105 degrees) - more vertical, less horizontal spread
                    const angle = (75 + Math.random() * 30) * Math.PI / 180;
                    const speed = 15 + Math.random() * 3;
                    this.state.fruits.push({
                        x: x,
                        y: this.state.height,
                        vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1) * 0.6,
                        vy: -Math.sin(angle) * speed,
                        radius: FRUIT_RADIUS,
                        color: fruitType.color,
                        emoji: fruitType.emoji,
                        cutEmoji: fruitType.cutEmoji,
                        sliced: false,
                        active: true,
                        isBomb: false
                    });
                    launchedCount++;
                    if (launchedCount === fruitCount) {
                        // All fruits have been launched, wait a bit then mark as complete
                        setTimeout(() => {
                            this.state.allFruitsLaunched = true;
                        }, 100);
                    }
                }, launchDelay);
            }
        };
        const launchBomb = (beforeFruit) => {
            // beforeFruit: true = bomb launches before fruits (350ms earlier), false = after fruits (350ms later)
            const delay = beforeFruit ? 0 : 350;
            setTimeout(() => {
                if (!this.state.isPlaying)
                    return;
                // Random launch position
                const x = this.state.width * (0.3 + Math.random() * 0.4);
                const angle = (75 + Math.random() * 30) * Math.PI / 180;
                const speed = 15 + Math.random() * 3;
                // Create a new fuse sound instance for this bomb
                const bombFuseSound = this.state.fuseSound.cloneNode();
                bombFuseSound.volume = this.state.fuseSound.volume;
                bombFuseSound.loop = true;
                console.log('Playing fuse sound for bomb');
                bombFuseSound.play().then(() => {
                    console.log('Fuse sound started successfully');
                }).catch(e => {
                    console.error('Fuse sound play failed:', e);
                });
                this.state.fruits.push({
                    x: x,
                    y: this.state.height,
                    vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1) * 0.6,
                    vy: -Math.sin(angle) * speed,
                    radius: FRUIT_RADIUS,
                    color: '#2c2c2c',
                    emoji: '💣',
                    sliced: false,
                    active: true,
                    isBomb: true,
                    fuseSound: bombFuseSound
                });
            }, delay);
        };
        // Launch fruits first
        launchFruitsNow();
        // Determine bomb spawning based on wave
        if (wave === 10) {
            // Wave 10: 7 fruits + 1 bomb (early or late)
            const bombEarly = Math.random() < 0.5;
            launchBomb(bombEarly);
        }
        else if (wave >= 11 && wave <= 20) {
            // Waves 11-20: 7 fruits + 50% chance of bomb
            if (Math.random() < 0.5) {
                const bombEarly = Math.random() < 0.5;
                launchBomb(bombEarly);
            }
        }
        else if (wave >= 21 && wave <= 30) {
            // Waves 21-30: 7 fruits + 1 bomb (100%)
            const bombEarly = Math.random() < 0.5;
            launchBomb(bombEarly);
        }
        else if (wave >= 31 && wave <= 40) {
            // Waves 31-40: 7 fruits + 1 bomb (100%) + 33% chance of 2nd bomb
            // First bomb
            const firstBombEarly = Math.random() < 0.5;
            launchBomb(firstBombEarly);
            // Second bomb (33% chance), opposite timing of first
            if (Math.random() < 0.333) {
                launchBomb(!firstBombEarly); // If first was early, second is late, and vice versa
            }
        }
    }
    handleInputStart(clientX, clientY) {
        if (!this.state.isPlaying)
            return;
        const rect = this.state.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        this.state.isDrawing = true;
        this.state.currentTrail = [{ x, y, timestamp: performance.now() }];
        this.state.slicedThisSwipe = [];
    }
    handleInputMove(clientX, clientY) {
        if (!this.state.isPlaying || !this.state.isDrawing)
            return;
        const rect = this.state.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const prevPoint = this.state.currentTrail[this.state.currentTrail.length - 1];
        this.state.currentTrail.push({ x, y, timestamp: performance.now() });
        // Remove old points from current trail (older than 150ms)
        const now = performance.now();
        this.state.currentTrail = this.state.currentTrail.filter(p => !p.timestamp || (now - p.timestamp) < 150);
        // Check for slicing in real-time as we draw
        if (prevPoint) {
            this.checkSlicingSegment(prevPoint, { x, y });
        }
        if (this.state.currentTrail.length > MAX_TRAIL_POINTS) {
            this.state.currentTrail.shift();
        }
    }
    handleInputEnd() {
        if (!this.state.isPlaying || !this.state.isDrawing)
            return;
        this.state.isDrawing = false;
        // Play knife swoosh sound only if swipe was long enough (5+ points)
        if (this.state.currentTrail.length >= 5) {
            this.playKnifeSwooshSound();
        }
        // Add trail to fading trails
        if (this.state.currentTrail.length > 1) {
            this.state.trails.push({
                points: [...this.state.currentTrail],
                opacity: 1
            });
        }
        this.state.currentTrail = [];
        this.state.slicedThisSwipe = [];
    }
    scoreCombo() {
        if (this.state.comboFruits.length === 0)
            return;
        const comboScore = SCORE_TABLE[Math.min(this.state.comboFruits.length, 7)];
        this.state.score += comboScore;
        // Calculate average position of all fruits in combo for popup
        let avgX = 0;
        let avgY = 0;
        for (const fruit of this.state.comboFruits) {
            avgX += fruit.x;
            avgY += fruit.y;
        }
        avgX /= this.state.comboFruits.length;
        avgY /= this.state.comboFruits.length;
        // Generate combo text based on fruit count
        const count = this.state.comboFruits.length;
        let comboText = '';
        if (count === 3)
            comboText = '3 Fruits - Good';
        else if (count === 4)
            comboText = '4 Fruits - Great';
        else if (count === 5) {
            comboText = '5 Fruits - Excellent';
            this.playComboSound('excellent');
        }
        else if (count === 6) {
            comboText = '6 Fruits - Amazing';
            this.playComboSound('amazing');
        }
        else if (count >= 7) {
            comboText = '7+ Fruits - Legendary';
            this.playComboSound('legendary');
        }
        // For combos (3+), show text in center of screen
        if (count >= 3) {
            this.state.scorePopups.push({
                x: this.state.width / 2,
                y: this.state.height / 2,
                score: comboScore,
                opacity: 1,
                scale: 1,
                comboText: comboText
            });
            this.createFireworks(avgX, avgY);
        }
        this.updateUI();
        // Reset combo state
        this.state.comboFruits = [];
        this.state.comboTimer = null;
    }
    handleBombCut() {
        // Find the bomb that was cut
        const bomb = this.state.fruits.find(f => f.isBomb && f.sliced);
        // Stop the fuse sound for the bomb
        if (bomb && bomb.fuseSound) {
            bomb.fuseSound.pause();
            bomb.fuseSound.currentTime = 0;
        }
        // Count uncut fruits
        const uncutFruits = this.state.fruits.filter(f => f.active && !f.sliced && !f.isBomb);
        const livesLost = uncutFruits.length;
        // Create massive explosion particles from bomb center
        if (bomb) {
            for (let i = 0; i < 50; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 5 + Math.random() * 10;
                this.state.particles.push({
                    x: bomb.x,
                    y: bomb.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 5 + Math.random() * 8,
                    color: ['#ff4444', '#ff8800', '#ffaa00', '#ff0000'][Math.floor(Math.random() * 4)],
                    life: 1
                });
            }
        }
        // Destroy all uncut fruits
        for (const fruit of uncutFruits) {
            fruit.active = false;
            fruit.sliced = true;
            // Create explosion particles for each destroyed fruit
            for (let i = 0; i < 15; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 3 + Math.random() * 5;
                this.state.particles.push({
                    x: fruit.x,
                    y: fruit.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 2,
                    size: 4 + Math.random() * 4,
                    color: '#ff4444',
                    life: 1
                });
            }
        }
        // Trigger screen shake and red flash
        this.state.screenShake = 20;
        this.state.redFlash = 1;
        // Show BOMB text
        if (bomb) {
            this.state.scorePopups.push({
                x: bomb.x,
                y: bomb.y,
                score: 0,
                opacity: 1,
                scale: 1,
                comboText: '💣 BOMB!'
            });
        }
        // Pause the game for dramatic effect
        this.state.isPaused = true;
        // Lose lives (ensure it doesn't go below 0)
        this.state.lives = Math.max(0, this.state.lives - livesLost);
        this.playBurningSound();
        // Clear combo state
        this.state.comboFruits = [];
        if (this.state.comboTimer !== null) {
            clearTimeout(this.state.comboTimer);
            this.state.comboTimer = null;
        }
        this.updateUI();
        // Show "Game continues in..." message if lives remain
        if (this.state.lives > 0) {
            this.state.scorePopups.push({
                x: this.state.width / 2,
                y: this.state.height / 2 + 50,
                score: 0,
                opacity: 1,
                scale: 0.8,
                comboText: 'Game continues in 2 seconds...'
            });
        }
        // Check game over AFTER updating UI
        if (this.state.lives <= 0) {
            setTimeout(() => {
                this.state.isPaused = false; // Unpause before showing game over
                this.showGameOver();
            }, 2000);
            return;
        }
        // Resume game after 2 seconds and check if wave should advance
        setTimeout(() => {
            this.state.isPaused = false;
            // Check if all fruits are gone and advance wave if needed
            if (this.state.allFruitsLaunched && this.state.fruits.every(f => !f.active) && !this.state.showingMilestone) {
                const currentWave = this.state.level;
                // Check if this is a milestone wave (10, 20, 30, 40)
                if (currentWave === 10 || currentWave === 20 || currentWave === 30 || currentWave === 40) {
                    // Add life bonus (except for wave 40)
                    if (currentWave !== 40) {
                        this.state.lives++;
                        this.updateUI();
                    }
                    // Show milestone message
                    this.showMilestoneMessage(currentWave);
                }
                else if (currentWave < MAX_LEVEL) {
                    // Regular wave advancement
                    this.state.level++;
                    this.updateUI();
                    this.launchFruits();
                }
                else {
                    // Game won at wave 40
                    this.showGameOver();
                }
            }
        }, 2000);
    }
    checkSlicingSegment(p1, p2) {
        // Check if this line segment intersects any fruit
        for (const fruit of this.state.fruits) {
            if (fruit.sliced || !fruit.active)
                continue;
            if (this.lineCircleIntersect(p1, p2, fruit)) {
                fruit.sliced = true;
                // Calculate slice angle from the swipe direction
                const rawAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                // Simplify to vertical or horizontal cuts
                // If angle is closer to vertical (up/down), make it vertical
                // If angle is closer to horizontal (left/right), make it horizontal
                const absAngle = Math.abs(rawAngle);
                let sliceAngle;
                if (absAngle < Math.PI / 4 || absAngle > 3 * Math.PI / 4) {
                    // Horizontal cut (left-right)
                    sliceAngle = 0;
                }
                else {
                    // Vertical cut (up-down)
                    sliceAngle = Math.PI / 2;
                }
                fruit.sliceAngle = sliceAngle;
                // Add to sliced fruits for combo calculation
                this.state.slicedThisSwipe.push(fruit);
                // Check if bomb was cut
                if (fruit.isBomb) {
                    this.handleBombCut();
                    return;
                }
                // Add to combo and manage timer
                this.state.comboFruits.push(fruit);
                // Clear existing timer if any
                if (this.state.comboTimer !== null) {
                    clearTimeout(this.state.comboTimer);
                }
                // Start new timer for 0.25 seconds
                this.state.comboTimer = window.setTimeout(() => {
                    this.scoreCombo();
                }, this.state.comboTimeoutDuration);
                // Play sound immediately based on current combo count
                this.playSliceSound(this.state.comboFruits.length);
                // Create fruit halves and particles
                this.createFruitHalves(fruit, sliceAngle);
                this.createSliceParticles(fruit);
            }
        }
    }
    lineCircleIntersect(p1, p2, fruit) {
        // Vector from p1 to p2
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        // Vector from p1 to circle center
        const fx = fruit.x - p1.x;
        const fy = fruit.y - p1.y;
        const a = dx * dx + dy * dy;
        const b = 2 * (fx * dx + fy * dy);
        const c = (fx * fx + fy * fy) - fruit.radius * fruit.radius;
        const discriminant = b * b - 4 * a * c;
        if (discriminant < 0)
            return false;
        const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
        const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);
        return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
    }
    createFruitHalves(fruit, sliceAngle) {
        // Calculate perpendicular offset for the two halves
        const offsetDist = fruit.radius * 0.3;
        const perpAngle = sliceAngle + Math.PI / 2;
        // Left half
        this.state.fruitHalves.push({
            x: fruit.x + Math.cos(perpAngle) * offsetDist,
            y: fruit.y + Math.sin(perpAngle) * offsetDist,
            vx: fruit.vx + Math.cos(perpAngle) * 2,
            vy: fruit.vy + Math.sin(perpAngle) * 2,
            radius: fruit.radius,
            color: fruit.color,
            emoji: fruit.emoji,
            cutEmoji: fruit.cutEmoji,
            rotation: 0,
            rotationSpeed: -0.1 - Math.random() * 0.1,
            isLeft: true,
            opacity: 1
        });
        // Right half
        this.state.fruitHalves.push({
            x: fruit.x - Math.cos(perpAngle) * offsetDist,
            y: fruit.y - Math.sin(perpAngle) * offsetDist,
            vx: fruit.vx - Math.cos(perpAngle) * 2,
            vy: fruit.vy - Math.sin(perpAngle) * 2,
            radius: fruit.radius,
            color: fruit.color,
            emoji: fruit.emoji,
            cutEmoji: fruit.cutEmoji,
            rotation: 0,
            rotationSpeed: 0.1 + Math.random() * 0.1,
            isLeft: false,
            opacity: 1
        });
    }
    createSliceParticles(fruit) {
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            this.state.particles.push({
                x: fruit.x,
                y: fruit.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                size: 3 + Math.random() * 3,
                color: fruit.color,
                life: 1
            });
        }
    }
    playKnifeSwooshSound() {
        // Play swoosh sound from file
        const sound = this.state.swooshSound.cloneNode();
        sound.volume = this.state.swooshSound.volume;
        sound.play().catch(e => console.log('Audio play failed:', e));
    }
    playBurningSound() {
        // Play explosion sound from file
        const sound = this.state.explosionSound.cloneNode();
        sound.volume = this.state.explosionSound.volume;
        sound.play().catch(e => console.log('Audio play failed:', e));
    }
    playFallSound() {
        // Play fall sound when fruit is missed
        const sound = this.state.fallSound.cloneNode();
        sound.volume = this.state.fallSound.volume;
        sound.play().catch(e => console.log('Audio play failed:', e));
    }
    playComboSound(type) {
        // Play combo sound based on type
        let sourceSound;
        if (type === 'excellent') {
            sourceSound = this.state.excellentSound;
        }
        else if (type === 'amazing') {
            sourceSound = this.state.amazingSound;
        }
        else {
            sourceSound = this.state.legendarySound;
        }
        const sound = sourceSound.cloneNode();
        sound.volume = sourceSound.volume;
        sound.play().catch(e => console.log('Audio play failed:', e));
    }
    playSliceSound(comboCount) {
        // Play slice sound from file
        const sound = this.state.sliceSound.cloneNode();
        // Slightly increase volume for combos
        sound.volume = Math.min(1.0, this.state.sliceSound.volume * (1 + comboCount * 0.1));
        sound.play().catch(e => console.log('Audio play failed:', e));
    }
    createFireworks(x, y) {
        const colors = ['#ff6b6b', '#ffa500', '#ffd93d', '#6bcf7f', '#c471f5', '#ff4757'];
        const particles = [];
        for (let i = 0; i < 50; i++) {
            const angle = (Math.PI * 2 * i) / 50;
            const speed = 3 + Math.random() * 5;
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 1
            });
        }
        this.state.fireworks.push({ x, y, particles });
    }
    updatePhysics(dt) {
        // Don't update physics if paused
        if (this.state.isPaused) {
            // Still update visual effects
            if (this.state.screenShake > 0) {
                this.state.screenShake -= 1 * dt;
                if (this.state.screenShake < 0)
                    this.state.screenShake = 0;
            }
            if (this.state.redFlash > 0) {
                this.state.redFlash -= 0.05 * dt;
                if (this.state.redFlash < 0)
                    this.state.redFlash = 0;
            }
            return;
        }
        const normalizedDt = Math.min(dt, 20) / 16.67; // Normalize to 60fps
        dt = normalizedDt;
        // Update fruits
        for (const fruit of this.state.fruits) {
            if (!fruit.active)
                continue;
            fruit.x += fruit.vx * dt;
            fruit.y += fruit.vy * dt;
            fruit.vy += GRAVITY * dt;
            // Wall bouncing - left wall
            if (fruit.x - fruit.radius < 0) {
                fruit.x = fruit.radius;
                fruit.vx = Math.abs(fruit.vx) * WALL_BOUNCE_DAMPING;
            }
            // Wall bouncing - right wall
            if (fruit.x + fruit.radius > this.state.width) {
                fruit.x = this.state.width - fruit.radius;
                fruit.vx = -Math.abs(fruit.vx) * WALL_BOUNCE_DAMPING;
            }
            // Check if fruit fell off screen
            if (fruit.y > this.state.height + fruit.radius) {
                fruit.active = false;
                // Stop fuse sound if it's a bomb
                if (fruit.isBomb && fruit.fuseSound) {
                    fruit.fuseSound.pause();
                    fruit.fuseSound.currentTime = 0;
                }
                // Lose life if not sliced AND not a bomb
                if (!fruit.sliced && !fruit.isBomb) {
                    this.state.lives--;
                    this.playFallSound(); // Play fall sound when fruit is missed
                    this.updateUI();
                    if (this.state.lives <= 0) {
                        this.showGameOver();
                        return;
                    }
                }
            }
        }
        // Check if all fruits are gone (advance level)
        if (this.state.allFruitsLaunched && this.state.fruits.every(f => !f.active) && !this.state.showingMilestone) {
            const currentWave = this.state.level;
            // Check if this is a milestone wave (10, 20, 30, 40)
            if (currentWave === 10 || currentWave === 20 || currentWave === 30 || currentWave === 40) {
                // Add life bonus (except for wave 40)
                if (currentWave !== 40) {
                    this.state.lives++;
                    this.updateUI();
                }
                // Show milestone message
                this.showMilestoneMessage(currentWave);
            }
            else if (currentWave < MAX_LEVEL) {
                // Regular wave advancement
                this.state.level++;
                this.updateUI();
                this.launchFruits();
            }
            else {
                // Game won at wave 40
                this.showGameOver();
            }
        }
        // Update fruit halves
        for (let i = this.state.fruitHalves.length - 1; i >= 0; i--) {
            const half = this.state.fruitHalves[i];
            half.x += half.vx * dt;
            half.y += half.vy * dt;
            half.vy += GRAVITY * dt;
            half.rotation += half.rotationSpeed * dt;
            // Fade out as they fall
            if (half.y > this.state.height * 0.5) {
                half.opacity -= 0.015 * dt;
            }
            // Remove when off screen or fully faded
            if (half.y > this.state.height + half.radius || half.opacity <= 0) {
                this.state.fruitHalves.splice(i, 1);
            }
        }
        // Update particles
        for (let i = this.state.particles.length - 1; i >= 0; i--) {
            const p = this.state.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += GRAVITY * 0.3 * dt;
            p.life -= 0.02 * dt;
            if (p.life <= 0) {
                this.state.particles.splice(i, 1);
            }
        }
        // Update fireworks
        for (let i = this.state.fireworks.length - 1; i >= 0; i--) {
            const fw = this.state.fireworks[i];
            let allDead = true;
            for (const p of fw.particles) {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vy += GRAVITY * 0.2 * dt;
                p.life -= 0.015 * dt;
                if (p.life > 0)
                    allDead = false;
            }
            if (allDead) {
                this.state.fireworks.splice(i, 1);
            }
        }
        // Update score popups
        for (let i = this.state.scorePopups.length - 1; i >= 0; i--) {
            const popup = this.state.scorePopups[i];
            popup.y -= 1 * dt;
            popup.opacity -= 0.02 * dt;
            popup.scale += 0.01 * dt;
            if (popup.opacity <= 0) {
                this.state.scorePopups.splice(i, 1);
            }
        }
        // Update current trail (remove old points even when mouse is stationary)
        if (this.state.isDrawing && this.state.currentTrail.length > 0) {
            const now = performance.now();
            this.state.currentTrail = this.state.currentTrail.filter(p => !p.timestamp || (now - p.timestamp) < 150);
        }
        // Update trails
        for (let i = this.state.trails.length - 1; i >= 0; i--) {
            const trail = this.state.trails[i];
            trail.opacity -= TRAIL_FADE_SPEED * dt;
            if (trail.opacity <= 0) {
                this.state.trails.splice(i, 1);
            }
        }
        // Update screen shake
        if (this.state.screenShake > 0) {
            this.state.screenShake -= 1 * dt;
            if (this.state.screenShake < 0)
                this.state.screenShake = 0;
        }
        // Update red flash
        if (this.state.redFlash > 0) {
            this.state.redFlash -= 0.05 * dt;
            if (this.state.redFlash < 0)
                this.state.redFlash = 0;
        }
    }
    render() {
        const ctx = this.state.ctx;
        // Apply screen shake
        ctx.save();
        if (this.state.screenShake > 0) {
            const shakeX = (Math.random() - 0.5) * this.state.screenShake;
            const shakeY = (Math.random() - 0.5) * this.state.screenShake;
            ctx.translate(shakeX, shakeY);
        }
        // Clear canvas with transparency to show background image
        ctx.clearRect(0, 0, this.state.width, this.state.height);
        // Draw red flash overlay
        if (this.state.redFlash > 0) {
            ctx.fillStyle = `rgba(255, 0, 0, ${this.state.redFlash * 0.5})`;
            ctx.fillRect(0, 0, this.state.width, this.state.height);
        }
        // Draw particles
        for (const p of this.state.particles) {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        // Draw fireworks
        for (const fw of this.state.fireworks) {
            for (const p of fw.particles) {
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.shadowBlur = 10;
                ctx.shadowColor = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        // Draw fruits (only unsliced ones)
        for (const fruit of this.state.fruits) {
            if (!fruit.active || fruit.sliced)
                continue;
            ctx.globalAlpha = 1;
            // Use image for watermelon, emoji for others
            if (fruit.emoji === '🍉' && this.state.watermelonImg.complete) {
                const imgSize = fruit.radius * 2.5;
                ctx.drawImage(this.state.watermelonImg, fruit.x - imgSize / 2, fruit.y - imgSize / 2, imgSize, imgSize);
            }
            else {
                // Draw emoji only (no background circle) - increased size
                ctx.font = `${fruit.radius * 2}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(fruit.emoji, fruit.x, fruit.y);
            }
        }
        // Draw fruit halves
        for (const half of this.state.fruitHalves) {
            ctx.save();
            ctx.globalAlpha = half.opacity;
            ctx.translate(half.x, half.y);
            ctx.rotate(half.rotation);
            // Use image for watermelon, emoji for others
            if (half.emoji === '🍉' && this.state.halfWatermelonImg.complete) {
                // Draw watermelon image - bigger size
                const imgSize = half.radius * 2.8;
                ctx.drawImage(this.state.halfWatermelonImg, -imgSize / 2, -imgSize / 2, imgSize, imgSize);
            }
            else {
                // Draw emoji split in half - same size as whole fruits
                const emojiSize = half.radius * 2;
                ctx.font = `${emojiSize}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                // Clip to show only half of the emoji
                ctx.save();
                ctx.beginPath();
                if (half.isLeft) {
                    // Show left half
                    ctx.rect(-emojiSize, -emojiSize, emojiSize, emojiSize * 2);
                }
                else {
                    // Show right half
                    ctx.rect(0, -emojiSize, emojiSize, emojiSize * 2);
                }
                ctx.clip();
                // Draw the emoji
                ctx.fillText(half.emoji, 0, 0);
                ctx.restore();
            }
            ctx.restore();
        }
        ctx.globalAlpha = 1;
        // Draw old trails
        for (const trail of this.state.trails) {
            this.drawTrail(trail.points, trail.opacity);
        }
        // Draw current trail
        if (this.state.currentTrail.length > 1) {
            this.drawTrail(this.state.currentTrail, 1);
        }
        // Draw score popups
        for (const popup of this.state.scorePopups) {
            ctx.globalAlpha = popup.opacity;
            ctx.fillStyle = '#f5576c';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#f5576c';
            // Draw combo text if available (3+ fruits)
            if (popup.comboText) {
                // Draw combo text in yellow
                ctx.fillStyle = '#FFD700';
                ctx.font = `bold ${32}px Arial`;
                ctx.textBaseline = 'bottom';
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#FFD700';
                ctx.fillText(popup.comboText, popup.x, popup.y - 10);
                // Draw score below in white
                ctx.fillStyle = '#FFFFFF';
                ctx.font = `bold ${24}px Arial`;
                ctx.textBaseline = 'top';
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#FFFFFF';
                ctx.fillText(`+${popup.score}`, popup.x, popup.y + 10);
            }
            else {
                // Draw only score for single/double fruits (smaller)
                const popupColor = popup.color || '#f5576c'; // Use popup color or default red
                ctx.fillStyle = popupColor;
                ctx.font = `bold ${20}px Arial`;
                ctx.textBaseline = 'middle';
                ctx.shadowBlur = 10;
                ctx.shadowColor = popupColor;
                ctx.fillText(`+${popup.score}`, popup.x, popup.y);
            }
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        // Restore canvas (remove screen shake)
        ctx.restore();
    }
    getFleshColor(emoji) {
        // Return realistic flesh colors for different fruits
        switch (emoji) {
            case '🍎': return '#f5f5dc'; // Apple - pale cream/white
            case '🍊': return '#ffd699'; // Orange - light orange
            case '🍋': return '#fffacd'; // Lemon - pale yellow
            case '🍌': return '#fff8dc'; // Banana - cream
            case '🍉': return '#ffb3ba'; // Watermelon - light pink/red
            case '🍇': return '#dda0dd'; // Grapes - light purple
            case '🍓': return '#ffcccb'; // Strawberry - light pink
            case '🥝': return '#d4f1d4'; // Kiwi - pale green
            default: return '#ffffff'; // Default white
        }
    }
    getLighterColor(color) {
        // Convert hex color to lighter shade for fruit flesh
        const hex = color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        // Make it lighter by adding to RGB values
        const lighter = (val) => Math.min(255, val + 80);
        return `rgb(${lighter(r)}, ${lighter(g)}, ${lighter(b)})`;
    }
    getDarkerColor(color) {
        // Convert hex color to darker shade for borders
        const hex = color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        // Make it darker by reducing RGB values
        const darker = (val) => Math.max(0, val - 60);
        return `rgb(${darker(r)}, ${darker(g)}, ${darker(b)})`;
    }
    drawFruitDetails(ctx, half) {
        // Add seeds or details based on fruit type
        const emoji = half.emoji;
        // Watermelon - add black seeds
        if (emoji === '🍉') {
            ctx.fillStyle = '#2c2c2c';
            for (let i = 0; i < 3; i++) {
                const angle = (Math.PI * 2 * i) / 3;
                const x = Math.cos(angle) * half.radius * 0.3;
                const y = Math.sin(angle) * half.radius * 0.3;
                ctx.beginPath();
                ctx.ellipse(x, y, 2, 3, angle, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        // Kiwi - add small seeds pattern
        else if (emoji === '🥝') {
            ctx.fillStyle = '#2c2c2c';
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 * i) / 8;
                const x = Math.cos(angle) * half.radius * 0.25;
                const y = Math.sin(angle) * half.radius * 0.25;
                ctx.beginPath();
                ctx.arc(x, y, 1, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        // Orange/Lemon - add segment lines
        else if (emoji === '🍊' || emoji === '🍋') {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1;
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI * 2 * i) / 6;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(angle) * half.radius * 0.5, Math.sin(angle) * half.radius * 0.5);
                ctx.stroke();
            }
        }
        // Strawberry - add small seeds
        else if (emoji === '🍓') {
            ctx.fillStyle = '#ffe66d';
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI * 2 * i) / 6 + Math.random() * 0.3;
                const dist = half.radius * (0.2 + Math.random() * 0.2);
                const x = Math.cos(angle) * dist;
                const y = Math.sin(angle) * dist;
                ctx.beginPath();
                ctx.arc(x, y, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    drawTrail(points, opacity) {
        if (points.length < 2)
            return;
        const ctx = this.state.ctx;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        // Draw trail segments with varying thickness (comet effect)
        // Newest point (end) is thickest, oldest point (start) is thinnest
        for (let i = 0; i < points.length - 1; i++) {
            const progress = i / (points.length - 1); // 0 to 1
            const thickness = 1 + progress * 7; // 1px at start, 8px at end
            const segmentOpacity = opacity * (0.3 + progress * 0.7); // Fade older segments
            ctx.globalAlpha = segmentOpacity;
            ctx.strokeStyle = '#00d4ff';
            ctx.lineWidth = thickness;
            ctx.shadowBlur = 10 + progress * 10; // More glow at thick end
            ctx.shadowColor = '#00d4ff';
            ctx.beginPath();
            ctx.moveTo(points[i].x, points[i].y);
            ctx.lineTo(points[i + 1].x, points[i + 1].y);
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }
    updateUI() {
        document.getElementById('score').textContent = this.state.score.toString();
        document.getElementById('level').textContent = this.state.level.toString();
        // Ensure lives is at least 0 before displaying
        const livesCount = Math.max(0, this.state.lives);
        const hearts = '❤️'.repeat(livesCount);
        document.getElementById('lives').textContent = hearts;
    }
    gameLoop(currentTime) {
        if (!this.state.isPlaying)
            return;
        const deltaTime = currentTime - this.state.lastFrameTime;
        this.state.lastFrameTime = currentTime;
        this.updatePhysics(deltaTime);
        this.render();
        requestAnimationFrame((time) => this.gameLoop(time));
    }
}
// ===== LEADERBOARD FUNCTIONALITY =====
const CONTRACT_ADDRESS = '0xa4f109Eb679970C0b30C21812C99318837A81c73';
const API_URL = 'https://base-fruits-game.vercel.app';
let currentScore = 0;
// SAVE LEADERBOARD - MetaMask otomatik açılır
async function saveScore() {
    const usernameInput = document.getElementById('username-input');
    const username = usernameInput.value.trim();
    if (!username) {
        alert('Lütfen kullanıcı adınızı girin!');
        return;
    }
    if (!window.ethereum) {
        alert('MetaMask yükleyin! metamask.io');
        return;
    }
    const btn = document.getElementById('save-leaderboard-button');
    btn.disabled = true;
    btn.textContent = '⏳ İşlem yapılıyor...';
    try {
        // MetaMask otomatik açılır
        const provider = new window.ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []); // ← MetaMask açılır
        const signer = provider.getSigner();
        const walletAddress = await signer.getAddress();
        // Base Mainnet kontrolü
        const network = await provider.getNetwork();
        if (network.chainId !== 8453) {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x2105' }],
            });
        }
        // İmza al
        const signResponse = await fetch(`${API_URL}/api/signScore`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                playerAddress: walletAddress,
                farcasterUsername: username,
                fid: 0,
                score: currentScore
            })
        });
        const signData = await signResponse.json();
        if (!signData.success) {
            throw new Error(signData.message);
        }
        // Contract'a yaz - MetaMask tekrar açılır
        const contract = new window.ethers.Contract(CONTRACT_ADDRESS, ['function submitScore(string memory _farcasterUsername, uint256 _fid, uint256 _score, uint256 _nonce, bytes memory _signature) external'], signer);
        const tx = await contract.submitScore(signData.data.params.farcasterUsername, signData.data.params.fid, signData.data.params.score, signData.data.nonce, signData.data.signature);
        btn.textContent = '⏳ Onay bekleniyor...';
        await tx.wait();
        alert('✅ Skorunuz kaydedildi!');
        btn.textContent = '✅ Kaydedildi!';
    }
    catch (error) {
        console.error(error);
        if (error.code === 'ACTION_REJECTED') {
            alert('İptal edildi.');
        }
        else if (error.message?.includes('insufficient funds')) {
            alert('Yetersiz ETH!');
        }
        else {
            alert('Hata: ' + (error.message || 'Bilinmeyen hata'));
        }
        btn.disabled = false;
        btn.textContent = '💾 Save Leaderboard';
    }
}
// VIEW LEADERBOARD - Wallet gerekmez
async function viewLeaderboard() {
    const modal = document.getElementById('leaderboard-modal');
    const content = document.getElementById('leaderboard-content');
    modal.classList.remove('hidden');
    content.innerHTML = '⏳ Yükleniyor...';
    try {
        const response = await fetch(`${API_URL}/api/leaderboard?limit=20`);
        const data = await response.json();
        if (!data.success || data.leaderboard.length === 0) {
            content.innerHTML = '<p>Henüz skor yok. İlk sen ol! 🎯</p>';
            return;
        }
        let html = '';
        data.leaderboard.forEach((item) => {
            html += `
                <div class="leaderboard-item">
                    <span>${item.rank}. ${item.username}</span>
                    <span><strong>${item.score}</strong></span>
                </div>
            `;
        });
        content.innerHTML = html;
    }
    catch (error) {
        content.innerHTML = '<p>Bağlantı hatası!</p>';
    }
}
function closeLeaderboard() {
    document.getElementById('leaderboard-modal').classList.add('hidden');
}
// ===== INITIALIZE GAME =====
window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing game...');
    try {
        const game = new FruitSliceGame();
        console.log('Game initialized successfully:', game);
        // Leaderboard event listeners
        document.getElementById('save-leaderboard-button').addEventListener('click', saveScore);
        document.getElementById('view-leaderboard-button').addEventListener('click', viewLeaderboard);
        document.getElementById('close-leaderboard').addEventListener('click', closeLeaderboard);
        // Modal dışına tıklayınca kapat
        document.getElementById('leaderboard-modal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('leaderboard-modal')) {
                closeLeaderboard();
            }
        });
    }
    catch (error) {
        console.error('Error initializing game:', error);
    }
});
//# sourceMappingURL=game.js.map