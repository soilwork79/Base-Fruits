// ===== TYPES AND INTERFACES =====
interface Point {
    x: number;
    y: number;
    timestamp?: number;
}

interface Fruit {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    color: string;
    fruitType: string;
    imagePath?: string;
    halfImagePath?: string;
    sliced: boolean;
    active: boolean;
    sliceAngle?: number;
    isBomb?: boolean;
    fuseSound?: HTMLAudioElement;
    rotation: number;
    rotationSpeed: number;
}

interface FruitHalf {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    color: string;
    fruitType: string;
    halfImagePath?: string;
    rotation: number;
    rotationSpeed: number;
    isLeft: boolean;
    opacity: number;
}

interface Trail {
    points: Point[];
    opacity: number;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    life: number;
}

interface ScorePopup {
    x: number;
    y: number;
    score: number;
    opacity: number;
    scale: number;
    comboText?: string;
    color?: string;
    isSimple?: boolean;
}

interface Firework {
    x: number;
    y: number;
    particles: Particle[];
}

// ===== GAME CONSTANTS =====
const GRAVITY = 0.17; // Adjusted gravity for optimal fruit trajectories
const INITIAL_LIVES = 4;
const MAX_LEVEL = 50;
const FRUIT_RADIUS = 26.46; // 40% smaller than original 44.1
const TRAIL_FADE_SPEED = 0.35;
const MAX_TRAIL_POINTS = 15; // Reduced for mobile performance
const WALL_BOUNCE_DAMPING = 0.7;
const MAX_FRUITS = 7;
const MAX_PARTICLES = 100; // Limit particles for performance
const MAX_TRAILS = 3; // Limit simultaneous trails
const MAX_SCORE_POPUPS = 5; // Limit score popups

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

// Global variable to store current score before saving
let currentScore = 0;
let globalUsername = '';

// ===== GAME STATE =====
class GameState {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    audioContext: AudioContext;
    
    // Game state
    isPlaying: boolean = false;
    score: number = 0;
    level: number = 1;
    lives: number = INITIAL_LIVES;
    
    // Game objects
    fruits: Fruit[] = [];
    fruitHalves: FruitHalf[] = [];
    trails: Trail[] = [];
    particles: Particle[] = [];
    scorePopups: ScorePopup[] = [];
    fireworks: Firework[] = [];
    
    // Input
    currentTrail: Point[] = [];
    isDrawing: boolean = false;
    slicedThisSwipe: Fruit[] = [];
    lastSwooshTime: number = 0; // Track last swoosh sound play time
    
    // Combo system
    comboFruits: Fruit[] = [];
    comboTimer: number | null = null;
    comboTimeoutDuration: number = 250; // 0.25 seconds in milliseconds
    
    // Bomb explosion effects
    screenShake: number = 0;
    redFlash: number = 0;
    isPaused: boolean = false;
    
    // Level management
    allFruitsLaunched: boolean = false;
    showingMilestone: boolean = false;
    
    // Animation
    lastFrameTime: number = 0;
    frameSkipCounter: number = 0;
    isLowPerformance: boolean = false;
    
    // Audio files
    swooshSound: HTMLAudioElement;
    sliceSound: HTMLAudioElement;
    explosionSound: HTMLAudioElement;
    fuseSound: HTMLAudioElement;
    fallSound: HTMLAudioElement;
    excellentSound: HTMLAudioElement;
    amazingSound: HTMLAudioElement;
    legendarySound: HTMLAudioElement;
    failSound: HTMLAudioElement;
    
    // Fruit images
    fruitImages: Map<string, HTMLImageElement> = new Map();
    halfFruitImages: Map<string, HTMLImageElement> = new Map();
    
    constructor() {
        this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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
        const container = this.canvas.parentElement!;
        this.width = container.clientWidth;
        this.height = container.clientHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }
}

