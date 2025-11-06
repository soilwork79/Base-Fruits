"use strict";

// ===== GAME CONSTANTS =====
const GRAVITY = 0.17;
const INITIAL_LIVES = 4;
const MAX_LEVEL = 50;
const FRUIT_RADIUS = 26.46;
const TRAIL_FADE_SPEED = 0.45;
const MAX_TRAIL_POINTS = 8;
const TRAIL_POINT_DISTANCE = 15;
const WALL_BOUNCE_DAMPING = 0.7;
const MAX_FRUITS = 7;
const MAX_PARTICLES = 50;
const MAX_TRAILS = 2;
const MAX_SCORE_POPUPS = 3;
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
let currentScore = 0;

// ===== GAME STATE =====
class GameState {
    constructor() {
        this.isPlaying = false;
        this.score = 0;
        this.level = 1;
        this.lives = INITIAL_LIVES;
        this.fruits = [];
        this.fruitHalves = [];
        this.trails = [];
        this.particles = [];
        this.scorePopups = [];
        this.fireworks = [];
        this.currentTrail = [];
        this.isDrawing = false;
        this.slicedThisSwipe = [];
        this.lastSwooshTime = 0;
        this.lastTrailPoint = null;
        this.comboFruits = [];
        this.comboTimer = null;
        this.comboTimeoutDuration = 250;
        this.screenShake = 0;
        this.redFlash = 0;
        this.isPaused = false;
        this.allFruitsLaunched = false;
        this.showingMilestone = false;
        this.lastFrameTime = 0;
        this.frameSkipCounter = 0;
        this.isLowPerformance = false;
        this.fruitImages = new Map();
        this.halfFruitImages = new Map();
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.width = 0;
        this.height = 0;
        this.resize();
        
        // Load audio
        this.swooshSound = new Audio('sounds/swoosh.mp3');
        this.sliceSound = new Audio('sounds/slice.mp3');
        this.explosionSound = new Audio('sounds/explosion.mp3');
        this.fuseSound = new Audio('sounds/fuse.mp3');
        this.fallSound = new Audio('sounds/fall.mp3');
        this.excellentSound = new Audio('sounds/excellent.mp3');
        this.amazingSound = new Audio('sounds/amazing.mp3');
        this.legendarySound = new Audio('sounds/legendary.mp3');
        this.failSound = new Audio('sounds/fail.mp3');
        
        // Set volumes
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
        this.state = new GameState();
        this.setupEventListeners();
        this.showStartScreen();

        // Global erişim için kaydet
        window.gameInstance = this;
    }
        
    // KRİTİK: Game over butonlarını dinamik ata
    this.setupGameOverButtons();
    
    // ✅ KRİTİK ÇÖZÜM: Game Over butonları için dinamik listener
    setupGameOverButtons() {
        const attachListener = (id, handler) => {
            // Her seferinde yeni listener atamak için önceki listener'ı temizle
            const btn = document.getElementById(id);
            if (btn) {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                document.getElementById(id).addEventListener('click', handler.bind(this));
                console.log(`✅ ${id} listener attached`);
            }
        };

        // Tüm butonlara listener ata
        attachListener('save-leaderboard-button', () => {
            console.log('💾 Save leaderboard clicked');
            saveScore();
        });
        
        attachListener('view-leaderboard-button', () => {
            console.log('🏆 View leaderboard clicked');
            viewLeaderboard();
        });
        
        attachListener('share-score-button', () => {
            console.log('🚀 Share clicked');
            shareOnFarcaster();
        });
        
        attachListener('restart-button', () => {
            console.log('🔄 Restart clicked');
            this.startGame();
        });
    }
    
