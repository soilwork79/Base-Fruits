"use strict";
// ===== GAME CONSTANTS =====
const GRAVITY = 0.17;
const INITIAL_LIVES = 4;
const MAX_LEVEL = 50;
const FRUIT_RADIUS = 26.46;
const TRAIL_FADE_SPEED = 0.35;
const MAX_TRAIL_POINTS = 15; // ✅ PERFORMANCE: 30'dan 15'e düşürüldü
const WALL_BOUNCE_DAMPING = 0.7;
const MAX_FRUITS = 7;
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

// ✅ PERFORMANCE: Daha sıkı limitler
const MAX_PARTICLES = 30; // 50'den 30'a
const MAX_FRUIT_HALVES = 10; // 20'den 10'a
const MAX_TRAILS = 3; // 5'ten 3'e
const MAX_SCORE_POPUPS = 5; // Yeni limit
const MAX_FIREWORKS = 3; // Yeni limit

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
        this.comboTimeoutDuration = 250;
        
        // Bomb explosion effects
        this.screenShake = 0;
        this.redFlash = 0;
        this.isPaused = false;
        
        // Level management
        this.allFruitsLaunched = false;
        this.showingMilestone = false;
        
        // Animation
        this.lastFrameTime = 0;
        
        // ✅ PERFORMANCE: Frame skip for mobile
        this.frameSkipCounter = 0;
        this.shouldSkipFrame = false;
        
        // Fruit images
        this.fruitImages = new Map();
        this.halfFruitImages = new Map();
        
        this.canvas = document.getElementById('game-canvas');
        
        // ✅ PERFORMANCE: Optimized canvas context
        this.ctx = this.canvas.getContext('2d', {
            alpha: false,
            desynchronized: true,
            willReadFrequently: false
        });
        
        // ✅ PERFORMANCE: Image smoothing optimal ayarı
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'low';
        
        // Audio context
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.unlockAudio();
        
        this.width = 0;
        this.height = 0;
        
        // Delay resize
        setTimeout(() => {
            this.resize();
            console.log('🎮 Initial canvas setup complete');
        }, 100);
        
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
        
        // ✅ PERFORMANCE: Preload images
        const imageLoadPromises = [];
        FRUIT_TYPES.forEach(fruitType => {
            const img = new Image();
            const halfImg = new Image();
            
            const loadPromise = new Promise((resolve) => {
                let loaded = 0;
                img.onload = halfImg.onload = () => {
                    loaded++;
                    if (loaded === 2) resolve();
                };
                img.onerror = halfImg.onerror = () => resolve(); // Continue even if failed
            });
            
            img.src = fruitType.imagePath;
            halfImg.src = fruitType.halfImagePath;
            
            this.fruitImages.set(fruitType.name, img);
            this.halfFruitImages.set(fruitType.name, halfImg);
            
            imageLoadPromises.push(loadPromise);
        });
        
        // Wait for all images to load
        Promise.all(imageLoadPromises).then(() => {
            console.log('✅ All fruit images loaded');
        });
        
        window.addEventListener('resize', () => this.resize());
    }
    
    resize() {
        const container = this.canvas.parentElement;
        container.style.display = 'block';
        
        this.width = container.clientWidth || window.innerWidth;
        this.height = container.clientHeight || window.innerHeight;
        
        if (this.width === 0) this.width = window.innerWidth;
        if (this.height === 0) this.height = window.innerHeight;
        
        // ✅ PERFORMANCE: DPR'yi 1.5 ile sınırla (2 yerine)
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
        
        this.ctx.scale(dpr, dpr);
        
        console.log('✅ Canvas resized:', {
            width: this.width,
            height: this.height,
            dpr: dpr,
            pixels: this.canvas.width * this.canvas.height
        });
    }
    
    unlockAudio() {
        const unlock = () => {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume().then(() => {
                    console.log('✅ Audio unlocked');
                }).catch(err => {
                    console.warn('⚠️ Audio unlock failed:', err);
                });
            }
        };
        document.addEventListener('touchstart', unlock, { once: true });
        document.addEventListener('click', unlock, { once: true });
        unlock();
    }
    
    // ✅ PERFORMANCE: Yeni cleanup metodu
    cleanupObjects() {
        // Fruit halves cleanup - ekrandan çıkanları sil
        this.fruitHalves = this.fruitHalves.filter(half => {
            return half.y < this.height + 100 && half.opacity > 0.01;
        });
        
        // Limit fruit halves
        if (this.fruitHalves.length > MAX_FRUIT_HALVES) {
            this.fruitHalves = this.fruitHalves.slice(-MAX_FRUIT_HALVES);
        }
        
        // Particles cleanup - ölmüş particle'ları sil
        this.particles = this.particles.filter(particle => {
            return particle.life > 0 && particle.y < this.height + 50;
        });
        
        // Limit particles
        if (this.particles.length > MAX_PARTICLES) {
            this.particles = this.particles.slice(-MAX_PARTICLES);
        }
        
        // Trails cleanup
        this.trails = this.trails.filter(trail => {
            return trail.points && trail.points.length > 0 && trail.opacity > 0.01;
        });
        
        // Limit trails
        if (this.trails.length > MAX_TRAILS) {
            this.trails = this.trails.slice(-MAX_TRAILS);
        }
        
        // Score popups cleanup
        this.scorePopups = this.scorePopups.filter(popup => popup.opacity > 0.01);
        
        // Limit score popups
        if (this.scorePopups.length > MAX_SCORE_POPUPS) {
            this.scorePopups = this.scorePopups.slice(-MAX_SCORE_POPUPS);
        }
        
        // Fireworks cleanup
        this.fireworks = this.fireworks.filter(fw => fw.particles && fw.particles.length > 0);
        
        // Limit fireworks
        if (this.fireworks.length > MAX_FIREWORKS) {
            this.fireworks = this.fireworks.slice(-MAX_FIREWORKS);
        }
    }
}