// ===== LEADERBOARD FUNCTIONS (Placeholder for non-Farcaster environment) =====
function openLeaderboard() {
    // Show modal
    document.getElementById('leaderboard-modal')!.classList.remove('hidden');
    
    // Trigger loading state or fetch data here
    // In a real application, you would fetch leaderboard data from a backend/storage
    // For this example, we just show a placeholder
    const leaderboardBody = document.getElementById('leaderboard-body')!;
    leaderboardBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-400">Loading Leaderboard...</td></tr>';
    
    // Farcaster logic goes here
    fetchLeaderboard();
}

function closeLeaderboard() {
    document.getElementById('leaderboard-modal')!.classList.add('hidden');
}

async function saveScoreToLeaderboard() {
    const usernameInput = document.getElementById('username-input') as HTMLInputElement;
    let username = usernameInput.value.trim();
    
    if (username.length < 3 || username.length > 15) {
        alert('Username must be between 3 and 15 characters.');
        return;
    }
    
    // Basic XSS prevention (sanitize the input)
    username = username.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    globalUsername = username;
    
    const saveBtn = document.getElementById('save-leaderboard-button') as HTMLButtonElement;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    
    // Simulate saving and fetching (in a real app, this would be an API call)
    // Here we'll just show the leaderboard with the new score added visually.
    
    // Farcaster logic to save score
    await postScoreToFarcaster(username, currentScore, game.state.level);
    
    saveBtn.textContent = '✅ Saved!';
    
    // Open leaderboard after saving (it will fetch the score)
    openLeaderboard();
}

// Farcaster Specific Functions
const FC_API_ENDPOINT = 'YOUR_FC_API_ENDPOINT'; // Replace with your actual API endpoint

async function fetchLeaderboard() {
    const leaderboardBody = document.getElementById('leaderboard-body')!;
    leaderboardBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-400">Farcaster API is required for the leaderboard.</td></tr>';
    
    // In a real implementation:
    /*
    try {
        const response = await fetch(`${FC_API_ENDPOINT}/leaderboard`);
        const data = await response.json();
        
        leaderboardBody.innerHTML = '';
        data.scores.forEach((item: any, index: number) => {
            const row = `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${index + 1}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.username}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.score}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.level}</td>
                </tr>
            `;
            leaderboardBody.innerHTML += row;
        });
    } catch (error) {
        leaderboardBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-red-500">Failed to load leaderboard.</td></tr>';
    }
    */
}

async function postScoreToFarcaster(username: string, score: number, level: number) {
    console.log(`Simulating score post: ${username}, Score: ${score}, Level: ${level}`);
    
    // In a real implementation:
    /*
    try {
        const response = await fetch(`${FC_API_ENDPOINT}/score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, score, level })
        });
        
        if (!response.ok) {
            throw new Error('Failed to post score to Farcaster API');
        }
        
        console.log('Score posted successfully.');
    } catch (error) {
        console.error('Error posting score:', error);
        alert('Failed to save score. Please try again.');
    }
    */
}

