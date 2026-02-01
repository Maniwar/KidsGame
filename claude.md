# Hello Kitty Sanrio Rush 🎀

A 3D endless runner game featuring Hello Kitty and friends, built for kids with adorable low-poly kawaii graphics, collectibles, power-ups, and unlockable characters.

## Project Overview

**Genre:** 3D Endless Runner / Collector
**Target Audience:** Kids (ages 4-10)
**Platform:** Web browser (desktop + mobile/tablet responsive)
**Tech Stack:** Three.js + vanilla JavaScript (no heavy frameworks)
**Art Style:** Low-poly kawaii with soft pastels and clean geometry

## Core Gameplay

### Movement System
- **Lane-based:** 3 lanes (left, center, right)
- **Actions:** Lane switch (left/right), Jump, Slide/Duck
- **Auto-run:** Character runs forward automatically, speed increases over time
- **Smooth transitions:** Animated lane changes, not instant snaps

### Controls

**Keyboard:**
- `←` / `A` - Move left lane
- `→` / `D` - Move right lane  
- `↑` / `W` / `Space` - Jump
- `↓` / `S` - Slide/Duck

**Touch (Mobile/Tablet):**
- Swipe left - Move left lane
- Swipe right - Move right lane
- Swipe up - Jump
- Swipe down - Slide/Duck
- Touch responsiveness must be snappy (<100ms)

## Collectibles

### Coins (Common)
- **Appearance:** Golden coins with Hello Kitty bow imprint
- **Value:** 1 coin each
- **Spawn:** Frequent, in patterns (lines, arcs, zigzags)
- **Collection effect:** Sparkle burst + satisfying "ding" sound

### Gems (Rare)
- **Types & Values:**
  - 💎 Blue Sapphire = 10 coins
  - 💗 Pink Diamond = 25 coins
  - ⭐ Star Crystal = 50 coins
  - 🌈 Rainbow Gem = 100 coins (very rare)
- **Spawn:** Occasional, often in risky positions or after obstacles
- **Collection effect:** Larger sparkle burst + magical chime

### Flowers (Bonus)
- **Types:** Daisies, tulips, roses, sunflowers
- **Purpose:** Bonus points + fill "Friendship Meter" for bonus rewards
- **Spawn:** Scattered along paths, sometimes hidden

## Power-Ups

All power-ups last 8-10 seconds with visual countdown indicator.

| Power-Up | Icon | Effect | Visual |
|----------|------|--------|--------|
| **Coin Magnet** | 🧲 | Attracts all coins in radius | Sparkle trail, coins fly toward player |
| **Shield Bubble** | 🛡️ | One-hit protection | Iridescent bubble around character |
| **Super Speed** | ⚡ | 2x speed + invincible | Motion blur, rainbow trail |
| **2x Multiplier** | ✨ | Double coin value | Golden glow, "2x" floating text |
| **Flight Mode** | 🎈 | Float above obstacles | Character on cute cloud, sparkles below |
| **Giant Mode** | 🍄 | Grow big, smash obstacles | Character 3x size, screen shake on smash |

## Characters

### Starter Character
**Hello Kitty** - The iconic white cat with red bow
- Unlocked by default
- Balanced stats

### Unlockable Characters (via coins)

| Character | Cost | Special Trait |
|-----------|------|---------------|
| **My Melody** | 500 | +10% flower bonus |
| **Cinnamoroll** | 750 | Floatier jumps (more air time) |
| **Pompompurin** | 1000 | Coin magnet radius +20% |
| **Keroppi** | 1500 | Higher jumps |
| **Kuromi** | 2500 | Start with shield |
| **Badtz-Maru** | 3500 | Speed boost lasts longer |
| **Chococat** | 5000 | 2x multiplier spawns more often |

### Character Design Guidelines
- Simple geometric shapes (spheres, rounded cubes)
- 4-6 colors max per character
- Expressive but minimal faces (dots for eyes, simple shapes)
- Idle bobbing animation
- Running animation (bouncy, joyful)
- Jump animation (arms up, excited)
- Slide animation (ducking pose)

## Worlds / Levels

### World 1: Sanrio Town (Starter)
- **Theme:** Cute city streets, shops, houses
- **Colors:** Pastel pink, white, soft blue
- **Obstacles:** Benches, mailboxes, flower pots, cafe tables
- **Decorations:** Street lamps, shop signs, balloons, bunting
- **Ground:** Cobblestone paths

### World 2: Flower Garden (Unlock: 1000 coins)
- **Theme:** Meadows, flower fields, greenhouses
- **Colors:** Greens, yellows, pinks, purples
- **Obstacles:** Hay bales, garden tools, bee hives, fountains
- **Decorations:** Butterflies, birds, windmills, arbors
- **Ground:** Grass paths with flower borders