// ===== GAME LOGIC =====
class FruitSliceGame {
    constructor() {
        this.state = new GameState();
        this.setupEventListeners();
        this.showStartScreen();
        this.setupVisibilityHandler();
        
        // ✅ PERFORMANCE: Cleanup interval
        this.cleanupInterval = setInterval(() => {
            if (this.state.isPlaying) {
                this.state.cleanupObjects();
            }
        }, 2000); // Her 2 saniyede bir temizlik
    }
    
    setupEventListeners() {
        const startButton = document.getElementById('start-button');
        console.log('Start button found:', startButton);
        if (startButton) {
            startButton.addEventListener('click', () => {
                console.log('Start button clicked!');
                this.startGame();
            });
        }
        
        document.getElementById('restart-button').addEventListener('click', () => {
            this.startGame();
        });
        
        // ✅ PERFORMANCE: Passive event listeners for better scroll performance
        this.state.canvas.addEventListener('mousedown', (e) => this.handleInputStart(e.clientX, e.clientY), { passive: true });
        this.state.canvas.addEventListener('mousemove', (e) => this.handleInputMove(e.clientX, e.clientY), { passive: true });
        this.state.canvas.addEventListener('mouseup', () => this.handleInputEnd(), { passive: true });
        
        this.state.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleInputStart(touch.clientX, touch.clientY);
        });
        
        this.state.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleInputMove(touch.clientX, touch.clientY);
        });
        
        this.state.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleInputEnd();
        });
    }
    
    setupVisibilityHandler() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('⏸️ Page hidden - pausing game');
                if (this.state.isPlaying && !this.state.isPaused) {
                    this.state.isPaused = true;
                }
            } else {
                console.log('▶️ Page visible - resuming game');
                if (this.state.isPlaying && this.state.isPaused) {
                    this.state.isPaused = false;
                    this.state.lastFrameTime = performance.now();
                }
            }
        });
    }
    
    handleInputStart(x, y) {
        if (!this.state.isPlaying || this.state.isPaused) return;
        
        this.state.isDrawing = true;
        this.state.currentTrail = [{ x, y, time: Date.now() }];
        this.state.slicedThisSwipe = [];
        
        this.createTrail();
        this.playSound(this.state.swooshSound);
    }
    
    handleInputMove(x, y) {
        if (!this.state.isDrawing || !this.state.isPlaying || this.state.isPaused) return;
        
        const trail = this.state.currentTrail;
        const lastPoint = trail[trail.length - 1];
        
        // ✅ PERFORMANCE: Minimum mesafe kontrolü
        const dx = x - lastPoint.x;
        const dy = y - lastPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 5) { // Sadece 5 piksel üzeri hareketleri kaydet
            trail.push({ x, y, time: Date.now() });
            
            // Trail point limitini kontrol et
            if (trail.length > MAX_TRAIL_POINTS) {
                trail.shift();
            }
            
            this.checkCollisions(lastPoint.x, lastPoint.y, x, y);
        }
    }
    
    handleInputEnd() {
        this.state.isDrawing = false;
        this.state.currentTrail = [];
        this.state.slicedThisSwipe = [];
    }
    
    createTrail() {
        if (this.state.trails.length >= MAX_TRAILS) {
            this.state.trails.shift();
        }
        
        const trail = {
            points: [],
            opacity: 1,
            color: '#ffffff'
        };
        this.state.trails.push(trail);
    }
    
    updateTrails(deltaTime) {
        const fadeAmount = TRAIL_FADE_SPEED * deltaTime;
        
        for (let i = this.state.trails.length - 1; i >= 0; i--) {
            const trail = this.state.trails[i];
            
            if (this.state.isDrawing && i === this.state.trails.length - 1) {
                trail.points = [...this.state.currentTrail];
            }
            
            trail.opacity = Math.max(0, trail.opacity - fadeAmount);
            
            // ✅ PERFORMANCE: Opacity 0 olanları hemen sil
            if (trail.opacity <= 0) {
                this.state.trails.splice(i, 1);
            }
        }
    }
    
    drawTrails(ctx) {
        // ✅ PERFORMANCE: Trail çizimini optimize et
        this.state.trails.forEach(trail => {
            if (trail.opacity <= 0 || !trail.points || trail.points.length < 2) return;
            
            ctx.save();
            ctx.globalAlpha = trail.opacity;
            ctx.strokeStyle = trail.color;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            ctx.beginPath();
            ctx.moveTo(trail.points[0].x, trail.points[0].y);
            
            // ✅ PERFORMANCE: Quadratic curve yerine basit line kullan
            for (let i = 1; i < trail.points.length; i++) {
                ctx.lineTo(trail.points[i].x, trail.points[i].y);
            }
            
            ctx.stroke();
            ctx.restore();
        });
    }
    
    updateParticles(deltaTime) {
        for (let i = this.state.particles.length - 1; i >= 0; i--) {
            const particle = this.state.particles[i];
            
            particle.x += particle.vx * deltaTime;
            particle.y += particle.vy * deltaTime;
            particle.vy += GRAVITY * deltaTime;
            particle.life -= deltaTime;
            
            // ✅ PERFORMANCE: Ölmüş particle'ları hemen sil
            if (particle.life <= 0 || particle.y > this.state.height + 50) {
                this.state.particles.splice(i, 1);
            }
        }
    }
    
    drawParticles(ctx) {
        // ✅ PERFORMANCE: Batch drawing
        ctx.save();
        
        this.state.particles.forEach(particle => {
            if (particle.life <= 0) return;
            
            const opacity = particle.life / particle.maxLife;
            ctx.globalAlpha = opacity;
            ctx.fillStyle = particle.color;
            
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.restore();
    }
    
    updateFruitHalves(deltaTime) {
        for (let i = this.state.fruitHalves.length - 1; i >= 0; i--) {
            const half = this.state.fruitHalves[i];
            
            half.x += half.vx * deltaTime;
            half.y += half.vy * deltaTime;
            half.vy += GRAVITY * deltaTime;
            half.rotation += half.rotationSpeed * deltaTime;
            half.opacity = Math.max(0, half.opacity - 0.5 * deltaTime);
            
            // ✅ PERFORMANCE: Görünmez veya ekran dışı olanları sil
            if (half.opacity <= 0 || half.y > this.state.height + 100) {
                this.state.fruitHalves.splice(i, 1);
            }
        }
    }
    
    drawFruitHalves(ctx) {
        this.state.fruitHalves.forEach(half => {
            if (half.opacity <= 0) return;
            
            ctx.save();
            ctx.globalAlpha = half.opacity;
            ctx.translate(half.x, half.y);
            ctx.rotate(half.rotation);
            
            const img = this.state.halfFruitImages.get(half.type);
            if (img && img.complete) {
                const size = FRUIT_RADIUS * 2;
                ctx.drawImage(img, -size/2, -size/2, size, size);
            }
            
            ctx.restore();
        });
    }
    
    createParticles(x, y, color, count = 10) {
        // ✅ PERFORMANCE: Particle sayısını sınırla
        const actualCount = Math.min(count, MAX_PARTICLES - this.state.particles.length);
        
        for (let i = 0; i < actualCount; i++) {
            const angle = (Math.PI * 2 * i) / actualCount;
            const speed = 2 + Math.random() * 3;
            
            this.state.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                size: 2 + Math.random() * 3,
                color: color,
                life: 30,
                maxLife: 30
            });
        }
    }
    
    sliceFruit(fruit) {
        if (!fruit || fruit.sliced) return;
        
        fruit.sliced = true;
        this.state.slicedThisSwipe.push(fruit.id);
        
        if (!fruit.isBomb) {
            this.state.comboFruits.push(fruit);
            this.playSound(this.state.sliceSound);
            
            // ✅ PERFORMANCE: Fruit half sayısını kontrol et
            if (this.state.fruitHalves.length < MAX_FRUIT_HALVES) {
                // Create two halves
                for (let i = 0; i < 2; i++) {
                    this.state.fruitHalves.push({
                        x: fruit.x,
                        y: fruit.y,
                        vx: (i === 0 ? -2 : 2) + fruit.vx * 0.5,
                        vy: -3 + fruit.vy * 0.5,
                        rotation: 0,
                        rotationSpeed: (Math.random() - 0.5) * 0.2,
                        type: fruit.type,
                        opacity: 1
                    });
                }
            }
            
            // Create particles
            this.createParticles(fruit.x, fruit.y, fruit.color, 8);
            
            // Remove fruit
            const index = this.state.fruits.indexOf(fruit);
            if (index > -1) {
                this.state.fruits.splice(index, 1);
            }
        } else {
            this.explodeBomb(fruit);
        }
    }
    
    explodeBomb(bomb) {
        this.playSound(this.state.explosionSound);
        this.state.screenShake = 20;
        this.state.redFlash = 1;
        
        // Create explosion particles
        this.createParticles(bomb.x, bomb.y, '#ff0000', 15);
        
        // Remove bomb
        const index = this.state.fruits.indexOf(bomb);
        if (index > -1) {
            this.state.fruits.splice(index, 1);
        }
        
        // Lose a life
        this.state.lives--;
        this.updateLifeDisplay();
        
        if (this.state.lives <= 0) {
            this.gameOver();
        }
    }
    
    checkCollisions(x1, y1, x2, y2) {
        this.state.fruits.forEach(fruit => {
            if (fruit.sliced || this.state.slicedThisSwipe.includes(fruit.id)) return;
            
            const dist = this.pointToLineDistance(fruit.x, fruit.y, x1, y1, x2, y2);
            if (dist < FRUIT_RADIUS) {
                this.sliceFruit(fruit);
            }
        });
    }
    
    pointToLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        
        if (lenSq !== 0) {
            param = dot / lenSq;
        }
        
        let xx, yy;
        
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }
        
        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    updateFruits(deltaTime) {
        for (let i = this.state.fruits.length - 1; i >= 0; i--) {
            const fruit = this.state.fruits[i];
            
            fruit.x += fruit.vx * deltaTime;
            fruit.y += fruit.vy * deltaTime;
            fruit.vy += GRAVITY * deltaTime;
            fruit.rotation += fruit.rotationSpeed * deltaTime;
            
            // Wall bounce
            if (fruit.x - FRUIT_RADIUS < 0 || fruit.x + FRUIT_RADIUS > this.state.width) {
                fruit.vx *= -WALL_BOUNCE_DAMPING;
                fruit.x = Math.max(FRUIT_RADIUS, Math.min(this.state.width - FRUIT_RADIUS, fruit.x));
            }
            
            // Check if fruit fell
            if (fruit.y > this.state.height + FRUIT_RADIUS * 2) {
                if (!fruit.isBomb && !fruit.sliced) {
                    this.state.lives--;
                    this.updateLifeDisplay();
                    this.playSound(this.state.fallSound);
                    
                    if (this.state.lives <= 0) {
                        this.gameOver();
                    }
                }
                this.state.fruits.splice(i, 1);
            }
        }
    }
    
    drawFruits(ctx) {
        this.state.fruits.forEach(fruit => {
            ctx.save();
            ctx.translate(fruit.x, fruit.y);
            ctx.rotate(fruit.rotation);
            
            if (fruit.isBomb) {
                // Draw bomb
                ctx.fillStyle = '#2c2c2c';
                ctx.beginPath();
                ctx.arc(0, 0, FRUIT_RADIUS, 0, Math.PI * 2);
                ctx.fill();
                
                // Fuse
                ctx.strokeStyle = '#8b4513';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(0, -FRUIT_RADIUS);
                ctx.lineTo(0, -FRUIT_RADIUS - 10);
                ctx.stroke();
                
                // Spark
                const sparkSize = 3 + Math.random() * 2;
                ctx.fillStyle = '#ff6600';
                ctx.beginPath();
                ctx.arc(0, -FRUIT_RADIUS - 10, sparkSize, 0, Math.PI * 2);
                ctx.fill();
            } else {
                const img = this.state.fruitImages.get(fruit.type);
                if (img && img.complete) {
                    const size = FRUIT_RADIUS * 2;
                    ctx.drawImage(img, -size/2, -size/2, size, size);
                } else {
                    // Fallback
                    ctx.fillStyle = fruit.color;
                    ctx.beginPath();
                    ctx.arc(0, 0, FRUIT_RADIUS, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            
            ctx.restore();
        });
    }
    
    launchFruit() {
        if (this.state.fruits.length >= MAX_FRUITS) return;
        
        const isBomb = Math.random() < this.getBombChance();
        const fruitType = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
        
        const side = Math.random() < 0.5 ? 'left' : 'right';
        const x = side === 'left' ? 
            FRUIT_RADIUS + Math.random() * this.state.width * 0.2 :
            this.state.width - FRUIT_RADIUS - Math.random() * this.state.width * 0.2;
        
        const targetX = this.state.width * 0.3 + Math.random() * this.state.width * 0.4;
        const dx = targetX - x;
        const vx = dx / 60;
        
        const minHeight = this.state.height * 0.4;
        const maxHeight = this.state.height * 0.2;
        const peakHeight = maxHeight + Math.random() * (minHeight - maxHeight);
        const timeToReachPeak = 30 + Math.random() * 20;
        const vy = -Math.sqrt(2 * GRAVITY * (this.state.height - peakHeight));
        
        const fruit = {
            id: Date.now() + Math.random(),
            x: x,
            y: this.state.height + FRUIT_RADIUS,
            vx: vx,
            vy: vy,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 0.15,
            type: fruitType.name,
            emoji: fruitType.emoji,
            color: fruitType.color,
            isBomb: isBomb,
            sliced: false
        };
        
        this.state.fruits.push(fruit);
        
        if (isBomb) {
            this.playSound(this.state.fuseSound);
        }
    }
    
    getBombChance() {
        const baseChance = 0.05;
        const levelBonus = Math.min(this.state.level * 0.01, 0.15);
        return baseChance + levelBonus;
    }
    
    getFruitCount() {
        const base = 3;
        const levelBonus = Math.floor(this.state.level / 5);
        return Math.min(base + levelBonus, 8);
    }
    
    getFruitInterval() {
        const base = 2000;
        const reduction = Math.min(this.state.level * 50, 1000);
        return Math.max(base - reduction, 800);
    }
    
    startLevel() {
        this.state.allFruitsLaunched = false;
        const fruitCount = this.getFruitCount();
        const interval = this.getFruitInterval();
        
        let launched = 0;
        const launchInterval = setInterval(() => {
            if (!this.state.isPlaying || this.state.isPaused) {
                clearInterval(launchInterval);
                return;
            }
            
            this.launchFruit();
            launched++;
            
            if (launched >= fruitCount) {
                clearInterval(launchInterval);
                this.state.allFruitsLaunched = true;
            }
        }, interval);
    }
    
    checkLevelComplete() {
        if (this.state.allFruitsLaunched && this.state.fruits.length === 0) {
            this.processCombo();
            this.nextLevel();
        }
    }
    
    nextLevel() {
        this.state.level++;
        
        if (this.state.level > MAX_LEVEL) {
            this.victory();
            return;
        }
        
        // Show milestone messages
        if (this.state.level % 5 === 0) {
            this.showMilestone();
        } else {
            setTimeout(() => this.startLevel(), 1000);
        }
        
        this.updateLevelDisplay();
    }
    
    showMilestone() {
        this.state.showingMilestone = true;
        
        const messages = {
            5: "Nice Start!",
            10: "Getting Good!",
            15: "Impressive!",
            20: "Amazing!",
            25: "Incredible!",
            30: "Legendary!",
            35: "Unstoppable!",
            40: "Master Slicer!",
            45: "Almost There!",
            50: "Final Level!"
        };
        
        const message = messages[this.state.level] || "Keep Going!";
        
        // Create milestone display
        setTimeout(() => {
            this.state.showingMilestone = false;
            this.startLevel();
        }, 2000);
    }
    
    processCombo() {
        if (this.state.comboTimer) {
            clearTimeout(this.state.comboTimer);
            this.state.comboTimer = null;
        }
        
        if (this.state.comboFruits.length > 0) {
            const comboScore = this.calculateComboScore();
            this.state.score += comboScore;
            this.updateScoreDisplay();
            
            if (this.state.comboFruits.length >= 3) {
                const sounds = {
                    3: this.state.excellentSound,
                    4: this.state.amazingSound,
                    5: this.state.legendarySound
                };
                const sound = sounds[Math.min(this.state.comboFruits.length, 5)];
                if (sound) this.playSound(sound);
            }
            
            // Show score popup
            if (this.state.comboFruits.length > 0) {
                const lastFruit = this.state.comboFruits[this.state.comboFruits.length - 1];
                this.createScorePopup(lastFruit.x, lastFruit.y, comboScore, this.state.comboFruits.length);
            }
            
            this.state.comboFruits = [];
        }
    }
    
    calculateComboScore() {
        const count = Math.min(this.state.comboFruits.length, SCORE_TABLE.length - 1);
        return SCORE_TABLE[count];
    }
    
    createScorePopup(x, y, score, comboCount) {
        // ✅ PERFORMANCE: Popup sayısını kontrol et
        if (this.state.scorePopups.length >= MAX_SCORE_POPUPS) {
            this.state.scorePopups.shift();
        }
        
        this.state.scorePopups.push({
            x: x,
            y: y,
            score: score,
            comboCount: comboCount,
            opacity: 1,
            scale: 0,
            time: 0
        });
    }
    
    updateScorePopups(deltaTime) {
        for (let i = this.state.scorePopups.length - 1; i >= 0; i--) {
            const popup = this.state.scorePopups[i];
            
            popup.time += deltaTime;
            popup.y -= 1 * deltaTime;
            
            if (popup.time < 10) {
                popup.scale = Math.min(1, popup.scale + 0.1 * deltaTime);
            } else {
                popup.opacity = Math.max(0, popup.opacity - 0.02 * deltaTime);
            }
            
            // ✅ PERFORMANCE: Görünmez olanları sil
            if (popup.opacity <= 0) {
                this.state.scorePopups.splice(i, 1);
            }
        }
    }
    
    drawScorePopups(ctx) {
        this.state.scorePopups.forEach(popup => {
            if (popup.opacity <= 0) return;
            
            ctx.save();
            ctx.globalAlpha = popup.opacity;
            ctx.translate(popup.x, popup.y);
            ctx.scale(popup.scale, popup.scale);
            
            // Combo text
            if (popup.comboCount >= 3) {
                ctx.fillStyle = '#ffeb3b';
                ctx.font = 'bold 20px Arial';
                ctx.textAlign = 'center';
                const comboText = popup.comboCount === 3 ? "GOOD!" :
                                 popup.comboCount === 4 ? "GREAT!" :
                                 popup.comboCount === 5 ? "AMAZING!" :
                                 "LEGENDARY!";
                ctx.fillText(comboText, 0, -20);
            }
            
            // Score
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 32px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`+${popup.score}`, 0, 10);
            
            ctx.restore();
        });
    }
    
    updateFireworks(deltaTime) {
        for (let i = this.state.fireworks.length - 1; i >= 0; i--) {
            const fw = this.state.fireworks[i];
            
            for (let j = fw.particles.length - 1; j >= 0; j--) {
                const p = fw.particles[j];
                p.x += p.vx * deltaTime;
                p.y += p.vy * deltaTime;
                p.vy += GRAVITY * 0.3 * deltaTime;
                p.life -= deltaTime;
                
                if (p.life <= 0) {
                    fw.particles.splice(j, 1);
                }
            }
            
            // ✅ PERFORMANCE: Boş firework'leri sil
            if (fw.particles.length === 0) {
                this.state.fireworks.splice(i, 1);
            }
        }
    }
    
    drawFireworks(ctx) {
        this.state.fireworks.forEach(fw => {
            fw.particles.forEach(p => {
                if (p.life <= 0) return;
                
                const opacity = p.life / p.maxLife;
                ctx.save();
                ctx.globalAlpha = opacity;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        });
    }
    
    createFirework(x, y) {
        // ✅ PERFORMANCE: Firework sayısını kontrol et
        if (this.state.fireworks.length >= MAX_FIREWORKS) {
            this.state.fireworks.shift();
        }
        
        const colors = ['#ff6b6b', '#ffd93d', '#6bcf7f', '#6b9dff', '#ff6bff'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const particles = [];
        
        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 * i) / 20;
            const speed = 2 + Math.random() * 3;
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 2,
                color: color,
                life: 30,
                maxLife: 30
            });
        }
        
        this.state.fireworks.push({ particles });
    }
    
    playSound(sound) {
        if (sound && sound.src) {
            sound.currentTime = 0;
            sound.play().catch(e => {
                console.warn('Sound play failed:', e);
            });
        }
    }
    
    gameLoop(currentTime) {
        if (!this.state.isPlaying) return;
        
        // ✅ PERFORMANCE: Frame limiter for mobile (30 FPS)
        const targetFPS = 30;
        const frameInterval = 1000 / targetFPS;
        const deltaMs = currentTime - this.state.lastFrameTime;
        
        if (deltaMs < frameInterval) {
            requestAnimationFrame((t) => this.gameLoop(t));
            return;
        }
        
        const deltaTime = Math.min(deltaMs / 16.67, 2); // Cap at 2x speed
        this.state.lastFrameTime = currentTime;
        
        if (!this.state.isPaused) {
            this.update(deltaTime);
            this.render();
        }
        
        requestAnimationFrame((t) => this.gameLoop(t));
    }
    
    update(deltaTime) {
        // Update all game objects
        this.updateFruits(deltaTime);
        this.updateFruitHalves(deltaTime);
        this.updateParticles(deltaTime);
        this.updateTrails(deltaTime);
        this.updateScorePopups(deltaTime);
        this.updateFireworks(deltaTime);
        
        // Update effects
        this.state.screenShake = Math.max(0, this.state.screenShake - deltaTime);
        this.state.redFlash = Math.max(0, this.state.redFlash - 0.05 * deltaTime);
        
        // Check combo timeout
        if (this.state.comboFruits.length > 0 && !this.state.comboTimer) {
            this.state.comboTimer = setTimeout(() => {
                this.processCombo();
            }, this.state.comboTimeoutDuration);
        }
        
        // Check level complete
        this.checkLevelComplete();
        
        // ✅ PERFORMANCE: Periodic cleanup
        if (Math.random() < 0.01) { // 1% chance per frame
            this.state.cleanupObjects();
        }
    }
    
    render() {
        const ctx = this.state.ctx;
        
        // ✅ PERFORMANCE: Clear with fillRect instead of clearRect
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, this.state.width, this.state.height);
        
        // Screen shake
        if (this.state.screenShake > 0) {
            ctx.save();
            const shakeX = (Math.random() - 0.5) * this.state.screenShake;
            const shakeY = (Math.random() - 0.5) * this.state.screenShake;
            ctx.translate(shakeX, shakeY);
        }
        
        // Draw game objects (order matters for layering)
        this.drawFruitHalves(ctx);
        this.drawParticles(ctx);
        this.drawFruits(ctx);
        this.drawTrails(ctx);
        this.drawScorePopups(ctx);
        this.drawFireworks(ctx);
        
        // Reset shake
        if (this.state.screenShake > 0) {
            ctx.restore();
        }
        
        // Red flash effect
        if (this.state.redFlash > 0) {
            ctx.fillStyle = `rgba(255, 0, 0, ${this.state.redFlash * 0.3})`;
            ctx.fillRect(0, 0, this.state.width, this.state.height);
        }
        
        // Milestone message
        if (this.state.showingMilestone) {
            this.drawMilestoneMessage(ctx);
        }
    }
    
    drawMilestoneMessage(ctx) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.state.width, this.state.height);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const message = `Level ${this.state.level}!`;
        ctx.fillText(message, this.state.width / 2, this.state.height / 2);
        
        ctx.restore();
    }
    
    updateScoreDisplay() {
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            scoreElement.textContent = this.state.score;
        }
        
        // Update global score for sharing
        if (typeof currentScore !== 'undefined') {
            window.currentScore = this.state.score;
        }
    }
    
    updateLevelDisplay() {
        const levelElement = document.getElementById('level');
        if (levelElement) {
            levelElement.textContent = this.state.level;
        }
    }
    
    updateLifeDisplay() {
        const livesContainer = document.getElementById('lives');
        if (livesContainer) {
            livesContainer.innerHTML = '';
            for (let i = 0; i < this.state.lives; i++) {
                const heart = document.createElement('span');
                heart.className = 'life';
                heart.textContent = '❤️';
                livesContainer.appendChild(heart);
            }
        }
    }
    
    showStartScreen() {
        document.getElementById('start-screen').classList.remove('hidden');
        document.getElementById('game-ui').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        this.state.canvas.classList.add('hidden');
    }
    
    showGameScreen() {
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-ui').classList.remove('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        this.state.canvas.classList.remove('hidden');
    }
    
    showGameOverScreen() {
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-ui').classList.add('hidden');
        document.getElementById('game-over-screen').classList.remove('hidden');
        this.state.canvas.classList.add('hidden');
        
        const finalScoreElement = document.getElementById('final-score');
        if (finalScoreElement) {
            finalScoreElement.textContent = this.state.score;
        }
        
        // Update global score
        window.currentScore = this.state.score;
    }
    
    startGame() {
        console.log('Starting game...');
        
        // ✅ PERFORMANCE: Reset ve temizlik
        this.resetGame();
        
        this.showGameScreen();
        this.state.isPlaying = true;
        this.state.isPaused = false;
        
        this.updateScoreDisplay();
        this.updateLevelDisplay();
        this.updateLifeDisplay();
        
        this.startLevel();
        
        // Start game loop with proper timing
        this.state.lastFrameTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
        
        console.log('✅ Game started successfully');
    }
    
    resetGame() {
        // ✅ PERFORMANCE: Tüm dizileri temizle
        this.state.fruits = [];
        this.state.fruitHalves = [];
        this.state.trails = [];
        this.state.particles = [];
        this.state.scorePopups = [];
        this.state.fireworks = [];
        
        this.state.score = 0;
        this.state.level = 1;
        this.state.lives = INITIAL_LIVES;
        this.state.comboFruits = [];
        this.state.screenShake = 0;
        this.state.redFlash = 0;
        
        if (this.state.comboTimer) {
            clearTimeout(this.state.comboTimer);
            this.state.comboTimer = null;
        }
        
        // Stop any playing sounds
        if (this.state.fuseSound) {
            this.state.fuseSound.pause();
            this.state.fuseSound.currentTime = 0;
        }
    }
    
    gameOver() {
        console.log('Game Over! Score:', this.state.score);
        this.state.isPlaying = false;
        this.playSound(this.state.failSound);
        
        // Stop fuse sound
        if (this.state.fuseSound) {
            this.state.fuseSound.pause();
            this.state.fuseSound.currentTime = 0;
        }
        
        this.showGameOverScreen();
    }
    
    victory() {
        console.log('Victory! Score:', this.state.score);
        this.state.isPlaying = false;
        
        // Create celebration
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const x = Math.random() * this.state.width;
                const y = Math.random() * this.state.height * 0.5;
                this.createFirework(x, y);
            }, i * 200);
        }
        
        setTimeout(() => {
            this.showGameOverScreen();
        }, 2000);
    }
    
    destroy() {
        // ✅ PERFORMANCE: Cleanup on destroy
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        if (this.state.comboTimer) {
            clearTimeout(this.state.comboTimer);
        }
        
        // Stop all sounds
        const sounds = [
            this.state.swooshSound,
            this.state.sliceSound,
            this.state.explosionSound,
            this.state.fuseSound,
            this.state.fallSound,
            this.state.excellentSound,
            this.state.amazingSound,
            this.state.legendarySound,
            this.state.failSound
        ];
        
        sounds.forEach(sound => {
            if (sound) {
                sound.pause();
                sound.currentTime = 0;
            }
        });
    }
}

