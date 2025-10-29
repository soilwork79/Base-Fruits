"use strict";

// ===== GAME CONSTANTS (PERFORMANS İÇİN GÜNCELLENDİ) =====
const GRAVITY = 0.17;
const INITIAL_LIVES = 4;
const MAX_LEVEL = 50;
const FRUIT_RADIUS = 26.46;
const TRAIL_FADE_SPEED = 0.35;
const MAX_TRAIL_POINTS = 8; // GÜNCELLEME: 15 -> 8
const WALL_BOUNCE_DAMPING = 0.7;
const MAX_FRUITS = 7;
const MAX_PARTICLES = 30; // GÜNCELLEME: 50 -> 30
const MAX_TRAILS = 2; // GÜNCELLEME: 3 -> 2
const MAX_SCORE_POPUPS = 3; // GÜNCELLEME: 5 -> 3
const PARTICLE_PER_SLICE = 8; // GÜNCELLEME: Yeni sabit
const BOMB_EXPLOSION_PARTICLES = 20; // GÜNCELLEME: Yeni sabit

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
        this.canvas = document.getElementById('game-canvas');
        
        // GÜNCELLEME: Canvas context performans ayarları
        this.ctx = this.canvas.getContext('2d', { 
            alpha: false, // Arka plan şeffaf değil, performans artar
            desynchronized: true // Gecikmeyi azaltır
        });
        
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.width = 0;
        this.height = 0;
        this.resize();
        
        // Game state
        this.isPlaying = false;
        this.score = 0;
        this.level = 1;
        this.lives = INITIAL_LIVES;
        
        // Game objects (Artık object pool olarak kullanılacaklar)
        this.fruits = []; // Meyveler dinamik kalacak (sayısı az)
        this.fruitHalves = []; // GÜNCELLEME: Havuz
        this.trails = []; // Trail sayısı çok az (MAX_TRAILS=2), havuzlamaya gerek yok
        this.particles = []; // GÜNCELLEME: Havuz
        this.scorePopups = []; // GÜNCELLEME: Havuz
        this.fireworks = []; // Havai fişekler nadir, havuzlamaya gerek yok
        
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
        
        // Animation
        this.lastFrameTime = 0;
        this.frameSkipCounter = 0;
        this.isLowPerformance = false;
        
        // Audio files
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
        
        // Fruit images
        this.fruitImages = new Map();
        this.halfFruitImages = new Map();
        
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

        // GÜNCELLEME: Object Pool'ları önceden doldur (Pre-populate)
        // Parçacık havuzu
        for (let i = 0; i < MAX_PARTICLES; i++) {
            this.particles.push({ x: 0, y: 0, vx: 0, vy: 0, size: 0, color: '', life: 0, active: false });
        }
        // Meyve yarısı havuzu (En fazla 7 meyve * 2 yarı = 14)
        for (let i = 0; i < (MAX_FRUITS * 2) + 2; i++) { // +2 buffer
            this.fruitHalves.push({ x: 0, y: 0, vx: 0, vy: 0, radius: 0, color: '', fruitType: '', rotation: 0, rotationSpeed: 0, isLeft: false, opacity: 0, active: false });
        }
        // Skor popup havuzu
        for (let i = 0; i < MAX_SCORE_POPUPS; i++) {
            this.scorePopups.push({ x: 0, y: 0, score: 0, opacity: 0, scale: 0, active: false });
        }
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
    
    showGameOver(playFailSound = true) {
        this.state.isPlaying = false;
        
        // Stop all fuse sounds
        for (const fruit of this.state.fruits) {
            if (fruit.isBomb && fruit.fuseSound) {
                fruit.fuseSound.pause();
                fruit.fuseSound.currentTime = 0;
                fruit.fuseSound = undefined; // Clear reference
            }
        }
        
        // Play fail sound when game is over
        if (playFailSound) {
            this.playFailSound();
        }
        
        // Update global score for leaderboard
        currentScore = this.state.score;
        
        document.getElementById('final-score').textContent = this.state.score.toString();
        document.getElementById('final-level').textContent = this.state.level.toString();
        document.getElementById('game-over-screen').classList.remove('hidden');
        document.getElementById('game-hud').classList.add('hidden');
    }
    
    getBackgroundForWave(wave) {
        // Determine which background to use based on wave ranges
        if (wave >= 1 && wave <= 10) return "island_background.png";
        if (wave >= 11 && wave <= 20) return "purple_background.png";
        if (wave >= 21 && wave <= 30) return "dojo_background.png";
        if (wave >= 31 && wave <= 40) return "forest_background.png";
        if (wave >= 41 && wave <= 50) return "desert_background.png";
        return "island_background.png"; // Default fallback
    }

    changeBackground(wave) {
        const backgroundImage = this.getBackgroundForWave(wave);
        
        console.log(`Changing background to: ${backgroundImage} for wave ${wave}`);
        
        const gameContainer = document.getElementById('game-container');
        gameContainer.style.backgroundImage = `url('images/${backgroundImage}')`;
    }

    showChapterName(wave, onComplete) {
        const chapterNames = {
            1: "Tropical Island",
            11: "Valley of\nPurple Rocks", 
            21: "Silent Sword Dojo",
            31: "Wild Forest",
            41: "Desert Night"
        };
        
        const chapterName = chapterNames[wave];
        if (!chapterName) {
            if (onComplete) onComplete();
            return;
        }
        
        console.log(`Showing chapter: ${chapterName} for wave ${wave}`);
        
        // Change background first
        this.changeBackground(wave);
        
        // Update chapter text
        const chapterTextElement = document.getElementById('chapter-text');
        chapterTextElement.textContent = chapterName;
        
        // Force h1 styles
        chapterTextElement.style.cssText = `
            font-size: 2rem !important;
            color: #ffffff !important;
            text-align: center !important;
            text-shadow: 
                0 0 10px rgba(255, 255, 255, 0.9),
                0 0 20px rgba(255, 255, 255, 0.7),
                0 0 30px rgba(255, 255, 255, 0.5),
                0 0 40px rgba(255, 255, 255, 0.3),
                2px 2px 8px rgba(0, 0, 0, 0.9) !important;
            font-weight: bold !important;
            letter-spacing: 3px !important;
            margin: 0 !important;
            padding: 20px !important;
            white-space: pre-line !important;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
        `;
        
        const chapterElement = document.getElementById('chapter-name');
        
        // Reset any previous state
        chapterElement.classList.remove('show');
        chapterElement.classList.remove('hidden');
        
        // Show chapter name (fade in over 1s)
        // Force inline styles to override any conflicts
        chapterElement.style.cssText = `
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            z-index: 9999 !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            width: 100% !important;
            height: auto !important;
            pointer-events: none !important;
            opacity: 0 !important;
            transition: opacity 1s ease-in-out !important;
        `;
        
        // Force reflow to ensure initial state
        chapterElement.offsetHeight;
        setTimeout(() => {
            chapterElement.style.opacity = '1';
            chapterElement.classList.add('show');
        }, 100);
        
        // Hide chapter name after 3 seconds (fade out over 1s)
        setTimeout(() => {
            chapterElement.style.opacity = '0';
            chapterElement.classList.remove('show');
            setTimeout(() => {
                chapterElement.classList.add('hidden');
                chapterElement.style.display = 'none';
                
                // Wait 2 seconds after chapter disappears, then call callback
                if (onComplete) {
                    setTimeout(() => {
                        onComplete();
                    }, 2000);
                }
            }, 1000);
        }, 3000);
    }

    showMilestoneMessage(wave) {
        this.state.showingMilestone = true;
        
        // Determine message based on wave
        let mainText = '';
        let subText = '';
        
        if (wave === 10) {
            mainText = 'Congratulations!';
            subText = 'You passed the Tropical Island level and gained 1 life ❤️';
        } else if (wave === 20) {
            mainText = 'Congratulations!';
            subText = 'You passed the Valley of Purple Rocks level and gained 1 life ❤️';
        } else if (wave === 30) {
            mainText = 'Congratulations!';
            subText = 'You passed the Silent Sword Dojo level and gained 1 life ❤️';
        } else if (wave === 40) {
            mainText = 'Congratulations!';
            subText = 'You passed the Wild Forest level and gained 1 life ❤️';
        } else if (wave === 50) {
            mainText = 'Congratulations, you have completed the game by passing 50 waves.';
            subText = '';
        }
        
        // Update milestone message elements
        document.getElementById('milestone-text').textContent = mainText;
        document.getElementById('milestone-subtext').textContent = subText;
        document.getElementById('milestone-message').classList.remove('hidden');
        
        // Fireworks on final completion
        if (wave === 50) {
            this.createFireworks(this.state.width / 2, this.state.height / 2);
        }
        
        // Hide milestone message after 3 seconds
        setTimeout(() => {
            document.getElementById('milestone-message').classList.add('hidden');
            this.state.showingMilestone = false;
            
            if (wave === 50) {
                // Final screen without fail sound
                this.showGameOver(false);
            } else {
                // Advance to next wave
                this.state.level++;
                this.updateUI();
                
                // Check if this is a chapter start wave
                const nextWave = this.state.level;
                if (nextWave === 11 || nextWave === 21 || nextWave === 31 || nextWave === 41) {
                    // Show chapter name and launch fruits 3 seconds after it disappears
                    this.showChapterName(nextWave, () => {
                        console.log(`Chapter ${nextWave}: Launching fruits after chapter title`);
                        this.launchFruits();
                    });
                } else {
                    // Launch fruits immediately for non-chapter waves
                    this.launchFruits();
                }
            }
        }, 3000);
    }
    
    startGame() {
        console.log('startGame() called');
        
        // Stop all fuse sounds from previous game
        for (const fruit of this.state.fruits) {
            if (fruit.isBomb && fruit.fuseSound) {
                fruit.fuseSound.pause();
                fruit.fuseSound.currentTime = 0;
                fruit.fuseSound = undefined; // Clear reference
            }
        }
        
        // Reset state
        this.state.score = 0;
        this.state.level = 1;
        this.state.lives = INITIAL_LIVES;
        this.state.fruits = []; // Meyveler dinamik olarak eklenecek
        this.state.trails = [];
        this.state.fireworks = [];
        this.state.isPlaying = true;

        // GÜNCELLEME: Object Pool'ları temizle (objeleri silme, 'active' flag'ini kapat)
        this.state.particles.forEach(p => p.active = false);
        this.state.fruitHalves.forEach(h => h.active = false);
        this.state.scorePopups.forEach(s => s.active = false);
        
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
        
        // Clear game state flags
        this.state.isPaused = false;
        this.state.showingMilestone = false;
        this.state.allFruitsLaunched = false;
        
        // Reset save leaderboard button
        const saveBtn = document.getElementById('save-leaderboard-button');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = '💾 Save Leaderboard';
        }
        
        // Update UI
        this.updateUI();
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('game-hud').classList.remove('hidden');
        
        // Change background and show chapter name for wave 1
        this.changeBackground(1);
        this.showChapterName(1, () => {
            // Launch fruits 3 seconds after chapter disappears
            this.launchFruits();
        }); // Wait for chapter name to finish (4s total)
        
        // Start game loop
        this.gameLoop(performance.now());
    }
    
    launchFruits() {
        const wave = this.state.level;
        console.log(`launchFruits called for wave ${wave}`);
        let fruitCount = 7; // Default to 7 fruits
        
        // Determine fruit count based on wave (updated rules)
        if (wave <= 2) {
            fruitCount = 1;
        } else if (wave <= 5) {
            fruitCount = 2;
        } else if (wave <= 8) {
            fruitCount = 3;
        } else if (wave <= 10) {
            fruitCount = 4;
        } else if (wave <= 20) {
            fruitCount = 5;
        } else if (wave <= 30) {
            fruitCount = 6;
        } else {
            fruitCount = 7; // Waves 31+
        }
        
        
        this.state.fruits = []; // Meyveleri temizle (bunlar pool'da değil)
        this.state.allFruitsLaunched = false;
        
        // Base delay to coordinate bombs relative to fruits (for waves 41-50)
        const fruitBaseDelay = (wave >= 41 && wave <= 50) ? 1000 : 0;
        
        const launchFruitsNow = () => {
            // Launch fruits with staggered timing (0-500ms spread)
            let launchedCount = 0;
            for (let i = 0; i < fruitCount; i++) {
                // Random delay between 0 and 500ms
                const launchDelay = Math.random() * 500;
                
                setTimeout(() => {
                    if (!this.state.isPlaying) {
                        console.log(`Fruit launch cancelled: isPlaying = false at wave ${wave}`);
                        return;
                    }
                    
                    const fruitType = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
                    
                    // Random launch position along bottom (more centered)
                    const x = this.state.width * (0.3 + Math.random() * 0.4);
                    
                    // Random angle (75-105 degrees) - more vertical, less horizontal spread
                    const angle = (75 + Math.random() * 30) * Math.PI / 180;
                    const speed = 12 + Math.random() * 2.4; // Reduced by 20% to match gravity
                    
                    this.state.fruits.push({
                        x: x,
                        y: this.state.height,
                        vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1) * 0.6,
                        vy: -Math.sin(angle) * speed,
                        radius: FRUIT_RADIUS,
                        color: fruitType.color,
                        fruitType: fruitType.name,
                        imagePath: fruitType.imagePath,
                        halfImagePath: fruitType.halfImagePath,
                        sliced: false,
                        active: true,
                        isBomb: false,
                        rotation: Math.random() * Math.PI * 2,
                        rotationSpeed: (Math.random() - 0.5) * 0.1
                    });
                    
                    launchedCount++;
                    if (launchedCount === fruitCount) {
                        // All fruits have been launched, wait for bombs to spawn too
                        // Bombs can spawn up to 350ms after fruits (or 1000ms in waves 41-50)
                        const bombDelay = (wave >= 41 && wave <= 50) ? 1500 : 600;
                        setTimeout(() => {
                            this.state.allFruitsLaunched = true;
                            console.log(`Wave ${wave}: All fruits and bombs launched`);
                        }, bombDelay);
                    }
                }, fruitBaseDelay + launchDelay);
            }
        };
        
        const launchBomb = (beforeFruit) => {
            // beforeFruit: true = bomb launches before fruits (350ms earlier), false = after fruits (350ms later)
            const delay = beforeFruit ? 0 : 350;
            launchBombAt(delay);
        };

        const launchBombAt = (delayMs) => {
            const delay = Math.max(0, delayMs);
            setTimeout(() => {
                if (!this.state.isPlaying) {
                    console.log(`Bomb launch cancelled: isPlaying = false at wave ${wave}`);
                    return;
                }
                
                // Random launch position
                const x = this.state.width * (0.3 + Math.random() * 0.4);
                const angle = (75 + Math.random() * 30) * Math.PI / 180;
                const speed = 12 + Math.random() * 2.4; // Reduced by 20% to match gravity
                
                // Create a new fuse sound instance for this bomb
                const bombFuseSound = this.state.fuseSound.cloneNode();
                bombFuseSound.volume = this.state.fuseSound.volume;
                bombFuseSound.loop = true;
                console.log('Playing fuse sound for bomb');
                bombFuseSound.play().then(() => {
                    console.log('Fuse sound started successfully');
                }).catch((e) => {
                    console.error('Fuse sound play failed:', e);
                });
                
                this.state.fruits.push({
                    x: x,
                    y: this.state.height,
                    vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1) * 0.6,
                    vy: -Math.sin(angle) * speed,
                    radius: FRUIT_RADIUS,
                    color: '#2c2c2c',
                    fruitType: 'bomb',
                    sliced: false,
                    active: true,
                    isBomb: true,
                    fuseSound: bombFuseSound,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: (Math.random() - 0.5) * 0.1
                });
            }, delay);
        };
        
        // Launch fruits first
        launchFruitsNow();
        
        
        // Determine bomb spawning based on wave (updated rules)
        if (wave >= 11 && wave <= 20) {
            // 50% chance of 1 bomb
            const bombChance = Math.random();
            if (bombChance < 0.5) {
                const bombEarly = Math.random() < 0.5;
                launchBombAt(fruitBaseDelay + (bombEarly ? 0 : 350));
            } else {
            }
        } else if (wave >= 21 && wave <= 30) {
            // 50% chance of 1 bomb
            if (Math.random() < 0.5) {
                const bombEarly = Math.random() < 0.5;
                launchBombAt(fruitBaseDelay + (bombEarly ? 0 : 350));
            }
        } else if (wave >= 31 && wave <= 40) {
            // Always 1 bomb
            const bombEarly = Math.random() < 0.5;
            launchBombAt(fruitBaseDelay + (bombEarly ? 0 : 350));
        } else if (wave >= 41 && wave <= 50) {
            // Always 1 bomb, 50% chance of a second bomb
            const hasSecond = Math.random() < 0.5;
            
            // One bomb 1s before fruits
            launchBombAt(fruitBaseDelay - 1000);
            
            if (hasSecond) {
                // Second bomb 1s after fruits
                launchBombAt(fruitBaseDelay + 1000);
            } else {
                // (Orijinal kodla aynı mantık)
            }
        }
    }
    
    handleInputStart(clientX, clientY) {
        if (!this.state.isPlaying) return;
        
        const rect = this.state.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        this.state.isDrawing = true;
        this.state.currentTrail = [{ x, y, timestamp: performance.now() }];
        this.state.slicedThisSwipe = [];
    }
    
    handleInputMove(clientX, clientY) {
        if (!this.state.isPlaying || !this.state.isDrawing) return;
        
        const rect = this.state.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        const prevPoint = this.state.currentTrail[this.state.currentTrail.length - 1];
        const now = performance.now();
        this.state.currentTrail.push({ x, y, timestamp: now });
        
        // Calculate movement speed and play swoosh sound if moving fast enough
        if (prevPoint && prevPoint.timestamp) {
            const dx = x - prevPoint.x;
            const dy = y - prevPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const timeDiff = now - prevPoint.timestamp;
            const speed = timeDiff > 0 ? distance / timeDiff : 0;
            
            // Play swoosh if moving fast and enough time passed since last swoosh (200ms cooldown)
            const timeSinceLastSwoosh = now - this.state.lastSwooshTime;
            if (speed > 1.5 && timeSinceLastSwoosh > 200 && this.state.currentTrail.length >= 3) {
                this.playKnifeSwooshSound();
                this.state.lastSwooshTime = now;
            }
        }
        
        // Remove old points from current trail (older than 150ms)
        this.state.currentTrail = this.state.currentTrail.filter(p => 
            !p.timestamp || (now - p.timestamp) < 150
        );
        
        // Check for slicing in real-time as we draw
        if (prevPoint) {
            this.checkSlicingSegment(prevPoint, { x, y });
        }
        
        if (this.state.currentTrail.length > MAX_TRAIL_POINTS) {
            this.state.currentTrail.shift();
        }
    }
    
    handleInputEnd() {
        if (!this.state.isPlaying || !this.state.isDrawing) return;
        
        this.state.isDrawing = false;
        
        // Add trail to fading trails (limit for performance)
        if (this.state.currentTrail.length > 1) {
            // Remove oldest trail if we have too many
            if (this.state.trails.length >= MAX_TRAILS) {
                this.state.trails.shift();
            }
            this.state.trails.push({
                points: [...this.state.currentTrail],
                opacity: 1
            });
        }
        
        this.state.currentTrail = [];
        this.state.slicedThisSwipe = [];
    }
    
    scoreCombo() {
        if (this.state.comboFruits.length === 0) return;
        
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
        
        // GÜNCELLEME: Object pool'dan popup al
        const popup = this.state.scorePopups.find(p => !p.active);
        
        if (popup) {
            popup.active = true;
            popup.score = comboScore;
            popup.opacity = 1;
            popup.scale = 1;

            if (count === 1 || count === 2) {
                // Single or double fruit
                popup.x = avgX;
                popup.y = avgY;
                popup.comboText = '';
                popup.isSimple = true;
            } else {
                // 3+ Combo
                popup.x = this.state.width / 2;
                popup.y = this.state.height / 2;
                popup.isSimple = false;

                if (count === 3) {
                    comboText = '3 Fruit Combo';
                } else if (count === 4) {
                    comboText = '4 Fruit Combo';
                } else if (count === 5) {
                    comboText = '5 Fruit Combo';
                    this.playComboSound('excellent');
                } else if (count === 6) {
                    comboText = '6 Fruit Combo';
                    this.playComboSound('amazing');
                } else if (count >= 7) {
                    comboText = '7+ Fruit Combo';
                    this.playComboSound('legendary');
                }
                popup.comboText = comboText;
            }
        }
        
        // Create fireworks for 3+ combos
        if (count >= 3) {
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
        
        // Stop ALL fuse sounds when any bomb explodes
        for (const fruit of this.state.fruits) {
            if (fruit.isBomb && fruit.fuseSound) {
                fruit.fuseSound.pause();
                fruit.fuseSound.currentTime = 0;
                fruit.fuseSound = undefined; // Clear reference
            }
        }
        
        // Count uncut fruits
        const uncutFruits = this.state.fruits.filter(f => f.active && !f.sliced && !f.isBomb);
        const livesLost = uncutFruits.length;
        
        // GÜNCELLEME: Bomba patlama parçacıkları (Pool'dan)
        if (bomb) {
            let activatedCount = 0;
            for (const p of this.state.particles) {
                if (activatedCount >= BOMB_EXPLOSION_PARTICLES) break;
                if (!p.active) {
                    p.x = bomb.x;
                    p.y = bomb.y;
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 5 + Math.random() * 10;
                    p.vx = Math.cos(angle) * speed;
                    p.vy = Math.sin(angle) * speed;
                    p.size = 5 + Math.random() * 8;
                    p.color = ['#ff4444', '#ff8800', '#ffaa00', '#ff0000'][Math.floor(Math.random() * 4)];
                    p.life = 1;
                    p.active = true;
                    activatedCount++;
                }
            }
        }
        
        // Destroy all uncut fruits
        for (const fruit of uncutFruits) {
            fruit.active = false;
            fruit.sliced = true;
            
            // GÜNCELLEME: Yok edilen meyve parçacıkları (Pool'dan)
            let fruitParticleCount = 0;
            for (const p of this.state.particles) {
                if (fruitParticleCount >= PARTICLE_PER_SLICE) break;
                if (!p.active) {
                    p.x = fruit.x;
                    p.y = fruit.y;
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 3 + Math.random() * 5;
                    p.vx = Math.cos(angle) * speed;
                    p.vy = Math.sin(angle) * speed - 2;
                    p.size = 4 + Math.random() * 4;
                    p.color = '#ff4444';
                    p.life = 1;
                    p.active = true;
                    fruitParticleCount++;
                }
            }
        }
        
        // Trigger screen shake and red flash
        this.state.screenShake = 20;
        this.state.redFlash = 1;
        
        // Show BOMB text (Pool'dan)
        if (bomb) {
            const popup = this.state.scorePopups.find(p => !p.active);
            if (popup) {
                popup.x = bomb.x;
                popup.y = bomb.y;
                popup.score = 0;
                popup.opacity = 1;
                popup.scale = 1;
                popup.comboText = '💣 BOMB!';
                popup.isSimple = false; // Combo stili kullan
                popup.active = true;
            }
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
        
        // Show "Game continues in..." message if lives remain (Pool'dan)
        if (this.state.lives > 0) {
            const popup = this.state.scorePopups.find(p => !p.active);
            if (popup) {
                popup.x = this.state.width / 2;
                popup.y = this.state.height / 2 + 50;
                popup.score = 0;
                popup.opacity = 1;
                popup.scale = 0.8;
                popup.comboText = 'Game continues in 2 seconds...';
                popup.isSimple = false; // Combo stili kullan
                popup.active = true;
            }
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
                
                // Check if this is a milestone wave (10, 20, 30, 40, 50)
                if (currentWave === 10 || currentWave === 20 || currentWave === 30 || currentWave === 40 || currentWave === 50) {
                    // Add life bonus (except for final wave 50)
                    if (currentWave !== 50) {
                        this.state.lives++;
                        this.updateUI();
                    }
                    
                    // Show milestone message
                    this.showMilestoneMessage(currentWave);
                } else if (currentWave < MAX_LEVEL) {
                    // Regular wave advancement
                    this.state.level++;
                    this.updateUI();
                    
                    // Check if this is a chapter start wave
                    const nextWave = this.state.level;
                    if (nextWave === 11 || nextWave === 21 || nextWave === 31 || nextWave === 41) {
                        // Show chapter name and immediately launch fruits
                        this.showChapterName(nextWave, () => {
                            this.launchFruits();
                        });
                    } else {
                        this.launchFruits();
                    }
                } else {
                    // Game won at wave 50 (suppress fail sound)
                    this.showGameOver(false);
                }
            }
        }, 2000);
    }
    
    checkSlicingSegment(p1, p2) {
        // Check if this line segment intersects any fruit
        for (const fruit of this.state.fruits) {
            if (fruit.sliced || !fruit.active) continue;
            
            if (this.lineCircleIntersect(p1, p2, fruit)) {
                fruit.sliced = true;
                
                // Calculate slice angle from the swipe direction
                const rawAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                
                // Simplify to vertical or horizontal cuts
                const absAngle = Math.abs(rawAngle);
                let sliceAngle;
                
                if (absAngle < Math.PI / 4 || absAngle > 3 * Math.PI / 4) {
                    // Horizontal cut (left-right)
                    sliceAngle = 0;
                } else {
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
        
        if (discriminant < 0) return false;
        
        const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
        const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);
        
        return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
    }
    
    createFruitHalves(fruit, sliceAngle) {
        // Calculate perpendicular offset for the two halves
        const offsetDist = fruit.radius * 0.3;
        const perpAngle = sliceAngle + Math.PI / 2;
        
        // GÜNCELLEME: Object pool'dan yarı al (Sol)
        const half1 = this.state.fruitHalves.find(h => !h.active);
        if (half1) {
            half1.x = fruit.x + Math.cos(perpAngle) * offsetDist;
            half1.y = fruit.y + Math.sin(perpAngle) * offsetDist;
            half1.vx = fruit.vx + Math.cos(perpAngle) * 2;
            half1.vy = fruit.vy + Math.sin(perpAngle) * 2;
            half1.radius = fruit.radius;
            half1.color = fruit.color;
            half1.fruitType = fruit.fruitType;
            half1.halfImagePath = fruit.halfImagePath;
            half1.rotation = 0;
            half1.rotationSpeed = -0.1 - Math.random() * 0.1;
            half1.isLeft = true;
            half1.opacity = 1;
            half1.active = true;
        }
        
        // GÜNCELLEME: Object pool'dan yarı al (Sağ)
        const half2 = this.state.fruitHalves.find(h => !h.active);
        if (half2) {
            half2.x = fruit.x - Math.cos(perpAngle) * offsetDist;
            half2.y = fruit.y - Math.sin(perpAngle) * offsetDist;
            half2.vx = fruit.vx - Math.cos(perpAngle) * 2;
            half2.vy = fruit.vy - Math.sin(perpAngle) * 2;
            half2.radius = fruit.radius;
            half2.color = fruit.color;
            half2.fruitType = fruit.fruitType;
            half2.halfImagePath = fruit.halfImagePath;
            half2.rotation = 0;
            half2.rotationSpeed = 0.1 + Math.random() * 0.1;
            half2.isLeft = false;
            half2.opacity = 1;
            half2.active = true;
        }
    }
    
    createSliceParticles(fruit) {
        // GÜNCELLEME: Object pool'dan parçacık al (Dilimleme)
        let activatedCount = 0;
        for (const p of this.state.particles) {
            if (activatedCount >= PARTICLE_PER_SLICE) break;
            if (!p.active) {
                p.x = fruit.x;
                p.y = fruit.y;
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 3;
                p.vx = Math.cos(angle) * speed;
                p.vy = Math.sin(angle) * speed - 2;
                p.size = 3 + Math.random() * 3;
                p.color = fruit.color;
                p.life = 1;
                p.active = true;
                activatedCount++;
            }
        }
    }
    
    playKnifeSwooshSound() {
        const sound = this.state.swooshSound.cloneNode();
        sound.volume = this.state.swooshSound.volume;
        sound.play().catch((e) => console.log('Audio play failed:', e));
    }
    
    playBurningSound() {
        const sound = this.state.explosionSound.cloneNode();
        sound.volume = this.state.explosionSound.volume;
        sound.play().catch((e) => console.log('Audio play failed:', e));
    }
    
    playFallSound() {
        const sound = this.state.fallSound.cloneNode();
        sound.volume = this.state.fallSound.volume;
        sound.play().catch((e) => console.log('Audio play failed:', e));
    }
    
    playComboSound(type) {
        let sourceSound;
        if (type === 'excellent') {
            sourceSound = this.state.excellentSound;
        } else if (type === 'amazing') {
            sourceSound = this.state.amazingSound;
        } else {
            sourceSound = this.state.legendarySound;
        }
        
        const sound = sourceSound.cloneNode();
        sound.volume = sourceSound.volume;
        sound.play().catch((e) => console.log('Audio play failed:', e));
    }
    
    playSliceSound(comboCount) {
        const sound = this.state.sliceSound.cloneNode();
        sound.volume = Math.min(1.0, this.state.sliceSound.volume * (1 + comboCount * 0.1));
        sound.play().catch((e) => console.log('Audio play failed:', e));
    }
    
    playFailSound() {
        const sound = this.state.failSound.cloneNode();
        sound.volume = this.state.failSound.volume;
        sound.play().catch((e) => console.log('Fail audio play failed:', e));
    }
    
    createFireworks(x, y) {
        const colors = ['#ff6b6b', '#ffa500', '#ffd93d', '#6bcf7f', '#c471f5', '#ff4757'];
        
        // GÜNCELLEME: Havai fişek parçacıklarını da pool'dan al
        const particleCount = 30; // (Bu, bomba patlamasından ayrı, 30'da kalabilir)
        let activatedCount = 0;
        
        for (const p of this.state.particles) {
            if (activatedCount >= particleCount) break;
            if (!p.active) {
                const angle = (Math.PI * 2 * activatedCount) / particleCount;
                const speed = 3 + Math.random() * 5;

                p.x = x;
                p.y = y;
                p.vx = Math.cos(angle) * speed;
                p.vy = Math.sin(angle) * speed;
                p.size = 3 + Math.random() * 4;
                p.color = colors[Math.floor(Math.random() * colors.length)];
                p.life = 1;
                p.active = true;
                activatedCount++;
            }
        }
    }
    
    updatePhysics(dt) {
        // Don't update physics if paused
        if (this.state.isPaused) {
            // Still update visual effects
            if (this.state.screenShake > 0) {
                this.state.screenShake -= 1 * dt;
                if (this.state.screenShake < 0) this.state.screenShake = 0;
            }
            if (this.state.redFlash > 0) {
                this.state.redFlash -= 0.05 * dt;
                if (this.state.redFlash < 0) this.state.redFlash = 0;
            }
            return;
        }
        
        const normalizedDt = Math.min(dt, 20) / 16.67; // Normalize to 60fps
        dt = normalizedDt;
        
        // Update fruits (Bunlar pool'da değil, normal döngü)
        for (let i = this.state.fruits.length - 1; i >= 0; i--) {
            const fruit = this.state.fruits[i];
            if (!fruit.active) {
                // Sliced meyveleri ve bombayı listeden çıkar
                if (fruit.sliced) {
                    this.state.fruits.splice(i, 1);
                }
                continue;
            }
            
            fruit.x += fruit.vx * dt;
            fruit.y += fruit.vy * dt;
            fruit.vy += GRAVITY * dt;
            fruit.rotation += fruit.rotationSpeed * dt;
            
            // Wall bouncing
            if (fruit.x - fruit.radius < 0) {
                fruit.x = fruit.radius;
                fruit.vx = Math.abs(fruit.vx) * WALL_BOUNCE_DAMPING;
            }
            if (fruit.x + fruit.radius > this.state.width) {
                fruit.x = this.state.width - fruit.radius;
                fruit.vx = -Math.abs(fruit.vx) * WALL_BOUNCE_DAMPING;
            }
            
            // Check if fruit fell off screen
            if (fruit.y > this.state.height + fruit.radius) {
                fruit.active = false;
                
                if (fruit.isBomb && fruit.fuseSound) {
                    fruit.fuseSound.pause();
                    fruit.fuseSound.currentTime = 0;
                    fruit.fuseSound = undefined;
                }
                
                if (!fruit.sliced && !fruit.isBomb) {
                    this.state.lives--;
                    this.playFallSound();
                    this.updateUI();
                    
                    if (this.state.lives <= 0) {
                        this.showGameOver();
                        return; // Fonksiyondan hemen çık
                    }
                }
                
                // Aktif olmayan meyveyi listeden sil
                this.state.fruits.splice(i, 1);
            }
        }
        
        // Check if all fruits are gone (advance level)
        if (this.state.allFruitsLaunched && this.state.fruits.length === 0 && !this.state.showingMilestone && this.state.isPlaying) {
            const currentWave = this.state.level;
            
            this.state.allFruitsLaunched = false;
            
            if (currentWave === 10 || currentWave === 20 || currentWave === 30 || currentWave === 40 || currentWave === 50) {
                if (currentWave !== 50) {
                    this.state.lives++;
                    this.updateUI();
                }
                this.showMilestoneMessage(currentWave);
            } else if (currentWave < MAX_LEVEL) {
                this.state.level++;
                this.updateUI();
                const nextWave = this.state.level;
                if (nextWave === 11 || nextWave === 21 || nextWave === 31 || nextWave === 41) {
                    this.showChapterName(nextWave, () => {
                        this.launchFruits();
                    });
                } else {
                    this.launchFruits();
                }
            } else {
                this.showGameOver(false);
            }
        }
        
        // GÜNCELLEME: fruitHalves pool'unu güncelle (splice yok)
        for (const half of this.state.fruitHalves) {
            if (!half.active) continue;
            
            half.x += half.vx * dt;
            half.y += half.vy * dt;
            half.vy += GRAVITY * dt;
            half.rotation += half.rotationSpeed * dt;
            
            if (half.y > this.state.height * 0.5) {
                half.opacity -= 0.03 * dt;
            }
            
            if (half.y > this.state.height + half.radius || half.opacity <= 0) {
                half.active = false; // Havuza geri döndür
            }
        }
        
        // GÜNCELLEME: particles pool'unu güncelle (splice yok)
        for (const p of this.state.particles) {
            if (!p.active) continue;

            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += GRAVITY * 0.3 * dt;
            p.life -= 0.04 * dt;
            
            if (p.life <= 0 || p.y > this.state.height || p.x < 0 || p.x > this.state.width) {
                p.active = false; // Havuza geri döndür
            }
        }
        
        // Update fireworks (Bunlar pool'da değil, splice kullanılıyor, sayısı çok az)
        for (let i = this.state.fireworks.length - 1; i >= 0; i--) {
            //... (Bu düşük frekanslı, optimizasyona gerek yok)
        }
        
        // GÜNCELLEME: scorePopups pool'unu güncelle (splice yok)
        for (const popup of this.state.scorePopups) {
            if (!popup.active) continue;

            popup.y -= 1 * dt;
            popup.opacity -= 0.02 * dt;
            popup.scale += 0.01 * dt;
            
            if (popup.opacity <= 0) {
                popup.active = false; // Havuza geri döndür
            }
        }
        
        // Update current trail
        if (this.state.isDrawing && this.state.currentTrail.length > 0) {
            const now = performance.now();
            this.state.currentTrail = this.state.currentTrail.filter(p => 
                !p.timestamp || (now - p.timestamp) < 150
            );
        }
        
        // Update trails (splice kullanıyor, sayısı çok az MAX_TRAILS=2)
        for (let i = this.state.trails.length - 1; i >= 0; i--) {
            const trail = this.state.trails[i];
            trail.opacity -= TRAIL_FADE_SPEED * dt;
            
            if (trail.points.length > MAX_TRAIL_POINTS) {
                trail.points = trail.points.slice(-MAX_TRAIL_POINTS);
            }
            
            if (trail.opacity <= 0) {
                this.state.trails.splice(i, 1);
            }
        }
        
        // Update screen shake
        if (this.state.screenShake > 0) {
            this.state.screenShake -= 1 * dt;
            if (this.state.screenShake < 0) this.state.screenShake = 0;
        }
        
        // Update red flash
        if (this.state.redFlash > 0) {
            this.state.redFlash -= 0.05 * dt;
            if (this.state.redFlash < 0) this.state.redFlash = 0;
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
        
        ctx.clearRect(0, 0, this.state.width, this.state.height);
        
        // Draw red flash overlay
        if (this.state.redFlash > 0) {
            ctx.fillStyle = `rgba(255, 0, 0, ${this.state.redFlash * 0.5})`;
            ctx.fillRect(0, 0, this.state.width, this.state.height);
        }
        
        // GÜNCELLEME: Sadece aktif parçacıkları çiz
        for (const p of this.state.particles) {
            if (!p.active) continue;
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.globalAlpha = 1;
        
        // Draw fruits (only unsliced ones)
        for (const fruit of this.state.fruits) {
            if (!fruit.active || fruit.sliced) continue;
            
            ctx.globalAlpha = 1;
            
            ctx.save();
            ctx.translate(fruit.x, fruit.y);
            ctx.rotate(fruit.rotation);
            
            if (fruit.isBomb) {
                // Draw bomb emoji
                ctx.font = `${fruit.radius * 2}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('💣', 0, 0);
            } else {
                // Use fruit image with custom sizes
                const img = this.state.fruitImages.get(fruit.fruitType);
                if (img && img.complete) {
                    let sizeMultiplier = 2.5; // default size
                    
                    // Custom sizes for different fruits
                    switch (fruit.fruitType) {
                        case 'pineapple':
                            sizeMultiplier = 3.2;
                            break;
                        case 'lemon':
                            sizeMultiplier = 1.8;
                            break;
                        default:
                            sizeMultiplier = 2.5;
                            break;
                    }
                    
                    const imgSize = fruit.radius * sizeMultiplier;
                    ctx.drawImage(img, -imgSize / 2, -imgSize / 2, imgSize, imgSize);
                }
            }
            
            ctx.restore();
        }
        
        // GÜNCELLEME: Sadece aktif meyve yarılarını çiz
        for (const half of this.state.fruitHalves) {
            if (!half.active) continue;

            ctx.save();
            ctx.globalAlpha = half.opacity;
            ctx.translate(half.x, half.y);
            ctx.rotate(half.rotation);
            
            // Use half fruit image with custom sizes
            const halfImg = this.state.halfFruitImages.get(half.fruitType);
            if (halfImg && halfImg.complete) {
                let sizeMultiplier = 2.8; // default size
                
                // Custom sizes for different fruit halves
                switch (half.fruitType) {
                    case 'apple': sizeMultiplier = 1.8; break;
                    case 'pineapple': sizeMultiplier = 3.5; break;
                    case 'orange': case 'lemon': sizeMultiplier = 1.9; break;
                    case 'kiwi': sizeMultiplier = 2; break;
                    case 'strawberry': sizeMultiplier = 1.9; break;
                    case 'watermelon': sizeMultiplier = 3.0; break;
                    default: sizeMultiplier = 2.2; break;
                }
                
                const imgSize = half.radius * sizeMultiplier;
                ctx.drawImage(halfImg, -imgSize / 2, -imgSize / 2, imgSize, imgSize);
            }
            
            ctx.restore();
        }
        
        ctx.globalAlpha = 1;
        
        // Draw old trails (Bunlar pool'da değil, sayısı az)
        for (const trail of this.state.trails) {
            this.drawTrail(trail.points, trail.opacity);
        }
        
        // Draw current trail
        if (this.state.currentTrail.length > 1) {
            this.drawTrail(this.state.currentTrail, 1);
        }
        
        // GÜNCELLEME: Sadece aktif skor popuplarını çiz
        for (const popup of this.state.scorePopups) {
            if (!popup.active) continue;

            ctx.globalAlpha = popup.opacity;
            ctx.textAlign = 'center';
            
            const useShadows = !this.state.isLowPerformance;

            // Simple green popup for 1-2 fruits
            if (popup.isSimple) {
                ctx.fillStyle = '#4ade80'; // Green color
                ctx.font = `bold ${28}px Arial`;
                ctx.textBaseline = 'middle';
                if (useShadows) {
                    ctx.shadowBlur = 12;
                    ctx.shadowColor = '#4ade80';
                }
                ctx.fillText(`+${popup.score}`, popup.x, popup.y);
            }
            // Combo popup for 3+ fruits
            else if (popup.comboText) {
                // Draw combo text in yellow
                ctx.fillStyle = '#FFD700';
                ctx.font = `bold ${32}px Arial`;
                ctx.textBaseline = 'bottom';
                if (useShadows) {
                    ctx.shadowBlur = 20;
                    ctx.shadowColor = '#FFD700';
                }
                ctx.fillText(popup.comboText, popup.x, popup.y - 10);
                
                // Draw score below combo text in white
                ctx.fillStyle = '#FFFFFF';
                ctx.font = `bold ${28}px Arial`;
                ctx.textBaseline = 'top';
                if (useShadows) {
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = '#FFFFFF';
                }
                ctx.fillText(`+${popup.score}`, popup.x, popup.y + 10);
            }
        }
        
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        
        // Restore canvas (remove screen shake)
        ctx.restore();
    }
    
    // ... (getFleshColor, getLighterColor, getDarkerColor, drawFruitDetails - Değişiklik yok)
    getFleshColor(emoji) {
        switch (emoji) {
            case '🍎': return '#f5f5dc';
            case '🍊': return '#ffd699';
            case '🍋': return '#fffacd';
            case '🍌': return '#fff8dc';
            case '🍉': return '#ffb3ba';
            case '🍇': return '#dda0dd';
            case '🍓': return '#ffcccb';
            case '🥝': return '#d4f1d4';
            default: return '#ffffff';
        }
    }
    getLighterColor(color) {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const lighter = (val) => Math.min(255, val + 80);
        return `rgb(${lighter(r)}, ${lighter(g)}, ${lighter(b)})`;
    }
    getDarkerColor(color) {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const darker = (val) => Math.max(0, val - 60);
        return `rgb(${darker(r)}, ${darker(g)}, ${darker(b)})`;
    }
    drawFruitDetails(ctx, half) {
        // ... (Detay çizimlerinde değişiklik yok)
    }

    // GÜNCELLEME: Trail çizim fonksiyonu (Performans ve görsellik için güncellendi)
    drawTrail(points, opacity) {
        if (points.length < 2) return;
        
        const ctx = this.state.ctx;
        ctx.globalAlpha = opacity;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        const step = this.state.isLowPerformance ? 2 : 1;
        const useShadows = !this.state.isLowPerformance;
        
        const layers = [
            { widthStart: 3, widthEnd: 9, color: 'rgba(80, 180, 255, 0.3)', blur: 12 },
            { widthStart: 1.5, widthEnd: 4, color: 'rgba(150, 220, 255, 0.9)', blur: 6 }
        ];
        
        for (const layer of layers) {
            for (let i = 0; i < points.length - 1; i += step) {
                const p1 = points[i];
                const p2 = points[Math.min(i + 1, points.length - 1)];
                
                const progress = i / (points.length - 1);
                const width = layer.widthStart + (layer.widthEnd - layer.widthStart) * progress;
                
                ctx.strokeStyle = layer.color;
                ctx.lineWidth = width;
                
                if (useShadows) {
                    ctx.shadowBlur = layer.blur;
                    ctx.shadowColor = layer.color;
                }
                
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                
                if (i < points.length - 2) {
                    const p3 = points[Math.min(i + 2, points.length - 1)];
                    const mid_p2_p3 = { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 };
                    ctx.quadraticCurveTo(p2.x, p2.y, mid_p2_p3.x, mid_p2_p3.y);
                } else {
                    ctx.lineTo(p2.x, p2.y);
                }
                
                ctx.stroke();
            }
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
        if (!this.state.isPlaying) return;
        
        const deltaTime = currentTime - this.state.lastFrameTime;
        
        // Detect low performance (FPS < 30)
        if (deltaTime > 33 && !this.state.isLowPerformance) {
            this.state.frameSkipCounter++;
            if (this.state.frameSkipCounter > 10) {
                console.log('Low performance detected, enabling optimizations');
                this.state.isLowPerformance = true;
            }
        } else if (deltaTime < 20 && this.state.isLowPerformance) {
            this.state.frameSkipCounter = 0;
        }
        
        this.state.lastFrameTime = currentTime;
        
        // Always update physics
        this.updatePhysics(deltaTime);
        
        // Skip rendering every other frame on low performance devices
        if (!this.state.isLowPerformance || this.state.frameSkipCounter % 2 === 0) {
            this.render();
        }
        
        requestAnimationFrame((time) => { this.gameLoop(time); });
    }
}

// ===== LEADERBOARD FUNCTIONALITY =====
// (Değişiklik yok)
const CONTRACT_ADDRESS = '0xa4f109Eb679970C0b30C21812C99318837A81c73';
const API_URL = '';
let currentScore = 0;

async function saveScore() {
    console.log('=== SAVE SCORE STARTED ===');
    console.log('Current score:', currentScore);
    console.log('Window parent:', window.parent);
    console.log('SDK present:', !!window.sdk);
    
    let username = '';
    let fid = 0;
    
    try {
        if (window.sdk) {
            const context = await window.sdk.context;
            if (context?.user?.fid && context?.user?.username) {
                username = context.user.username;
                fid = context.user.fid;
                console.log('Farcaster user:', { username, fid });
            }
        }
    } catch (error) {
        console.log('Farcaster SDK context error:', error?.message || error);
    }
    
    if (!username) {
        const testUsernames = ['Player1', 'FruitNinja', 'SliceKing', 'BombAvoider', 'ComboMaster', 'FruitHero'];
        username = testUsernames[Math.floor(Math.random() * testUsernames.length)] + Math.floor(Math.random() * 1000);
        fid = Math.floor(Math.random() * 100000); // Test FID
    }

    const btn = document.getElementById('save-leaderboard-button');
    btn.disabled = true;
    btn.textContent = '⏳ Processing...';

    try {
        let provider;
        let signer;
        let walletAddress;
        let rawProvider; 

        let inFarcasterFrame = false;
        let farcasterWalletAvailable = false;
        
        try {
            if (window.sdk?.wallet?.getEthereumProvider) {
                rawProvider = await window.sdk.wallet.getEthereumProvider();
                if (!rawProvider && window.sdk?.actions?.signin) {
                    console.log('Attempting Farcaster signin to enable wallet...');
                    await window.sdk.actions.signin();
                    rawProvider = await window.sdk.wallet.getEthereumProvider();
                }
                if (rawProvider) {
                    farcasterWalletAvailable = true;
                    try {
                        const accounts = await rawProvider.request({ method: 'eth_requestAccounts' });
                        walletAddress = accounts?.[0];
                    } catch {}
                    if (window.ethers?.providers) {
                        const ethers = window.ethers;
                        provider = new ethers.providers.Web3Provider(rawProvider);
                        signer = provider.getSigner();
                    }
                    console.log('Farcaster wallet connected:', walletAddress);
                }
            }
        } catch (sdkProvErr) {
            console.log('SDK provider error:', sdkProvErr?.message || sdkProvErr);
        }
        
        if (!farcasterWalletAvailable) {
            console.log('Trying MetaMask/browser wallet...');
            
            if (!window.ethereum) {
                console.error('No wallet provider available');
                if (inFarcasterFrame) {
                    alert('Wallet connection failed in Farcaster. Please try refreshing the app.');
                } else {
                    alert('Please install MetaMask or use this app in Farcaster!');
                }
                return;
            }
            
            rawProvider = window.ethereum;
            
            if (!window.ethers) {
                console.log('Waiting for ethers.js...');
                let attempts = 0;
                while (!window.ethers && attempts < 30) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }
            }
            
            if (window.ethers && window.ethers.providers) {
                const ethers = window.ethers;
                provider = new ethers.providers.Web3Provider(rawProvider);
                await provider.send("eth_requestAccounts", []);
                signer = provider.getSigner();
                walletAddress = await signer.getAddress();
                console.log('MetaMask wallet connected:', walletAddress);
            } else {
                console.log('Using raw provider without ethers.js');
                const accounts = await rawProvider.request({ method: 'eth_requestAccounts' });
                walletAddress = accounts[0];
            }
        }

        try {
            const chainIdHex = await rawProvider.request({ method: 'eth_chainId' });
            const currentChain = typeof chainIdHex === 'string' ? chainIdHex : '0x0';
            if (currentChain !== '0x2105') {
                try {
                    await rawProvider.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0x2105' }]
                    });
                } catch (switchError) {
                    if (switchError.code === 4902) {
                        await rawProvider.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: '0x2105',
                                chainName: 'Base Mainnet',
                                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                                rpcUrls: ['https://mainnet.base.org'],
                                blockExplorerUrls: ['https://basescan.org']
                            }]
                        });
                    } else {
                        throw switchError;
                    }
                }
            }
        } catch (netErr) {
            console.log('Network check failed:', netErr?.message || netErr);
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
            const contract = new ethers.Contract(
                CONTRACT_ADDRESS,
                ['function submitScore(string memory _farcasterUsername, uint256 _fid, uint256 _score, uint256 _nonce, bytes memory _signature) external'],
                signer
            );

            tx = await contract.submitScore(
                signData.data.params.farcasterUsername,
                signData.data.params.fid,
                signData.data.params.score,
                signData.data.nonce,
                signData.data.signature
            );
            
            btn.textContent = '⏳ Waiting confirmation...';
            await tx.wait();
        } else if (rawProvider) {
            console.log('Using raw transaction without ethers.js');
            
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
            } else {
                throw new Error('Cannot encode transaction without ethers.js');
            }
        } else {
            throw new Error('No provider available for transaction');
        }
        
        if (!window.sdk) {
            alert('✅ Score saved successfully!');
        }
        btn.textContent = '✅ Saved!';
        
    } catch (error) {
        console.error(error);
        
        if (!window.sdk) {
            if (error.code === 'ACTION_REJECTED') {
                alert('Transaction cancelled.');
            } else if (error.message?.includes('insufficient funds')) {
                alert('Insufficient ETH!');
            } else {
                alert('Error: ' + (error.message || 'Unknown error'));
            }
        } else {
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

    } catch (error) {
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
    } catch (error) {
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
        
    } catch (error) {
        console.error('Error initializing game:', error);
    }
});