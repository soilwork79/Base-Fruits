# ✅ Farcaster Deployment Checklist

## Pre-Deployment

- [x] Game is full-screen (no outer frame)
- [x] Portrait mode supported
- [x] Touch controls working
- [x] Safe areas handled
- [x] PWA manifest created
- [x] TypeScript compiled to JavaScript
- [x] All files ready

## Files to Deploy

Required:
- [x] `index.html`
- [x] `styles.css`
- [x] `game.js`
- [x] `manifest.json`

Optional:
- [ ] `game.js.map` (for debugging)
- [ ] `README.md` (documentation)

## Testing Locally

1. Open http://localhost:8000
2. Test on desktop (mouse controls)
3. Open http://localhost:8000/test-mobile.html for mobile preview
4. Test touch/swipe gestures
5. Verify full-screen display

## Deployment Steps

### Option 1: Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Option 2: Netlify
1. Go to drop.netlify.com
2. Drag project folder
3. Get URL

### Option 3: GitHub Pages
```bash
git init
git add .
git commit -m "Farcaster Fruit Slice game"
git push
```

## Post-Deployment

- [ ] Test deployed URL in browser
- [ ] Test on mobile device
- [ ] Add URL to Farcaster Mini Apps
- [ ] Test in Farcaster app
- [ ] Share with community!

## Farcaster Integration

1. Open Farcaster app
2. Navigate to Mini Apps section
3. Click "Add Mini App" or similar
4. Enter your deployed URL
5. Game appears in rectangular format!

## Troubleshooting

**Game not full-screen?**
- Check viewport meta tags
- Verify CSS position: fixed

**Touch not working?**
- Ensure HTTPS (required for touch events)
- Check touch-action: none in CSS

**Scrolling issues?**
- Verify overscroll-behavior: none
- Check position: fixed on html/body

## Success Criteria

✅ Game fills entire screen
✅ No outer frame visible
✅ Works in portrait mode
✅ Touch controls responsive
✅ Fruits slice smoothly
✅ Score displays correctly
✅ Lives system working
✅ Level progression smooth

## Ready to Deploy! 🚀

Your game is now optimized for Farcaster mini apps!