### World 3: Sweet Paradise (Unlock: 3000 coins)
- **Theme:** Candy land, desserts, treats
- **Colors:** Candy pastels, bright pinks, mint, cream
- **Obstacles:** Lollipops, gummy bears, cake slices, ice cream
- **Decorations:** Candy canes, sprinkles, chocolate rivers
- **Ground:** Cookie/wafer paths

### World 4: Cloud Kingdom (Unlock: 6000 coins)
- **Theme:** Sky islands, clouds, stars
- **Colors:** Soft blues, whites, sunset oranges, purples
- **Obstacles:** Cloud puffs, floating stars, moon crescents
- **Decorations:** Rainbows, hot air balloons, kites, birds
- **Ground:** Fluffy cloud paths

### World 5: Starlight Festival (Unlock: 10000 coins)
- **Theme:** Nighttime celebration, lanterns, fireworks
- **Colors:** Deep purples, navy, gold, warm glows
- **Obstacles:** Lantern posts, festival stalls, drums
- **Decorations:** Fireworks, string lights, floating lanterns
- **Ground:** Festival street with glowing edges

## Day/Night & Weather Cycles

### Time of Day (visual transitions during run)
- **Dawn:** Soft orange/pink sky, long shadows
- **Day:** Bright blue sky, full colors
- **Sunset:** Warm oranges, purples, golden light
- **Night:** Dark blue sky, stars, glowing elements

Cycle duration: ~90 seconds per full cycle during run

### Weather Effects (random per run)
- **Clear:** Default sunny
- **Light Rain:** Gentle particles, puddle reflections, rainbow chance
- **Cherry Blossoms:** Pink petals floating (spring theme)
- **Snowfall:** Soft snow particles (winter theme)
- **Sparkle Shower:** Magical sparkles falling (rare/special)

## Progression System

### Score System
- Distance traveled = 1 point per meter
- Coins collected = face value
- Gems collected = face value  
- Flowers = 5 points each
- Near-miss bonus = 10 points (barely dodging obstacle)
- Combo system: Consecutive coins without missing = multiplier buildup

### Friendship Meter
- Fills by collecting flowers
- When full: Bonus coin shower + temporary 2x multiplier
- Resets after activation

### Milestones & Rewards
- Distance milestones (100m, 500m, 1000m, etc.) = coin bonuses
- Daily login bonus = coins
- Achievement system with permanent rewards

### Achievements (Examples)
- "First Steps" - Run 100m (Reward: 50 coins)
- "Coin Collector" - Collect 100 coins total (Reward: 100 coins)
- "Rainbow Finder" - Find a rainbow gem (Reward: 200 coins)
- "Best Friends" - Unlock 3 characters (Reward: 500 coins)
- "Speed Demon" - Reach max speed (Reward: 300 coins)
- "World Traveler" - Play all worlds (Reward: 1000 coins)

## Visual Effects

### Particle Systems
- Coin collection: Gold sparkle burst
- Gem collection: Colored star burst + screen flash
- Power-up activation: Character-colored aura expansion
- Power-up active: Continuous particle trail
- Jump: Small dust puff from feet
- Landing: Larger dust puff
- Obstacle hit: Comic "POW" effect + stars
- Speed lines at high velocity

### UI Effects
- Score counter: Pop animation on increase
- Combo meter: Glow intensity increases with combo
- Coin counter: Satisfying tick-up animation
- Power-up timer: Circular countdown, flashes when low

### Post-Processing
- Soft bloom on bright objects
- Subtle vignette
- Color grading: Warm, cheerful tones
- Optional: Tilt-shift blur for miniature toy look

## Sound Design

### Music
- Main menu: Upbeat, cheerful J-pop style instrumental
- Gameplay: Energetic but not stressful, kawaii electronic
- Shop/Character select: Calm, cute melody
- Each world: Slight variation on theme to match environment

### Sound Effects
- Coin collect: Bright "ding" (pitch varies slightly)
- Gem collect: Magical chime (different per gem type)
- Jump: Soft "boing"
- Slide: Quick whoosh
- Lane change: Subtle swish
- Power-up collect: Magical activation sound
- Power-up active: Ambient hum/sparkle
- Power-up end: Wind-down sound
- Obstacle hit: Soft "bonk" (not scary for kids)
- Game over: Sad but cute melody (encouraging, not punishing)
- New high score: Celebration fanfare
- Character unlock: Special achievement jingle
- UI buttons: Soft click/pop

## Technical Architecture