async function shareOnFarcaster() {
    if (!currentScore) {
        alert("Please play a game first!");
        return;
    }
    
    const message = `I just scored ${currentScore} and reached wave ${game.state.level} in the Fruit Slice game! Can you beat my score? #fruitslicegame #farcaster #game`;
    const gameUrl = window.location.href.split('?')[0]; // Clean URL
    
    // Preferred sharing URL for Warpcast
    const farcasterUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(message)}&embeds[]=${encodeURIComponent(gameUrl)}`;
    
    try {
        // Method 1: Check for mobile/Warpcast app (Less reliable, relies on user-agent)
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            // Attempt to open in new tab for better compatibility
            window.open(farcasterUrl, '_blank');
        } else {
            // Method 2: Open in current window for desktop
            const newWindow = window.open(farcasterUrl, '_blank', 'width=550,height=420');
            if (newWindow) {
                newWindow.focus();
            } else {
                window.location.href = farcasterUrl;
            }
        }
    } catch (error) {
        // Method 3: Copy to clipboard as fallback
        navigator.clipboard.writeText(message + ' ' + gameUrl).then(() => {
            alert('Farcaster link could not be opened. Message copied to clipboard!');
        }).catch(() => {
            alert('Unable to open Farcaster. Please manually share: ' + message + ' ' + gameUrl);
        });
    }
}

// ===== GAME LOGIC =====
class FruitSliceGame {
    state: GameState;
    
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
        document.getElementById('restart-button')!.addEventListener('click', () => {
            this.startGame();
        });
        
        // Save score button
        document.getElementById('save-leaderboard-button')!.addEventListener('click', saveScoreToLeaderboard);
        
        // Leaderboard button
        document.getElementById('leaderboard-button')!.addEventListener('click', openLeaderboard);
        document.getElementById('final-leaderboard-button')!.addEventListener('click', openLeaderboard);
        
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
        document.getElementById('start-screen')!.classList.remove('hidden');
        document.getElementById('game-hud')!.classList.add('hidden');
        document.getElementById('game-over-screen')!.classList.add('hidden');
        document.getElementById('leaderboard-modal')!.classList.add('hidden');
    }
    
    showGameOver(playFailSound: boolean = true) {
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
        
        document.getElementById('final-score')!.textContent = this.state.score.toString();
        document.getElementById('final-level')!.textContent = this.state.level.toString();
        
        // If a username was saved during the game, pre-fill it
        const usernameInput = document.getElementById('username-input') as HTMLInputElement;
        if (globalUsername) {
            usernameInput.value = globalUsername;
        } else {
            usernameInput.value = '';
        }
        
        document.getElementById('game-over-screen')!.classList.remove('hidden');
        document.getElementById('game-hud')!.classList.add('hidden');
    }
    
    getBackgroundForWave(wave: number): string {
        // Determine which background to use based on wave ranges
        if (wave >= 1 && wave <= 10) return "island_background.png";
        if (wave >= 11 && wave <= 20) return "purple_background.png";
        if (wave >= 21 && wave <= 30) return "dojo_background.png";
        if (wave >= 31 && wave <= 40) return "forest_background.png";
        if (wave >= 41 && wave <= 50) return "desert_background.png";
        return "island_background.png"; // Default fallback
    }

    changeBackground(wave: number) {
        const backgroundImage = this.getBackgroundForWave(wave);
        
        console.log(`Changing background to: ${backgroundImage} for wave ${wave}`);
        
        const gameContainer = document.getElementById('game-container')!;
        gameContainer.style.backgroundImage = `url('images/${backgroundImage}')`;
    }

    showChapterName(wave: number, onComplete?: () => void) {
        const chapterNames: { [key: number]: string } = {
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
        const chapterTextElement = document.getElementById('chapter-text')!;
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
        
        const chapterElement = document.getElementById('chapter-name')!;
        
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

    showMilestoneMessage(wave: number) {
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
        document.getElementById('milestone-text')!.textContent = mainText;
        document.getElementById('milestone-subtext')!.textContent = subText;
        document.getElementById('milestone-message')!.classList.remove('hidden');
        
        // Fireworks on final completion
        if (wave === 50) {
            this.createFireworks(this.state.width / 2, this.state.height / 2);
        }
        
        // Hide milestone message after 3 seconds
        setTimeout(() => {
            document.getElementById('milestone-message')!.classList.add('hidden');
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
        
        // Clear game state flags
        this.state.isPaused = false;
        this.state.showingMilestone = false;
        this.state.allFruitsLaunched = false;
        
        // Reset save leaderboard button
        const saveBtn = document.getElementById('save-leaderboard-button') as HTMLButtonElement;
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = '💾 Save Leaderboard';
        }
        
        // Update UI
        this.updateUI();
        document.getElementById('start-screen')!.classList.add('hidden');
        document.getElementById('game-over-screen')!.classList.add('hidden');
        document.getElementById('game-hud')!.classList.remove('hidden');
        
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
        
        
        this.state.fruits = [];
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
        
        const launchBombAt = (delayMs: number) => {
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
                const bombFuseSound = this.state.fuseSound.cloneNode() as HTMLAudioElement;
                bombFuseSound.volume = this.state.fuseSound.volume;
                bombFuseSound.loop = true;
                console.log('Playing fuse sound for bomb');
                bombFuseSound.play().then(() => {
                    console.log('Fuse sound started successfully');
                }).catch((e: any) => {
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
                // No bomb
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
            }
        }
    }
    
    handleInputStart(clientX: number, clientY: number) {
        if (!this.state.isPlaying) return;
        
        const rect = this.state.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        this.state.isDrawing = true;
        this.state.currentTrail = [{ x, y, timestamp: performance.now() }];
        this.state.slicedThisSwipe = [];
    }
    
    handleInputMove(clientX: number, clientY: number) {
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
        
        // Limit score popups for performance
        if (this.state.scorePopups.length >= MAX_SCORE_POPUPS) {
            this.state.scorePopups.shift();
        }
        
        if (count === 1 || count === 2) {
            // Single or double fruit - show simple green score at fruit position
            this.state.scorePopups.push({
                x: avgX,
                y: avgY,
                score: comboScore,
                opacity: 1,
                scale: 1,
                comboText: '', // No text, just score
                isSimple: true // Flag for simple green style
            });
        } else if (count === 3) {
            comboText = '3 Fruit Combo';
            this.state.scorePopups.push({
                x: this.state.width / 2,
                y: this.state.height / 2,
                score: comboScore,
                opacity: 1,
                scale: 1,
                comboText: comboText,
                isSimple: false
            });
        } else if (count === 4) {
            comboText = '4 Fruit Combo';
            this.state.scorePopups.push({
                x: this.state.width / 2,
                y: this.state.height / 2,
                score: comboScore,
                opacity: 1,
                scale: 1,
                comboText: comboText,
                isSimple: false
            });
        } else if (count === 5) {
            comboText = '5 Fruit Combo';
            this.playComboSound('excellent');
            this.state.scorePopups.push({
                x: this.state.width / 2,
                y: this.state.height / 2,
                score: comboScore,
                opacity: 1,
                scale: 1,
                comboText: comboText,
                isSimple: false
            });
        } else if (count === 6) {
            comboText = '6 Fruit Combo';
            this.playComboSound('amazing');
            this.state.scorePopups.push({
                x: this.state.width / 2,
                y: this.state.height / 2,
                score: comboScore,
                opacity: 1,
                scale: 1,
                comboText: comboText,
                isSimple: false
            });
        } else if (count >= 7) {
            comboText = '7+ Fruit Combo';
            this.playComboSound('legendary');
            this.state.scorePopups.push({
                x: this.state.width / 2,
                y: this.state.height / 2,
                score: comboScore,
                opacity: 1,
                scale: 1,
                comboText: comboText,
                isSimple: false
            });
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
        
        // Create massive explosion particles from bomb center (reduced for mobile)
        if (bomb && this.state.particles.length < MAX_PARTICLES) {
            const particleCount = Math.min(25, MAX_PARTICLES - this.state.particles.length);
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
        
        // Destroy all uncut fruits
        for (const fruit of uncutFruits) {
            fruit.active = false;
            fruit.sliced = true;
            
            // Create explosion particles for each destroyed fruit (reduced for mobile)
            if (this.state.particles.length < MAX_PARTICLES) {
                const particleCount = Math.min(8, MAX_PARTICLES - this.state.particles.length);
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
    
    checkSlicingSegment(p1: Point, p2: Point) {
        // Check if this line segment intersects any fruit
        for (const fruit of this.state.fruits) {
            if (fruit.sliced || !fruit.active) continue;
            
            if (this.lineCircleIntersect(p1, p2, fruit)) {
                fruit.sliced = true;
                
                // Calculate slice angle from the swipe direction
                const rawAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                
                // Simplify to vertical or horizontal cuts
                // If angle is closer to vertical (up/down), make it vertical
                // If angle is closer to horizontal (left/right), make it horizontal
                const absAngle = Math.abs(rawAngle);
                let sliceAngle: number;
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

    lineCircleIntersect(p1: Point, p2: Point, fruit: Fruit): boolean {
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

    createFruitHalves(fruit: Fruit, sliceAngle: number) {
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
            fruitType: fruit.fruitType,
            halfImagePath: fruit.halfImagePath,
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
            fruitType: fruit.fruitType,
            halfImagePath: fruit.halfImagePath,
            rotation: 0,
            rotationSpeed: 0.1 + Math.random() * 0.1,
            isLeft: false,
            opacity: 1
        });
    }

    createSliceParticles(fruit: Fruit) {
        // Create juice particles (reduced for mobile)
        if (this.state.particles.length < MAX_PARTICLES) {
            const particleCount = Math.min(10, MAX_PARTICLES - this.state.particles.length);
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

    playKnifeSwooshSound(): void {
        const sound = this.state.swooshSound.cloneNode() as HTMLAudioElement;
        sound.volume = this.state.swooshSound.volume;
        sound.play().catch((e: any) => console.log('Audio play failed:', e));
    }

    playBurningSound(): void {
        const sound = this.state.explosionSound.cloneNode() as HTMLAudioElement;
        sound.volume = this.state.explosionSound.volume;
        sound.play().catch((e: any) => console.log('Audio play failed:', e));
    }

    playFallSound(): void {
        const sound = this.state.fallSound.cloneNode() as HTMLAudioElement;
        sound.volume = this.state.fallSound.volume;
        sound.play().catch((e: any) => console.log('Audio play failed:', e));
    }

    playComboSound(type: 'excellent' | 'amazing' | 'legendary'): void {
        let sourceSound: HTMLAudioElement;
        if (type === 'excellent') {
            sourceSound = this.state.excellentSound;
        } else if (type === 'amazing') {
            sourceSound = this.state.amazingSound;
        } else {
            sourceSound = this.state.legendarySound;
        }
        
        const sound = sourceSound.cloneNode() as HTMLAudioElement;
        sound.volume = sourceSound.volume;
        sound.play().catch((e: any) => console.log('Audio play failed:', e));
    }

    playSliceSound(comboCount: number): void {
        const sound = this.state.sliceSound.cloneNode() as HTMLAudioElement;
        // Increase volume slightly with combo for effect, capping at 1.0
        sound.volume = Math.min(1.0, this.state.sliceSound.volume * (1 + comboCount * 0.1));
        sound.play().catch((e: any) => console.log('Audio play failed:', e));
    }
    
    playFailSound(): void {
        const sound = this.state.failSound.cloneNode() as HTMLAudioElement;
        sound.volume = this.state.failSound.volume;
        sound.play().catch((e: any) => console.log('Fail audio play failed:', e));
    }
    
    createFireworks(x: number, y: number): void {
        const colors = ['#ff6b6b', '#ffa500', '#ffd93d', '#6bcf7f', '#c471f5', '#ff4757'];
        const particles: Particle[] = [];
        
        for (let i = 0; i < 50; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 5;
            
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 1
            });
        }
        
        // Limit fireworks count
        if (this.state.fireworks.length < 3) {
            this.state.fireworks.push({ x, y, particles });
        }
    }
    
    update(deltaTime: number) {
        if (!this.state.isPlaying || this.state.isPaused) return;

        // Apply screen shake decay
        this.state.screenShake = Math.max(0, this.state.screenShake - deltaTime * 0.05);
        this.state.redFlash = Math.max(0, this.state.redFlash - deltaTime * 0.005);
        
        // Update Fruits
        let allFruitsInactive = true;
        for (let i = this.state.fruits.length - 1; i >= 0; i--) {
            const fruit = this.state.fruits[i];
            
            if (!fruit.active) continue;
            
            allFruitsInactive = false;

            // Apply gravity
            fruit.vy += GRAVITY * deltaTime;

            // Update position
            fruit.x += fruit.vx * deltaTime;
            fruit.y += fruit.vy * deltaTime;
            
            // Update rotation
            fruit.rotation += fruit.rotationSpeed * deltaTime;
            
            // Wall bouncing logic (for fun/realism)
            if (fruit.x - fruit.radius < 0 || fruit.x + fruit.radius > this.state.width) {
                fruit.vx *= -WALL_BOUNCE_DAMPING;
                fruit.x = fruit.x - fruit.radius < 0 ? fruit.radius : this.state.width - fruit.radius;
            }

            // Check if fruit has fallen off the bottom
            if (fruit.y > this.state.height + fruit.radius * 2) {
                fruit.active = false;
                
                // Stop fuse sound if it's a bomb
                if (fruit.isBomb && fruit.fuseSound) {
                    fruit.fuseSound.pause();
                    fruit.fuseSound.currentTime = 0;
                    fruit.fuseSound = undefined;
                }
                
                // Only lose a life if it was a non-sliced, non-bomb fruit
                if (!fruit.sliced && !fruit.isBomb) {
                    this.state.lives--;
                    this.playFallSound();
                    this.updateUI();
                    
                    if (this.state.lives <= 0) {
                        this.showGameOver();
                        return; // Stop updating if game over
                    }
                }
            }
        }
        
        // Update Fruit Halves
        for (let i = this.state.fruitHalves.length - 1; i >= 0; i--) {
            const half = this.state.fruitHalves[i];
            
            // Apply gravity
            half.vy += GRAVITY * deltaTime;

            // Update position
            half.x += half.vx * deltaTime;
            half.y += half.vy * deltaTime;
            
            // Update rotation
            half.rotation += half.rotationSpeed * deltaTime;
            
            // Fade out the half as it falls
            half.opacity = Math.max(0, half.opacity - deltaTime * 0.005);
            
            // Remove if off screen and faded out
            if (half.y > this.state.height + half.radius || half.opacity <= 0) {
                this.state.fruitHalves.splice(i, 1);
            }
        }
        
        // Update Trails (Current Trail is handled by inputMove, fading trails here)
        for (let i = this.state.trails.length - 1; i >= 0; i--) {
            const trail = this.state.trails[i];
            trail.opacity = Math.max(0, trail.opacity - TRAIL_FADE_SPEED * deltaTime * 0.01);
            if (trail.opacity <= 0) {
                this.state.trails.splice(i, 1);
            }
        }
        
        // Update Particles
        for (let i = this.state.particles.length - 1; i >= 0; i--) {
            const particle = this.state.particles[i];
            
            // Apply gravity
            particle.vy += GRAVITY * deltaTime * 0.5; // Less gravity for particles
            
            // Update position
            particle.x += particle.vx * deltaTime;
            particle.y += particle.vy * deltaTime;
            
            // Fade out
            particle.life -= deltaTime * 0.005; // Fade time is about 200ms
            
            if (particle.life <= 0) {
                this.state.particles.splice(i, 1);
            }
        }
        
        // Update Score Popups
        for (let i = this.state.scorePopups.length - 1; i >= 0; i--) {
            const popup = this.state.scorePopups[i];
            
            popup.y -= deltaTime * 0.05; // Float upwards
            popup.opacity = Math.max(0, popup.opacity - deltaTime * 0.005);
            popup.scale = Math.min(2.0, popup.scale + deltaTime * 0.001);
            
            if (popup.opacity <= 0) {
                this.state.scorePopups.splice(i, 1);
            }
        }
        
        // Update Fireworks
        for (let i = this.state.fireworks.length - 1; i >= 0; i--) {
            const firework = this.state.fireworks[i];
            let fireworkActive = false;
            for (let j = firework.particles.length - 1; j >= 0; j--) {
                const particle = firework.particles[j];
                
                // Apply gravity
                particle.vy += GRAVITY * deltaTime * 0.5;
                
                // Update position
                particle.x += particle.vx * deltaTime;
                particle.y += particle.vy * deltaTime;
                
                // Fade out
                particle.life -= deltaTime * 0.002;
                
                if (particle.life <= 0) {
                    firework.particles.splice(j, 1);
                } else {
                    fireworkActive = true;
                }
            }
            
            if (!fireworkActive) {
                this.state.fireworks.splice(i, 1);
            }
        }

        // Wave advancement logic
        // Check if all fruits have been launched and all are now inactive
        if (this.state.allFruitsLaunched && allFruitsInactive && !this.state.showingMilestone) {
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
    }
    
    draw() {
        const ctx = this.state.ctx;
        
        // Apply screen shake offset
        const offsetX = this.state.screenShake * (Math.random() - 0.5);
        const offsetY = this.state.screenShake * (Math.random() - 0.5);
        
        // Apply red flash effect
        const redFlashColor = `rgba(255, 0, 0, ${this.state.redFlash * 0.5})`;
        
        ctx.save();
        ctx.translate(offsetX, offsetY);
        
        // Clear canvas (Red flash effect is drawn on top)
        ctx.clearRect(0, 0, this.state.width, this.state.height);
        
        // Draw red flash background
        if (this.state.redFlash > 0) {
            ctx.fillStyle = redFlashColor;
            ctx.fillRect(0, 0, this.state.width, this.state.height);
        }

        // Draw Trails (Fading Trails first)
        for (const trail of this.state.trails) {
            this.drawTrail(ctx, trail.points, trail.opacity);
        }
        
        // Draw Current Trail
        if (this.state.isDrawing && this.state.currentTrail.length > 1) {
            this.drawTrail(ctx, this.state.currentTrail, 1.0);
        }

        // Draw Fruits
        for (const fruit of this.state.fruits) {
            if (fruit.active && !fruit.sliced) {
                this.drawFruit(ctx, fruit);
            }
        }
        
        // Draw Fruit Halves
        for (const half of this.state.fruitHalves) {
            this.drawFruitHalf(ctx, half);
        }
        
        // Draw Juice Particles
        for (const particle of this.state.particles) {
            this.drawParticle(ctx, particle);
        }
        
        // Draw Fireworks
        for (const firework of this.state.fireworks) {
            for (const particle of firework.particles) {
                this.drawParticle(ctx, particle, true);
            }
        }
        
        // Draw Score Popups (Combo text)
        for (const popup of this.state.scorePopups) {
            this.drawScorePopup(ctx, popup);
        }
        
        ctx.restore();
    }
    
    drawTrail(ctx: CanvasRenderingContext2D, points: Point[], opacity: number) {
        ctx.save();
        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        
        // Draw only the last 5 points for better performance and smoother look
        const start = Math.max(0, points.length - 5);
        ctx.moveTo(points[start].x, points[start].y);
        
        for (let i = start + 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        
        ctx.stroke();
        ctx.restore();
    }
    
    drawFruit(ctx: CanvasRenderingContext2D, fruit: Fruit) {
        ctx.save();
        ctx.translate(fruit.x, fruit.y);
        ctx.rotate(fruit.rotation);
        
        const image = this.state.fruitImages.get(fruit.fruitType);
        const size = fruit.radius * 2;
        
        if (image && image.complete) {
            ctx.drawImage(image, -fruit.radius, -fruit.radius, size, size);
        } else {
            // Fallback: draw a colored circle
            ctx.fillStyle = fruit.color;
            ctx.beginPath();
            ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Bomb fallback: draw a fuse and bomb highlight
            if (fruit.isBomb) {
                ctx.fillStyle = '#000000';
                ctx.fillRect(-2, -fruit.radius * 1.5, 4, fruit.radius * 0.5); // Fuse
                ctx.strokeStyle = '#ff0000';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, fruit.radius - 2, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        
        ctx.restore();
    }
    
    drawFruitHalf(ctx: CanvasRenderingContext2D, half: FruitHalf) {
        ctx.save();
        ctx.globalAlpha = half.opacity;
        ctx.translate(half.x, half.y);
        ctx.rotate(half.rotation);
        
        const image = this.state.halfFruitImages.get(half.fruitType);
        const size = half.radius * 2;
        const offset = half.isLeft ? -half.radius : 0;
        
        if (image && image.complete) {
            // Drawing a half image requires cropping the source image
            // We draw the full half image at the rotated position
            ctx.drawImage(image, offset, -half.radius, half.radius, size, half.radius * (half.isLeft ? -1 : 0), -half.radius, size, size);
        } else {
            // Fallback: draw a colored arc/shape (more complex for halves)
            ctx.fillStyle = half.color;
            ctx.beginPath();
            // Simple approach: just draw a full circle with reduced opacity
            ctx.arc(0, 0, half.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    drawParticle(ctx: CanvasRenderingContext2D, particle: Particle, isFirework: boolean = false) {
        ctx.save();
        
        const alpha = particle.life;
        const color = isFirework ? particle.color : `rgba(255, 255, 255, ${alpha})`;
        
        if (!isFirework) {
            // Juice particles: use fruit color and gradually fade
            ctx.fillStyle = particle.color;
        } else {
            // Firework particles: bright glow effect
            ctx.fillStyle = particle.color;
        }
        
        ctx.globalAlpha = alpha;
        
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    drawScorePopup(ctx: CanvasRenderingContext2D, popup: ScorePopup) {
        ctx.save();
        ctx.globalAlpha = popup.opacity;
        ctx.font = `${popup.isSimple ? 24 : 36}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let text: string;
        let yOffset = 0;
        
        if (popup.comboText) {
            if (popup.isSimple) {
                // Simple score popup (small green score)
                ctx.fillStyle = 'rgba(0, 255, 0, 1)';
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 4;
                text = `+${popup.score}`;
            } else {
                // Combo message (large white text)
                ctx.fillStyle = 'white';
                ctx.shadowColor = 'black';
                ctx.shadowBlur = 10;
                
                // Draw combo text first (larger)
                ctx.font = 'bold 36px Impact, sans-serif';
                ctx.fillText(popup.comboText, popup.x, popup.y);
                
                // Draw score below
                ctx.font = 'bold 24px Arial, sans-serif';
                text = `+${popup.score} Points`;
                yOffset = 40;
            }
        } else {
            // Single score popup (default green)
            ctx.fillStyle = 'rgba(0, 255, 0, 1)';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 4;
            text = `+${popup.score}`;
        }
        
        ctx.scale(popup.scale, popup.scale);
        
        // Adjust coordinates after scale
        const scaleFactor = 1 / popup.scale;
        ctx.fillText(text, popup.x * scaleFactor, (popup.y + yOffset) * scaleFactor);
        
        ctx.restore();
    }
    
    updateUI() {
        document.getElementById('score-value')!.textContent = this.state.score.toString().padStart(6, '0');
        document.getElementById('wave-value')!.textContent = this.state.level.toString().padStart(2, '0');
        
        const livesContainer = document.getElementById('lives-container')!;
        livesContainer.innerHTML = '';
        for (let i = 0; i < INITIAL_LIVES; i++) {
            const heart = document.createElement('span');
            heart.className = 'text-2xl transition-opacity duration-300';
            heart.textContent = '❤️';
            if (i >= this.state.lives) {
                heart.style.opacity = '0.3'; // Dim lost lives
            }
            livesContainer.appendChild(heart);
        }
    }

    gameLoop(currentTime: number) {
        if (!this.state.isPlaying) return;
        
        // Calculate delta time
        const deltaTime = (currentTime - this.state.lastFrameTime) / 1000;
        this.state.lastFrameTime = currentTime;
        
        // Performance check (simple frame skipping)
        // If deltaTime is too large (e.g., > 100ms), we skip the update step to avoid physics glitches
        const maxDeltaTime = 100;
        
        if (deltaTime < maxDeltaTime) {
            this.update(deltaTime);
        } else {
            console.warn(`Frame skipped due to large delta time: ${deltaTime.toFixed(2)}ms`);
        }
        
        this.draw();
        
        // Request next frame
        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

// Global reference for leaderboard functions to access game state
let game: FruitSliceGame;

// ===== INITIALIZE GAME =====
window.addEventListener('DOMContentLoaded', () => {
    try {
        game = new FruitSliceGame();
        
        // Close leaderboard button
        const closeLeaderboardBtn = document.getElementById('close-leaderboard');
        if (closeLeaderboardBtn) {
            closeLeaderboardBtn.addEventListener('click', closeLeaderboard);
        }
        
        // Share button event listener
        const shareButton = document.getElementById('share-score-button');
        if (shareButton) {
            shareButton.addEventListener('click', shareOnFarcaster);
        }
        
        // Modal dışına tıklayınca kapat
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