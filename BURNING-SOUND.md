# 🔥 Fruit Size Reduced + Burning Sound Added!

## ✅ Changes Made

### 1. **Fruit Size Reduced by 20%** 📏
- **Before:** 36.75px radius
- **After:** 29.4px radius (20% smaller)
- **Diameter:** 73.5px → 58.8px
- **Result:** Smaller, more challenging targets

### 2. **Burning Sound When Life Lost** 🔥
- **Trigger:** When a fruit falls off screen without being sliced
- **Sound:** Sizzling/burning noise effect
- **Duration:** 0.5 seconds
- **Effect:** White noise filtered through lowpass at 800 Hz

## 🔊 Burning Sound Details

### How It Works:
```typescript
When fruit falls:
  → Life lost
  → Play burning sound 🔥
  → Update UI (hearts decrease)
```

### Technical Implementation:
- **Type:** White noise with decay
- **Filter:** Lowpass at 800 Hz (removes harsh high frequencies)
- **Envelope:** Fades from 0.4 to 0.01 over 0.5 seconds
- **Effect:** Sounds like sizzling/burning

### Sound Generation:
```typescript
// Generate random noise
for each sample:
    noise = random(-1, 1) * decay * 0.3

// Apply lowpass filter at 800 Hz
// Fade out over 0.5 seconds
```

## 🎮 Gameplay Impact

### Size Reduction:
- ✅ **More challenging** - Smaller targets require better aim
- ✅ **More space** - Fruits don't overlap as much
- ✅ **Better balance** - Not too easy, not too hard
- ✅ **Still visible** - Large enough to see clearly

### Burning Sound:
- ✅ **Clear feedback** - Know immediately when you lose a life
- ✅ **Emotional impact** - Burning sound creates urgency
- ✅ **Motivation** - Don't want to hear that sound!
- ✅ **Audio cue** - Even if not watching the screen

## 📊 Size Comparison

```
Original:     30.0px radius (60.0px diameter)
After +75%:   52.5px radius (105px diameter)
After -30%:   36.75px radius (73.5px diameter)
After -20%:   29.4px radius (58.8px diameter) ← Current
```

**Net change from original:** -2% (slightly smaller than original)

## 🎯 Sound Events Summary

### During Gameplay:
1. **Slice 1st fruit:** Short beep (0.1s)
2. **Slice 2nd-4th fruit:** Medium beep (0.2s)
3. **Slice 5th-6th fruit:** Long beep (0.35s)
4. **Slice 7th fruit:** Longest beep (0.5s)
5. **Fruit falls (life lost):** Burning/sizzling sound 🔥 (0.5s)

### Sound Types:
- **Slice sounds:** Clean sine wave tones
- **Burning sound:** Filtered white noise (sizzle effect)

## 🧪 Test It!

**Refresh** http://localhost:8000 and:

1. **Notice smaller fruits** - 20% reduction in size
2. **Let a fruit fall** - Hear the burning sound! 🔥
3. **Watch your lives** - Each miss plays the sizzle
4. **Try not to hear it** - Adds pressure to the game!

The game is now more challenging with smaller fruits and has clear audio feedback for mistakes! 🔥✨