### File Structure
```
hello-kitty-runner/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── main.js              # Entry point, game loop
│   ├── game/
│   │   ├── Game.js          # Main game class
│   │   ├── Player.js        # Character controller
│   │   ├── World.js         # Level generation
│   │   ├── Obstacle.js      # Obstacle spawning/management
│   │   ├── Collectible.js   # Coins, gems, flowers
│   │   ├── PowerUp.js       # Power-up system
│   │   └── Score.js         # Scoring & progression
│   ├── graphics/
│   │   ├── Scene.js         # Three.js scene setup
│   │   ├── Camera.js        # Camera follow system
│   │   ├── Lighting.js      # Day/night lighting
│   │   ├── Effects.js       # Particles, post-processing
│   │   └── Characters.js    # Character models & animations
│   ├── ui/
│   │   ├── HUD.js           # In-game UI
│   │   ├── Menu.js          # Main menu
│   │   ├── Shop.js          # Character/world shop
│   │   └── GameOver.js      # Results screen
│   ├── input/
│   │   ├── Keyboard.js      # Keyboard controls
│   │   └── Touch.js         # Touch/swipe controls
│   ├── audio/
│   │   └── AudioManager.js  # Sound effects & music
│   └── utils/
│       ├── Storage.js       # Save/load (localStorage)
│       └── Constants.js     # Game constants
├── assets/
│   ├── models/              # 3D models (or generated in code)
│   ├── textures/
│   ├── audio/
│   │   ├── music/
│   │   └── sfx/
│   └── fonts/
└── claude.md
```

### Performance Targets
- 60 FPS on desktop
- 30+ FPS on mobile devices
- Initial load < 5 seconds
- Memory usage < 200MB

### Mobile Optimization
- Object pooling for collectibles/obstacles
- LOD (Level of Detail) for distant objects
- Compressed textures
- Efficient particle limits
- Touch event debouncing

### Save System (localStorage)
```javascript
{
  "coins": 1500,
  "highScore": 12450,
  "unlockedCharacters": ["hello-kitty", "my-melody"],
  "unlockedWorlds": ["sanrio-town", "flower-garden"],
  "selectedCharacter": "hello-kitty",
  "selectedWorld": "sanrio-town",
  "achievements": ["first-steps", "coin-collector"],
  "settings": {
    "musicVolume": 0.8,
    "sfxVolume": 1.0,
    "quality": "high"
  },
  "stats": {
    "totalDistance": 45000,
    "totalCoins": 8500,
    "totalRuns": 127
  }
}
```

## Development Phases

### Phase 1: Core Prototype
- [ ] Three.js scene setup
- [ ] Basic Hello Kitty character (low-poly cube/sphere)
- [ ] 3-lane movement system
- [ ] Jump and slide mechanics
- [ ] Simple obstacle spawning
- [ ] Basic coin collection
- [ ] Keyboard controls
- [ ] Simple score display

### Phase 2: Mobile & Touch
- [ ] Touch/swipe controls
- [ ] Responsive canvas sizing
- [ ] Mobile performance optimization
- [ ] Touch-friendly UI buttons

### Phase 3: Visual Polish
- [ ] Refined character models
- [ ] Sanrio Town environment
- [ ] Day/night cycle
- [ ] Particle effects
- [ ] Post-processing
- [ ] Animations

### Phase 4: Progression System
- [ ] Coin/gem system
- [ ] Power-ups (all 6)
- [ ] Character shop
- [ ] World unlocks
- [ ] Save/load system
- [ ] Achievements

### Phase 5: Content Expansion
- [ ] All unlockable characters (7)
- [ ] All worlds (5)
- [ ] Weather effects
- [ ] More obstacle variety
- [ ] Sound effects & music

### Phase 6: Polish & Launch
- [ ] Menu screens
- [ ] Tutorial/onboarding
- [ ] Bug fixes
- [ ] Performance optimization
- [ ] Final art pass

## Art Style Reference

### Color Palette
```
Primary Pink:    #FFB7C5 (Hello Kitty pink)
Secondary Pink:  #FF69B4 (Hot pink accents)
Soft White:      #FFF5F5 (Warm white)
Sky Blue:        #87CEEB (Day sky)
Sunset Orange:   #FFB347 (Warm accents)
Grass Green:     #90EE90 (Garden world)
Gold:            #FFD700 (Coins)
Purple:          #DDA0DD (Gems, night sky)
```

### Model Guidelines
- All models use flat shading (low-poly look)
- Rounded edges where possible
- No harsh shadows (soft/ambient only)
- Consistent scale: Character ~1 unit tall
- Obstacles: 1-2 units, clearly readable silhouettes
- Environment: Simple shapes, instanced for performance

## Important Notes for Development

1. **Kid-Friendly:** No scary elements, failure is gentle and encouraging
2. **Colorblind Accessible:** Don't rely solely on color for gameplay info
3. **No Ads/Purchases:** This is a personal project, no monetization
4. **Fair Progression:** Unlocks should feel achievable, not grindy
5. **Responsive:** Must work on all screen sizes
6. **Performant:** Prioritize smooth gameplay over visual complexity
7. **Iterative:** Build core loop first, add features incrementally

## Quick Start for Development

```bash
# Serve locally (any simple server)
npx serve .
# or
python -m http.server 8000
```

Start with Phase 1 core prototype. Get the character running and collecting coins before adding visual polish. Fun gameplay first, pretty graphics second.