// ===== LEADERBOARD & SHARING (unchanged) =====
const API_URL = 'https://base-fruits.vercel.app';
const CONTRACT_ADDRESS = '0xe25a327091907e3de22e2e05c3f3cb09e3f8f9ba';
let currentScore = 0;

async function saveScore() {
    const btn = document.getElementById('save-leaderboard-button');
    btn.disabled = true;
    btn.textContent = '⏳ Loading...';

    try {
        let provider, signer, walletAddress;
        let username = '';
        let fid = 0;

        const farcasterWalletAvailable = window.parent !== window &&
            typeof window.parent.farcaster !== 'undefined' &&
            typeof window.parent.farcaster.wallet !== 'undefined';

        if (farcasterWalletAvailable) {
            console.log('Farcaster wallet detected!');
            
            const userResponse = await window.parent.farcaster.getCurrentUser();
            if (!userResponse?.uid) {
                throw new Error('Farcaster kullanıcı bilgisi alınamadı');
            }
            
            username = userResponse.username || 'Unknown';
            fid = parseInt(userResponse.uid);
            
            const ethProvider = await window.parent.farcaster.wallet.getEthereumProvider();
            provider = new window.ethers.providers.Web3Provider(ethProvider);
            signer = provider.getSigner();
            walletAddress = await signer.getAddress();
            console.log('Farcaster wallet connected:', walletAddress);
        } else if (typeof window.ethereum !== 'undefined') {
            console.log('MetaMask detected');
            
            const usernameInput = prompt('Enter your Farcaster username:');
            if (!usernameInput) {
                btn.disabled = false;
                btn.textContent = '💾 Save Leaderboard';
                return;
            }
            username = usernameInput;
            
            provider = new window.ethers.providers.Web3Provider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            signer = provider.getSigner();
            walletAddress = await signer.getAddress();
            console.log('MetaMask wallet connected:', walletAddress);
        }

        const network = await provider.getNetwork();
        if (network.chainId !== 8453) {
            try {
                const walletProvider = farcasterWalletAvailable ?
                    await window.parent.farcaster.wallet.getEthereumProvider() :
                    window.ethereum;
                console.log('Switching to Base network...');
                
                await walletProvider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x2105' }],
                });
            } catch (switchError) {
                console.log('Network switch error:', switchError);
                if (switchError.code === 4902) {
                    try {
                        const walletProvider = farcasterWalletAvailable ?
                            await window.parent.farcaster.wallet.getEthereumProvider() :
                            window.ethereum;
                        console.log('Adding Base network...');
                        await walletProvider.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: '0x2105',
                                chainName: 'Base Mainnet',
                                nativeCurrency: {
                                    name: 'Ethereum',
                                    symbol: 'ETH',
                                    decimals: 18
                                },
                                rpcUrls: ['https://mainnet.base.org'],
                                blockExplorerUrls: ['https://basescan.org']
                            }]
                        });
                    } catch (addError) {
                        console.error('Failed to add Base network:', addError);
                        throw new Error('Base ağı eklenemedi. Lütfen manuel olarak ekleyin.');
                    }
                } else {
                    throw new Error('Base ağına geçilemedi: ' + switchError.message);
                }
            }
        }

        const signResponse = await fetch(`${API_URL}/api/signScore`, {
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

        const contract = new window.ethers.Contract(
            CONTRACT_ADDRESS,
            ['function submitScore(string memory _farcasterUsername, uint256 _fid, uint256 _score, uint256 _nonce, bytes memory _signature) external'],
            signer
        );

        const tx = await contract.submitScore(
            signData.data.params.farcasterUsername,
            signData.data.params.fid,
            signData.data.params.score,
            signData.data.nonce,
            signData.data.signature
        );

        btn.textContent = '⏳ Waiting confirmation...';
        await tx.wait();

        alert('✅ Score saved successfully!');
        btn.textContent = '✅ Saved!';

    } catch (error) {
        console.error(error);
        if (error.code === 'ACTION_REJECTED') {
            alert('Transaction cancelled.');
        } else if (error.message?.includes('insufficient funds')) {
            alert('Insufficient ETH!');
        } else {
            alert('Error: ' + (error.message || 'Unknown error'));
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

    } catch (error) {
        content.innerHTML = '<p>Bağlantı hatası!</p>';
    }
}

function closeLeaderboard() {
    document.getElementById('leaderboard-modal').classList.add('hidden');
}

function shareOnFarcaster() {
    console.log('Share button clicked! Current score:', currentScore);

    const message = `Scored ${currentScore} points in Base Fruits! 🥇 Can you beat me? 🍓🍉`;
    const gameUrl = 'https://base-fruits.vercel.app/';

    console.log('Share message:', message);

    const castText = encodeURIComponent(message);
    const embedUrl = encodeURIComponent(gameUrl);
    const farcasterUrl = `https://warpcast.com/~/compose?text=${castText}&embeds[]=${embedUrl}`;

    console.log('Farcaster URL:', farcasterUrl);

    try {
        const newWindow = window.open(farcasterUrl, '_blank');
        if (!newWindow) {
            console.log('Popup blocked, trying alternative method...');
            window.location.href = farcasterUrl;
        } else {
            console.log('Successfully opened Farcaster compose window');
        }
    } catch (error) {
        console.error('Error opening Farcaster URL:', error);
        navigator.clipboard.writeText(message + ' ' + gameUrl).then(() => {
            alert('Farcaster link could not be opened. Message copied to clipboard!');
        }).catch(() => {
            alert('Unable to open Farcaster. Please manually share: ' + message + ' ' + gameUrl);
        });
    }
}

// ===== INITIALIZE GAME =====
window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing game...');
    
    try {
        const game = new FruitSliceGame();
        console.log('Game initialized successfully:', game);

        document.getElementById('save-leaderboard-button').addEventListener('click', saveScore);
        document.getElementById('view-leaderboard-button').addEventListener('click', viewLeaderboard);
        document.getElementById('close-leaderboard').addEventListener('click', closeLeaderboard);

        const shareButton = document.getElementById('share-score-button');
        if (shareButton) {
            console.log('Share button found, adding event listener');
            shareButton.addEventListener('click', shareOnFarcaster);
        } else {
            console.error('Share button not found!');
        }

        document.getElementById('leaderboard-modal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('leaderboard-modal')) {
                closeLeaderboard();
            }
        });

    } catch (error) {
        console.error('Error initializing game:', error);
    }
});
