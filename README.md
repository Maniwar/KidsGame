# Hello Kitty Sanrio Rush

A 3D endless runner game built entirely with web technologies. Players control a Hello Kitty-style character running through a colorful kawaii world, dodging obstacles, collecting coins and candies, and activating power-ups across an infinite procedurally generated landscape.

**Live Demo:** [https://maniwar.github.io/KidsGame/](https://maniwar.github.io/KidsGame/)

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Architecture Overview](#architecture-overview)
- [Core Game Systems](#core-game-systems)
  - [Game Loop & State Management](#game-loop--state-management)
  - [Player Mechanics](#player-mechanics)
  - [World Generation](#world-generation)
  - [Obstacle System](#obstacle-system)
  - [Collectibles & Economy](#collectibles--economy)
  - [Candy & Sugar Rush](#candy--sugar-rush)
  - [Power-Up System](#power-up-system)
  - [Finish Line Milestones](#finish-line-milestones)
- [Graphics & Rendering](#graphics--rendering)
  - [Scene](#scene)
  - [Camera System](#camera-system)
  - [Lighting](#lighting)
- [Procedural Audio Engine](#procedural-audio-engine)
- [Input Handling](#input-handling)
- [Firebase Integration](#firebase-integration)
- [Cosmetic Shop](#cosmetic-shop)
- [Performance Optimizations](#performance-optimizations)
- [Configuration](#configuration)

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **Three.js** v0.182.0 | WebGL 3D rendering |
| **Vite** v7.3.1 | Build tool & dev server |
| **Firebase Realtime Database** | Player data persistence & leaderboards |
| **Web Audio API** | Procedural music & sound effects |
| **gh-pages** v6.3.0 | GitHub Pages deployment |

No external assets, audio files, or physics libraries are used. All visuals are constructed from Three.js primitives, and all audio is synthesized at runtime via the Web Audio API.

---

## Getting Started

```bash
# Install dependencies
npm install

# Start development server (http://localhost:5173)
npm run dev

# Production build (output: /dist)
npm run build

# Preview production build locally
npm run preview

# Build and deploy to GitHub Pages
npm run deploy
```

**Build Configuration (vite.config.js):**
- Base path: `/KidsGame/` (GitHub Pages routing)
- Target: `es2020` (modern browsers)
- Three.js split into a separate chunk for better caching
- Source maps disabled in production

---

## Project Structure

```
KidsGame/
├── index.html                 # Entry point & UI overlay (menus, HUD, shop)
├── package.json
├── vite.config.js             # Vite build config with manual chunking
├── css/
│   └── styles.css             # Game UI styling
└── js/
    ├── main.js                # Game engine, core loop, state machine
    ├── graphics/
    │   ├── Scene.js           # 3D scene, environment, ground chunks
    │   ├── Camera.js          # Follow, death, celebration camera modes
    │   └── Lighting.js        # Ambient, directional, hemisphere, fill lights
    ├── game/
    │   ├── Player.js          # Character model, movement, animations
    │   ├── World.js           # Chunk-based procedural world generation
    │   ├── Obstacle.js        # Jump/slide obstacle types & variants
    │   ├── Collectible.js     # Coins & gem collectibles
    │   ├── Candy.js           # 11 candy types, Sugar Rush meter
    │   ├── PowerUp.js         # 6 power-up types with 3D visuals
    │   ├── FinishLine.js      # Milestone checkpoint banners
    │   ├── Enemy.js           # Enemy AI (future feature)
    │   ├── Tower.js           # Tower defense (future feature)
    │   └── Projectile.js      # Projectile physics (future feature)
    ├── input/
    │   ├── Keyboard.js        # Keyboard input (Arrow keys / WASD)
    │   └── Touch.js           # Touch/swipe input for mobile
    ├── audio/
    │   └── AudioManager.js    # Procedural music & SFX engine
    ├── firebase/
    │   ├── PlayerDataManager.js   # Player save data & recovery codes
    │   └── LeaderboardManager.js  # Global leaderboard backend
    ├── shop/
    │   └── CosmeticShop.js    # Cosmetic items, pricing, equip logic
    └── utils/
        └── Constants.js       # Game configuration & color palette
```

---

## Architecture Overview

The game is a modular ES6 application with no framework dependencies beyond Three.js. The main entry point (`main.js`) acts as the game engine, managing the update loop, collision detection, scoring, and state transitions. Each subsystem (player, world, audio, etc.) is a self-contained class that exposes a clean interface to the engine.

**Key architectural decisions:**
- **Zero external assets** — all geometry is built from Three.js primitives, all audio is synthesized via Web Audio API oscillators
- **Chunk-based world** — the infinite world is generated in 50m segments, created ahead and recycled behind the player
- **Firebase without auth** — player identity uses human-readable recovery codes (KITTY-XXXX-XXXX) instead of traditional authentication
- **Offline-first** — localStorage serves as the primary data store with Firebase sync when online

---

## Core Game Systems

### Game Loop & State Management

The game operates on a `requestAnimationFrame` loop managed in `main.js`. Each frame:

1. **Input polling** — reads keyboard/touch state
2. **Player update** — applies movement, gravity, lane switching, animations
3. **World update** — spawns/recycles chunks, moves environment objects
4. **Collision detection** — checks player against obstacles, collectibles, candies, power-ups, and finish lines
5. **Scoring** — distance tracking, coin totals, multipliers, Sugar Rush bonuses
6. **HUD update** — real-time score, coins, distance, active power-ups display
7. **Camera update** — smooth follow interpolation

**Game States:** Start Screen → Playing → Game Over → Leaderboard Submission

### Player Mechanics

| Parameter | Value |
|---|---|
| Start speed | 25 m/s |
| Max speed | 40 m/s |
| Acceleration | 1.5 m/s² |
| Jump force | 12 m/s |
| Gravity | -30 m/s² |
| Lanes | 3 (positions: -2, 0, +2) |
| Lane switch time | 0.2s |
| Double jump | Enabled |

The player character is a Hello Kitty-style model constructed from Three.js primitives (spheres, cylinders, boxes) with customizable outfit pieces (shirt, overalls, bow). Movement uses smooth lerp interpolation for lane changes and physics-based parabolic arcs for jumping.

**Animations:**
- Continuous bobbing while running
- Random blinking every ~3 seconds
- Celebration pose at milestone finish lines
- Rainbow hue cycling for legendary cosmetics

### World Generation

The world uses a **chunk-based generation system** (`World.js`):

- **Chunk length:** 50 meters
- **Initial chunks:** 3 generated at start
- **Progressive difficulty:** obstacle spacing decreases over 20 chunks (12m minimum → 8m at max difficulty)

Each chunk procedurally places:
- **Obstacles** with guaranteed escape routes (never all 3 lanes blocked)
- **Collectibles** in patterns (lines across all lanes, zigzags, or random scatter)
- **Candies** (11 visual types with varying Sugar Rush meter fill values)
- **Power-ups** at random intervals
- **Environmental decoration** (buildings, trees, street lamps, clouds)

**Obstacle patterns:**
- Single obstacles (70%) — one lane blocked
- Double obstacles (15% after progression) — two lanes blocked, always one escape
- Staggered pairs (25% after progression) — forces lane change then action

### Obstacle System

Two fundamental obstacle types with multiple visual variants:

**Low obstacles (jump over):** Wooden crate, flower pot, traffic cone — height 1.2-1.3 units

**Tall obstacles (slide under):** Various tall structures requiring the player to slide

Each obstacle has colored ground warning stripes (green = jump, orange = slide) using emissive materials for visibility.

### Collectibles & Economy

| Type | Shape | Value | Spawn Rate |
|---|---|---|---|
| Coin | Gold disc | 5 pts | ~78% of spawns |
| Blue Gem | Octahedron | 15 pts | 7% |
| Pink Gem | Octahedron | 20 pts | 7% |
| Star Gem | Octahedron | 35 pts | 5% |
| Rainbow Gem | Octahedron | 50 pts | 3% |

Collectibles use shared geometries and materials across all instances for memory efficiency. Coins have metallic gold appearance (metalness: 0.95) with a torus rim edge. All collectibles bob vertically using sinusoidal animation and rotate for visual shimmer.

### Candy & Sugar Rush

**11 candy types** (lollipop, donut, cupcake, ice-cream, strawberry, cherry, cake, cake slice, star cookie, watermelon, wrapped candy) float at 1.8 units height and fill the Sugar Rush meter at varying rates (12-40 points per candy).

**Sugar Rush is a 3-level power system:**

| Level | Name | Score Multiplier | Magnet Radius | Invincible | Speed Boost |
|---|---|---|---|---|---|
| 1 | Sugar Rush! | 3x | 8 units | No | 1.0x |
| 2 | SUPER Sugar Rush! | 5x | 12 units | No | 1.15x |
| 3 | MEGA Sugar Rush!!! | 10x | 18 units | Yes | 1.3x |

The meter has a max capacity of 70 candies, decays at 12-25/sec during activation (scales with level), and enters a 4-second cooldown after depletion.

### Power-Up System

Six collectible power-ups with unique 3D visual representations:

| Power-Up | Effect |
|---|---|
| **Magnet** | Auto-collects coins within radius |
| **Shield** | Absorbs one hit from an obstacle |
| **Speed** | Temporary velocity boost |
| **Multiplier** | Doubles coin value |
| **Flight** | Float over all obstacles |
| **Giant** | Grow large and break through obstacles |

Multiple power-ups can be active simultaneously. Same-type pickups refresh the timer. A **Mystery Power-Up Box** is available in the shop (1000 coins base, price increases per purchase, max 5 per session).

### Finish Line Milestones

Checkered red/white banners spanning all 3 lanes serve as progressive goals:
- First milestone at **300m**, then every **250m** (550m, 800m, 1050m...)
- Crossing triggers a **celebration camera** sequence and coin rewards
- Milestone count tracked for personal best and leaderboard

---

## Graphics & Rendering

### Scene

`Scene.js` manages the Three.js WebGL renderer with shadow mapping. The environment features:
- Pink/blue gradient sky background
- Procedurally generated ground segments with decorative details
- Buildings (25-unit spacing), trees (20-unit spacing), street lamps (25-unit spacing)
- Moving clouds and animated environment objects

### Camera System

`Camera.js` implements four camera modes:

1. **Follow mode** — positioned above (+5y) and behind (+5z) the player, looking 8 units ahead, with smooth lerp interpolation (factor 0.1)
2. **Death camera** — orbital animation around the character at face height over 1.2 seconds with easing
3. **Celebration camera** — orbital celebration effect at milestone finish lines
4. **Return camera** — spinning transition back to follow mode during countdown

FOV: 75° | Near: 0.1 | Far: 1000

### Lighting

Four-light setup designed for a warm, kid-friendly aesthetic:

- **Ambient light** (0.6 intensity) — soft base illumination
- **Directional sun** (0.8 intensity) — primary shadow caster at position (10, 20, 10), shadow map 1024x1024 with tight frustum
- **Hemisphere light** (0.4 intensity) — blue sky to pink ground gradient
- **Fill light** (0.3 intensity) — pink-tinted side light (0xFFB7C5) for warmth

---

## Procedural Audio Engine

`AudioManager.js` generates all game music and sound effects in real-time using the Web Audio API. No audio files are loaded.

**Background Music:**
- **Tempo:** 160 BPM
- **Key:** C Major
- **Structure:** Full pop song form across 128 beats (~49 seconds per cycle): Intro → Verse A → Verse B → Chorus → Verse A2 → Chorus 2 → Bridge → Chorus 3 → Outro

**Music Theory Implementation:**
- 5 chord progressions rotate between cycles (I-V-vi-IV, vi-IV-I-V, I-vi-IV-V, I-IV-vi-V, IV-V-vi-I)
- 8 melodic hook shapes with 7 development variations
- Random phrase structures per cycle (AABA, ABAB, ABCA, AABC)
- Seeded random (`_seededRandom()`) for reproducible-but-varied generation

**Call-and-Response System:**
- Melody voice plays during "call" beats, rests during "response" beats
- Response voice answers with different timbre and chord-tone patterns
- Per-section instrument timbres and volumes

**Dynamic Instrument Palette:**
- 5 melody instruments (warmSine, softSquare, melloSaw, pluck, organSine)
- 5 response instruments (clarinet, flute, reedy, bellSine, warmSquare)
- Each instrument defined by oscillator type, filter settings, and envelope attack style (smooth, pluck, organ, breathy)
- Instruments rotate per section and per song cycle using seeded random

**Percussion:**
- Per-section kick/snare patterns (groove, bouncy, syncopated, driving)
- Hi-hat patterns with open hi-hat accents
- Ghost snare fills
- 4 randomized drum fill types
- Crash cymbal on section downbeats

**Additional Layers:**
- Chord arpeggios with direction variation (up, down, pendulum, random) per cycle
- Countermelody in chorus sections
- Light pad synthesis in verse B
- Transition sweeps/risers between sections
- 12% grace note chance and 8% octave jump chance (chorus) as ornaments
- 20% per-note mutation for variation between cycles

**Game Over Music:** Separate procedural composition at 110 BPM with its own chord progressions and melancholy tone.

---

## Input Handling

**Keyboard (`Keyboard.js`):**

| Action | Keys |
|---|---|
| Move left | Arrow Left / A |
| Move right | Arrow Right / D |
| Jump | Arrow Up / W / Space |
| Slide | Arrow Down / S |

Features just-pressed detection (single-frame activation), continuous hold support, and input field awareness (doesn't capture when typing in UI fields).

**Touch (`Touch.js`):**

| Action | Gesture |
|---|---|
| Move left | Swipe left (>50px) |
| Move right | Swipe right (>50px) |
| Jump | Swipe up (>50px) |
| Slide | Swipe down (>50px) |
| Continuous move | Hold & drag (>30px, 200ms interval) |

---

## Firebase Integration

### Player Data (`PlayerDataManager.js`)

Instead of traditional authentication, the game uses a **recovery code system**:
- Format: `KITTY-XXXX-XXXX` (human-readable, no confusing characters like 0/O, 1/I/L)
- Stored in both localStorage and Firebase
- Players can recover their progress on any device by entering their code

**Persisted data:**
- Total coins, best milestone count
- Unlocked cosmetic items
- Currently equipped outfit (shirt, overalls, bow)
- Last updated timestamp

**Strategy:** localStorage loads immediately for responsive UX; Firebase syncs in the background when online. Only saves if player has meaningful progress (coins > 0 or unlocked items).

### Leaderboard (`LeaderboardManager.js`)

- Global leaderboard backed by Firebase Realtime Database
- Stores initials, score, distance, coins, candies, and timestamp per entry
- Real-time subscription to top scores
- Local cache fallback via localStorage for offline play

---

## Cosmetic Shop

`CosmeticShop.js` manages a cosmetic customization system with three categories:

**Shirts:** 8 colors + rainbow variant (Free → 10,000 coins)
**Overalls:** 8 colors + rainbow variant + "no overalls" option (Free → 5,000 coins)
**Bows:** 8 colors + rainbow variant (Free → 10,000 coins)

**Price tiers** are balanced against expected earnings:

| Tier | Price Range | Target |
|---|---|---|
| Free | 0 | Default items + "no clothes" options |
| Starter | 150-400 | 1 decent run |
| Common | 600-1,200 | 2-3 average runs |
| Uncommon | 1,500-2,500 | 3-5 runs or 1 great run |
| Rare | 3,000-5,000 | Multiple sessions |
| Legendary | 10,000 | Long-term goal |

Rainbow variants feature animated hue cycling using a pre-computed 64-entry HUE lookup table and merged geometry with vertex colors to minimize draw calls.

---

## Performance Optimizations

**Memory:**
- Pre-allocated `Vector3` and `Color` objects to avoid garbage collection pressure
- Object pooling for particles and effects
- Shared geometries and materials across all instances of the same object type (coins, trees, lamps)

**Rendering:**
- Reduced polygon counts (16-segment coins vs 32)
- Shadow map resolution: 1024x1024 (down from 2048)
- Tight shadow camera frustum to minimize wasted shadow pixels
- Character spawn rate capped at 15%
- Increased environmental spacing (lamps 25 units, trees 20 units)

**Computation:**
- Static HUE lookup table (64 entries) replaces per-frame trigonometry
- Rainbow cosmetic updates throttled to 30fps (imperceptible vs 60fps)
- Accumulated animation time avoids repeated `Date.now()` calls
- Rainbow bow uses merged geometry (5 draw calls → 1)

**Audio:**
- All music procedurally generated — zero network requests for audio assets
- Beat scheduling uses Web Audio API's precise timing (`context.currentTime`)
- Oscillator nodes created per-note and auto-disconnected after use

**Build:**
- Three.js isolated in a separate chunk for browser caching
- ES2020 target (no legacy transpilation overhead)
- Source maps disabled in production builds

---

## Configuration

Core gameplay parameters are centralized in `js/utils/Constants.js`, including:

- Lane dimensions and count
- Speed, acceleration, and physics values
- Spawn rates and spacing
- Color palette (kawaii pink/blue theme)
- Collectible values and probabilities
- Sugar Rush thresholds and multipliers
- Power-up durations and effects

The color palette uses a warm kawaii aesthetic: primary pink (0xFFB7C5), hot pink accents (0xFF69B4), sky blue (0x87CEEB), gold highlights (0xFFD700), and soft white backgrounds (0xFFF5F5).
