# 🎮 Gameplay Guide - How It Works Now

## 🚀 Fruit Physics

### Launch Behavior
```
Bottom of screen:
[        🍎 Launch!        ]
         ↑↑↑
    Speed: 14-18
    Angle: 60-120°
    Position: Center 40% of screen
```

### Flight Path
```
Top      [    🍎            ]  ← Peak height (near top!)
         [      ↘️           ]
         [        ↘️         ]
Mid      [          ↘️       ]
         [            ↘️     ]
         [              ↘️   ]
Bottom   [                🍎]  ← Falls back down
```

### Wall Bouncing
```
Left Wall:                Right Wall:
[🍎→                ]    [                ←🍎]
[  ←🍎 Bounce!      ]    [      Bounce! 🍎→  ]
     ↖️                            ↗️
  70% velocity            70% velocity
```

## 🎯 How to Play

### 1. **Wait for Launch**
- Fruits launch from bottom center
- Watch their trajectory
- Plan your slice path

### 2. **Slice Multiple Fruits**
- Drag across multiple fruits in one motion
- Bigger combos = exponentially more points!
- 7 fruits in one slice = 1200 points + fireworks! 🎆

### 3. **Use Wall Bounces**
- Fruits bounce off left/right edges
- Gives you a second chance to slice
- Creates interesting patterns

### 4. **Don't Let Them Fall**
- You have 4 lives (❤️❤️❤️❤️)
- Each missed fruit = -1 life
- Sliced fruits don't cost lives

## 📊 Scoring Strategy

### Point Values:
| Fruits Sliced | Points | Strategy |
|---------------|--------|----------|
| 1 | 10 | Last resort |
| 2 | 30 | Okay |
| 3 | 135 | Good! |
| 4 | 200 | Great! |
| 5 | 375 | Excellent! |
| 6 | 675 | Amazing! 🎆 |
| 7 | 1200 | LEGENDARY! 🎆 |

### Pro Tips:
1. **Wait for the peak** - Fruits are slowest at the top of their arc
2. **Diagonal slices** - Cover more area for combos
3. **Use bounces** - Fruits bouncing off walls group together
4. **Plan ahead** - Watch where fruits are going, not where they are

## 🎪 Level Progression

```
Level 1:  🍎                    (1 fruit)
Level 2:  🍎 🍊                 (2 fruits)
Level 3:  🍎 🍊 🍋              (3 fruits)
Level 4:  🍎 🍊 🍋 🍌           (4 fruits)
Level 5:  🍎 🍊 🍋 🍌 🍉        (5 fruits)
Level 6:  🍎 🍊 🍋 🍌 🍉 🍇     (6 fruits)
Level 7+: 🍎 🍊 🍋 🍌 🍉 🍇 🍓  (7 fruits - max!)
```

## 🎨 Visual Feedback

### Slice Trail
- **Glowing cyan line** follows your finger/mouse
- Fades quickly after each swipe
- Any fruit touching the line gets sliced!

### Score Popups
- Appear at center of your slice
- Size scales with points earned
- Bigger combos = bigger text!

### Fireworks
- Trigger on 6 or 7 fruit combos
- Colorful particle explosion
- Celebrate your amazing skills! 🎉

### Particles
- Small colored particles when fruits are sliced
- Match the fruit color
- Add satisfying visual feedback

## 🎯 Current Physics Settings

```typescript
Gravity: 0.25          // Slow fall
Launch Speed: 14-18    // High jumps
Launch Angle: 60-120°  // Vertical arcs
Wall Bounce: 70%       // Bounce damping
Launch Zone: 30-70%    // Centered
```

## 🏆 Winning Strategy

1. **Early Levels (1-3)**: Practice timing and aim
2. **Mid Levels (4-6)**: Focus on 3-4 fruit combos
3. **Late Levels (7+)**: Go for 5-7 fruit mega combos!
4. **Use wall bounces** to group fruits together
5. **Slice at the peak** when fruits are slowest
6. **Diagonal swipes** catch more fruits

## 🎮 Controls

### Desktop:
- **Click and drag** to slice
- **Mouse movement** creates the trail
- **Release** to complete the slice

### Mobile/Touch:
- **Touch and drag** to slice
- **Finger movement** creates the trail
- **Lift finger** to complete the slice

---

**Good luck slicing! Aim for those 7-fruit combos! 🍉✨**
