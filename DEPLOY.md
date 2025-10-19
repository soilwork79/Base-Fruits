# 🚀 Quick Deploy Guide for Farcaster

## Option 1: Vercel (Recommended)

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

3. Follow the prompts and get your URL!

## Option 2: Netlify Drop

1. Go to [drop.netlify.com](https://drop.netlify.com)
2. Drag and drop your project folder
3. Get instant URL!

## Option 3: GitHub Pages

1. Create a new GitHub repository
2. Push your code:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin YOUR_REPO_URL
git push -u origin main
```

3. Enable GitHub Pages in repository settings
4. Your game will be at: `https://YOUR_USERNAME.github.io/REPO_NAME`

## Testing in Farcaster

Once deployed:

1. Open Farcaster app
2. Go to Mini Apps
3. Add your deployed URL
4. Your game will appear in full-screen rectangular format!

## Files to Deploy

Make sure these files are included:
- ✅ `index.html`
- ✅ `styles.css`
- ✅ `game.js`
- ✅ `manifest.json`

Optional:
- `game.js.map` (for debugging)
- `README.md`

## Important Notes

- ✅ Game is now full-screen (no outer frame)
- ✅ Works in portrait mode
- ✅ Touch controls optimized
- ✅ Safe areas handled for notched devices
- ✅ PWA-ready for native-like experience

Enjoy! 🍉✨
