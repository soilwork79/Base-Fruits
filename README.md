# 🍉 Farcaster Fruit Slice

A fun and addictive Web3 mini-game built for Farcaster. Slice fruits, earn combo points, and compete for high scores!

## 🎮 Features

- **20 Progressive Levels**: Start with 1 fruit and work up to 7 fruits simultaneously
- **Physics-Based Gameplay**: Realistic gravity, high-arc trajectories, and wall bouncing
- **Wall Bouncing**: Fruits bounce off screen edges for extended play time
- **Combo System**: Earn massive points for multi-fruit slices
  - 1 fruit: 10 points
  - 2 fruits: 30 points
  - 3 fruits: 135 points
  - 4 fruits: 200 points
  - 5 fruits: 375 points
  - 6 fruits: 675 points
  - 7 fruits: 1200 points
- **Visual Effects**: 
  - Glowing slice trails
  - Particle effects on fruit slicing
  - Fireworks for 6-7 fruit combos
  - Score popups with dynamic sizing
- **Lives System**: 4 lives to complete all levels
- **Responsive Design**: Works on desktop (mouse) and mobile (touch)
- **Web3 Ready**: Built for Farcaster integration

## 🚀 Quick Start

### Prerequisites

- Node.js (for TypeScript compilation)
- A modern web browser

### Installation

1. Install dependencies:
```bash
npm install
```

2. Compile TypeScript:
```bash
npm run build
```

3. Start a local server:
```bash
npm run serve
```

4. Open your browser to `http://localhost:8000`

### Development

To auto-compile TypeScript on file changes:
```bash
npm run watch
```

## 🎯 How to Play

1. **Click "Start Game"** to begin
2. **Slice fruits** by dragging your mouse or finger across them
3. **Create combos** by slicing multiple fruits in one swipe
4. **Don't let fruits fall** or you'll lose a life
5. **Complete 20 levels** to win!

## 🏗️ Technical Details

### Architecture

- **Frontend**: Pure TypeScript with HTML5 Canvas
- **Physics Engine**: Custom gravity-based physics simulation
- **Rendering**: Canvas 2D API with optimized draw calls
- **Input Handling**: Unified mouse and touch event system
- **Collision Detection**: Line-circle intersection algorithm

### File Structure

```
├── index.html          # Main HTML structure
├── styles.css          # Responsive styling
├── game.ts             # TypeScript game logic
├── game.js             # Compiled JavaScript
├── package.json        # Dependencies
├── tsconfig.json       # TypeScript config
└── README.md           # This file
```

### Key Components

- **GameState**: Manages all game state and canvas
- **FruitSliceGame**: Main game controller
- **Physics System**: Handles gravity and motion
- **Collision Detection**: Line-circle intersection for slicing
- **Particle System**: Visual effects for slices and combos
- **Trail Renderer**: Smooth glowing slice trails

## 🌐 Farcaster Integration (Coming Soon)

Future enhancements for Web3 integration:

- [ ] Farcaster ID authentication
- [ ] On-chain leaderboard
- [ ] NFT badges for high scores
- [ ] Social sharing within Farcaster
- [ ] Wallet connection for rewards

## 📱 Progressive Web App (PWA)

To make this a PWA for better Farcaster integration:

1. Add a `manifest.json` file
2. Create a service worker for offline support
3. Add app icons
4. Deploy to HTTPS hosting

## 🎨 Customization

### Fruit Types

Edit the `FRUIT_TYPES` array in `game.ts`:

```typescript
const FRUIT_TYPES = [
    { emoji: '🍎', color: '#ff6b6b' },
    // Add more fruits...
];
```

### Scoring

Modify the `SCORE_TABLE` array:

```typescript
const SCORE_TABLE = [0, 10, 30, 135, 200, 375, 675, 1200];
```

### Physics

Adjust constants:

```typescript
const GRAVITY = 0.25;                 // Gravity strength
const FRUIT_RADIUS = 30;              // Fruit size
const WALL_BOUNCE_DAMPING = 0.7;      // Wall bounce velocity retention
```

## 🚢 Deployment

### For Farcaster Mini Apps

The game is now **fully optimized for Farcaster** with:
- ✅ Full-screen rectangular layout (no outer frame)
- ✅ Portrait orientation support
- ✅ Touch-optimized controls
- ✅ PWA manifest for native-like experience
- ✅ Safe area insets for notched devices

### Recommended Hosting for Farcaster

1. **Vercel** (Best for Farcaster Frames)
   ```bash
   vercel deploy
   ```
   - Get instant HTTPS URL
   - Perfect for Farcaster integration
   - Free tier available

2. **Netlify**
   - Drag and drop the folder
   - Automatic HTTPS
   - Easy custom domains

3. **GitHub Pages**
   - Push to `gh-pages` branch
   - Free hosting
   - Good for testing

4. **IPFS**
   - Fully decentralized hosting
   - Perfect for Web3 apps

### Build for Production

```bash
npm run build
```

Then deploy these files:
- `index.html`
- `styles.css`
- `game.js`
- `manifest.json`
- `game.js.map` (optional)

### Adding to Farcaster

1. Deploy your game to a public URL
2. Go to Farcaster Mini Apps settings
3. Add your game URL
4. Your game will appear in the rectangular mini app format!

## 🔧 Troubleshooting

### TypeScript compilation errors

Make sure you have TypeScript installed:
```bash
npm install -g typescript
```

### Game not loading

1. Check browser console for errors
2. Ensure `game.js` is generated from `game.ts`
3. Clear browser cache

### Touch not working on mobile

Make sure you're serving over HTTPS or localhost.

## 📄 License

MIT License - Feel free to use this for your own projects!

## 🤝 Contributing

Contributions are welcome! Feel free to:

- Report bugs
- Suggest features
- Submit pull requests
- Improve documentation

## 🎉 Credits

Built with ❤️ for the Farcaster community.

---

**Have fun slicing! 🍉✨**
