# ✂️ Fruit Splitting & Balance Update

## 🎯 Major Changes

### 1. **Fruit Splitting Animation** ✨
When fruits are sliced, they now **split in half** and fall down!

**Features:**
- ✅ Fruits split into two halves
- ✅ Each half rotates as it falls
- ✅ Halves separate in the direction of the cut
- ✅ Gradual fade as they fall (starts at 50% screen height)
- ✅ Realistic physics with rotation and gravity

### 2. **Slower Fruit Movement** 🐌
- Speed reduced: `14-18` → `11-14`
- More time to react and plan slices
- Easier to track multiple fruits

### 3. **Max 6 Fruits** 🎪
- Changed from 7 to 6 maximum fruits
- Level 6+: Always 6 fruits (not 7)
- More balanced difficulty

### 4. **Updated Scoring** 📊
- Removed 1200 point tier (was for 7 fruits)
- New max: 675 points (for 6 fruits)
- Score table: `[0, 10, 30, 135, 200, 375, 675]`

## 🎨 How Fruit Splitting Works

### Visual Behavior:
```
Before Slice:
    🍎 (Whole fruit)

After Slice:
    🍎  →  🍎|🍎
           ↙  ↘
          ↺    ↻
         (Rotating halves)
```

### Technical Details:

**Split Direction:**
- Calculated from swipe direction
- Halves separate perpendicular to cut
- Each half gets opposite rotation

**Physics:**
- Each half inherits fruit's velocity
- Added separation velocity perpendicular to cut
- Rotation speed: ±0.1-0.2 rad/frame
- Gravity affects both halves

**Fade Effect:**
- Opacity = 1.0 until 50% screen height
- Then fades gradually: `opacity -= 0.015/frame`
- Removed when off-screen or fully transparent

## 📊 Updated Game Balance

### Level Progression:
```
Level 1:  🍎                    (1 fruit)
Level 2:  🍎 🍊                 (2 fruits)
Level 3:  🍎 🍊 🍋              (3 fruits)
Level 4:  🍎 🍊 🍋 🍌           (4 fruits)
Level 5:  🍎 🍊 🍋 🍌 🍉        (5 fruits)
Level 6+: 🍎 🍊 🍋 🍌 🍉 🍇     (6 fruits - MAX!)
```

### Score Table:
| Fruits | Points | Change |
|--------|--------|--------|
| 1 | 10 | - |
| 2 | 30 | - |
| 3 | 135 | - |
| 4 | 200 | - |
| 5 | 375 | - |
| 6 | 675 | - |
| 7 | ~~1200~~ | **REMOVED** |

### Speed Changes:
```typescript
// Before
const speed = 14 + Math.random() * 4;  // 14-18

// After  
const speed = 11 + Math.random() * 3;  // 11-14 (21% slower)
```

## 🎮 Gameplay Impact

### More Satisfying:
- ✅ Visual feedback when slicing (split animation)
- ✅ Fruits don't just disappear - they split and fall
- ✅ Rotation adds dynamic visual interest
- ✅ Fade effect looks smooth and natural

### Better Balance:
- ✅ 6 fruits is more manageable than 7
- ✅ Slower speed gives more reaction time
- ✅ Scoring is more balanced
- ✅ Less overwhelming in later levels

### More Realistic:
- ✅ Fruits split like real slicing
- ✅ Halves tumble as they fall
- ✅ Physics feel natural
- ✅ Fade simulates disappearing

## 🔧 Technical Implementation

### New Interfaces:
```typescript
interface FruitHalf {
    x, y: number;           // Position
    vx, vy: number;         // Velocity
    radius: number;         // Size
    color: string;          // Color
    emoji: string;          // Emoji
    rotation: number;       // Current rotation
    rotationSpeed: number;  // Rotation per frame
    isLeft: boolean;        // Which half
    opacity: number;        // Fade value
}
```

### Split Algorithm:
```typescript
1. Calculate slice angle from swipe direction
2. Calculate perpendicular angle (slice angle + 90°)
3. Create two halves offset along perpendicular
4. Add separation velocity to each half
5. Set opposite rotation speeds
6. Render as semicircles with rotation
```

### Rendering:
- Unsliced fruits: Full circles with emoji
- Sliced fruits: Hidden (replaced by halves)
- Fruit halves: Semicircles with rotation and fade

## 🧪 Test It!

**Refresh** http://localhost:8000 and notice:

1. **Slice a fruit** - watch it split in two!
2. **Halves rotate** as they fall
3. **Gradual fade** as they descend
4. **Slower movement** - easier to track
5. **Max 6 fruits** in later levels

The game now feels more polished and satisfying! ✂️🍉✨