    setupEventListeners() {
        // Start button
        const startButton = document.getElementById('start-button');
        if (startButton) {
            startButton.addEventListener('click', () => this.startGame());
        }
        
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
        
        // Keyboard
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                const startScreen = document.getElementById('start-screen');
                const gameOverScreen = document.getElementById('game-over-screen');
                if (startScreen && !startScreen.classList.contains('hidden')) {
                    this.startGame();
                } else if (gameOverScreen && !gameOverScreen.classList.contains('hidden')) {
                    this.startGame();
                }
            }
        });
    }
    
    showStartScreen() {
        document.getElementById('start-screen').classList.remove('hidden');
        document.getElementById('game-over-screen').style.display = 'flex';
    document.getElementById('game-hud').style.display = 'none';
    }
    
    showGameOver(playFailSound = true) {
    this.state.isPlaying = false;
    
    // Stop all fuse sounds
    for (const fruit of this.state.fruits) {
        if (fruit.isBomb && fruit.fuseSound) {
            fruit.fuseSound.pause();
            fruit.fuseSound.currentTime = 0;
            fruit.fuseSound = undefined;
        }
    }
    
    if (playFailSound) {
        this.playFailSound();
    }
    
    currentScore = this.state.score;
    document.getElementById('final-score').textContent = this.state.score.toString();
    document.getElementById('final-level').textContent = this.state.level.toString();
        
        // ✅ Butonları etkinleştir
        this.activateGameOverButtons();
    }
    
    // ✅ Game Over butonlarını görünür olduğunda etkinleştir
    activateGameOverButtons() {
        const buttons = ['save-leaderboard-button', 'view-leaderboard-button', 'share-score-button', 'restart-button'];
        buttons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.style.pointerEvents = 'auto';
                btn.style.display = 'block';
                btn.disabled = false;
            }
        });
    }
    
    getBackgroundForWave(wave) {
        if (wave >= 1 && wave <= 10) return "island_background.png";
        if (wave >= 11 && wave <= 20) return "purple_background.png";
        if (wave >= 21 && wave <= 30) return "dojo_background.png";
        if (wave >= 31 && wave <= 40) return "forest_background.png";
        if (wave >= 41 && wave <= 50) return "desert_background.png";
        return "island_background.png";
    }

    changeBackground(wave) {
        const backgroundImage = this.getBackgroundForWave(wave);
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
        
        this.changeBackground(wave);
        
        const chapterTextElement = document.getElementById('chapter-text');
        chapterTextElement.textContent = chapterName;
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
        chapterElement.classList.remove('show', 'hidden');
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
        
        setTimeout(() => {
            chapterElement.style.opacity = '1';
            chapterElement.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            chapterElement.style.opacity = '0';
            chapterElement.classList.remove('show');
            setTimeout(() => {
                chapterElement.classList.add('hidden');
                chapterElement.style.display = 'none';
                if (onComplete) {
                    setTimeout(() => onComplete(), 2000);
                }
            }, 1000);
        }, 3000);
    }

    showMilestoneMessage(wave) {
        this.state.showingMilestone = true;
        
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
        
        document.getElementById('milestone-text').textContent = mainText;
        document.getElementById('milestone-subtext').textContent = subText;
        document.getElementById('milestone-message').classList.remove('hidden');
        
        if (wave === 50) {
            this.createFireworks(this.state.width / 2, this.state.height / 2);
        }
        
        setTimeout(() => {
            document.getElementById('milestone-message').classList.add('hidden');
            this.state.showingMilestone = false;
            
            if (wave === 50) {
                this.showGameOver(false);
            } else {
                this.state.level++;
                this.updateUI();
                
                const nextWave = this.state.level;
                if (nextWave === 11 || nextWave === 21 || nextWave === 31 || nextWave === 41) {
                    this.showChapterName(nextWave, () => this.launchFruits());
                } else {
                    this.launchFruits();
                }
            }
        }, 3000);
    }
    
    startGame() {
        // Stop all fuse sounds
        for (const fruit of this.state.fruits) {
            if (fruit.isBomb && fruit.fuseSound) {
                fruit.fuseSound.pause();
                fruit.fuseSound.currentTime = 0;
                fruit.fuseSound = undefined;
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
        
        if (this.state.comboTimer !== null) {
            clearTimeout(this.state.comboTimer);
        }
        this.state.comboFruits = [];
        this.state.comboTimer = null;
        
        this.state.isDrawing = false;
        this.state.currentTrail = [];
        this.state.slicedThisSwipe = [];
        
        this.state.screenShake = 0;
        this.state.redFlash = 0;
        this.state.isPaused = false;
        this.state.showingMilestone = false;
        this.state.allFruitsLaunched = false;
        
        // Reset button
        const saveBtn = document.getElementById('save-leaderboard-button').style.display = 'block';
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = '💾 Save to Leaderboard';
        }
        
        this.updateUI();
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('game-hud').classList.remove('hidden');
        
        this.changeBackground(1);
        this.showChapterName(1, () => this.launchFruits());
        
        this.gameLoop(performance.now());
    }
    
    cleanupMemory() {
        this.state.fruits = [];
        this.state.fruitHalves = [];
        this.state.trails = [];
        this.state.particles = [];
        this.state.scorePopups = [];
        this.state.fireworks = [];
        this.state.currentTrail = [];
        this.state.slicedThisSwipe = [];
        this.state.comboFruits = [];
        this.state.lastTrailPoint = null;
        
        if (this.state.comboTimer) {
            clearTimeout(this.state.comboTimer);
            this.state.comboTimer = null;
        }
        
        this.state.screenShake = 0;
        this.state.redFlash = 0;
        
        const allAudioElements = document.querySelectorAll('audio');
        allAudioElements.forEach(audio => {
            if (audio.src.includes('fuse.mp3')) {
                audio.pause();
                audio.currentTime = 0;
            }
        });
        
        if (window.gc) {
            window.gc();
        }
    }
    
    launchFruits() {
        this.cleanupMemory();
        
        const wave = this.state.level;
        let fruitCount = 7;
        
        if (wave <= 2) fruitCount = 1;
        else if (wave <= 5) fruitCount = 2;
        else if (wave <= 8) fruitCount = 3;
        else if (wave <= 10) fruitCount = 4;
        else if (wave <= 20) fruitCount = 5;
        else if (wave <= 30) fruitCount = 6;
        
        this.state.fruits = [];
        this.state.allFruitsLaunched = false;
        
        const fruitBaseDelay = (wave >= 41 && wave <= 50) ? 1000 : 0;
        
        const launchFruitsNow = () => {
            let launchedCount = 0;
            for (let i = 0; i < fruitCount; i++) {
                const launchDelay = Math.random() * 500;
                
                setTimeout(() => {
                    if (!this.state.isPlaying) return;
                    
                    const fruitType = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
                    const x = this.state.width * (0.3 + Math.random() * 0.4);
                    const angle = (75 + Math.random() * 30) * Math.PI / 180;
                    const speed = 12 + Math.random() * 2.4;
                    
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
                        const bombDelay = (wave >= 41 && wave <= 50) ? 1500 : 600;
                        setTimeout(() => {
                            this.state.allFruitsLaunched = true;
                        }, bombDelay);
                    }
                }, fruitBaseDelay + launchDelay);
            }
        };
        
        const launchBombAt = (delayMs) => {
            const delay = Math.max(0, delayMs);
            setTimeout(() => {
                if (!this.state.isPlaying) return;
                
                const x = this.state.width * (0.3 + Math.random() * 0.4);
                const angle = (75 + Math.random() * 30) * Math.PI / 180;
                const speed = 12 + Math.random() * 2.4;
                
                const bombFuseSound = this.state.fuseSound.cloneNode();
                bombFuseSound.volume = this.state.fuseSound.volume;
                bombFuseSound.loop = true;
                bombFuseSound.play().catch(() => {});
                
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
        
        launchFruitsNow();
        
        if (wave >= 11 && wave <= 20 && Math.random() < 0.5) {
            launchBombAt(fruitBaseDelay + (Math.random() < 0.5 ? 0 : 350));
        } else if (wave >= 21 && wave <= 30 && Math.random() < 0.5) {
            launchBombAt(fruitBaseDelay + (Math.random() < 0.5 ? 0 : 350));
        } else if (wave >= 31 && wave <= 40) {
            launchBombAt(fruitBaseDelay + (Math.random() < 0.5 ? 0 : 350));
        } else if (wave >= 41 && wave <= 50) {
            const hasSecond = Math.random() < 0.5;
            launchBombAt(fruitBaseDelay - 1000);
            if (hasSecond) {
                launchBombAt(fruitBaseDelay + 1000);
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
        
        if (this.state.lastTrailPoint) {
            const dx = x - this.state.lastTrailPoint.x;
            const dy = y - this.state.lastTrailPoint.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < TRAIL_POINT_DISTANCE) {
                const prevPoint = this.state.currentTrail[this.state.currentTrail.length - 1];
                if (prevPoint) {
                    this.checkSlicingSegment(prevPoint, { x, y });
                }
                return;
            }
        }
        
        const prevPoint = this.state.currentTrail[this.state.currentTrail.length - 1];
        const now = performance.now();
        this.state.currentTrail.push({ x, y, timestamp: now });
        this.state.lastTrailPoint = { x, y };
        
        if (prevPoint && prevPoint.timestamp) {
            const dx = x - prevPoint.x;
            const dy = y - prevPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const timeDiff = now - prevPoint.timestamp;
            const speed = timeDiff > 0 ? distance / timeDiff : 0;
            const timeSinceLastSwoosh = now - this.state.lastSwooshTime;
            
            if (speed > 1.5 && timeSinceLastSwoosh > 200 && this.state.currentTrail.length >= 3) {
                this.playKnifeSwooshSound();
                this.state.lastSwooshTime = now;
            }
        }
        
        this.state.currentTrail = this.state.currentTrail.filter(p => !p.timestamp || (now - p.timestamp) < 150);
        
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
        
        if (this.state.currentTrail.length > 1) {
            if (this.state.trails.length >= MAX_TRAILS) {
                this.state.trails.shift();
            }
            this.state.trails.push({
                points: [...this.state.currentTrail],
                opacity: 1
            });
        }
        
        this.state.currentTrail = [];
        this.state.lastTrailPoint = null;
        this.state.slicedThisSwipe = [];
    }
    
    scoreCombo() {
        if (this.state.comboFruits.length === 0) return;
        
        const comboScore = SCORE_TABLE[Math.min(this.state.comboFruits.length, 7)];
        this.state.score += comboScore;
        
        let avgX = 0;
        let avgY = 0;
        for (const fruit of this.state.comboFruits) {
            avgX += fruit.x;
            avgY += fruit.y;
        }
        avgX /= this.state.comboFruits.length;
        avgY /= this.state.comboFruits.length;
        
        const count = this.state.comboFruits.length;
        let comboText = '';
        
        if (this.state.scorePopups.length >= MAX_SCORE_POPUPS) {
            this.state.scorePopups.shift();
        }
        
        if (count === 1 || count === 2) {
            this.state.scorePopups.push({
                x: avgX,
                y: avgY,
                score: comboScore,
                opacity: 1,
                scale: 1,
                comboText: '',
                isSimple: true
            });
        } else if (count === 3) {
            comboText = '3 Fruit Combo';
            this.playComboSound('excellent');
        } else if (count === 4) {
            comboText = '4 Fruit Combo';
            this.playComboSound('excellent');
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
        
        if (count >= 3) {
            this.state.scorePopups.push({
                x: this.state.width / 2,
                y: this.state.height / 2,
                score: comboScore,
                opacity: 1,
                scale: 1,
                comboText: comboText,
                isSimple: false
            });
            
            this.createFireworks(avgX, avgY);
        }
        
        this.updateUI();
        this.state.comboFruits = [];
        this.state.comboTimer = null;
    }
    
    handleBombCut() {
        const bomb = this.state.fruits.find(f => f.isBomb && f.sliced);
        
        for (const fruit of this.state.fruits) {
            if (fruit.isBomb && fruit.fuseSound) {
                fruit.fuseSound.pause();
                fruit.fuseSound.currentTime = 0;
                fruit.fuseSound = undefined;
            }
        }
        
        const uncutFruits = this.state.fruits.filter(f => f.active && !f.sliced && !f.isBomb);
        const livesLost = uncutFruits.length;
        
        if (bomb && this.state.particles.length < MAX_PARTICLES) {
            const particleCount = Math.min(15, MAX_PARTICLES - this.state.particles.length);
            for (let i = 0; i < particleCount; i++) {
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
        
        for (const fruit of uncutFruits) {
            fruit.active = false;
            fruit.sliced = true;
            
            if (this.state.particles.length < MAX_PARTICLES) {
                const particleCount = Math.min(5, MAX_PARTICLES - this.state.particles.length);
                for (let i = 0; i < particleCount; i++) {
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
        }
        
        this.state.screenShake = 20;
        this.state.redFlash = 1;
        
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
        
        this.state.isPaused = true;
        this.state.lives = Math.max(0, this.state.lives - livesLost);
        this.playBurningSound();
        
        this.state.comboFruits = [];
        if (this.state.comboTimer !== null) {
            clearTimeout(this.state.comboTimer);
            this.state.comboTimer = null;
        }
        
        this.updateUI();
        
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
        
        if (this.state.lives <= 0) {
            setTimeout(() => {
                this.state.isPaused = false;
                this.showGameOver();
            }, 2000);
            return;
        }
        
        setTimeout(() => {
            this.state.isPaused = false;
            
            if (this.state.allFruitsLaunched && this.state.fruits.every(f => !f.active) && !this.state.showingMilestone) {
                const currentWave = this.state.level;
                
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
                        this.showChapterName(nextWave, () => this.launchFruits());
                    } else {
                        this.launchFruits();
                    }
                } else {
                    this.showGameOver(false);
                }
            }
        }, 2000);
    }
    
    checkSlicingSegment(p1, p2) {
        for (const fruit of this.state.fruits) {
            if (fruit.sliced || !fruit.active) continue;
            
            if (this.lineCircleIntersect(p1, p2, fruit)) {
                fruit.sliced = true;
                
                const rawAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                const absAngle = Math.abs(rawAngle);
                let sliceAngle;
                
                if (absAngle < Math.PI / 4 || absAngle > 3 * Math.PI / 4) {
                    sliceAngle = 0;
                } else {
                    sliceAngle = Math.PI / 2;
                }
                
                fruit.sliceAngle = sliceAngle;
                this.state.slicedThisSwipe.push(fruit);
                
                if (fruit.isBomb) {
                    this.handleBombCut();
                    return;
                }
                
                this.state.comboFruits.push(fruit);
                
                if (this.state.comboTimer !== null) {
                    clearTimeout(this.state.comboTimer);
                }
                
                this.state.comboTimer = window.setTimeout(() => {
                    this.scoreCombo();
                }, this.state.comboTimeoutDuration);
                
                this.playSliceSound(this.state.comboFruits.length);
                this.createFruitHalves(fruit, sliceAngle);
                this.createSliceParticles(fruit);
            }
        }
    }
    
    lineCircleIntersect(p1, p2, fruit) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
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
        const offsetDist = fruit.radius * 0.3;
        const perpAngle = sliceAngle + Math.PI / 2;
        
        this.state.fruitHalves.push({
            x: fruit.x + Math.cos(perpAngle) * offsetDist,
            y: fruit.y + Math.sin(perpAngle) * offsetDist,
            vx: fruit.vx + Math.cos(perpAngle) * 2,
            vy: fruit.vy + Math.sin(perpAngle) * 2,
            radius: fruit.radius,
            color: fruit.color,
            fruitType: fruit.fruitType,
            halfImagePath: fruit.halfImagePath,
            rotation: 0,
            rotationSpeed: -0.1 - Math.random() * 0.1,
            isLeft: true,
            opacity: 1
        });
        
        this.state.fruitHalves.push({
            x: fruit.x - Math.cos(perpAngle) * offsetDist,
            y: fruit.y - Math.sin(perpAngle) * offsetDist,
            vx: fruit.vx - Math.cos(perpAngle) * 2,
            vy: fruit.vy - Math.sin(perpAngle) * 2,
            radius: fruit.radius,
            color: fruit.color,
            fruitType: fruit.fruitType,
            halfImagePath: fruit.halfImagePath,
            rotation: 0,
            rotationSpeed: 0.1 + Math.random() * 0.1,
            isLeft: false,
            opacity: 1
        });
    }
    
    createSliceParticles(fruit) {
        if (this.state.particles.length < MAX_PARTICLES) {
            const particleCount = Math.min(6, MAX_PARTICLES - this.state.particles.length);
            for (let i = 0; i < particleCount; i++) {
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
    }
    
    playKnifeSwooshSound() {
        const sound = this.state.swooshSound.cloneNode();
        sound.volume = this.state.swooshSound.volume;
        sound.play().catch(() => {});
    }
    
    playBurningSound() {
        const sound = this.state.explosionSound.cloneNode();
        sound.volume = this.state.explosionSound.volume;
        sound.play().catch(() => {});
    }
    
    playFallSound() {
        const sound = this.state.fallSound.cloneNode();
        sound.volume = this.state.fallSound.volume;
        sound.play().catch(() => {});
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
        sound.play().catch(() => {});
    }
    
    playSliceSound(comboCount) {
        const sound = this.state.sliceSound.cloneNode();
        sound.volume = Math.min(1.0, this.state.sliceSound.volume * (1 + comboCount * 0.1));
        sound.play().catch(() => {});
    }
    
    playFailSound() {
        const sound = this.state.failSound.cloneNode();
        sound.volume = this.state.failSound.volume;
        sound.play().catch(() => {});
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
        if (this.state.isPaused) {
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
        
        const normalizedDt = Math.min(dt, 20) / 16.67;
        dt = normalizedDt;
        
        for (const fruit of this.state.fruits) {
            if (!fruit.active) continue;
            
            fruit.x += fruit.vx * dt;
            fruit.y += fruit.vy * dt;
            fruit.vy += GRAVITY * dt;
            fruit.rotation += fruit.rotationSpeed * dt;
            
            if (fruit.x - fruit.radius < 0) {
                fruit.x = fruit.radius;
                fruit.vx = Math.abs(fruit.vx) * WALL_BOUNCE_DAMPING;
            }
            
            if (fruit.x + fruit.radius > this.state.width) {
                fruit.x = this.state.width - fruit.radius;
                fruit.vx = -Math.abs(fruit.vx) * WALL_BOUNCE_DAMPING;
            }
            
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
                        return;
                    }
                }
            }
        }
        
        if (this.state.allFruitsLaunched && this.state.fruits.every(f => !f.active) && !this.state.showingMilestone && this.state.isPlaying) {
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
                    this.showChapterName(nextWave, () => this.launchFruits());
                } else {
                    this.launchFruits();
                }
            } else {
                this.showGameOver(false);
            }
        }
        
        for (let i = this.state.fruitHalves.length - 1; i >= 0; i--) {
            const half = this.state.fruitHalves[i];
            half.x += half.vx * dt;
            half.y += half.vy * dt;
            half.vy += GRAVITY * dt;
            half.rotation += half.rotationSpeed * dt;
            
            if (half.y > this.state.height * 0.5) {
                half.opacity -= 0.015 * dt;
            }
            
            if (half.y > this.state.height + half.radius || half.opacity <= 0) {
                this.state.fruitHalves.splice(i, 1);
            }
        }
        
        for (let i = this.state.particles.length - 1; i >= 0; i--) {
            const p = this.state.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += GRAVITY * 0.3 * dt;
            p.life -= 0.02 * dt;
            
            if (p.life <= 0 || p.y > this.state.height || p.x < 0 || p.x > this.state.width) {
                this.state.particles.splice(i, 1);
            }
        }
        
        if (this.state.particles.length > MAX_PARTICLES) {
            this.state.particles = this.state.particles.slice(-MAX_PARTICLES);
        }
        
        for (let i = this.state.fireworks.length - 1; i >= 0; i--) {
            const fw = this.state.fireworks[i];
            let allDead = true;
            
            for (const p of fw.particles) {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vy += GRAVITY * 0.2 * dt;
                p.life -= 0.015 * dt;
                
                if (p.life > 0) allDead = false;
            }
            
            if (allDead) {
                this.state.fireworks.splice(i, 1);
            }
        }
        
        for (let i = this.state.scorePopups.length - 1; i >= 0; i--) {
            const popup = this.state.scorePopups[i];
            popup.y -= 1 * dt;
            popup.opacity -= 0.02 * dt;
            popup.scale += 0.01 * dt;
            
            if (popup.opacity <= 0) {
                this.state.scorePopups.splice(i, 1);
            }
        }
        
        if (this.state.isDrawing && this.state.currentTrail.length > 0) {
            const now = performance.now();
            this.state.currentTrail = this.state.currentTrail.filter(p => 
                !p.timestamp || (now - p.timestamp) < 150
            );
        }
        
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
        
        if (this.state.trails.length > MAX_TRAILS) {
            this.state.trails = this.state.trails.slice(-MAX_TRAILS);
        }
        
        if (this.state.scorePopups.length > MAX_SCORE_POPUPS) {
            this.state.scorePopups = this.state.scorePopups.slice(-MAX_SCORE_POPUPS);
        }
        
        if (this.state.screenShake > 0) {
            this.state.screenShake -= 1 * dt;
            if (this.state.screenShake < 0) this.state.screenShake = 0;
        }
        
        if (this.state.redFlash > 0) {
            this.state.redFlash -= 0.05 * dt;
            if (this.state.redFlash < 0) this.state.redFlash = 0;
        }
    }
    
    render() {
        const ctx = this.state.ctx;
        ctx.save();
        
        if (this.state.screenShake > 0) {
            const shakeX = (Math.random() - 0.5) * this.state.screenShake;
            const shakeY = (Math.random() - 0.5) * this.state.screenShake;
            ctx.translate(shakeX, shakeY);
        }
        
        ctx.clearRect(0, 0, this.state.width, this.state.height);
        
        if (this.state.redFlash > 0) {
            ctx.fillStyle = `rgba(255, 0, 0, ${this.state.redFlash * 0.5})`;
            ctx.fillRect(0, 0, this.state.width, this.state.height);
        }
        
        for (const p of this.state.particles) {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        for (const fw of this.state.fireworks) {
            for (const p of fw.particles) {
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
        
        for (const fruit of this.state.fruits) {
            if (!fruit.active || fruit.sliced) continue;
            
            ctx.globalAlpha = 1;
            ctx.save();
            ctx.translate(fruit.x, fruit.y);
            ctx.rotate(fruit.rotation);
            
            if (fruit.isBomb) {
                ctx.font = `${fruit.radius * 2}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('💣', 0, 0);
            } else {
                const img = this.state.fruitImages.get(fruit.fruitType);
                if (img && img.complete) {
                    let sizeMultiplier = 2.5;
                    switch (fruit.fruitType) {
                        case 'pineapple':
                            sizeMultiplier = 3.2;
                            break;
                        case 'lemon':
                            sizeMultiplier = 1.8;
                            break;
                    }
                    const imgSize = fruit.radius * sizeMultiplier;
                    ctx.drawImage(img, -imgSize / 2, -imgSize / 2, imgSize, imgSize);
                }
            }
            
            ctx.restore();
        }
        
        for (const half of this.state.fruitHalves) {
            ctx.save();
            ctx.globalAlpha = half.opacity;
            ctx.translate(half.x, half.y);
            ctx.rotate(half.rotation);
            
            const halfImg = this.state.halfFruitImages.get(half.fruitType);
            if (halfImg && halfImg.complete) {
                let sizeMultiplier = 2.8;
                switch (half.fruitType) {
                    case 'apple':
                    case 'orange':
                    case 'lemon':
                        sizeMultiplier = 1.8;
                        break;
                    case 'pineapple':
                        sizeMultiplier = 3.5;
                        break;
                    case 'watermelon':
                        sizeMultiplier = 3.0;
                        break;
                    case 'kiwi':
                        sizeMultiplier = 2;
                        break;
                    case 'strawberry':
                        sizeMultiplier = 1.9;
                        break;
                }
                
                const imgSize = half.radius * sizeMultiplier;
                ctx.drawImage(halfImg, -imgSize / 2, -imgSize / 2, imgSize, imgSize);
            }
            
            ctx.restore();
        }
        
        ctx.globalAlpha = 1;
        
        for (const trail of this.state.trails) {
            this.drawTrail(trail.points, trail.opacity);
        }
        
        if (this.state.currentTrail.length > 1) {
            this.drawTrail(this.state.currentTrail, 1);
        }
        
        for (const popup of this.state.scorePopups) {
            ctx.globalAlpha = popup.opacity;
            ctx.textAlign = 'center';
            
            if (popup.isSimple) {
                ctx.fillStyle = '#4ade80';
                ctx.font = `bold ${28}px Arial`;
                ctx.textBaseline = 'middle';
                ctx.shadowBlur = 12;
                ctx.shadowColor = '#4ade80';
                ctx.fillText(`+${popup.score}`, popup.x, popup.y);
            } else if (popup.comboText) {
                ctx.fillStyle = '#FFD700';
                ctx.font = `bold ${32}px Arial`;
                ctx.textBaseline = 'bottom';
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#FFD700';
                ctx.fillText(popup.comboText, popup.x, popup.y - 10);
                ctx.fillStyle = '#FFFFFF';
                ctx.font = `bold ${28}px Arial`;
                ctx.textBaseline = 'top';
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#FFFFFF';
                ctx.fillText(`+${popup.score}`, popup.x, popup.y + 10);
            }
        }
        
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.restore();
    }
    
    drawTrail(points, opacity) {
        if (points.length < 2) return;
        
        const ctx = this.state.ctx;
        ctx.globalAlpha = opacity;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        const step = this.state.isLowPerformance ? 2 : 1;
        
        const layers = [
            { widthStart: 3, widthEnd: 9, color: 'rgba(80, 180, 255, 0.3)', blur: 12 },
            { widthStart: 1.5, widthEnd: 4, color: 'rgba(150, 220, 255, 0.9)', blur: 6 }
        ];
        
        for (const layer of layers) {
            for (let i = 0; i < points.length - 1; i += step) {
                const progress = i / (points.length - 1);
                const width = layer.widthStart + (layer.widthEnd - layer.widthStart) * progress;
                
                ctx.strokeStyle = layer.color;
                ctx.lineWidth = width;
                ctx.shadowBlur = layer.blur;
                ctx.shadowColor = layer.color;
                
                ctx.beginPath();
                ctx.moveTo(points[i].x, points[i].y);
                
                if (i < points.length - 2) {
                    const xc = (points[i + 1].x + points[Math.min(i + 2, points.length - 1)].x) / 2;
                    const yc = (points[i + 1].y + points[Math.min(i + 2, points.length - 1)].y) / 2;
                    ctx.quadraticCurveTo(points[i + 1].x, points[i + 1].y, xc, yc);
                } else {
                    ctx.lineTo(points[i + 1].x, points[i + 1].y);
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
        
        const livesCount = Math.max(0, this.state.lives);
        const hearts = '❤️'.repeat(livesCount);
        document.getElementById('lives').textContent = hearts;
    }
    
    gameLoop(currentTime) {
        if (!this.state.isPlaying) return;
        
        const deltaTime = currentTime - this.state.lastFrameTime;
        
        if (deltaTime > 33 && !this.state.isLowPerformance) {
            this.state.frameSkipCounter++;
            if (this.state.frameSkipCounter > 10) {
                this.state.isLowPerformance = true;
            }
        } else if (deltaTime < 20 && this.state.isLowPerformance) {
            this.state.frameSkipCounter = 0;
        }
        
        this.state.lastFrameTime = currentTime;
        this.updatePhysics(deltaTime);
        
        if (!this.state.isLowPerformance || this.state.frameSkipCounter % 2 === 0) {
            this.render();
        }
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

// ===== LEADERBOARD FUNCTIONALITY =====

const CONTRACT_ADDRESS = '0xa4f109Eb679970C0b30C21812C99318837A81c73';
const API_URL = ''; // Vercel backend adresinizi yazın
let currentScore = 0;

async function saveScore() {
    const btn = document.getElementById('save-leaderboard-button').style.display = 'block';
    btn.disabled = true;
    btn.textContent = '⏳ Processing...';

    try {
        let walletAddress = null;
        let rawProvider = null;
        let username = '';
        let fid = 0;

        // 1. Farcaster SDK Wallet
        try {
            if (window.sdk?.wallet?.getEthereumProvider) {
                console.log('Farcaster SDK detected...');
                rawProvider = await window.sdk.wallet.getEthereumProvider();
                
                if (rawProvider) {
                    const accounts = await rawProvider.request({ method: 'eth_requestAccounts' });
                    walletAddress = accounts?.[0];
                    
                    if (window.farcasterContext?.user) {
                        username = window.farcasterContext.user.username || `User${walletAddress?.slice(2, 8)}`;
                        fid = window.farcasterContext.user.fid || 0;
                    }
                    
                    console.log('Farcaster wallet:', walletAddress);
                }
            }
        } catch (sdkError) {
            console.log('Farcaster SDK error:', sdkError);
        }

        // 2. MetaMask Fallback
        if (!walletAddress && window.ethereum) {
            console.log('Trying MetaMask...');
            rawProvider = window.ethereum;
            const accounts = await rawProvider.request({ method: 'eth_requestAccounts' });
            walletAddress = accounts?.[0];
            username = `User${walletAddress.slice(2, 8)}`;
            fid = 0;
            console.log('MetaMask:', walletAddress);
        }

        // 3. No wallet
        if (!walletAddress || !rawProvider) {
            throw new Error('Wallet bağlanamadı. Farcaster Mini App veya MetaMask kullanın.');
        }

        // 4. Switch to Base
        btn.textContent = '⏳ Switching to Base...';
        const chainIdHex = await rawProvider.request({ method: 'eth_chainId' });
        if (chainIdHex !== '0x2105') {
            await rawProvider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x2105' }]
            });
        }

        // 5. Get signature
        btn.textContent = '⏳ Getting signature...';
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
        if (!signData.success) throw new Error(signData.message);

        // 6. Send transaction
        btn.textContent = '⏳ Submitting...';
        
        const ethers = window.ethers;
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

        const txHash = await rawProvider.request({
            method: 'eth_sendTransaction',
            params: [txParams]
        });

        // 7. Wait confirmation
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

        if (!receipt) throw new Error('Transaction timeout');
        if (receipt.status === '0x0') throw new Error('Transaction failed');

        // 8. Success
        if (!window.sdk) alert('✅ Score saved!');
        btn.textContent = '✅ Saved!';
        console.log('✅ TX:', txHash);

    } catch (error) {
        console.error('❌ Save error:', error);
        
        if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
            if (!window.sdk) alert('❌ Transaction cancelled.');
        } else if (error.message?.includes('insufficient funds')) {
            if (!window.sdk) alert('❌ Insufficient ETH!');
        } else {
            if (!window.sdk) alert('❌ Error: ' + (error.message || 'Unknown'));
        }
        
        btn.disabled = false;
        btn.textContent = '💾 Save to Leaderboard';
    }
}

// VIEW LEADERBOARD
async function viewLeaderboard() {
    const modal = document.getElementById('leaderboard-modal');
    const content = document.getElementById('leaderboard-content');
    
    modal.classList.remove('hidden');
    content.innerHTML = '⏳ Loading...';

    try {
        const response = await fetch(`${API_URL}/api/leaderboard?limit=20`);
        const data = await response.json();

        if (!data.success || data.leaderboard.length === 0) {
            content.innerHTML = '<p>No scores yet. Be the first! 🎯</p>';
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
        console.error('Leaderboard error:', error);
        content.innerHTML = '<p>❌ Connection error!</p>';
    }
}

function closeLeaderboard() {
    document.getElementById('leaderboard-modal').classList.add('hidden');
}

// SHARE ON FARCASTER
function shareOnFarcaster() {
    const message = `🍉 I scored ${currentScore} points in Base Fruits! 🥇\n\nCan you beat me? 🍓🍉`;
    const gameUrl = 'https://base-fruits-farcaster-miniapp.vercel.app/';
    
    if (window.sdk?.actions?.composeCast) {
        try {
            window.sdk.actions.composeCast({
                text: message,
                embeds: [gameUrl]
            });
            return;
        } catch (error) {
            console.log('composeCast failed:', error);
        }
    }
    
    const castText = encodeURIComponent(message);
    const embedUrl = encodeURIComponent(gameUrl);
    const farcasterUrl = `https://warpcast.com/~/compose?text=${castText}&embeds[]=${embedUrl}`;
    
    window.open(farcasterUrl, '_blank');
}

// ===== INITIALIZE GAME =====
window.addEventListener('DOMContentLoaded', () => {
    try {
        const game = new FruitSliceGame();
        console.log('✅ Game initialized');
        
        // KRİTİK: Buton listener'larını burada ata
        attachGameOverListeners();
        
        // Modal kapatma
        const modal = document.getElementById('leaderboard-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeLeaderboard();
            });
        }
        
    } catch (error) {
        console.error('❌ Game init error:', error);
    }
});

// ✅ KRİTİK: Global fonksiyon - butonlara listener ata
function attachGameOverListeners() {
    console.log('Attaching game over listeners...');
    
    // Helper
    const addClickListener = (id, handler) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', handler);
            console.log(`✅ ${id} listener attached successfully`);
        } else {
            console.error(`❌ Button ${id} not found in DOM`);
        }
    };

    // Tüm butonlara listener ata
    addClickListener('save-leaderboard-button', () => {
        console.log('💾 Save leaderboard clicked');
        saveScore();
    });
    
    addClickListener('view-leaderboard-button', () => {
        console.log('🏆 View leaderboard clicked');
        viewLeaderboard();
    });
    
    addClickListener('share-score-button', () => {
        console.log('🚀 Share clicked');
        shareOnFarcaster();
    });
    
    addClickListener('restart-button', () => {
        console.log('🔄 Restart clicked');
        // Game instance'a erişim için global değişken kullan
        if (window.gameInstance) {
            window.gameInstance.startGame();
        }
    });
}