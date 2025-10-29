var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// ===== GAME CONSTANTS =====
const GRAVITY = 0.17;
const INITIAL_LIVES = 4;
const MAX_LEVEL = 50;
const FRUIT_RADIUS = 26.46;
const TRAIL_FADE_SPEED = 0.45; // Daha hızlı kaybolma
const MAX_TRAIL_POINTS = 8; // Daha az nokta - performans için
const WALL_BOUNCE_DAMPING = 0.7;
const MAX_FRUITS = 7;
const MAX_PARTICLES = 50; // Daha az partikül - performans için
const MAX_TRAILS = 2; // Daha az trail
const MAX_SCORE_POPUPS = 3; // Daha az popup
const TRAIL_POINT_DISTANCE = 15; // Trail noktaları arası mesafe - daha seyrek
const FRUIT_TYPES = [
    { name: 'apple', emoji: '🍎', color: '#ff6b6b', imagePath: 'images/apple.png', halfImagePath: 'images/half_apple.png' },
    { name: 'orange', emoji: '🍊', color: '#ffa500', imagePath: 'images/orange.png', halfImagePath: 'images/half_orange.png' },
    { name: 'lemon', emoji: '🍋', color: '#ffd93d', imagePath: 'images/lemon.png', halfImagePath: 'images/half_lemon.png' },
    { name: 'watermelon', emoji: '🍉', color: '#ff6b9d', imagePath: 'images/watermelon.png', halfImagePath: 'images/half_watermelon.png' },
    { name: 'strawberry', emoji: '🍓', color: '#ff4757', imagePath: 'images/strawberry.png', halfImagePath: 'images/half_strawberry.png' },
    { name: 'kiwi', emoji: '🥝', color: '#6bcf7f', imagePath: 'images/kiwi.png', halfImagePath: 'images/half_kiwi.png' },
    { name: 'pineapple', emoji: '🍍', color: '#ffe66d', imagePath: 'images/pineapple.png', halfImagePath: 'images/half_pineapple.png' }
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
        this.lastSwooshTime = 0;
        this.lastTrailPoint = null; // Trail optimizasyonu için
        // Combo system
        this.comboFruits = [];
        this.comboTimer = null;
        this.comboTimeoutDuration = 250;
        // Bomb explosion effects
        this.screenShake = 0;
        this.redFlash = 0;
        this.isPaused = false;
        // Level management
        this.allFruitsLaunched = false;
        this.showingMilestone = false;
        // Animation & Performance
        this.lastFrameTime = 0;
        this.frameSkipCounter = 0;
        this.isLowPerformance = false;
        this.targetFPS = 60;
        this.frameInterval = 1000 / 60;
        this.offscreenCanvas = null;
        this.offscreenCtx = null;
        // Fruit images
        this.fruitImages = new Map();
        this.halfFruitImages = new Map();
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d', {
            alpha: false,
            desynchronized: true // Performans için
        });
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.width = 0;
        this.height = 0;
        this.resize();
        // Offscreen canvas için double buffering
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCtx = this.offscreenCanvas.getContext('2d', { alpha: false });
        // Load audio files
        this.swooshSound = new Audio('sounds/swoosh.mp3');
        this.sliceSound = new Audio('sounds/slice.mp3');
        this.explosionSound = new Audio('sounds/explosion.mp3');
        this.fuseSound = new Audio('sounds/fuse.mp3');
        this.fallSound = new Audio('sounds/fall.mp3');
        this.excellentSound = new Audio('sounds/excellent.mp3');
        this.amazingSound = new Audio('sounds/amazing.mp3');
        this.legendarySound = new Audio('sounds/legendary.mp3');
        this.failSound = new Audio('sounds/fail.mp3');
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
        this.failSound.volume = 0.7;
        // Load fruit images
        FRUIT_TYPES.forEach(fruitType => {
            const img = new Image();
            img.src = fruitType.imagePath;
            this.fruitImages.set(fruitType.name, img);
            const halfImg = new Image();
            halfImg.src = fruitType.halfImagePath;
            this.halfFruitImages.set(fruitType.name, halfImg);
        });
        window.addEventListener('resize', () => this.resize());
    }
    resize() {
        const container = this.canvas.parentElement;
        this.width = container.clientWidth;
        this.height = container.clientHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        // Offscreen canvas'ı da resize et
        if (this.offscreenCanvas) {
            this.offscreenCanvas.width = this.width;
            this.offscreenCanvas.height = this.height;
        }
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
    handleInputStart(clientX, clientY) {
        if (!this.state.isPlaying || this.state.isPaused)
            return;
        const rect = this.state.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        this.state.isDrawing = true;
        this.state.currentTrail = [{ x, y, timestamp: Date.now() }];
        this.state.lastTrailPoint = { x, y };
        this.state.slicedThisSwipe = [];
    }
    handleInputMove(clientX, clientY) {
        if (!this.state.isPlaying || !this.state.isDrawing || this.state.isPaused)
            return;
        const rect = this.state.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        // Sadece belirli bir mesafeden sonra nokta ekle - performans için
        if (this.state.lastTrailPoint) {
            const dx = x - this.state.lastTrailPoint.x;
            const dy = y - this.state.lastTrailPoint.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < TRAIL_POINT_DISTANCE) {
                return; // Çok yakın, ekleme
            }
        }
        this.state.currentTrail.push({ x, y, timestamp: Date.now() });
        this.state.lastTrailPoint = { x, y };
        // Trail noktalarını sınırla
        if (this.state.currentTrail.length > MAX_TRAIL_POINTS) {
            this.state.currentTrail.shift();
        }
        // Swoosh sound throttling
        const now = Date.now();
        if (now - this.state.lastSwooshTime > 100) {
            this.playSwoosh();
            this.state.lastSwooshTime = now;
        }
        this.checkFruitSlice(x, y);
    }
    handleInputEnd() {
        if (!this.state.isPlaying)
            return;
        this.state.isDrawing = false;
        if (this.state.currentTrail.length > 0) {
            // Trail'i kaydet ama sayıyı sınırla
            if (this.state.trails.length < MAX_TRAILS) {
                this.state.trails.push({
                    points: [...this.state.currentTrail],
                    opacity: 1
                });
            }
        }
        this.state.currentTrail = [];
        this.state.lastTrailPoint = null;
        if (this.state.comboFruits.length > 1) {
            this.activateCombo();
        }
        this.state.comboFruits = [];
        if (this.state.comboTimer) {
            clearTimeout(this.state.comboTimer);
            this.state.comboTimer = null;
        }
    }
    checkFruitSlice(x, y) {
        for (const fruit of this.state.fruits) {
            if (fruit.active && !fruit.sliced && !this.state.slicedThisSwipe.includes(fruit)) {
                const dx = x - fruit.x;
                const dy = y - fruit.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < fruit.radius + 5) {
                    if (fruit.isBomb) {
                        this.explodeBomb(fruit);
                    }
                    else {
                        this.sliceFruit(fruit, x, y);
                    }
                    this.state.slicedThisSwipe.push(fruit);
                }
            }
        }
    }
    sliceFruit(fruit, sliceX, sliceY) {
        fruit.sliced = true;
        fruit.active = false;
        const dx = sliceX - fruit.x;
        const dy = sliceY - fruit.y;
        fruit.sliceAngle = Math.atan2(dy, dx);
        this.createFruitHalves(fruit);
        this.createParticles(fruit.x, fruit.y, fruit.color, 6); // Daha az partikül
        this.playSlice();
        this.addToCombo(fruit);
        this.state.score += 1;
        this.updateScoreDisplay();
        this.state.scorePopups.push({
            x: fruit.x,
            y: fruit.y,
            score: 1,
            opacity: 1,
            scale: 1,
            isSimple: true
        });
        // Popup sayısını sınırla
        if (this.state.scorePopups.length > MAX_SCORE_POPUPS) {
            this.state.scorePopups.shift();
        }
    }
    explodeBomb(bomb) {
        bomb.sliced = true;
        bomb.active = false;
        if (bomb.fuseSound) {
            bomb.fuseSound.pause();
            bomb.fuseSound.currentTime = 0;
        }
        this.playExplosion();
        this.state.isPaused = true;
        this.state.screenShake = 15;
        this.state.redFlash = 1.0;
        this.createExplosionParticles(bomb.x, bomb.y, 20); // Daha az partikül
        setTimeout(() => {
            this.state.isPaused = false;
            this.loseLife();
            if (this.state.comboTimer) {
                clearTimeout(this.state.comboTimer);
                this.state.comboTimer = null;
            }
            this.state.comboFruits = [];
        }, 500);
    }
    createFruitHalves(fruit) {
        const angle = fruit.sliceAngle || 0;
        const perpAngle = angle + Math.PI / 2;
        const separationSpeed = 1.5;
        const halfImage = this.state.halfFruitImages.get(fruit.fruitType);
        this.state.fruitHalves.push({
            x: fruit.x,
            y: fruit.y,
            vx: fruit.vx + Math.cos(perpAngle) * separationSpeed,
            vy: fruit.vy + Math.sin(perpAngle) * separationSpeed - 2,
            radius: fruit.radius,
            color: fruit.color,
            fruitType: fruit.fruitType,
            halfImagePath: halfImage === null || halfImage === void 0 ? void 0 : halfImage.src,
            rotation: fruit.rotation,
            rotationSpeed: fruit.rotationSpeed * 1.5,
            isLeft: true,
            opacity: 1
        });
        this.state.fruitHalves.push({
            x: fruit.x,
            y: fruit.y,
            vx: fruit.vx - Math.cos(perpAngle) * separationSpeed,
            vy: fruit.vy - Math.sin(perpAngle) * separationSpeed - 2,
            radius: fruit.radius,
            color: fruit.color,
            fruitType: fruit.fruitType,
            halfImagePath: halfImage === null || halfImage === void 0 ? void 0 : halfImage.src,
            rotation: fruit.rotation + Math.PI,
            rotationSpeed: fruit.rotationSpeed * 1.5,
            isLeft: false,
            opacity: 1
        });
    }
    createParticles(x, y, color, count = 6) {
        // Partikül sayısını sınırla
        if (this.state.particles.length >= MAX_PARTICLES) {
            return;
        }
        const actualCount = Math.min(count, MAX_PARTICLES - this.state.particles.length);
        for (let i = 0; i < actualCount; i++) {
            const angle = (Math.PI * 2 * i) / actualCount;
            const speed = 2 + Math.random() * 2;
            this.state.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                size: 3 + Math.random() * 3,
                color: color,
                life: 1
            });
        }
    }
    createExplosionParticles(x, y, count = 20) {
        // Partikül sayısını sınırla
        if (this.state.particles.length >= MAX_PARTICLES) {
            return;
        }
        const actualCount = Math.min(count, MAX_PARTICLES - this.state.particles.length);
        for (let i = 0; i < actualCount; i++) {
            const angle = (Math.PI * 2 * i) / actualCount;
            const speed = 3 + Math.random() * 4;
            this.state.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 4 + Math.random() * 4,
                color: '#ff4444',
                life: 1
            });
        }
    }
    addToCombo(fruit) {
        this.state.comboFruits.push(fruit);
        if (this.state.comboTimer) {
            clearTimeout(this.state.comboTimer);
        }
        this.state.comboTimer = window.setTimeout(() => {
            if (this.state.comboFruits.length > 1) {
                this.activateCombo();
            }
            this.state.comboFruits = [];
            this.state.comboTimer = null;
        }, this.state.comboTimeoutDuration);
    }
    activateCombo() {
        const comboSize = this.state.comboFruits.length;
        if (comboSize < 2 || comboSize > 7)
            return;
        const comboScore = SCORE_TABLE[comboSize];
        this.state.score += comboScore;
        this.updateScoreDisplay();
        const firstFruit = this.state.comboFruits[0];
        const lastFruit = this.state.comboFruits[comboSize - 1];
        const centerX = (firstFruit.x + lastFruit.x) / 2;
        const centerY = (firstFruit.y + lastFruit.y) / 2;
        let comboText = '';
        let color = '#ffffff';
        if (comboSize === 2) {
            comboText = 'NICE!';
            color = '#4CAF50';
        }
        else if (comboSize === 3) {
            comboText = 'GREAT!';
            color = '#2196F3';
            this.playExcellent();
        }
        else if (comboSize === 4) {
            comboText = 'EXCELLENT!';
            color = '#9C27B0';
            this.playExcellent();
        }
        else if (comboSize === 5) {
            comboText = 'AMAZING!';
            color = '#FF9800';
            this.playAmazing();
        }
        else if (comboSize === 6) {
            comboText = 'LEGENDARY!';
            color = '#F44336';
            this.playLegendary();
        }
        else if (comboSize === 7) {
            comboText = 'IMPOSSIBLE!';
            color = '#FFD700';
            this.playLegendary();
            this.createFirework(centerX, centerY);
        }
        // Popup sayısını sınırla
        if (this.state.scorePopups.length < MAX_SCORE_POPUPS) {
            this.state.scorePopups.push({
                x: centerX,
                y: centerY,
                score: comboScore,
                opacity: 1,
                scale: 1,
                comboText: comboText,
                color: color
            });
        }
    }
    createFirework(x, y) {
        const particles = [];
        const particleCount = 30; // Daha az partikül
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 3 + Math.random() * 2;
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 2,
                color: `hsl(${Math.random() * 360}, 100%, 50%)`,
                life: 1
            });
        }
        this.state.fireworks.push({ x, y, particles });
    }
    loseLife() {
        this.state.lives--;
        this.updateLivesDisplay();
        this.playFail();
        if (this.state.lives <= 0) {
            this.gameOver();
        }
    }
    gameOver() {
        this.state.isPlaying = false;
        for (const fruit of this.state.fruits) {
            if (fruit.isBomb && fruit.fuseSound) {
                fruit.fuseSound.pause();
                fruit.fuseSound.currentTime = 0;
            }
        }
        this.showGameOverScreen();
    }
    spawnFruit() {
        if (this.state.fruits.length >= MAX_FRUITS)
            return;
        const isBomb = Math.random() < 0.1;
        const spawnX = Math.random() * (this.state.width * 0.8) + this.state.width * 0.1;
        const targetX = Math.random() * (this.state.width * 0.6) + this.state.width * 0.2;
        const vx = (targetX - spawnX) * 0.015;
        const minVy = -10 - (this.state.level * 0.3);
        const maxVy = -8 - (this.state.level * 0.3);
        const vy = minVy + Math.random() * (maxVy - minVy);
        let fuseSound = undefined;
        if (isBomb) {
            fuseSound = new Audio('sounds/fuse.mp3');
            fuseSound.volume = 0.5;
            fuseSound.loop = true;
            fuseSound.play();
        }
        const fruitType = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
        this.state.fruits.push({
            x: spawnX,
            y: this.state.height + FRUIT_RADIUS,
            vx: vx,
            vy: vy,
            radius: FRUIT_RADIUS,
            color: isBomb ? '#333' : fruitType.color,
            fruitType: isBomb ? 'bomb' : fruitType.name,
            imagePath: isBomb ? 'images/bomb.png' : fruitType.imagePath,
            halfImagePath: fruitType.halfImagePath,
            sliced: false,
            active: true,
            isBomb: isBomb,
            fuseSound: fuseSound,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 0.1
        });
    }
    updateFruits() {
        for (let i = this.state.fruits.length - 1; i >= 0; i--) {
            const fruit = this.state.fruits[i];
            if (!fruit.active) {
                if (fruit.isBomb && fruit.fuseSound) {
                    fruit.fuseSound.pause();
                    fruit.fuseSound.currentTime = 0;
                }
                this.state.fruits.splice(i, 1);
                continue;
            }
            fruit.vy += GRAVITY;
            fruit.x += fruit.vx;
            fruit.y += fruit.vy;
            fruit.rotation += fruit.rotationSpeed;
            if (fruit.x - fruit.radius < 0 || fruit.x + fruit.radius > this.state.width) {
                fruit.vx *= -WALL_BOUNCE_DAMPING;
                fruit.x = Math.max(fruit.radius, Math.min(this.state.width - fruit.radius, fruit.x));
            }
            if (fruit.y - fruit.radius > this.state.height) {
                if (!fruit.sliced && !fruit.isBomb) {
                    this.loseLife();
                    this.playFall();
                }
                if (fruit.isBomb && fruit.fuseSound) {
                    fruit.fuseSound.pause();
                    fruit.fuseSound.currentTime = 0;
                }
                this.state.fruits.splice(i, 1);
            }
        }
    }
    updateFruitHalves() {
        for (let i = this.state.fruitHalves.length - 1; i >= 0; i--) {
            const half = this.state.fruitHalves[i];
            half.vy += GRAVITY;
            half.x += half.vx;
            half.y += half.vy;
            half.rotation += half.rotationSpeed;
            half.opacity -= 0.015;
            if (half.y > this.state.height + half.radius || half.opacity <= 0) {
                this.state.fruitHalves.splice(i, 1);
            }
        }
    }
    updateParticles() {
        for (let i = this.state.particles.length - 1; i >= 0; i--) {
            const particle = this.state.particles[i];
            particle.vy += GRAVITY * 0.3;
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= 0.02;
            if (particle.life <= 0) {
                this.state.particles.splice(i, 1);
            }
        }
    }
    updateTrails() {
        for (let i = this.state.trails.length - 1; i >= 0; i--) {
            const trail = this.state.trails[i];
            trail.opacity -= TRAIL_FADE_SPEED * 0.016; // Frame-independent
            if (trail.opacity <= 0) {
                this.state.trails.splice(i, 1);
            }
        }
    }
    updateScorePopups() {
        for (let i = this.state.scorePopups.length - 1; i >= 0; i--) {
            const popup = this.state.scorePopups[i];
            popup.y -= 1;
            popup.opacity -= 0.015;
            popup.scale += 0.02;
            if (popup.opacity <= 0) {
                this.state.scorePopups.splice(i, 1);
            }
        }
    }
    updateFireworks() {
        for (let i = this.state.fireworks.length - 1; i >= 0; i--) {
            const firework = this.state.fireworks[i];
            let allDead = true;
            for (let j = firework.particles.length - 1; j >= 0; j--) {
                const particle = firework.particles[j];
                particle.vy += GRAVITY * 0.2;
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.life -= 0.015;
                if (particle.life <= 0) {
                    firework.particles.splice(j, 1);
                }
                else {
                    allDead = false;
                }
            }
            if (allDead) {
                this.state.fireworks.splice(i, 1);
            }
        }
    }
    drawFruit(fruit) {
        const ctx = this.state.ctx;
        const img = this.state.fruitImages.get(fruit.fruitType);
        if (img && img.complete) {
            ctx.save();
            ctx.translate(fruit.x, fruit.y);
            ctx.rotate(fruit.rotation);
            const size = fruit.radius * 2;
            ctx.drawImage(img, -size / 2, -size / 2, size, size);
            ctx.restore();
        }
        else {
            ctx.fillStyle = fruit.color;
            ctx.beginPath();
            ctx.arc(fruit.x, fruit.y, fruit.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    drawFruitHalf(half) {
        const ctx = this.state.ctx;
        const img = this.state.halfFruitImages.get(half.fruitType);
        ctx.save();
        ctx.globalAlpha = half.opacity;
        ctx.translate(half.x, half.y);
        ctx.rotate(half.rotation);
        if (img && img.complete) {
            const size = half.radius * 2;
            if (half.isLeft) {
                ctx.drawImage(img, -size / 2, -size / 2, size, size);
            }
            else {
                ctx.scale(-1, 1);
                ctx.drawImage(img, -size / 2, -size / 2, size, size);
            }
        }
        else {
            ctx.fillStyle = half.color;
            ctx.beginPath();
            ctx.arc(0, 0, half.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
    drawTrail(trail) {
        if (trail.points.length < 2)
            return;
        const ctx = this.state.ctx;
        ctx.save();
        ctx.globalAlpha = trail.opacity;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        // Gradient için
        const gradient = ctx.createLinearGradient(trail.points[0].x, trail.points[0].y, trail.points[trail.points.length - 1].x, trail.points[trail.points.length - 1].y);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.8)');
        ctx.strokeStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(trail.points[0].x, trail.points[0].y);
        for (let i = 1; i < trail.points.length; i++) {
            ctx.lineTo(trail.points[i].x, trail.points[i].y);
        }
        ctx.stroke();
        ctx.restore();
    }
    drawParticle(particle) {
        const ctx = this.state.ctx;
        ctx.save();
        ctx.globalAlpha = particle.life;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    drawScorePopup(popup) {
        const ctx = this.state.ctx;
        ctx.save();
        ctx.globalAlpha = popup.opacity;
        ctx.translate(popup.x, popup.y);
        ctx.scale(popup.scale, popup.scale);
        if (popup.isSimple) {
            ctx.font = 'bold 20px Arial';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`+${popup.score}`, 0, 0);
        }
        else {
            ctx.font = 'bold 30px Arial';
            ctx.fillStyle = popup.color || '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            if (popup.comboText) {
                ctx.fillText(popup.comboText, 0, -15);
            }
            ctx.font = 'bold 24px Arial';
            ctx.fillText(`+${popup.score}`, 0, 15);
        }
        ctx.restore();
    }
    render() {
        const ctx = this.state.offscreenCtx;
        // Arka plan
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, this.state.width, this.state.height);
        // Bomba patlaması efektleri
        if (this.state.redFlash > 0) {
            ctx.fillStyle = `rgba(255, 0, 0, ${this.state.redFlash * 0.3})`;
            ctx.fillRect(0, 0, this.state.width, this.state.height);
            this.state.redFlash -= 0.05;
        }
        // Screen shake
        if (this.state.screenShake > 0) {
            const offsetX = (Math.random() - 0.5) * this.state.screenShake;
            const offsetY = (Math.random() - 0.5) * this.state.screenShake;
            ctx.translate(offsetX, offsetY);
            this.state.screenShake *= 0.9;
            if (this.state.screenShake < 0.1)
                this.state.screenShake = 0;
        }
        // Çizim sırası - Batch rendering
        // 1. Trail'ler (en altta)
        this.state.trails.forEach(trail => this.drawTrail(trail));
        if (this.state.isDrawing && this.state.currentTrail.length > 1) {
            this.drawTrail({ points: this.state.currentTrail, opacity: 1 });
        }
        // 2. Partiküller
        this.state.particles.forEach(particle => this.drawParticle(particle));
        // 3. Havai fişek partikülleri
        this.state.fireworks.forEach(firework => {
            firework.particles.forEach(particle => this.drawParticle(particle));
        });
        // 4. Meyve yarımları
        this.state.fruitHalves.forEach(half => this.drawFruitHalf(half));
        // 5. Meyveler
        this.state.fruits.forEach(fruit => {
            if (fruit.active) {
                this.drawFruit(fruit);
            }
        });
        // 6. Skor popup'ları (en üstte)
        this.state.scorePopups.forEach(popup => this.drawScorePopup(popup));
        // Offscreen canvas'ı ana canvas'a kopyala
        this.state.ctx.drawImage(this.state.offscreenCanvas, 0, 0);
    }
    gameLoop(currentTime) {
        if (!this.state.isPlaying)
            return;
        // FPS throttling
        const deltaTime = currentTime - this.state.lastFrameTime;
        if (deltaTime < this.state.frameInterval) {
            requestAnimationFrame((time) => this.gameLoop(time));
            return;
        }
        this.state.lastFrameTime = currentTime - (deltaTime % this.state.frameInterval);
        if (!this.state.isPaused) {
            this.updateFruits();
            this.updateFruitHalves();
            this.updateParticles();
            this.updateTrails();
            this.updateScorePopups();
            this.updateFireworks();
            this.checkLevelComplete();
        }
        this.render();
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    checkLevelComplete() {
        if (this.state.allFruitsLaunched &&
            this.state.fruits.length === 0 &&
            this.state.fruitHalves.length === 0 &&
            !this.state.showingMilestone) {
            if (this.state.level < MAX_LEVEL) {
                this.nextLevel();
            }
            else {
                this.showVictoryScreen();
            }
        }
    }
    nextLevel() {
        this.state.level++;
        this.updateLevelDisplay();
        if (this.state.level % 10 === 0) {
            this.showMilestoneScreen();
        }
        else {
            setTimeout(() => {
                this.startLevel();
            }, 1000);
        }
    }
    startLevel() {
        this.state.allFruitsLaunched = false;
        const baseSpawnCount = 5;
        const levelMultiplier = Math.floor((this.state.level - 1) / 5);
        const totalSpawns = baseSpawnCount + levelMultiplier * 2;
        let spawnCount = 0;
        const spawnInterval = setInterval(() => {
            if (!this.state.isPlaying) {
                clearInterval(spawnInterval);
                return;
            }
            this.spawnFruit();
            spawnCount++;
            if (spawnCount >= totalSpawns) {
                clearInterval(spawnInterval);
                this.state.allFruitsLaunched = true;
            }
        }, 1000 - (this.state.level * 10));
    }
    startGame() {
        this.state.isPlaying = true;
        this.state.score = 0;
        this.state.level = 1;
        this.state.lives = INITIAL_LIVES;
        this.state.fruits = [];
        this.state.fruitHalves = [];
        this.state.trails = [];
        this.state.particles = [];
        this.state.scorePopups = [];
        this.state.fireworks = [];
        this.state.currentTrail = [];
        this.state.isDrawing = false;
        this.state.slicedThisSwipe = [];
        this.state.comboFruits = [];
        this.state.screenShake = 0;
        this.state.redFlash = 0;
        this.state.isPaused = false;
        this.state.allFruitsLaunched = false;
        this.state.showingMilestone = false;
        this.state.lastTrailPoint = null;
        this.hideStartScreen();
        this.hideGameOverScreen();
        this.hideMilestoneScreen();
        this.hideVictoryScreen();
        this.updateScoreDisplay();
        this.updateLevelDisplay();
        this.updateLivesDisplay();
        this.startLevel();
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    showStartScreen() {
        document.getElementById('start-screen').classList.remove('hidden');
    }
    hideStartScreen() {
        document.getElementById('start-screen').classList.add('hidden');
    }
    showGameOverScreen() {
        document.getElementById('final-score').textContent = this.state.score.toString();
        document.getElementById('final-level').textContent = this.state.level.toString();
        document.getElementById('game-over-screen').classList.remove('hidden');
        currentScore = this.state.score;
    }
    hideGameOverScreen() {
        document.getElementById('game-over-screen').classList.add('hidden');
    }
    showMilestoneScreen() {
        this.state.showingMilestone = true;
        const milestoneScreen = document.getElementById('milestone-screen');
        const milestoneLevel = document.getElementById('milestone-level');
        milestoneLevel.textContent = this.state.level.toString();
        milestoneScreen.classList.remove('hidden');
        setTimeout(() => {
            this.hideMilestoneScreen();
            this.state.showingMilestone = false;
            this.startLevel();
        }, 2000);
    }
    hideMilestoneScreen() {
        document.getElementById('milestone-screen').classList.add('hidden');
    }
    showVictoryScreen() {
        this.state.isPlaying = false;
        document.getElementById('victory-final-score').textContent = this.state.score.toString();
        document.getElementById('victory-screen').classList.remove('hidden');
        currentScore = this.state.score;
    }
    hideVictoryScreen() {
        document.getElementById('victory-screen').classList.add('hidden');
    }
    updateScoreDisplay() {
        document.getElementById('score').textContent = this.state.score.toString();
    }
    updateLevelDisplay() {
        document.getElementById('level').textContent = this.state.level.toString();
    }
    updateLivesDisplay() {
        const livesContainer = document.getElementById('lives');
        livesContainer.innerHTML = '❤️'.repeat(this.state.lives);
    }
    playSwoosh() {
        this.playSound(this.state.swooshSound);
    }
    playSlice() {
        this.playSound(this.state.sliceSound);
    }
    playExplosion() {
        this.playSound(this.state.explosionSound);
    }
    playFall() {
        this.playSound(this.state.fallSound);
    }
    playExcellent() {
        this.playSound(this.state.excellentSound);
    }
    playAmazing() {
        this.playSound(this.state.amazingSound);
    }
    playLegendary() {
        this.playSound(this.state.legendarySound);
    }
    playFail() {
        this.playSound(this.state.failSound);
    }
    playSound(audio) {
        const clone = audio.cloneNode();
        clone.volume = audio.volume;
        clone.play().catch(() => { });
    }
}
// ===== WALLET & LEADERBOARD =====
const CONTRACT_ADDRESS = '0x7c0F0C4bDACb0eAF8372f275E57C3F962B8Efb38';
const API_URL = 'https://base-fruits-api.vercel.app';
let currentScore = 0;
function connectWallet() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const btn = document.getElementById('save-score-button');
        btn.disabled = true;
        btn.textContent = '⏳ Connecting...';
        try {
            // SDK kontrolü
            const sdk = window.sdk;
            if (sdk === null || sdk === void 0 ? void 0 : sdk.wallet) {
                const provider = sdk.wallet.ethersProvider;
                const signer = provider.getSigner();
                const walletAddress = yield signer.getAddress();
                btn.textContent = '💾 Saving...';
                yield submitScore(walletAddress, provider, signer);
                return;
            }
            // Normal MetaMask/Provider
            if (!window.ethereum) {
                alert('Please install MetaMask!');
                btn.disabled = false;
                btn.textContent = '💾 Save Leaderboard';
                return;
            }
            const rawProvider = window.ethereum;
            yield rawProvider.request({ method: 'eth_requestAccounts' });
            let provider, signer;
            if ((_b = (_a = window.ethers) === null || _a === void 0 ? void 0 : _a.providers) === null || _b === void 0 ? void 0 : _b.Web3Provider) {
                provider = new window.ethers.providers.Web3Provider(rawProvider);
                signer = provider.getSigner();
            }
            else {
                provider = rawProvider;
                signer = null;
            }
            const walletAddress = yield (signer ? signer.getAddress() : rawProvider.request({ method: 'eth_accounts' }).then((accounts) => accounts[0]));
            btn.textContent = '💾 Saving...';
            yield submitScore(walletAddress, provider, signer, rawProvider);
        }
        catch (error) {
            console.error(error);
            if (error.code === 4001) {
                alert('Connection rejected!');
            }
            else {
                alert('Error: ' + (error.message || 'Unknown error'));
            }
            btn.disabled = false;
            btn.textContent = '💾 Save Leaderboard';
        }
    });
}
function submitScore(walletAddress, provider, signer, rawProvider) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const btn = document.getElementById('save-score-button');
        try {
            // Farcaster bilgileri
            const username = window.farcasterUsername || 'Unknown';
            const fid = window.farcasterFid || 0;
            // Network kontrolü
            try {
                const chainId = yield (signer ? provider.getNetwork().then((n) => n.chainId) : rawProvider.request({ method: 'eth_chainId' }).then((id) => parseInt(id, 16)));
                if (chainId !== 8453) {
                    try {
                        if (signer) {
                            yield provider.send('wallet_switchEthereumChain', [{ chainId: '0x2105' }]);
                        }
                        else {
                            yield rawProvider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x2105' }] });
                        }
                    }
                    catch (switchError) {
                        if (switchError.code === 4902) {
                            const addParams = {
                                chainId: '0x2105',
                                chainName: 'Base Mainnet',
                                nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
                                rpcUrls: ['https://mainnet.base.org'],
                                blockExplorerUrls: ['https://basescan.org']
                            };
                            yield (signer ? provider.send('wallet_addEthereumChain', [addParams]) : rawProvider.request({ method: 'wallet_addEthereumChain', params: [addParams] }));
                        }
                        else {
                            throw switchError;
                        }
                    }
                }
            }
            catch (netErr) {
                console.log('Network check failed:', (netErr === null || netErr === void 0 ? void 0 : netErr.message) || netErr);
            }
            // İmza al
            const signResponse = yield fetch(`${API_URL}/api/sign-score`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerAddress: walletAddress,
                    farcasterUsername: username,
                    fid: fid,
                    score: currentScore
                })
            });
            const signData = yield signResponse.json();
            if (!signData.success) {
                throw new Error(signData.message);
            }
            // Contract interaction
            let tx;
            if (window.ethers && window.ethers.Contract && signer) {
                const ethers = window.ethers;
                const contract = new ethers.Contract(CONTRACT_ADDRESS, ['function submitScore(string memory _farcasterUsername, uint256 _fid, uint256 _score, uint256 _nonce, bytes memory _signature) external'], signer);
                tx = yield contract.submitScore(signData.data.params.farcasterUsername, signData.data.params.fid, signData.data.params.score, signData.data.nonce, signData.data.signature);
                btn.textContent = '⏳ Waiting confirmation...';
                yield tx.wait();
            }
            else if (rawProvider) {
                console.log('Using raw transaction without ethers.js');
                const functionSignature = 'submitScore(string,uint256,uint256,uint256,bytes)';
                const ethers = window.ethers;
                if (ethers && ethers.utils) {
                    const iface = new ethers.utils.Interface([
                        'function submitScore(string memory _farcasterUsername, uint256 _fid, uint256 _score, uint256 _nonce, bytes memory _signature) external'
                    ]);
                    const data = iface.encodeFunctionData('submitScore', [
                        signData.data.params.farcasterUsername,
                        signData.data.params.fid,
                        signData.data.params.score,
                        signData.data.nonce,
                        signData.data.signature
                    ]);
                    const txParams = {
                        to: CONTRACT_ADDRESS,
                        from: walletAddress,
                        data: data,
                        gas: '0x30000'
                    };
                    btn.textContent = '⏳ Sending transaction...';
                    const txHash = yield rawProvider.request({
                        method: 'eth_sendTransaction',
                        params: [txParams]
                    });
                    btn.textContent = '⏳ Waiting confirmation...';
                    let receipt = null;
                    let attempts = 0;
                    while (!receipt && attempts < 60) {
                        yield new Promise(resolve => setTimeout(resolve, 2000));
                        receipt = yield rawProvider.request({
                            method: 'eth_getTransactionReceipt',
                            params: [txHash]
                        });
                        attempts++;
                    }
                    if (!receipt) {
                        throw new Error('Transaction timeout');
                    }
                    if (receipt.status === '0x0') {
                        throw new Error('Transaction failed');
                    }
                }
                else {
                    throw new Error('Cannot encode transaction without ethers.js');
                }
            }
            else {
                throw new Error('No provider available for transaction');
            }
            if (!window.sdk) {
                alert('✅ Score saved successfully!');
            }
            btn.textContent = '✅ Saved!';
        }
        catch (error) {
            console.error(error);
            if (!window.sdk) {
                if (error.code === 'ACTION_REJECTED') {
                    alert('Transaction cancelled.');
                }
                else if ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('insufficient funds')) {
                    alert('Insufficient ETH!');
                }
                else {
                    alert('Error: ' + (error.message || 'Unknown error'));
                }
            }
            else {
                btn.textContent = '❌ Error';
            }
            btn.disabled = false;
            btn.textContent = '💾 Save Leaderboard';
        }
    });
}
function viewLeaderboard() {
    return __awaiter(this, void 0, void 0, function* () {
        const modal = document.getElementById('leaderboard-modal');
        const content = document.getElementById('leaderboard-content');
        modal.classList.remove('hidden');
        content.innerHTML = '⏳ Yükleniyor...';
        try {
            const response = yield fetch(`${API_URL}/api/leaderboard?limit=20`);
            const data = yield response.json();
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
    });
}
function closeLeaderboard() {
    document.getElementById('leaderboard-modal').classList.add('hidden');
}
function shareOnFarcaster() {
    const message = `Scored ${currentScore} points in Base Fruits! 🥇 Can you beat me? 🍓🍉`;
    const gameUrl = 'https://base-fruits.vercel.app/';
    const castText = encodeURIComponent(message);
    const embedUrl = encodeURIComponent(gameUrl);
    const farcasterUrl = `https://warpcast.com/~/compose?text=${castText}&embeds[]=${embedUrl}`;
    try {
        const newWindow = window.open(farcasterUrl, '_blank');
        if (!newWindow) {
            window.location.href = farcasterUrl;
        }
    }
    catch (error) {
        navigator.clipboard.writeText(message + ' ' + gameUrl).then(() => {
            alert('Farcaster link could not be opened. Message copied to clipboard!');
        }).catch(() => {
            alert('Unable to open Farcaster. Please manually share: ' + message + ' ' + gameUrl);
        });
    }
}
// ===== INITIALIZE GAME =====
window.addEventListener('DOMContentLoaded', () => {
    try {
        const game = new FruitSliceGame();
        const closeLeaderboardBtn = document.getElementById('close-leaderboard');
        if (closeLeaderboardBtn) {
            closeLeaderboardBtn.addEventListener('click', closeLeaderboard);
        }
        const shareButton = document.getElementById('share-score-button');
        if (shareButton) {
            shareButton.addEventListener('click', shareOnFarcaster);
        }
        const leaderboardModal = document.getElementById('leaderboard-modal');
        if (leaderboardModal) {
            leaderboardModal.addEventListener('click', (e) => {
                if (e.target === leaderboardModal) {
                    closeLeaderboard();
                }
            });
        }
    }
    catch (error) {
        console.error('Error initializing game:', error);
    }
});
