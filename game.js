// ===== GAME CONSTANTS =====
const GRAVITY = 0.17;
const INITIAL_LIVES = 4;
const MAX_LEVEL = 50;
const FRUIT_RADIUS = 26.46;
const TRAIL_FADE_SPEED = 0.35;
const MAX_TRAIL_POINTS = 8; // Azaltıldı (15'ten 8'e)
const WALL_BOUNCE_DAMPING = 0.7;
const MAX_FRUITS = 7;
const MAX_PARTICLES = 30; // Azaltıldı (100'den 30'a)
const MAX_TRAILS = 2; // Azaltıldı (3'ten 2'ye)
const MAX_SCORE_POPUPS = 3; // Azaltıldı (5'ten 3'e)
const PARTICLE_PER_SLICE = 8; // Kesim başına parçacık sayısı
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
// ===== OBJECT POOLS =====
class ObjectPool {
    constructor(factory, reset, initialSize = 20) {
        this.pool = [];
        this.factory = factory;
        this.reset = reset;
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(factory());
        }
    }
    get() {
        if (this.pool.length > 0) {
            const obj = this.pool.pop();
            this.reset(obj);
            return obj;
        }
        return this.factory();
    }
    release(obj) {
        this.pool.push(obj);
    }
}
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
        // Animation - optimizasyon
        this.lastFrameTime = 0;
        this.frameSkipCounter = 0;
        this.targetFPS = 60;
        this.frameDelta = 1000 / 60;
        // Fruit images
        this.fruitImages = new Map();
        this.halfFruitImages = new Map();
        // Rendering optimization
        this.dirtyRegions = [];
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d', {
            alpha: false,
            desynchronized: true // Daha iyi performans için
        });
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.width = 0;
        this.height = 0;
        this.resize();
        // Object pools oluştur
        this.particlePool = new ObjectPool(() => ({ x: 0, y: 0, vx: 0, vy: 0, size: 0, color: '', life: 0, active: false }), (p) => { p.active = false; p.life = 1; }, 50);
        this.trailPool = new ObjectPool(() => ({ points: [], opacity: 1, active: false }), (t) => { t.points = []; t.opacity = 1; t.active = false; }, 5);
        this.scorePopupPool = new ObjectPool(() => ({ x: 0, y: 0, score: 0, opacity: 1, scale: 1, active: false }), (s) => { s.opacity = 1; s.scale = 1; s.active = false; }, 10);
        this.fruitHalfPool = new ObjectPool(() => ({
            x: 0, y: 0, vx: 0, vy: 0, radius: 0, color: '',
            fruitType: '', rotation: 0, rotationSpeed: 0,
            isLeft: false, opacity: 1, active: false
        }), (h) => { h.opacity = 1; h.active = false; }, 30);
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
    }
}
// ===== GAME LOGIC =====
class FruitSliceGame {
    constructor() {
        this.gameLoop = (timestamp) => {
            if (!this.state.isPlaying)
                return;
            const deltaTime = timestamp - this.state.lastFrameTime;
            this.state.lastFrameTime = timestamp;
            this.update(deltaTime);
            this.render();
            requestAnimationFrame(this.gameLoop);
        };
        this.state = new GameState();
        this.setupEventListeners();
        this.showStartScreen();
    }
    setupEventListeners() {
        const startButton = document.getElementById('start-button');
        if (startButton) {
            startButton.addEventListener('click', () => {
                this.startGame();
            });
        }
        document.getElementById('restart-button').addEventListener('click', () => {
            this.startGame();
        });
        // Mouse events
        this.state.canvas.addEventListener('mousedown', (e) => this.handleInputStart(e.clientX, e.clientY));
        this.state.canvas.addEventListener('mousemove', (e) => this.handleInputMove(e.clientX, e.clientY));
        this.state.canvas.addEventListener('mouseup', () => this.handleInputEnd());
        this.state.canvas.addEventListener('mouseleave', () => this.handleInputEnd());
        // Touch events - preventDefault ile scroll engellenmesin
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
        this.state.slicedThisSwipe = [];
    }
    handleInputMove(clientX, clientY) {
        if (!this.state.isDrawing || !this.state.isPlaying || this.state.isPaused)
            return;
        const rect = this.state.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        // Trail noktası ekle
        this.state.currentTrail.push({ x, y, timestamp: Date.now() });
        // MAX_TRAIL_POINTS'i aşmasın
        if (this.state.currentTrail.length > MAX_TRAIL_POINTS) {
            this.state.currentTrail.shift();
        }
        // Swoosh sesi - throttle edilmiş
        const now = Date.now();
        if (now - this.state.lastSwooshTime > 150) {
            this.playSoundSafe(this.state.swooshSound);
            this.state.lastSwooshTime = now;
        }
        // Meyve kontrolleri
        this.checkFruitCollisions(x, y);
    }
    handleInputEnd() {
        if (!this.state.isDrawing)
            return;
        this.state.isDrawing = false;
        // Trail'i pool'a ekle
        if (this.state.currentTrail.length > 2 && this.state.trails.length < MAX_TRAILS) {
            const trail = this.state.trailPool.get();
            trail.points = [...this.state.currentTrail];
            trail.opacity = 1;
            trail.active = true;
            this.state.trails.push(trail);
        }
        this.state.currentTrail = [];
        this.processCombo();
    }
    checkFruitCollisions(x, y) {
        for (const fruit of this.state.fruits) {
            if (fruit.sliced || !fruit.active)
                continue;
            if (this.state.slicedThisSwipe.includes(fruit))
                continue;
            const dx = fruit.x - x;
            const dy = fruit.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < fruit.radius) {
                if (fruit.isBomb) {
                    this.explodeBomb(fruit);
                }
                else {
                    this.sliceFruit(fruit, x, y);
                    this.state.slicedThisSwipe.push(fruit);
                }
            }
        }
    }
    sliceFruit(fruit, sliceX, sliceY) {
        fruit.sliced = true;
        fruit.active = false;
        this.playSoundSafe(this.state.sliceSound);
        const angle = Math.atan2(sliceY - fruit.y, sliceX - fruit.x);
        fruit.sliceAngle = angle;
        // Pool'dan yarımları al
        const leftHalf = this.state.fruitHalfPool.get();
        const rightHalf = this.state.fruitHalfPool.get();
        Object.assign(leftHalf, {
            x: fruit.x,
            y: fruit.y,
            vx: -Math.cos(angle + Math.PI / 2) * 3,
            vy: -Math.sin(angle + Math.PI / 2) * 3 - 2,
            radius: fruit.radius,
            color: fruit.color,
            fruitType: fruit.fruitType,
            halfImagePath: fruit.halfImagePath,
            rotation: fruit.rotation,
            rotationSpeed: fruit.rotationSpeed * 1.2,
            isLeft: true,
            opacity: 1,
            active: true
        });
        Object.assign(rightHalf, {
            x: fruit.x,
            y: fruit.y,
            vx: Math.cos(angle + Math.PI / 2) * 3,
            vy: Math.sin(angle + Math.PI / 2) * 3 - 2,
            radius: fruit.radius,
            color: fruit.color,
            fruitType: fruit.fruitType,
            halfImagePath: fruit.halfImagePath,
            rotation: fruit.rotation,
            rotationSpeed: -fruit.rotationSpeed * 1.2,
            isLeft: false,
            opacity: 1,
            active: true
        });
        this.state.fruitHalves.push(leftHalf, rightHalf);
        // Daha az parçacık oluştur
        for (let i = 0; i < PARTICLE_PER_SLICE; i++) {
            const particle = this.state.particlePool.get();
            const particleAngle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 2;
            Object.assign(particle, {
                x: fruit.x,
                y: fruit.y,
                vx: Math.cos(particleAngle) * speed,
                vy: Math.sin(particleAngle) * speed - 2,
                size: Math.random() * 4 + 3,
                color: fruit.color,
                life: 1,
                active: true
            });
            this.state.particles.push(particle);
        }
        // Combo
        this.state.comboFruits.push(fruit);
        if (this.state.comboTimer) {
            clearTimeout(this.state.comboTimer);
        }
        this.state.comboTimer = window.setTimeout(() => {
            this.processCombo();
        }, this.state.comboTimeoutDuration);
    }
    processCombo() {
        if (this.state.comboFruits.length === 0)
            return;
        const comboCount = this.state.comboFruits.length;
        const points = SCORE_TABLE[Math.min(comboCount, SCORE_TABLE.length - 1)];
        if (comboCount >= 2) {
            const firstFruit = this.state.comboFruits[0];
            this.showScorePopup(firstFruit.x, firstFruit.y, points, comboCount);
            this.state.score += points;
            this.updateScoreDisplay();
            if (comboCount >= 3)
                this.playSoundSafe(this.state.excellentSound);
            if (comboCount >= 5)
                this.playSoundSafe(this.state.amazingSound);
            if (comboCount >= 7)
                this.playSoundSafe(this.state.legendarySound);
        }
        else {
            const fruit = this.state.comboFruits[0];
            this.showScorePopup(fruit.x, fruit.y, 10, 1);
            this.state.score += 10;
            this.updateScoreDisplay();
        }
        this.state.comboFruits = [];
        this.state.comboTimer = null;
    }
    showScorePopup(x, y, score, comboCount) {
        if (this.state.scorePopups.length >= MAX_SCORE_POPUPS) {
            const oldest = this.state.scorePopups.shift();
            if (oldest)
                this.state.scorePopupPool.release(oldest);
        }
        const popup = this.state.scorePopupPool.get();
        Object.assign(popup, {
            x, y, score,
            opacity: 1,
            scale: 1,
            active: true,
            comboText: comboCount >= 2 ? `${comboCount}x COMBO!` : undefined,
            color: comboCount >= 7 ? '#FFD700' :
                comboCount >= 5 ? '#FF4500' :
                    comboCount >= 3 ? '#1E90FF' : '#FFFFFF',
            isSimple: comboCount === 1
        });
        this.state.scorePopups.push(popup);
    }
    explodeBomb(bomb) {
        bomb.active = false;
        bomb.sliced = true;
        this.playSoundSafe(this.state.explosionSound);
        if (bomb.fuseSound) {
            bomb.fuseSound.pause();
            bomb.fuseSound.currentTime = 0;
        }
        this.state.screenShake = 20;
        this.state.redFlash = 0.6;
        this.state.lives--;
        this.updateLivesDisplay();
        // Daha az patlama parçacığı
        for (let i = 0; i < 20; i++) {
            const particle = this.state.particlePool.get();
            const angle = (Math.PI * 2 * i) / 20;
            const speed = Math.random() * 4 + 3;
            Object.assign(particle, {
                x: bomb.x,
                y: bomb.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 6 + 4,
                color: '#ff0000',
                life: 1,
                active: true
            });
            this.state.particles.push(particle);
        }
        if (this.state.lives <= 0) {
            this.endGame();
        }
    }
    update(deltaTime) {
        if (!this.state.isPlaying || this.state.isPaused)
            return;
        // Normalize delta time
        const dt = Math.min(deltaTime / 16.67, 2);
        // Update fruits
        for (let i = this.state.fruits.length - 1; i >= 0; i--) {
            const fruit = this.state.fruits[i];
            if (!fruit.active)
                continue;
            fruit.vy += GRAVITY * dt;
            fruit.x += fruit.vx * dt;
            fruit.y += fruit.vy * dt;
            fruit.rotation += fruit.rotationSpeed * dt;
            // Wall bounce
            if (fruit.x < fruit.radius) {
                fruit.x = fruit.radius;
                fruit.vx *= -WALL_BOUNCE_DAMPING;
            }
            else if (fruit.x > this.state.width - fruit.radius) {
                fruit.x = this.state.width - fruit.radius;
                fruit.vx *= -WALL_BOUNCE_DAMPING;
            }
            // Screen dışına çıkan meyveleri kaldır
            if (fruit.y > this.state.height + 100) {
                if (!fruit.sliced && !fruit.isBomb) {
                    this.state.lives--;
                    this.updateLivesDisplay();
                    this.playSoundSafe(this.state.fallSound);
                    if (this.state.lives <= 0) {
                        this.endGame();
                    }
                }
                if (fruit.fuseSound) {
                    fruit.fuseSound.pause();
                    fruit.fuseSound.currentTime = 0;
                }
                this.state.fruits.splice(i, 1);
            }
        }
        // Update fruit halves
        for (let i = this.state.fruitHalves.length - 1; i >= 0; i--) {
            const half = this.state.fruitHalves[i];
            if (!half.active)
                continue;
            half.vy += GRAVITY * dt;
            half.x += half.vx * dt;
            half.y += half.vy * dt;
            half.rotation += half.rotationSpeed * dt;
            half.opacity -= 0.01 * dt;
            if (half.y > this.state.height + 100 || half.opacity <= 0) {
                this.state.fruitHalfPool.release(half);
                this.state.fruitHalves.splice(i, 1);
            }
        }
        // Update particles
        for (let i = this.state.particles.length - 1; i >= 0; i--) {
            const particle = this.state.particles[i];
            if (!particle.active)
                continue;
            particle.vy += GRAVITY * 0.5 * dt;
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;
            particle.life -= 0.02 * dt;
            if (particle.life <= 0) {
                this.state.particlePool.release(particle);
                this.state.particles.splice(i, 1);
            }
        }
        // Update trails
        for (let i = this.state.trails.length - 1; i >= 0; i--) {
            const trail = this.state.trails[i];
            trail.opacity -= TRAIL_FADE_SPEED * dt;
            if (trail.opacity <= 0) {
                this.state.trailPool.release(trail);
                this.state.trails.splice(i, 1);
            }
        }
        // Update score popups
        for (let i = this.state.scorePopups.length - 1; i >= 0; i--) {
            const popup = this.state.scorePopups[i];
            popup.y -= 1 * dt;
            popup.opacity -= 0.015 * dt;
            popup.scale += 0.01 * dt;
            if (popup.opacity <= 0) {
                this.state.scorePopupPool.release(popup);
                this.state.scorePopups.splice(i, 1);
            }
        }
        // Screen shake
        if (this.state.screenShake > 0) {
            this.state.screenShake -= 1 * dt;
        }
        // Red flash
        if (this.state.redFlash > 0) {
            this.state.redFlash -= 0.02 * dt;
        }
        // Level check
        if (this.state.allFruitsLaunched && this.state.fruits.length === 0) {
            this.nextLevel();
        }
    }
    render() {
        const ctx = this.state.ctx;
        const shake = this.state.screenShake;
        // Clear canvas - arka plan
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, this.state.width, this.state.height);
        // Screen shake
        if (shake > 0) {
            ctx.save();
            ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
        }
        // Red flash
        if (this.state.redFlash > 0) {
            ctx.fillStyle = `rgba(255, 0, 0, ${this.state.redFlash * 0.3})`;
            ctx.fillRect(0, 0, this.state.width, this.state.height);
        }
        // Trails - Bezier curve ile yumuşak
        this.renderTrails(ctx);
        // Current trail
        if (this.state.isDrawing && this.state.currentTrail.length > 1) {
            this.renderSmoothTrail(ctx, this.state.currentTrail, 1);
        }
        // Fruits
        for (const fruit of this.state.fruits) {
            if (!fruit.active)
                continue;
            this.renderFruit(ctx, fruit);
        }
        // Fruit halves
        for (const half of this.state.fruitHalves) {
            if (!half.active)
                continue;
            this.renderFruitHalf(ctx, half);
        }
        // Particles
        for (const particle of this.state.particles) {
            if (!particle.active)
                continue;
            ctx.globalAlpha = particle.life;
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        // Score popups
        for (const popup of this.state.scorePopups) {
            if (!popup.active)
                continue;
            this.renderScorePopup(ctx, popup);
        }
        if (shake > 0) {
            ctx.restore();
        }
    }
    renderTrails(ctx) {
        for (const trail of this.state.trails) {
            if (trail.points.length < 2)
                continue;
            this.renderSmoothTrail(ctx, trail.points, trail.opacity);
        }
    }
    renderSmoothTrail(ctx, points, opacity) {
        if (points.length < 2)
            return;
        // Bezier curve ile yumuşak trail çizimi
        ctx.globalAlpha = opacity;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length - 1; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2;
            const yc = (points[i].y + points[i + 1].y) / 2;
            ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }
        // Son nokta
        if (points.length > 1) {
            const last = points[points.length - 1];
            const prev = points[points.length - 2];
            ctx.quadraticCurveTo(prev.x, prev.y, last.x, last.y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
    renderFruit(ctx, fruit) {
        ctx.save();
        ctx.translate(fruit.x, fruit.y);
        ctx.rotate(fruit.rotation);
        const img = this.state.fruitImages.get(fruit.fruitType);
        if (img && img.complete) {
            const size = fruit.radius * 2;
            ctx.drawImage(img, -fruit.radius, -fruit.radius, size, size);
        }
        else {
            ctx.fillStyle = fruit.color;
            ctx.beginPath();
            ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
    renderFruitHalf(ctx, half) {
        ctx.save();
        ctx.globalAlpha = half.opacity;
        ctx.translate(half.x, half.y);
        ctx.rotate(half.rotation);
        const img = this.state.halfFruitImages.get(half.fruitType);
        if (img && img.complete) {
            const size = half.radius * 2;
            if (half.isLeft) {
                ctx.scale(-1, 1);
            }
            ctx.drawImage(img, -half.radius, -half.radius, size, size);
        }
        else {
            ctx.fillStyle = half.color;
            ctx.beginPath();
            ctx.arc(0, 0, half.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
    renderScorePopup(ctx, popup) {
        ctx.save();
        ctx.globalAlpha = popup.opacity;
        ctx.translate(popup.x, popup.y);
        ctx.scale(popup.scale, popup.scale);
        ctx.fillStyle = popup.color || '#FFFFFF';
        ctx.font = popup.isSimple ? 'bold 24px Arial' : 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (popup.comboText) {
            ctx.fillText(popup.comboText, 0, -20);
        }
        ctx.fillText(`+${popup.score}`, 0, popup.comboText ? 10 : 0);
        ctx.restore();
    }
    startGame() {
        this.state.score = 0;
        this.state.level = 1;
        this.state.lives = INITIAL_LIVES;
        this.state.fruits = [];
        this.state.fruitHalves = [];
        this.state.trails = [];
        this.state.particles = [];
        this.state.scorePopups = [];
        this.state.comboFruits = [];
        this.state.allFruitsLaunched = false;
        this.updateScoreDisplay();
        this.updateLevelDisplay();
        this.updateLivesDisplay();
        this.hideStartScreen();
        this.hideGameOver();
        this.state.isPlaying = true;
        this.state.lastFrameTime = performance.now();
        this.launchWave();
        requestAnimationFrame(this.gameLoop);
    }
    launchWave() {
        const fruitsInWave = Math.min(3 + Math.floor(this.state.level / 3), MAX_FRUITS);
        const hasBomb = Math.random() < 0.3;
        this.state.allFruitsLaunched = false;
        for (let i = 0; i < fruitsInWave; i++) {
            setTimeout(() => {
                this.launchFruit(hasBomb && i === fruitsInWave - 1);
                if (i === fruitsInWave - 1) {
                    this.state.allFruitsLaunched = true;
                }
            }, i * 400);
        }
    }
    launchFruit(isBomb = false) {
        const fruitType = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
        const fruit = {
            x: Math.random() * (this.state.width - 200) + 100,
            y: this.state.height + 50,
            vx: (Math.random() - 0.5) * 4,
            vy: -12 - Math.random() * 4,
            radius: FRUIT_RADIUS,
            color: isBomb ? '#333' : fruitType.color,
            fruitType: isBomb ? 'bomb' : fruitType.name,
            imagePath: isBomb ? 'images/bomb.png' : fruitType.imagePath,
            halfImagePath: fruitType.halfImagePath,
            sliced: false,
            active: true,
            isBomb: isBomb,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 0.1
        };
        if (isBomb) {
            const fuseAudio = this.state.fuseSound.cloneNode();
            fuseAudio.volume = 0.5;
            fuseAudio.play().catch(() => { });
            fruit.fuseSound = fuseAudio;
        }
        this.state.fruits.push(fruit);
    }
    nextLevel() {
        this.state.level++;
        this.updateLevelDisplay();
        if (this.state.level > MAX_LEVEL) {
            this.endGame();
            return;
        }
        const isMilestone = this.state.level % 10 === 0;
        if (isMilestone) {
            this.showMilestone();
        }
        else {
            setTimeout(() => this.launchWave(), 1000);
        }
    }
    showMilestone() {
        this.state.showingMilestone = true;
        const milestoneDiv = document.createElement('div');
        milestoneDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: #FFD700;
            padding: 40px;
            border-radius: 20px;
            font-size: 48px;
            font-weight: bold;
            text-align: center;
            z-index: 1000;
            animation: pulse 0.5s ease-in-out;
        `;
        milestoneDiv.textContent = `Level ${this.state.level}!`;
        document.body.appendChild(milestoneDiv);
        setTimeout(() => {
            document.body.removeChild(milestoneDiv);
            this.state.showingMilestone = false;
            this.launchWave();
        }, 2000);
    }
    endGame() {
        this.state.isPlaying = false;
        for (const fruit of this.state.fruits) {
            if (fruit.fuseSound) {
                fruit.fuseSound.pause();
                fruit.fuseSound.currentTime = 0;
            }
        }
        this.showGameOver();
    }
    playSoundSafe(audio) {
        try {
            const clone = audio.cloneNode();
            clone.volume = audio.volume;
            clone.play().catch(() => { });
        }
        catch (e) { }
    }
    updateScoreDisplay() {
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            scoreElement.textContent = `Score: ${this.state.score}`;
        }
    }
    updateLevelDisplay() {
        const levelElement = document.getElementById('level');
        if (levelElement) {
            levelElement.textContent = `Level: ${this.state.level}`;
        }
    }
    updateLivesDisplay() {
        const livesElement = document.getElementById('lives');
        if (livesElement) {
            livesElement.textContent = `❤️ ${this.state.lives}`;
        }
    }
    showStartScreen() {
        const startScreen = document.getElementById('start-screen');
        if (startScreen) {
            startScreen.classList.remove('hidden');
        }
    }
    hideStartScreen() {
        const startScreen = document.getElementById('start-screen');
        if (startScreen) {
            startScreen.classList.add('hidden');
        }
    }
    showGameOver() {
        const gameOverScreen = document.getElementById('game-over');
        const finalScoreElement = document.getElementById('final-score');
        if (gameOverScreen && finalScoreElement) {
            finalScoreElement.textContent = `${this.state.score}`;
            gameOverScreen.classList.remove('hidden');
            window.currentScore = this.state.score;
        }
    }
    hideGameOver() {
        const gameOverScreen = document.getElementById('game-over');
        if (gameOverScreen) {
            gameOverScreen.classList.add('hidden');
        }
    }
}
let currentScore = 0;
const API_URL = 'https://base-fruits-backend.vercel.app';
const CONTRACT_ADDRESS = '0xF5AbbF1B6acB9E23E2e92e1ECBFC481D97b7daac';
async function connectWallet() {
    var _a;
    const btn = document.getElementById('save-score-button');
    try {
        btn.disabled = true;
        btn.textContent = '⏳ Connecting...';
        let provider;
        let signer;
        let rawProvider = null;
        let walletAddress = '';
        if (window.sdk) {
            console.log('Farcaster Frame detected');
            rawProvider = window.sdk.wallet.ethProvider;
            if (!rawProvider) {
                throw new Error('Frame wallet provider not available');
            }
            const accounts = await rawProvider.request({
                method: 'eth_requestAccounts'
            });
            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts returned from Frame');
            }
            walletAddress = accounts[0];
            console.log('Frame wallet connected:', walletAddress);
            if (window.ethers) {
                provider = new ethers.providers.Web3Provider(rawProvider);
                signer = provider.getSigner();
            }
        }
        else {
            if (typeof window.ethereum === 'undefined') {
                window.open('https://metamask.io/download/', '_blank');
                throw new Error('MetaMask not installed');
            }
            rawProvider = window.ethereum;
            const accounts = await rawProvider.request({
                method: 'eth_requestAccounts'
            });
            walletAddress = accounts[0];
            if (window.ethers) {
                provider = new ethers.providers.Web3Provider(rawProvider);
                signer = provider.getSigner();
            }
        }
        console.log('Wallet connected:', walletAddress);
        btn.textContent = '✅ Wallet Connected';
        try {
            const chainId = await rawProvider.request({ method: 'eth_chainId' });
            if (chainId !== '0x2105') {
                try {
                    await rawProvider.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0x2105' }]
                    });
                }
                catch (switchError) {
                    if (switchError.code === 4902) {
                        await rawProvider.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                    chainId: '0x2105',
                                    chainName: 'Base',
                                    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                                    rpcUrls: ['https://mainnet.base.org'],
                                    blockExplorerUrls: ['https://basescan.org']
                                }]
                        });
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
        await saveScore(walletAddress, signer, rawProvider);
    }
    catch (error) {
        console.error('Connection error:', error);
        if (error.code === 4001) {
            alert('Connection cancelled.');
        }
        else if ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('MetaMask not installed')) {
            alert('MetaMask not found! Redirecting to download page...');
        }
        else {
            alert('Connection error: ' + (error.message || 'Unknown error'));
        }
        btn.disabled = false;
        btn.textContent = '💾 Save Leaderboard';
    }
}
async function saveScore(walletAddress, signer, rawProvider) {
    var _a, _b, _c;
    const btn = document.getElementById('save-score-button');
    try {
        btn.textContent = '⏳ Getting signature...';
        let username = 'anon';
        let fid = 0;
        if ((_b = (_a = window.sdk) === null || _a === void 0 ? void 0 : _a.context) === null || _b === void 0 ? void 0 : _b.user) {
            const user = window.sdk.context.user;
            username = user.username || user.displayName || 'anon';
            fid = user.fid || 0;
        }
        try {
            const chainId = await rawProvider.request({ method: 'eth_chainId' });
            if (chainId !== '0x2105') {
                try {
                    await rawProvider.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0x2105' }]
                    });
                }
                catch (switchError) {
                    if (switchError.code === 4902) {
                        await rawProvider.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                    chainId: '0x2105',
                                    chainName: 'Base',
                                    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                                    rpcUrls: ['https://mainnet.base.org'],
                                    blockExplorerUrls: ['https://basescan.org']
                                }]
                        });
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
        const signResponse = await fetch(`${API_URL}/api/sign-score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                playerAddress: walletAddress,
                farcasterUsername: username,
                fid: fid,
                score: currentScore
            })
        });
        const signData = await signResponse.json();
        if (!signData.success) {
            throw new Error(signData.message);
        }
        let tx;
        if (window.ethers && window.ethers.Contract && signer) {
            const ethers = window.ethers;
            const contract = new ethers.Contract(CONTRACT_ADDRESS, ['function submitScore(string memory _farcasterUsername, uint256 _fid, uint256 _score, uint256 _nonce, bytes memory _signature) external'], signer);
            tx = await contract.submitScore(signData.data.params.farcasterUsername, signData.data.params.fid, signData.data.params.score, signData.data.nonce, signData.data.signature);
            btn.textContent = '⏳ Waiting confirmation...';
            await tx.wait();
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
                const txHash = await rawProvider.request({
                    method: 'eth_sendTransaction',
                    params: [txParams]
                });
                btn.textContent = '⏳ Waiting confirmation...';
                let receipt = null;
                let attempts = 0;
                while (!receipt && attempts < 60) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    receipt = await rawProvider.request({
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
            else if ((_c = error.message) === null || _c === void 0 ? void 0 : _c.includes('insufficient funds')) {
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
}
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
