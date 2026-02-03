import * as THREE from 'three';
import { GameScene } from './graphics/Scene.js';
import { GameCamera } from './graphics/Camera.js';
import { GameLighting } from './graphics/Lighting.js';
import { Player } from './game/Player.js';
import { KeyboardController } from './input/Keyboard.js';
import { TouchController } from './input/Touch.js';
import { World } from './game/World.js';
import { AudioManager } from './audio/AudioManager.js';
import { LeaderboardManager } from './firebase/LeaderboardManager.js';

class Game {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.score = 0;
        this.coins = 0;
        this.candyCollected = 0;
        this.distance = 0;

        // Input debounce for discrete actions
        this.lastJumpTime = 0;
        this.lastSlideTime = 0;
        this.lastLaneChangeTime = 0;
        this.actionCooldown = 0.2; // seconds

        // Power-up system
        this.activePowerUps = new Map(); // type -> {duration, maxDuration}
        this.coinMultiplier = 1;
        this.hasShield = false;
        this.invincibilityTimer = 0; // Brief invincibility after shield breaks

        // Candy & Sugar Rush system - multi-level with balanced progression
        this.candyMeter = 0;
        this.candyMeterMax = 70; // Meter to trigger Sugar Rush (balanced)
        this.isSugarRush = false;
        this.sugarRushLevel = 0; // 0=off, 1=Sugar Rush, 2=Super Sugar Rush, 3=MEGA Sugar Rush
        this.sugarRushCooldown = 0; // Cooldown after Sugar Rush ends
        this.sugarRushCooldownDuration = 4; // Seconds before meter can fill again
        this.sugarRushDecayRate = 12; // Meter drains this much per second during Sugar Rush
        this.sugarRushLevelChangeCooldown = 0; // Cooldown between level changes to prevent oscillation

        // Sugar Rush level configs - only level 3 grants invincibility!
        // Magnet only attracts COINS, not candy - must collect candy manually
        // decayRate balanced for manual candy collection (~7/sec max gain)
        this.sugarRushConfigs = {
            1: { name: 'Sugar Rush!', multiplier: 3, magnetRadius: 8, auraSize: 1.2, auraColor: 0xFF69B4, speedBoost: 1.0, invincible: false, levelUpCost: 90, meterThreshold: 0, decayRate: 12 },
            2: { name: 'SUPER Sugar Rush!', multiplier: 5, magnetRadius: 12, auraSize: 1.5, auraColor: 0xFFD700, speedBoost: 1.15, invincible: false, levelUpCost: 110, meterThreshold: 40, decayRate: 18 },
            3: { name: 'MEGA SUGAR RUSH!!!', multiplier: 10, magnetRadius: 18, auraSize: 2.0, auraColor: 0xFF0000, speedBoost: 1.3, invincible: true, levelUpCost: 999, meterThreshold: 70, decayRate: 25 }
        };

        // Leaderboard (Firebase-backed with local fallback)
        this.leaderboard = new LeaderboardManager();
        this.highScores = [];  // Global scores from Firebase
        this.localScores = this.loadLocalScores();  // Personal best scores
        this.isNewHighScore = false;
        this.leaderboardInitialized = false;

        // PERFORMANCE: Cached frame time (updated once per frame, passed to all systems)
        this.frameTime = 0;

        // PERFORMANCE: Pre-allocated vectors to avoid GC pressure
        this._tempVec3 = new THREE.Vector3();

        // PERFORMANCE: Particle pool for explosions and effects
        this.particlePool = [];
        this.activeParticles = [];
        this.maxPoolSize = 100;

        // PERFORMANCE: Shared geometries and materials for particles
        this.sharedParticleGeo = null;
        this.sharedSpeedTrailGeo = null;

        // PERFORMANCE: Animation queue (replaces separate RAF callbacks)
        this.animations = [];

        // Persistent dizzy stars for death animation (orbit until restart)
        this.dizzyStars = [];

        // Load settings first (before creating renderer)
        this.loadSettings();

        // Initialize game systems
        this.init();
    }

    async init() {
        // Graphics - pass settings for antialias configuration
        this.gameScene = new GameScene(this.settings);
        this.camera = new GameCamera();
        this.lighting = new GameLighting(this.gameScene.getScene());

        // Player
        this.player = new Player(this.gameScene.getScene());

        // World (obstacles and collectibles)
        this.world = new World(this.gameScene.getScene());

        // Audio
        this.audio = new AudioManager();

        // Input
        this.keyboard = new KeyboardController();
        this.touch = new TouchController();
        this.setupTouchControls();

        // Clock for delta time
        this.clock = performance.now();
        this.lastTime = this.clock;

        // FPS tracking
        this.frameCount = 0;
        this.fpsUpdateTime = 0;
        this.currentFPS = 60;

        // PERFORMANCE: Initialize shared geometries and particle pool
        this.initSharedResources();

        // PERFORMANCE: Cache DOM elements
        this.domElements = {
            score: document.getElementById('score'),
            coins: document.getElementById('coins'),
            candies: document.getElementById('candies'),
            distance: document.getElementById('distance'),
            fps: document.getElementById('fps'),
            powerUpDisplay: null,
            powerUpStylesInjected: false
        };

        // PERFORMANCE: Throttle HUD updates (DOM operations are expensive)
        this.lastHUDUpdate = 0;
        this.hudUpdateInterval = 100; // Update HUD every 100ms instead of every frame

        // Setup UI
        this.setupUI();

        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());

        // Initialize Firebase leaderboard (async, non-blocking)
        this.initLeaderboard();

        // Start render loop (menu visible initially)
        this.render();
    }

    async initLeaderboard() {
        // Always display local scores first (instant)
        this.displayLocalLeaderboard();

        try {
            await this.leaderboard.init();
            this.leaderboardInitialized = true;

            // Load initial global scores
            this.highScores = await this.leaderboard.getTopScores(10);
            this.displayLeaderboard();

            // Subscribe to real-time updates
            this.leaderboard.subscribeToLeaderboard((scores) => {
                this.highScores = scores;
                // Only update display if game over screen is visible
                const gameOverScreen = document.getElementById('game-over-screen');
                if (gameOverScreen && gameOverScreen.classList.contains('active')) {
                    this.displayLeaderboard();
                }
            });

            console.log('Leaderboard connected to global server');
        } catch (error) {
            console.warn('Leaderboard running in offline mode:', error);
            this.highScores = this.leaderboard.localScores;
            this.displayLeaderboard();
        }
    }

    loadSettings() {
        // Load anti-aliasing preference (default: auto-detect based on device)
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
                      || window.innerWidth < 768;
        const savedAA = localStorage.getItem('antialiasing');

        if (savedAA !== null) {
            this.settings = { antialias: savedAA === 'true' };
        } else {
            // Default: enabled on desktop, disabled on mobile
            this.settings = { antialias: !isMobile };
        }
    }

    saveSettings() {
        localStorage.setItem('antialiasing', this.settings.antialias.toString());
    }

    getSettings() {
        return this.settings;
    }

    setupUI() {
        // Start button
        const startButton = document.getElementById('start-button');
        startButton.addEventListener('click', () => this.startGame());

        // Settings button
        document.getElementById('settings-button').addEventListener('click', () => {
            document.getElementById('start-screen').classList.remove('active');
            document.getElementById('settings-panel').classList.add('active');
            // Update toggle to match current setting
            document.getElementById('aa-toggle').checked = this.settings.antialias;
        });

        // Settings back button
        document.getElementById('settings-back-button').addEventListener('click', () => {
            document.getElementById('settings-panel').classList.remove('active');
            document.getElementById('start-screen').classList.add('active');
        });

        // Anti-aliasing toggle
        document.getElementById('aa-toggle').addEventListener('change', (e) => {
            const newValue = e.target.checked;
            if (newValue !== this.settings.antialias) {
                this.settings.antialias = newValue;
                this.saveSettings();
                // Notify user that reload is needed
                if (confirm('Anti-aliasing setting changed. Reload now to apply?')) {
                    window.location.reload();
                }
            }
        });

        // Restart button
        const restartButton = document.getElementById('restart-button');
        restartButton.addEventListener('click', () => this.restartGame());

        // Save score button
        const saveScoreButton = document.getElementById('save-score-button');
        saveScoreButton.addEventListener('click', () => this.saveHighScore());

        // Initials input - auto-uppercase on blur
        const initialsInput = document.getElementById('initials-input');
        initialsInput.addEventListener('blur', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });

        // Display leaderboards on start
        this.displayLeaderboard();
        this.displayLocalLeaderboard();

        // Keyboard shortcuts for menu navigation
        window.addEventListener('keydown', (e) => {
            // Spacebar or Enter to start/restart
            if (e.code === 'Space' || e.code === 'Enter') {
                const startScreen = document.getElementById('start-screen');
                const gameOverScreen = document.getElementById('game-over-screen');
                const newHighScoreDiv = document.getElementById('new-high-score');

                // Don't trigger if typing initials
                if (document.activeElement === initialsInput) {
                    return;
                }

                // Start game if on start screen
                if (startScreen.classList.contains('active')) {
                    e.preventDefault();
                    this.startGame();
                }
                // Restart if on game over screen (but not entering initials)
                else if (gameOverScreen.classList.contains('active') &&
                         newHighScoreDiv.style.display === 'none') {
                    e.preventDefault();
                    this.restartGame();
                }
            }

            // Enter to save score when entering initials
            if (e.code === 'Enter' && document.activeElement === initialsInput) {
                e.preventDefault();
                this.saveHighScore();
            }
        });
    }

    setupTouchControls() {
        // Swipe left - move left lane
        this.touch.setSwipeLeftCallback(() => {
            if (this.isRunning && !this.isPaused) {
                this.player.moveLeft();
                this.audio.playLaneChangeSound();
            }
        });

        // Swipe right - move right lane
        this.touch.setSwipeRightCallback(() => {
            if (this.isRunning && !this.isPaused) {
                this.player.moveRight();
                this.audio.playLaneChangeSound();
            }
        });

        // Hold left - continuous left movement (for players who hold finger)
        this.touch.setHoldLeftCallback(() => {
            if (this.isRunning && !this.isPaused) {
                this.player.moveLeft();
                this.audio.playLaneChangeSound();
            }
        });

        // Hold right - continuous right movement (for players who hold finger)
        this.touch.setHoldRightCallback(() => {
            if (this.isRunning && !this.isPaused) {
                this.player.moveRight();
                this.audio.playLaneChangeSound();
            }
        });

        // Swipe up - jump
        this.touch.setSwipeUpCallback(() => {
            if (this.isRunning && !this.isPaused) {
                this.player.jump();
                this.audio.playJumpSound();
            }
        });

        // Swipe down - slide
        this.touch.setSwipeDownCallback(() => {
            if (this.isRunning && !this.isPaused) {
                this.player.slide();
                this.audio.playSlideSound();
            }
        });

        // Tap - will be used for tower placement later
        this.touch.setTapCallback((x, y) => {
            // TODO: Handle tower placement
        });
    }

    startGame() {
        // Hide start screen
        document.getElementById('start-screen').classList.remove('active');

        // Restore HUD visibility (may have been hidden during death)
        const hud = document.getElementById('hud');
        if (hud) {
            hud.style.opacity = '1';
        }
        if (this.domElements.powerUpDisplay) {
            this.domElements.powerUpDisplay.style.opacity = '1';
        }
        // Restore candy meter visibility
        if (this.domElements.candyMeter) {
            this.domElements.candyMeter.style.opacity = '1';
        }

        // Initialize and start audio
        this.audio.init();
        this.audio.playBackgroundMusic();

        // Clean up any active power-ups from previous game
        // This removes their visual meshes and effects
        for (const [type] of this.activePowerUps) {
            this.deactivatePowerUp(type);
        }

        // MEMORY FIX: Clear power-up HUD elements from previous game
        if (this.domElements.powerUpElements) {
            for (const [, elem] of this.domElements.powerUpElements) {
                elem.remove();
            }
            this.domElements.powerUpElements.clear();
        }

        // MEMORY FIX: Remove any lingering power-up notifications
        document.querySelectorAll('.power-up-notification').forEach(el => el.remove());

        // PERFORMANCE: Reset particle pool (return all active particles)
        for (let i = this.activeParticles.length - 1; i >= 0; i--) {
            this.returnParticleToPool(this.activeParticles[i]);
        }

        // MEMORY FIX: Force-complete any pending animations to dispose their resources
        if (this.animations && this.animations.length > 0) {
            this.animations.forEach(anim => {
                if (anim.update) {
                    anim.update(1); // Force completion (triggers cleanup)
                }
            });
        }
        // Clear animation queue
        this.animations = [];

        // Clean up any lingering speed trail particles (legacy cleanup)
        if (this.speedTrailParticles) {
            this.speedTrailParticles.forEach(p => {
                if (p.parent) p.parent.remove(p);
                if (p.geometry) p.geometry.dispose();
                if (p.material) p.material.dispose();
            });
            this.speedTrailParticles = [];
        }

        // Reset game state
        this.score = 0;
        this.coins = 0;
        this.candyCollected = 0;
        this.distance = 0;
        this.activePowerUps.clear();
        this.coinMultiplier = 1;
        this.hasShield = false;
        this.invincibilityTimer = 0;
        this.lastHUDUpdate = 0; // MEMORY FIX: Reset HUD throttle timer

        // Reset candy meter and Sugar Rush
        this.candyMeter = 0;
        this.isSugarRush = false;
        this.sugarRushLevel = 0;
        this.sugarRushCooldown = 0;
        this.removeSugarRushEffects();
        this.removeSugarRushBenefitsUI();

        this.updateHUD();

        this.isRunning = true;
        this.isPaused = false;
        this.lastTime = performance.now();
    }

    restartGame() {
        // Hide game over screen
        document.getElementById('game-over-screen').classList.remove('active');

        // Reset death camera back to normal gameplay camera
        this.camera.resetDeathCamera();

        // Clean up dizzy stars
        this.cleanupDizzyStars();

        // Reset player
        this.player.reset();

        // Reset world
        this.world.reset();

        // Reset scene (ground segments, buildings, etc.)
        this.gameScene.reset();

        // Start game
        this.startGame();
    }

    gameOver() {
        this.isRunning = false;

        // Play game over sound
        this.audio.playGameOverSound();
        this.audio.stopBackgroundMusic();

        // Update final score display
        const finalScore = Math.floor(this.score);
        document.getElementById('final-score').textContent = finalScore;
        document.getElementById('final-coins').textContent = this.coins;
        document.getElementById('final-candies').textContent = this.candyCollected;
        document.getElementById('final-distance').textContent = Math.floor(this.distance) + 'm';

        // Check if it's a high score
        this.isNewHighScore = this.checkHighScore(finalScore);

        if (this.isNewHighScore) {
            document.getElementById('new-high-score').style.display = 'block';
            document.getElementById('initials-input').value = '';
            document.getElementById('initials-input').focus();
        } else {
            document.getElementById('new-high-score').style.display = 'none';
        }

        // Display leaderboards
        this.displayLeaderboard();
        this.displayLocalLeaderboard();

        // Show game over screen
        document.getElementById('game-over-screen').classList.add('active');
    }

    handleInput(deltaTime) {
        const currentTime = performance.now() / 1000;

        // Lane switching (with cooldown)
        if (currentTime - this.lastLaneChangeTime > this.actionCooldown) {
            if (this.keyboard.isLeftPressed()) {
                this.player.moveLeft();
                this.audio.playLaneChangeSound();
                this.lastLaneChangeTime = currentTime;
            } else if (this.keyboard.isRightPressed()) {
                this.player.moveRight();
                this.audio.playLaneChangeSound();
                this.lastLaneChangeTime = currentTime;
            }
        }

        // Jumping (only on key press, not while holding)
        // Reduced cooldown for double jump support
        if (currentTime - this.lastJumpTime > 0.15) { // 150ms cooldown for double jump
            if (this.keyboard.isJumpJustPressed()) {
                const wasJumping = this.player.isJumping;
                const oldJumpCount = this.player.jumpCount;
                this.player.jump();
                // Only play sound and set cooldown if jump was successful
                if (this.player.jumpCount > oldJumpCount || (!wasJumping && this.player.isJumping)) {
                    this.audio.playJumpSound();
                    this.lastJumpTime = currentTime;
                }
            }
        }

        // Sliding (only on key press, not while holding)
        if (currentTime - this.lastSlideTime > this.actionCooldown) {
            if (this.keyboard.isSlideJustPressed()) {
                this.player.slide();
                this.audio.playSlideSound();
                this.lastSlideTime = currentTime;
            }
        }
    }

    update(deltaTime) {
        if (!this.isRunning || this.isPaused) return;

        // Handle input
        this.handleInput(deltaTime);

        // Update power-up timers
        for (const [type, data] of this.activePowerUps) {
            data.duration -= deltaTime;
            if (data.duration <= 0) {
                this.deactivatePowerUp(type);
            }
        }

        // Update invincibility timer (from shield breaking)
        if (this.invincibilityTimer > 0) {
            this.invincibilityTimer -= deltaTime;
        }

        // Update Sugar Rush - meter ALWAYS decays, collect candy to build/maintain!
        if (this.isSugarRush) {
            // Decay the meter - higher levels decay FASTER!
            const config = this.sugarRushConfigs[this.sugarRushLevel];
            const decayRate = config ? config.decayRate : this.sugarRushDecayRate;
            this.candyMeter -= decayRate * deltaTime;

            // Check for level down or end
            if (this.candyMeter <= 0) {
                this.candyMeter = 0;
                this.endSugarRush();
            } else {
                // Check if we should level down
                const currentConfig = this.sugarRushConfigs[this.sugarRushLevel];
                if (this.sugarRushLevel > 1 && currentConfig) {
                    const threshold = currentConfig.meterThreshold;
                    if (this.candyMeter < threshold) {
                        this.levelDownSugarRush();
                    }
                }

                // Sugar Rush effects - candy magnet
                this.attractCandies(deltaTime);
            }

            // Update meter UI to show decay
            this.animateCandyMeter();
        } else if (this.sugarRushCooldown <= 0 && this.candyMeter > 0) {
            // Level 0 decay - meter drains even when building up!
            // Candy spawns ~0.4/sec collectible, avg value ~18 = ~7/sec max gain
            // 4/sec decay allows net +3/sec with good play, ~23sec to fill meter
            const level0DecayRate = 4;
            this.candyMeter -= level0DecayRate * deltaTime;
            if (this.candyMeter < 0) this.candyMeter = 0;

            // Update meter UI to show decay
            this.animateCandyMeter();
        }

        // Update Sugar Rush cooldown
        if (this.sugarRushCooldown > 0) {
            this.sugarRushCooldown -= deltaTime;
        }

        // Update level change cooldown (prevents rapid oscillation)
        if (this.sugarRushLevelChangeCooldown > 0) {
            this.sugarRushLevelChangeCooldown -= deltaTime;
        }

        // Update power-up visual effects
        this.updatePowerUpVisuals(deltaTime);

        // Flight mode effect - lift player higher
        if (this.activePowerUps.has('flight')) {
            this.player.position.y = Math.max(this.player.position.y, 2.0);
        }

        // Update player
        this.player.update(deltaTime);

        // Magnet effect - attract nearby coins
        if (this.activePowerUps.has('magnet')) {
            const playerPos = this.player.getPosition();
            const magnetRadius = 5; // Attraction radius
            const magnetRadiusSq = magnetRadius * magnetRadius; // PERFORMANCE: Squared for comparison
            const attractSpeed = 15; // How fast coins move toward player

            const collectibles = this.world.getCollectibles();
            for (let i = 0, len = collectibles.length; i < len; i++) {
                const collectible = collectibles[i];
                if (collectible.isCollected) continue;

                // PERFORMANCE: Early z-check (cheap culling)
                const dz = playerPos.z - collectible.position.z;
                if (dz > magnetRadius || dz < -magnetRadius) continue;

                const dx = playerPos.x - collectible.position.x;

                // PERFORMANCE: Early x-check
                if (dx > magnetRadius || dx < -magnetRadius) continue;

                // PERFORMANCE: Use squared distance
                const distanceSq = dx * dx + dz * dz;
                if (distanceSq < magnetRadiusSq && distanceSq > 0.01) {
                    // Only compute sqrt when actually needed
                    const distance = Math.sqrt(distanceSq);
                    const invDist = 1 / distance;
                    collectible.position.x += dx * invDist * attractSpeed * deltaTime;
                    collectible.position.z += dz * invDist * attractSpeed * deltaTime;
                    collectible.group.position.x = collectible.position.x;
                    collectible.group.position.z = collectible.position.z;
                }
            }
        }

        // Update world (obstacles and collectibles)
        this.world.update(deltaTime, this.player.getPosition().z);

        // Update scene (clouds, animations)
        this.gameScene.update(deltaTime, this.player.getPosition().z);

        // Check collisions
        this.checkCollisions();

        // Update camera to follow player
        this.camera.update(this.player.getPosition());

        // Update lighting to follow player
        this.lighting.updateLightPosition(this.player.getPosition().z);

        // Update score (distance-based)
        this.distance += this.player.speed * deltaTime;
        this.score = this.distance;

        // Update music tempo based on game speed
        // Scale from 128 BPM at start speed to 180 BPM at max speed
        const speedProgress = (this.player.speed - 25) / (40 - 25); // 0 to 1
        const newTempo = 128 + (speedProgress * 52); // 128 to 180 BPM
        this.audio.setTempo(newTempo);

        // Update HUD
        this.updateHUD();

        // Clear keyboard just-pressed state for next frame
        this.keyboard.update();
    }

    activatePowerUp(type) {
        const duration = 12; // Increased from 8 - more time to enjoy power-ups!

        // Check if power-up is already active
        const wasActive = this.activePowerUps.has(type);

        // Add to active power-ups (or refresh duration if already active)
        this.activePowerUps.set(type, {
            duration: duration,
            maxDuration: duration
        });

        // If already active, just refresh duration - don't reapply effects
        if (wasActive) {
            return;
        }

        // Show notification explaining the power-up
        const messages = {
            'shield': 'Shield Active! Protects from 1 hit',
            'multiplier': '2x Coins! Double coin value',
            'speed': 'Super Speed! Fast & invincible',
            'giant': 'Giant Mode! Smash obstacles',
            'flight': 'Flight Mode! Float over obstacles',
            'magnet': 'Coin Magnet! Auto-collect coins'
        };
        this.showPowerUpNotification(type, messages[type]);

        // Apply immediate effects and create visual feedback
        switch (type) {
            case 'shield':
                this.hasShield = true;
                this.createShieldVisual();
                break;
            case 'multiplier':
                this.coinMultiplier = 2;
                this.createMultiplierVisual();
                break;
            case 'speed':
                this.player.speed *= 1.5;
                this.createSpeedTrail();
                break;
            case 'giant':
                this.player.character.scale.set(2, 2, 2);
                break;
            case 'flight':
                this.createCloudVisual();
                break;
            case 'magnet':
                this.createMagnetVisual();
                break;
        }
    }

    deactivatePowerUp(type) {
        this.activePowerUps.delete(type);

        // Remove effects and visuals
        switch (type) {
            case 'shield':
                this.hasShield = false;
                this.removeShieldVisual();
                break;
            case 'multiplier':
                this.coinMultiplier = 1;
                this.removeMultiplierVisual();
                break;
            case 'speed':
                this.player.speed /= 1.5;
                this.removeSpeedTrail();
                break;
            case 'giant':
                this.player.character.scale.set(1, 1, 1);
                break;
            case 'flight':
                this.removeCloudVisual();
                // Reset player to ground level (feet at y=0)
                this.player.position.y = 0;
                break;
            case 'magnet':
                this.removeMagnetVisual();
                break;
        }
    }

    createShieldVisual() {
        // Hello Kitty dimensions: body y=0.45, head y=1.2, ears top y~1.8
        // Shield needs to fully enclose character from feet to ears
        const shieldGeometry = new THREE.SphereGeometry(1.2, 16, 16);
        const shieldMaterial = new THREE.MeshBasicMaterial({
            color: 0x00FFFF,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        this.shieldMesh = new THREE.Mesh(shieldGeometry, shieldMaterial);
        // Center between feet (0) and ear tips (1.8) = 0.9
        // With radius 1.2: covers y=-0.3 to y=2.1 (fully enclosing character)
        this.shieldMesh.position.y = 0.9;
        this.player.character.add(this.shieldMesh);
    }

    removeShieldVisual() {
        if (this.shieldMesh) {
            this.player.character.remove(this.shieldMesh);
            this.shieldMesh.geometry.dispose();
            this.shieldMesh.material.dispose();
            this.shieldMesh = null;
        }
    }

    createMultiplierVisual() {
        const ringGeometry = new THREE.TorusGeometry(0.6, 0.1, 8, 16);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFD700,
            transparent: true,
            opacity: 0.6
        });
        this.multiplierRing = new THREE.Mesh(ringGeometry, ringMaterial);
        this.multiplierRing.rotation.x = Math.PI / 2;
        this.player.character.add(this.multiplierRing);
    }

    removeMultiplierVisual() {
        if (this.multiplierRing) {
            this.player.character.remove(this.multiplierRing);
            this.multiplierRing.geometry.dispose();
            this.multiplierRing.material.dispose();
            this.multiplierRing = null;
        }
    }

    createSpeedTrail() {
        this.speedTrailParticles = [];
        // Trail particles will be created in update loop
    }

    removeSpeedTrail() {
        if (this.speedTrailParticles) {
            this.speedTrailParticles.forEach(p => {
                if (p.parent) p.parent.remove(p);
                p.geometry.dispose();
                p.material.dispose();
            });
            this.speedTrailParticles = [];
        }
    }

    createCloudVisual() {
        const cloudGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        cloudGeometry.scale(1.5, 0.5, 1);
        const cloudMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.7
        });
        this.cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
        this.cloudMesh.position.y = -0.5;
        this.player.character.add(this.cloudMesh);
    }

    removeCloudVisual() {
        if (this.cloudMesh) {
            this.player.character.remove(this.cloudMesh);
            this.cloudMesh.geometry.dispose();
            this.cloudMesh.material.dispose();
            this.cloudMesh = null;
        }
    }

    createMagnetVisual() {
        const ringGeometry = new THREE.TorusGeometry(0.7, 0.08, 8, 16);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF00FF,
            transparent: true,
            opacity: 0.5
        });
        this.magnetRing = new THREE.Mesh(ringGeometry, ringMaterial);
        this.magnetRing.rotation.x = Math.PI / 2;
        this.player.character.add(this.magnetRing);
    }

    removeMagnetVisual() {
        if (this.magnetRing) {
            this.player.character.remove(this.magnetRing);
            this.magnetRing.geometry.dispose();
            this.magnetRing.material.dispose();
            this.magnetRing = null;
        }
    }

    // ============================================
    // SUGAR RUSH SYSTEM
    // ============================================

    addToSugarMeter(value) {
        // Don't fill meter during cooldown
        if (this.sugarRushCooldown > 0 && !this.isSugarRush) {
            return;
        }

        if (this.isSugarRush) {
            // Already in Sugar Rush - fill meter to level up!
            this.candyMeter += value;

            // Check for level up - requires more candy at higher levels
            const currentConfig = this.sugarRushConfigs[this.sugarRushLevel];
            const levelUpCost = currentConfig ? currentConfig.levelUpCost : this.candyMeterMax;
            if (this.candyMeter >= levelUpCost && this.sugarRushLevel < 3) {
                this.levelUpSugarRush();
            }
            return;
        }

        this.candyMeter += value;

        // Trigger candy meter UI animation
        this.animateCandyMeter();

        // Check if meter is full
        if (this.candyMeter >= this.candyMeterMax) {
            this.activateSugarRush(1);
        }
    }

    activateSugarRush(level) {
        this.isSugarRush = true;
        this.sugarRushLevel = level;
        // Start with meter at the threshold for level 1 (gives some buffer time)
        this.candyMeter = this.candyMeterMax;

        // Show notification
        this.showSugarRushNotification();

        // Create visual effects
        this.createSugarRushVisuals();

        // Play exciting Sugar Rush fanfare!
        this.audio.playSugarRushSound();
    }

    levelUpSugarRush() {
        // Prevent rapid level oscillation
        if (this.sugarRushLevelChangeCooldown > 0) return;

        // Level up!
        this.sugarRushLevel = Math.min(this.sugarRushLevel + 1, 3);

        // Set meter to the new level's threshold + buffer
        const newConfig = this.sugarRushConfigs[this.sugarRushLevel];
        this.candyMeter = newConfig.meterThreshold + 25; // Buffer above threshold

        // Cooldown before next level change (1.5 seconds)
        this.sugarRushLevelChangeCooldown = 1.5;

        // Update visuals for new level
        this.updateSugarRushVisuals();

        // Show level up notification
        this.showSugarRushLevelUpNotification();

        // Play level up sound
        this.audio.playSugarRushLevelUpSound(this.sugarRushLevel);
    }

    levelDownSugarRush() {
        // Prevent rapid level oscillation
        if (this.sugarRushLevelChangeCooldown > 0) return;

        // Level down!
        this.sugarRushLevel = Math.max(this.sugarRushLevel - 1, 1);

        // Cooldown before next level change (1 second)
        this.sugarRushLevelChangeCooldown = 1.0;

        // Update visuals for lower level
        this.updateSugarRushVisuals();

        // Show level down notification
        this.showSugarRushLevelDownNotification();

        // Play warning sound
        this.audio.playSugarRushLevelDownSound();
    }

    endSugarRush() {
        this.isSugarRush = false;
        this.sugarRushLevel = 0;

        // Start cooldown - meter won't fill for a few seconds
        this.sugarRushCooldown = this.sugarRushCooldownDuration;
        this.candyMeter = 0; // Reset meter

        // Remove visual effects
        this.removeSugarRushEffects();

        // Show end notification
        this.showSugarRushEndNotification();

        // Play gentle end sound
        this.audio.playSugarRushEndSound();
    }

    getSugarRushMultiplier() {
        if (!this.isSugarRush || this.sugarRushLevel === 0) return 1;
        return this.sugarRushConfigs[this.sugarRushLevel].multiplier;
    }

    getSugarRushMagnetRadius() {
        if (!this.isSugarRush || this.sugarRushLevel === 0) return 0;
        return this.sugarRushConfigs[this.sugarRushLevel].magnetRadius;
    }

    isSugarRushInvincible() {
        if (!this.isSugarRush || this.sugarRushLevel === 0) return false;
        return this.sugarRushConfigs[this.sugarRushLevel].invincible;
    }

    createSugarRushVisuals() {
        // Get level config
        const config = this.sugarRushConfigs[this.sugarRushLevel] || this.sugarRushConfigs[1];

        // Rainbow aura around player - size based on level
        const auraGeometry = new THREE.SphereGeometry(config.auraSize, 16, 16);
        const auraMaterial = new THREE.MeshBasicMaterial({
            color: config.auraColor,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        this.sugarRushAura = new THREE.Mesh(auraGeometry, auraMaterial);
        this.sugarRushAura.position.y = 0.9; // Center on character
        this.player.character.add(this.sugarRushAura);

        // Rainbow trail particles array
        this.sugarRushTrail = [];

        // Screen tint overlay
        if (!document.getElementById('sugar-rush-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'sugar-rush-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: radial-gradient(circle, rgba(255,105,180,0.1) 0%, rgba(255,182,193,0.15) 100%);
                pointer-events: none;
                z-index: 5;
                animation: sugarRushPulse 0.5s ease-in-out infinite alternate;
            `;
            document.body.appendChild(overlay);

            // Add animation keyframes if not exist
            if (!document.getElementById('sugar-rush-style')) {
                const style = document.createElement('style');
                style.id = 'sugar-rush-style';
                style.textContent = `
                    @keyframes sugarRushPulse {
                        from { opacity: 0.5; }
                        to { opacity: 1; }
                    }
                `;
                document.head.appendChild(style);
            }
        }

        // Create benefits panel UI
        this.showSugarRushBenefitsUI();
    }

    showSugarRushBenefitsUI() {
        // Remove existing panel
        this.removeSugarRushBenefitsUI();

        const config = this.sugarRushConfigs[this.sugarRushLevel] || this.sugarRushConfigs[1];
        const panel = document.createElement('div');
        panel.id = 'sugar-rush-benefits';

        // Check if mobile - make compact badge at top instead of side panel
        const isMobile = window.innerWidth < 768;

        if (isMobile) {
            // Mobile: Compact horizontal badge at top-left, below HUD
            panel.style.cssText = `
                position: fixed;
                left: 10px;
                top: 45px;
                background: linear-gradient(90deg, rgba(255,105,180,0.85) 0%, rgba(255,182,193,0.85) 100%);
                border: 2px solid ${config.invincible ? '#FFD700' : '#FF69B4'};
                border-radius: 8px;
                padding: 4px 8px;
                color: white;
                font-family: 'Comic Sans MS', cursive, sans-serif;
                font-size: 10px;
                z-index: 100;
                box-shadow: 0 2px 8px rgba(255,105,180,0.4);
                display: flex;
                align-items: center;
                gap: 6px;
            `;

            const levelStars = '⭐'.repeat(this.sugarRushLevel);
            const invincibleBadge = config.invincible ? '🛡️' : '';

            panel.innerHTML = `
                <span style="font-weight:bold;">${levelStars}</span>
                <span>🎯${config.multiplier}x</span>
                <span>🧲${config.magnetRadius}m</span>
                ${invincibleBadge}
            `;
        } else {
            // Desktop: Full side panel
            panel.style.cssText = `
                position: fixed;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                background: linear-gradient(135deg, rgba(255,105,180,0.9) 0%, rgba(255,182,193,0.9) 100%);
                border: 3px solid ${config.invincible ? '#FFD700' : '#FF69B4'};
                border-radius: 15px;
                padding: 12px 15px;
                color: white;
                font-family: 'Comic Sans MS', cursive, sans-serif;
                font-size: 14px;
                z-index: 100;
                box-shadow: 0 4px 15px rgba(255,105,180,0.5);
                min-width: 140px;
            `;

            const levelStars = '⭐'.repeat(this.sugarRushLevel);
            const invincibleBadge = config.invincible ? '<div style="color:#FFD700;font-weight:bold;margin-top:5px;">🛡️ INVINCIBLE!</div>' : '';

            panel.innerHTML = `
                <div style="font-weight:bold;font-size:16px;text-align:center;margin-bottom:8px;">${config.name}</div>
                <div style="text-align:center;margin-bottom:8px;">${levelStars}</div>
                <div>🎯 ${config.multiplier}x</div>
                <div>🧲 ${config.magnetRadius}m</div>
                ${config.speedBoost > 1 ? `<div>💨 +${Math.round((config.speedBoost - 1) * 100)}%</div>` : ''}
                ${invincibleBadge}
                <div style="font-size:11px;margin-top:8px;text-align:center;opacity:0.9;">Collect candy to maintain!</div>
            `;
        }

        document.body.appendChild(panel);
    }

    removeSugarRushBenefitsUI() {
        const panel = document.getElementById('sugar-rush-benefits');
        if (panel) panel.remove();
    }

    updateSugarRushVisuals() {
        // Update aura for new level
        if (this.sugarRushAura) {
            const config = this.sugarRushConfigs[this.sugarRushLevel];

            // Recreate aura with new size
            this.player.character.remove(this.sugarRushAura);
            this.sugarRushAura.geometry.dispose();
            this.sugarRushAura.material.dispose();

            const auraGeometry = new THREE.SphereGeometry(config.auraSize, 16, 16);
            const auraMaterial = new THREE.MeshBasicMaterial({
                color: config.auraColor,
                transparent: true,
                opacity: 0.35 + this.sugarRushLevel * 0.05, // More opaque at higher levels
                side: THREE.DoubleSide
            });
            this.sugarRushAura = new THREE.Mesh(auraGeometry, auraMaterial);
            this.sugarRushAura.position.y = 0.9;
            this.player.character.add(this.sugarRushAura);
        }

        // Update overlay intensity
        const overlay = document.getElementById('sugar-rush-overlay');
        if (overlay) {
            const intensity = 0.1 + this.sugarRushLevel * 0.05;
            if (this.sugarRushLevel === 3) {
                overlay.style.background = `radial-gradient(circle, rgba(255,0,0,${intensity}) 0%, rgba(255,215,0,${intensity + 0.05}) 100%)`;
            } else if (this.sugarRushLevel === 2) {
                overlay.style.background = `radial-gradient(circle, rgba(255,215,0,${intensity}) 0%, rgba(255,182,193,${intensity + 0.05}) 100%)`;
            } else {
                overlay.style.background = `radial-gradient(circle, rgba(255,105,180,0.1) 0%, rgba(255,182,193,0.15) 100%)`;
            }
        }

        // Update benefits panel
        this.showSugarRushBenefitsUI();
    }

    clearSugarRushNotifications() {
        // Remove any existing Sugar Rush notifications to prevent overlap
        document.querySelectorAll('.sugar-rush-notification, .sugar-rush-end-notification').forEach(n => n.remove());
    }

    showSugarRushLevelUpNotification() {
        // Skip notification on mobile - benefits panel is enough
        if (window.innerWidth < 768) return;

        this.clearSugarRushNotifications();

        const config = this.sugarRushConfigs[this.sugarRushLevel];
        const invincibleText = config.invincible ? '🛡️ INVINCIBLE!' : '';
        const notification = document.createElement('div');
        notification.className = 'sugar-rush-notification level-up';
        notification.innerHTML = `
            <span class="icon">${this.sugarRushLevel === 3 ? '🌟' : '⬆️'}</span>
            <span class="title">${config.name}</span>
            <span class="description">${config.multiplier}x ${invincibleText}</span>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s';
            setTimeout(() => notification.remove(), 300);
        }, 1000);
    }

    showSugarRushLevelDownNotification() {
        // Skip notification on mobile - benefits panel is enough
        if (window.innerWidth < 768) return;

        this.clearSugarRushNotifications();

        const config = this.sugarRushConfigs[this.sugarRushLevel];
        const notification = document.createElement('div');
        notification.className = 'sugar-rush-notification level-down';
        notification.innerHTML = `
            <span class="icon">⬇️</span>
            <span class="title">${config.name}</span>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s';
            setTimeout(() => notification.remove(), 300);
        }, 800);
    }

    removeSugarRushEffects() {
        // Remove aura
        if (this.sugarRushAura) {
            this.player.character.remove(this.sugarRushAura);
            this.sugarRushAura.geometry.dispose();
            this.sugarRushAura.material.dispose();
            this.sugarRushAura = null;
        }

        // Remove trail particles
        if (this.sugarRushTrail) {
            this.sugarRushTrail.forEach(p => {
                if (p.parent) p.parent.remove(p);
                if (p.geometry) p.geometry.dispose();
                if (p.material) p.material.dispose();
            });
            this.sugarRushTrail = [];
        }

        // Remove screen overlay
        const overlay = document.getElementById('sugar-rush-overlay');
        if (overlay) {
            overlay.remove();
        }

        // Remove benefits panel
        this.removeSugarRushBenefitsUI();
    }

    attractCandies(deltaTime) {
        // NOTE: Only attracts COINS, not candy!
        // Candy must be collected manually to maintain Sugar Rush balance
        const playerPos = this.player.getPosition();
        const magnetRadius = this.getSugarRushMagnetRadius(); // Dynamic radius based on level
        const magnetRadiusSq = magnetRadius * magnetRadius;
        const attractSpeed = 20 + this.sugarRushLevel * 5; // Faster at higher levels

        // Attract coins during Sugar Rush
        const collectibles = this.world.getCollectibles();
        for (let i = 0, len = collectibles.length; i < len; i++) {
            const collectible = collectibles[i];
            if (collectible.isCollected) continue;

            const dz = playerPos.z - collectible.position.z;
            if (dz > magnetRadius || dz < -magnetRadius) continue;

            const dx = playerPos.x - collectible.position.x;
            if (dx > magnetRadius || dx < -magnetRadius) continue;

            const distanceSq = dx * dx + dz * dz;
            if (distanceSq < magnetRadiusSq && distanceSq > 0.01) {
                const distance = Math.sqrt(distanceSq);
                const invDist = 1 / distance;
                collectible.position.x += dx * invDist * attractSpeed * deltaTime;
                collectible.position.z += dz * invDist * attractSpeed * deltaTime;
                collectible.group.position.x = collectible.position.x;
                collectible.group.position.z = collectible.position.z;
            }
        }
    }

    createSugarRushSmash(position) {
        // Rainbow colored explosion!
        const particleCount = 16;
        const colors = [0xFF69B4, 0xFFD700, 0x87CEEB, 0x98FB98, 0xDDA0DD, 0xFFB347];

        for (let i = 0; i < particleCount; i++) {
            const color = colors[i % colors.length];
            const particle = this.getParticleFromPool(color);
            if (!particle) continue;

            particle.position.copy(position);

            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 4 + Math.random() * 3;
            particle.userData.velocity = {
                x: Math.cos(angle) * speed,
                y: 3 + Math.random() * 3,
                z: Math.sin(angle) * speed
            };
            particle.userData.rotationSpeed = {
                x: (Math.random() - 0.5) * 12,
                y: (Math.random() - 0.5) * 12,
                z: (Math.random() - 0.5) * 12
            };
            particle.userData.life = 0.8;
            particle.userData.maxLife = 0.8;
            particle.userData.gravity = true;
            particle.userData.shrink = true;
            particle.rotation.set(0, 0, 0);
            particle.scale.set(1.5, 1.5, 1.5);
        }
    }

    animateCandyMeter() {
        const meterFill = document.getElementById('candy-meter-fill');
        if (meterFill) {
            const percent = Math.min((this.candyMeter / this.candyMeterMax) * 100, 100);
            meterFill.style.width = `${percent}%`;

            // Pulse animation on collect
            meterFill.classList.add('candy-pulse');
            setTimeout(() => meterFill.classList.remove('candy-pulse'), 300);
        }
    }

    showSugarRushNotification() {
        // Skip on mobile - benefits panel shows the info
        if (window.innerWidth < 768) return;

        this.clearSugarRushNotifications();

        const config = this.sugarRushConfigs[this.sugarRushLevel] || this.sugarRushConfigs[1];
        const notification = document.createElement('div');
        notification.className = 'sugar-rush-notification';
        notification.innerHTML = `
            <span class="icon">🍭</span>
            <span class="title">${config.name}</span>
            <span class="description">${config.multiplier}x Points!</span>
        `;

        document.body.appendChild(notification);

        // Short display - 1 second then fade
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s';
            setTimeout(() => notification.remove(), 300);
        }, 1000);
    }

    showSugarRushEndNotification() {
        // Skip notification - meter going to 0 and benefits panel disappearing is enough
        // Having a popup in gameplay is too intrusive
    }

    createObstacleExplosion(position) {
        // PERFORMANCE: Use particle pool instead of creating new objects
        const particleCount = 12;

        for (let i = 0; i < particleCount; i++) {
            const color = Math.random() > 0.5 ? 0xFFAA00 : 0xFF6600;
            const particle = this.getParticleFromPool(color);
            if (!particle) continue; // Pool exhausted

            particle.position.copy(position);

            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 3 + Math.random() * 2;
            particle.userData.velocity = {
                x: Math.cos(angle) * speed,
                y: 2 + Math.random() * 2,
                z: Math.sin(angle) * speed
            };
            particle.userData.rotationSpeed = {
                x: (Math.random() - 0.5) * 10,
                y: (Math.random() - 0.5) * 10,
                z: (Math.random() - 0.5) * 10
            };
            particle.userData.life = 0.6;
            particle.userData.maxLife = 0.6;
            particle.userData.gravity = true;
            particle.userData.shrink = false;
            particle.rotation.set(0, 0, 0);
        }
    }

    screenShake(intensity = 0.3, duration = 200) {
        // PERFORMANCE: Use animation queue instead of separate RAF callback
        const camera = this.camera.getCamera();
        const originalX = camera.position.x;
        const originalY = camera.position.y;

        this.animations.push({
            elapsed: 0,
            duration: duration,
            update: (progress) => {
                if (progress >= 1) {
                    camera.position.x = originalX;
                    camera.position.y = originalY;
                    return true; // Animation complete
                }

                const currentIntensity = intensity * (1 - progress);
                camera.position.x = originalX + (Math.random() - 0.5) * currentIntensity;
                camera.position.y = originalY + (Math.random() - 0.5) * currentIntensity;
                return false;
            }
        });
    }

    createFloatingText(text, position, color = 0xFFFFFF) {
        // Create canvas texture with high visibility
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 256;

        // Draw black outline for contrast
        context.font = 'Bold 100px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.strokeStyle = '#000000';
        context.lineWidth = 8;
        context.strokeText(text, 256, 128);

        // Draw colored fill
        context.fillStyle = '#' + color.toString(16).padStart(6, '0');
        context.fillText(text, 256, 128);

        // Add glow effect
        context.shadowColor = '#' + color.toString(16).padStart(6, '0');
        context.shadowBlur = 20;
        context.fillText(text, 256, 128);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMaterial);

        sprite.position.copy(position);
        sprite.position.y += 1.5;
        sprite.scale.set(4, 2, 1); // Bigger scale for visibility

        this.gameScene.getScene().add(sprite);

        const startY = sprite.position.y;
        const startScale = 4;
        const scene = this.gameScene.getScene();

        // Animated pop-up with bounce effect
        this.animations.push({
            elapsed: 0,
            duration: 1200,
            update: (progress) => {
                if (progress >= 1) {
                    scene.remove(sprite);
                    texture.dispose();
                    spriteMaterial.dispose();
                    return true; // Animation complete
                }

                // Bounce up effect in first 20% of animation
                let scale = startScale;
                if (progress < 0.2) {
                    const bounceProgress = progress / 0.2;
                    scale = startScale * (1 + Math.sin(bounceProgress * Math.PI) * 0.3);
                }
                sprite.scale.set(scale, scale / 2, 1);

                // Float upward
                sprite.position.y = startY + progress * 4;

                // Fade out in second half
                if (progress > 0.5) {
                    sprite.material.opacity = 1 - ((progress - 0.5) * 2);
                }

                return false;
            }
        });
    }

    updatePowerUpVisuals(deltaTime) {
        // PERFORMANCE: Use cached frame time instead of Date.now()
        const time = this.frameTime;

        // Animate shield bubble
        if (this.shieldMesh) {
            this.shieldMesh.rotation.y += deltaTime * 2;
            const pulse = Math.sin(time * 0.003) * 0.1 + 0.3;
            this.shieldMesh.material.opacity = pulse;
        }

        // Animate multiplier ring
        if (this.multiplierRing) {
            this.multiplierRing.rotation.z += deltaTime * 3;
            const pulse = Math.sin(time * 0.005) * 0.2 + 0.6;
            this.multiplierRing.material.opacity = pulse;
        }

        // Animate magnet ring
        if (this.magnetRing) {
            this.magnetRing.rotation.z += deltaTime * 4;
            const pulse = Math.sin(time * 0.004) * 0.2 + 0.5;
            this.magnetRing.material.opacity = pulse;
        }

        // PERFORMANCE: Use particle pool for speed trail
        if (this.activePowerUps.has('speed') && this.speedTrailParticles) {
            // Spawn trail particle every few frames using particle pool
            if (Math.random() < 0.3) {
                const playerPos = this.player.getPosition();
                const hue = (time % 1000) / 1000;
                const color = new THREE.Color().setHSL(hue, 1, 0.5);
                const particle = this.getParticleFromPool(color.getHex());

                if (particle) {
                    particle.position.copy(playerPos);
                    particle.position.y += 0.5;
                    particle.userData.life = 0.5;
                    particle.userData.maxLife = 0.5;
                    particle.userData.gravity = false;
                    particle.userData.shrink = true;
                    particle.userData.velocity = { x: 0, y: 0, z: 0 };
                    particle.userData.rotationSpeed = null;
                    particle.scale.set(1, 1, 1);
                    // Use shared speed trail geometry (sphere vs box)
                    if (this.sharedSpeedTrailGeo && particle.geometry !== this.sharedSpeedTrailGeo) {
                        particle.geometry = this.sharedSpeedTrailGeo;
                    }
                }
            }
        }

        // Animate cloud
        if (this.cloudMesh) {
            this.cloudMesh.rotation.y += deltaTime;
            const bob = Math.sin(time * 0.002) * 0.1;
            this.cloudMesh.position.y = -0.5 + bob;
        }

        // Animate Sugar Rush aura (rainbow color cycle!)
        if (this.sugarRushAura && this.isSugarRush) {
            const hue = (time * 0.002) % 1;
            this.sugarRushAura.material.color.setHSL(hue, 1, 0.6);
            this.sugarRushAura.rotation.y += deltaTime * 2;

            // Pulsing size
            const pulse = 1 + Math.sin(time * 0.008) * 0.15;
            this.sugarRushAura.scale.set(pulse, pulse, pulse);

            // Spawn DRAMATIC rainbow trail particles - multiple per frame!
            const playerPos = this.player.getPosition();

            // Spawn 3-5 particles per frame for a thick, visible ribbon trail
            const particlesToSpawn = 3 + Math.floor(Math.random() * 3);
            for (let i = 0; i < particlesToSpawn; i++) {
                // Rainbow colors cycling through spectrum
                const trailHue = ((time * 0.003) + (i * 0.15)) % 1;
                const trailColor = new THREE.Color().setHSL(trailHue, 1, 0.6);
                const particle = this.getParticleFromPool(trailColor.getHex());

                if (particle) {
                    // Spread particles in a wider area behind player for ribbon effect
                    const spreadX = (Math.random() - 0.5) * 1.5;
                    const spreadY = Math.random() * 1.2;
                    const offsetZ = 0.3 + Math.random() * 0.6; // Behind player

                    particle.position.set(
                        playerPos.x + spreadX,
                        playerPos.y + 0.3 + spreadY,
                        playerPos.z + offsetZ
                    );
                    particle.userData.life = 0.8; // Longer life for longer trail
                    particle.userData.maxLife = 0.8;
                    particle.userData.gravity = false;
                    particle.userData.shrink = true;
                    particle.userData.velocity = {
                        x: spreadX * 0.5, // Drift outward slightly
                        y: 0.3 + Math.random() * 0.5,
                        z: 2 + Math.random() // Trail behind
                    };
                    particle.userData.rotationSpeed = null;
                    // Larger particles for more visibility
                    const size = 1.5 + Math.random() * 1.0;
                    particle.scale.set(size, size, size);
                }
            }

            // Also spawn some sparkle stars in the trail
            if (Math.random() < 0.3) {
                const sparkleHue = Math.random();
                const sparkleColor = new THREE.Color().setHSL(sparkleHue, 1, 0.8);
                const sparkle = this.getParticleFromPool(sparkleColor.getHex());

                if (sparkle) {
                    sparkle.position.set(
                        playerPos.x + (Math.random() - 0.5) * 2,
                        playerPos.y + Math.random() * 1.5,
                        playerPos.z + 0.5 + Math.random()
                    );
                    sparkle.userData.life = 0.5;
                    sparkle.userData.maxLife = 0.5;
                    sparkle.userData.gravity = false;
                    sparkle.userData.shrink = false; // Stay same size then pop
                    sparkle.userData.velocity = { x: 0, y: 1, z: 3 };
                    sparkle.userData.rotationSpeed = 10; // Spin fast
                    sparkle.scale.set(0.8, 0.8, 0.8);
                }
            }
        }
    }

    checkCollisions() {
        const playerPos = this.player.getPosition();

        // IMPORTANT: Check power-ups FIRST before obstacles
        // This ensures shields/power-ups collected in the same frame can protect you
        const powerUps = this.world.getPowerUps();
        for (const powerUp of powerUps) {
            if (!powerUp.isCollected && this.checkCollision(playerPos, powerUp.getBoundingBox())) {
                // Collect the power-up
                const type = powerUp.collect();
                this.activatePowerUp(type);

                // Play power-up sound
                this.audio.playPowerUpSound();
            }
        }

        // Check collectible collisions (coins, gems)
        const collectibles = this.world.getCollectibles();
        for (const collectible of collectibles) {
            if (!collectible.isCollected && this.checkCollision(playerPos, collectible.getBoundingBox())) {
                // Collect the item
                const value = collectible.collect();
                // Apply Sugar Rush level multiplier if active
                const sugarMultiplier = this.getSugarRushMultiplier();
                const activeMultiplier = this.coinMultiplier * sugarMultiplier;
                this.coins += value * activeMultiplier;
                this.score += value * 10 * activeMultiplier;

                // Play appropriate sound
                if (collectible.type === 'coin') {
                    this.audio.playCoinSound();
                } else {
                    this.audio.playGemSound();
                }
            }
        }

        // Check candy collisions - fill Sugar Rush meter!
        const candies = this.world.getCandies();
        for (const candy of candies) {
            if (!candy.isCollected && this.checkCollision(playerPos, candy.getBoundingBox())) {
                // Collect the candy
                const meterValue = candy.collect();
                this.addToSugarMeter(meterValue);
                this.candyCollected++;

                // Play sweet candy pop sound!
                this.audio.playCandySound();

                // Bonus score for candy - scales with Sugar Rush level
                const sugarMultiplier = this.getSugarRushMultiplier();
                const candyScoreBonus = meterValue * 2 * sugarMultiplier;
                this.score += candyScoreBonus;
            }
        }

        // Skip obstacle collisions if flying, giant, or Sugar Rush level 3 (MEGA only is invincible!)
        const isFlyingOrGiant = this.activePowerUps.has('flight') || this.activePowerUps.has('giant');
        const isInvincible = isFlyingOrGiant || this.isSugarRushInvincible();

        // Track if shield was consumed this frame to prevent multiple hits
        let shieldConsumedThisFrame = false;

        // Skip collision checks if invincible (after shield breaks)
        if (this.invincibilityTimer > 0) {
            return; // Still invincible, no collision damage
        }

        // Check obstacle collisions
        const obstacles = this.world.getObstacles();
        for (const obstacle of obstacles) {
            // Skip obstacles already being destroyed
            if (obstacle.isBeingDestroyed) continue;

            if (this.checkCollision(playerPos, obstacle.getBoundingBox())) {
                // Giant mode: smash through obstacles with bouncy animation!
                if (this.activePowerUps.has('giant')) {
                    this.smashStaticObstacle(obstacle, false);
                    this.score += 50; // Bonus points

                    // Visual feedback
                    this.audio.playGemSound();
                    this.createFloatingText('+50', obstacle.getPosition(), 0xFFAA00);

                    continue;
                }

                // MEGA Sugar Rush (level 3): smash through obstacles with rainbow explosion!
                if (this.isSugarRushInvincible()) {
                    this.smashStaticObstacle(obstacle, true);
                    this.score += 100; // Big bonus for MEGA Sugar Rush!

                    // Visual feedback
                    this.audio.playGemSound();
                    this.createFloatingText('+100', obstacle.getPosition(), 0xFF69B4);

                    continue;
                }

                // Flight mode: float above obstacles
                if (this.activePowerUps.has('flight')) {
                    continue;
                }

                // Shield: protect once then remove
                if (this.hasShield) {
                    this.deactivatePowerUp('shield');
                    this.audio.playShieldBreakSound();
                    this.invincibilityTimer = 1.0; // 1 second of invincibility after shield breaks
                    shieldConsumedThisFrame = true;
                    break; // Exit loop to prevent multiple hits in same frame
                }

                // Hit an obstacle - trigger death effects and play animation
                if (this.isRunning) {
                    this.isRunning = false; // Stop game immediately

                    // Trigger all death screen effects
                    this.triggerDeathEffects();

                    // Play enhanced death animation, then spin camera to face
                    this.player.playDeathAnimation(() => {
                        // Start dramatic camera spin to face close-up
                        const playerPos = this.player.getPosition();
                        this.camera.startDeathCamera(playerPos, () => {
                            // Show game over screen after camera spin completes
                            this.gameOver();
                        });
                    });
                }
                return;
            }
        }

        // Check moving object collisions (cars, buses, etc.)
        const movingObstacles = this.gameScene.getMovingObstacles();
        for (const movingObj of movingObstacles) {
            // Skip if already destroyed
            if (movingObj.userData.isDestroyed) continue;

            const boundingBox = {
                center: movingObj.position,
                radius: movingObj.userData.collisionRadius,
                height: movingObj.userData.obstacleHeight
            };

            if (this.checkCollision(playerPos, boundingBox)) {
                // Giant mode: SMASH cars with bouncy explosion!
                if (this.activePowerUps.has('giant')) {
                    this.smashMovingObstacle(movingObj);
                    this.score += 75; // Bonus for smashing cars!
                    this.audio.playGemSound();
                    this.createFloatingText('+75', movingObj.position, 0xFFAA00);
                    continue;
                }

                // MEGA Sugar Rush (level 3): SMASH cars with rainbow explosion!
                if (this.isSugarRushInvincible()) {
                    this.smashMovingObstacle(movingObj);
                    this.score += 125; // Big bonus for MEGA Sugar Rush!
                    this.audio.playGemSound();
                    this.createFloatingText('+125', movingObj.position, 0xFF69B4);
                    continue;
                }

                // Flight mode: float above
                if (this.activePowerUps.has('flight')) {
                    continue;
                }

                // Skip if shield was consumed this frame
                if (shieldConsumedThisFrame) continue;

                // Shield: protect once then remove
                if (this.hasShield) {
                    this.deactivatePowerUp('shield');
                    this.audio.playShieldBreakSound();
                    this.invincibilityTimer = 1.0; // 1 second of invincibility after shield breaks
                    break; // Exit loop to prevent multiple hits
                }

                // Still invincible from shield break
                if (this.invincibilityTimer > 0) continue;

                // Hit a moving obstacle - trigger death effects and play animation
                if (this.isRunning) {
                    this.isRunning = false; // Stop game immediately

                    // Trigger all death screen effects
                    this.triggerDeathEffects();

                    // Play enhanced death animation, then spin camera to face
                    this.player.playDeathAnimation(() => {
                        // Start dramatic camera spin to face close-up
                        const playerPos = this.player.getPosition();
                        this.camera.startDeathCamera(playerPos, () => {
                            // Show game over screen after camera spin completes
                            this.gameOver();
                        });
                    });
                }
                return;
            }
        }
    }

    // Smash a moving obstacle (car/bus) with bouncy explosion effect
    smashMovingObstacle(movingObj) {
        movingObj.userData.isDestroyed = true;

        const position = movingObj.position.clone();

        // Animate the car bouncing up and spinning away
        const startY = movingObj.position.y;
        const startTime = performance.now();
        const duration = 800; // 0.8 seconds

        const animateSmash = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Bounce up with gravity curve
            const bounceHeight = 4 * progress * (1 - progress) * 6; // Parabola peaking at 6 units
            movingObj.position.y = startY + bounceHeight;

            // Spin wildly
            movingObj.rotation.x += 0.3;
            movingObj.rotation.z += 0.2;

            // Fly away from player
            movingObj.position.z += 0.3;
            movingObj.position.x += (Math.random() - 0.5) * 0.2;

            // Shrink as it flies away
            const scale = 1 - progress * 0.8;
            movingObj.scale.set(scale, scale, scale);

            // Fade out
            movingObj.traverse((child) => {
                if (child.material) {
                    child.material.transparent = true;
                    child.material.opacity = 1 - progress;
                }
            });

            if (progress < 1) {
                requestAnimationFrame(animateSmash);
            } else {
                // Remove from scene
                if (movingObj.parent) {
                    movingObj.parent.remove(movingObj);
                }
            }
        };

        animateSmash();

        // Create colorful explosion particles
        this.createCarSmashExplosion(position);
    }

    // Colorful bouncy explosion for smashing cars
    createCarSmashExplosion(position) {
        const particleCount = 20;
        const colors = [0xFF6B6B, 0xFFE66D, 0x4ECDC4, 0xFF69B4, 0xFFD700, 0x87CEEB];

        for (let i = 0; i < particleCount; i++) {
            const color = colors[i % colors.length];
            const particle = this.getParticleFromPool(color);
            if (!particle) continue;

            particle.position.copy(position);
            particle.position.y += 0.5;

            // Explode outward in all directions
            const angle = (i / particleCount) * Math.PI * 2;
            const upAngle = Math.random() * Math.PI * 0.5; // Mostly upward
            const speed = 5 + Math.random() * 4;

            particle.userData.velocity = {
                x: Math.cos(angle) * Math.cos(upAngle) * speed,
                y: Math.sin(upAngle) * speed + 2,
                z: Math.sin(angle) * Math.cos(upAngle) * speed
            };
            particle.userData.rotationSpeed = {
                x: (Math.random() - 0.5) * 15,
                y: (Math.random() - 0.5) * 15,
                z: (Math.random() - 0.5) * 15
            };
            particle.userData.life = 1.0;
            particle.userData.maxLife = 1.0;
            particle.userData.gravity = true;
            particle.userData.shrink = true;
            particle.rotation.set(0, 0, 0);
            particle.scale.set(1.8, 1.8, 1.8); // Bigger particles for impact
        }
    }

    // Smash a static obstacle with bouncy animation (for Giant and Sugar Rush modes)
    smashStaticObstacle(obstacle, isRainbow = false) {
        // Mark as being destroyed (prevents re-collision)
        obstacle.isBeingDestroyed = true;

        const obstacleGroup = obstacle.group;
        const position = obstacle.getPosition().clone();

        // Animate the obstacle bouncing up and spinning away
        const startY = obstacleGroup.position.y;
        const startTime = performance.now();
        const duration = 600; // 0.6 seconds

        const animateSmash = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Bounce up with gravity curve
            const bounceHeight = 4 * progress * (1 - progress) * 5; // Parabola peaking at 5 units
            obstacleGroup.position.y = startY + bounceHeight;

            // Spin wildly
            obstacleGroup.rotation.x += 0.25;
            obstacleGroup.rotation.z += 0.15;
            obstacleGroup.rotation.y += 0.2;

            // Fly away from player (backwards)
            obstacleGroup.position.z += 0.2;

            // Shrink as it flies away
            const scale = 1 - progress * 0.9;
            obstacleGroup.scale.set(scale, scale, scale);

            // Fade out
            obstacleGroup.traverse((child) => {
                if (child.material) {
                    child.material.transparent = true;
                    child.material.opacity = 1 - progress;
                }
            });

            if (progress < 1) {
                requestAnimationFrame(animateSmash);
            } else {
                // Now mark as inactive so World can clean it up
                obstacle.isActive = false;
            }
        };

        animateSmash();

        // Create appropriate explosion effect
        if (isRainbow) {
            this.createSugarRushSmash(position);
        } else {
            this.createObstacleExplosion(position);
        }
    }

    checkCollision(playerPos, objectBox) {
        // PERFORMANCE: Use squared distance (no sqrt needed)
        const dx = playerPos.x - objectBox.center.x;
        const dz = playerPos.z - objectBox.center.z;
        const distanceSquared = dx * dx + dz * dz;

        // Player radius + object radius (squared for comparison)
        const collisionDistance = 0.4 + objectBox.radius;
        const collisionDistanceSquared = collisionDistance * collisionDistance;

        // Not close enough to collide
        if (distanceSquared > collisionDistanceSquared) {
            return false;
        }

        // Check if player is avoiding obstacle
        if (objectBox.height) {
            // LOW obstacles (1.0-1.6): Can jump over with single jump
            if (objectBox.height >= 1.0 && objectBox.height < 2.0) {
                if (this.player.isJumping && playerPos.y > objectBox.height + 0.3) {
                    return false; // Jumped over successfully
                }
                return true; // Hit the low obstacle
            }
            // TALL obstacles (2.0-3.5): Need double jump OR can slide under
            else if (objectBox.height >= 2.0) {
                // Can slide under tall obstacles
                if (this.player.isSliding) {
                    return false; // Slid under successfully
                }
                // Can double jump over tall obstacles (need to be really high!)
                if (this.player.isJumping && this.player.jumpCount === 2 && playerPos.y > objectBox.height + 0.5) {
                    return false; // Double jumped over successfully!
                }
                return true; // Hit the tall obstacle
            }
        }

        return true; // Hit something
    }

    updateHUD() {
        // PERFORMANCE: Throttle HUD updates - skip if updated recently
        const now = this.frameTime;
        if (now - this.lastHUDUpdate < this.hudUpdateInterval) {
            return;
        }
        this.lastHUDUpdate = now;

        // PERFORMANCE: Use cached DOM elements
        this.domElements.score.textContent = Math.floor(this.score);
        this.domElements.coins.textContent = this.coins;
        this.domElements.candies.textContent = this.candyCollected;
        this.domElements.distance.textContent = Math.floor(this.distance) + 'm';

        // Update power-up indicators
        this.updatePowerUpHUD();

        // Update candy meter
        this.updateCandyMeterHUD();
    }

    updatePowerUpHUD() {
        // PERFORMANCE: Inject styles only once
        if (!this.domElements.powerUpStylesInjected) {
            const style = document.createElement('style');
            style.id = 'power-up-styles';
            style.textContent = `
                .power-up-indicator {
                    background: rgba(255, 255, 255, 0.9);
                    color: #333;
                    padding: 8px 15px;
                    border-radius: 20px;
                    font-weight: bold;
                    font-size: 16px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                    animation: powerUpPulse 0.5s ease-in-out infinite alternate;
                }
                @keyframes powerUpPulse {
                    from { transform: scale(1); }
                    to { transform: scale(1.05); }
                }
                @media (max-width: 600px) {
                    .power-up-indicator {
                        padding: 4px 8px;
                        font-size: 12px;
                        border-radius: 12px;
                    }
                    #power-up-display {
                        top: 60px !important;
                        right: 5px !important;
                    }
                }
                .power-up-notification {
                    position: fixed;
                    top: 120px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 20px 40px;
                    border-radius: 15px;
                    font-weight: bold;
                    font-size: 24px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    z-index: 1000;
                    animation: notificationSlideIn 0.5s ease-out;
                    text-align: center;
                }
                .power-up-notification .icon {
                    font-size: 48px;
                    display: block;
                    margin-bottom: 10px;
                }
                .power-up-notification .title {
                    font-size: 28px;
                    margin-bottom: 5px;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                }
                .power-up-notification .description {
                    font-size: 18px;
                    opacity: 0.9;
                }
                @keyframes notificationSlideIn {
                    from {
                        transform: translateX(-50%) scale(0.5);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(-50%) scale(1);
                        opacity: 1;
                    }
                }
                /* Mobile: compact notification at bottom corner */
                @media (max-width: 600px) {
                    .power-up-notification {
                        top: auto;
                        bottom: 20px;
                        left: auto;
                        right: 10px;
                        transform: none;
                        padding: 10px 15px;
                        border-radius: 10px;
                        font-size: 14px;
                        animation: mobileSlideIn 0.3s ease-out;
                    }
                    .power-up-notification .icon {
                        font-size: 24px;
                        display: inline;
                        margin-bottom: 0;
                        margin-right: 8px;
                    }
                    .power-up-notification .title {
                        font-size: 16px;
                        display: inline;
                        margin-bottom: 0;
                    }
                    .power-up-notification .description {
                        display: none;
                    }
                    @keyframes mobileSlideIn {
                        from {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }
                }
            `;
            document.head.appendChild(style);
            this.domElements.powerUpStylesInjected = true;
        }

        // PERFORMANCE: Create power-up display only once
        if (!this.domElements.powerUpDisplay) {
            let powerUpDisplay = document.getElementById('power-up-display');
            if (!powerUpDisplay) {
                powerUpDisplay = document.createElement('div');
                powerUpDisplay.id = 'power-up-display';
                powerUpDisplay.style.cssText = `
                    position: fixed;
                    top: 80px;
                    right: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                    z-index: 100;
                `;
                document.body.appendChild(powerUpDisplay);
            }
            this.domElements.powerUpDisplay = powerUpDisplay;
            this.domElements.powerUpElements = new Map(); // Cache individual elements
        }

        const icons = {
            'magnet': '🧲',
            'shield': '🛡️',
            'speed': '⚡',
            'multiplier': '✨',
            'flight': '🎈',
            'giant': '🍄'
        };

        // PERFORMANCE: Update existing elements instead of rebuilding innerHTML
        const currentTypes = new Set(this.activePowerUps.keys());
        const cachedElements = this.domElements.powerUpElements;

        // Remove elements for inactive power-ups
        for (const [type, elem] of cachedElements) {
            if (!currentTypes.has(type)) {
                elem.remove();
                cachedElements.delete(type);
            }
        }

        // Update or create elements for active power-ups
        for (const [type, data] of this.activePowerUps) {
            const timeLeft = Math.ceil(data.duration);
            let elem = cachedElements.get(type);

            if (!elem) {
                // Create new element
                elem = document.createElement('div');
                elem.className = 'power-up-indicator';
                this.domElements.powerUpDisplay.appendChild(elem);
                cachedElements.set(type, elem);
            }

            // PERFORMANCE: Only update textContent (no innerHTML parsing)
            elem.textContent = `${icons[type]} ${timeLeft}s`;
        }
    }

    updateCandyMeterHUD() {
        // Create candy meter container if it doesn't exist
        if (!this.domElements.candyMeter) {
            // Inject candy meter styles
            if (!document.getElementById('candy-meter-styles')) {
                const style = document.createElement('style');
                style.id = 'candy-meter-styles';
                style.textContent = `
                    #candy-meter-container {
                        position: fixed;
                        bottom: 20px;
                        left: 50%;
                        transform: translateX(-50%);
                        width: 200px;
                        z-index: 500;
                        text-align: center;
                    }
                    #candy-meter-label {
                        font-family: 'Comic Sans MS', 'Arial', sans-serif;
                        font-size: 14px;
                        font-weight: bold;
                        color: #FF69B4;
                        text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
                        margin-bottom: 5px;
                    }
                    #candy-meter-bar {
                        width: 100%;
                        height: 20px;
                        background: rgba(255, 255, 255, 0.7);
                        border-radius: 15px;
                        overflow: hidden;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.2), inset 0 2px 4px rgba(0,0,0,0.1);
                        border: 2px solid #FF69B4;
                    }
                    #candy-meter-fill {
                        height: 100%;
                        width: 0%;
                        background: linear-gradient(90deg,
                            #FF69B4 0%,
                            #FFD700 25%,
                            #87CEEB 50%,
                            #98FB98 75%,
                            #FF69B4 100%);
                        background-size: 200% 100%;
                        animation: candyGradient 2s linear infinite;
                        border-radius: 12px;
                        transition: width 0.3s ease-out;
                    }
                    @keyframes candyGradient {
                        0% { background-position: 0% 50%; }
                        100% { background-position: 200% 50%; }
                    }
                    .candy-pulse {
                        animation: candyPulse 0.3s ease-out !important;
                    }
                    @keyframes candyPulse {
                        0% { transform: scaleY(1); }
                        50% { transform: scaleY(1.3); }
                        100% { transform: scaleY(1); }
                    }
                    #sugar-rush-timer {
                        position: fixed;
                        bottom: 75px;
                        left: 50%;
                        transform: translateX(-50%);
                        font-family: 'Comic Sans MS', 'Arial', sans-serif;
                        font-size: 18px;
                        font-weight: bold;
                        color: #FF69B4;
                        text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                        background: rgba(255,255,255,0.85);
                        padding: 6px 15px;
                        border-radius: 20px;
                        border: 2px solid #FF69B4;
                        white-space: nowrap;
                    }
                    .sugar-rush-notification {
                        position: fixed;
                        top: 120px;
                        left: 50%;
                        transform: translateX(-50%);
                        background: linear-gradient(135deg, #FF69B4 0%, #FFD700 50%, #87CEEB 100%);
                        color: white;
                        padding: 15px 30px;
                        border-radius: 15px;
                        font-weight: bold;
                        font-size: 18px;
                        box-shadow: 0 6px 20px rgba(0,0,0,0.3);
                        z-index: 999;
                        animation: notificationSlideIn 0.3s ease-out;
                        text-align: center;
                    }
                    .sugar-rush-notification .icon {
                        font-size: 32px;
                        display: block;
                        margin-bottom: 5px;
                    }
                    .sugar-rush-notification .title {
                        font-size: 22px;
                        text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                        margin-bottom: 3px;
                    }
                    .sugar-rush-notification .description {
                        font-size: 14px;
                        opacity: 0.9;
                    }
                    .sugar-rush-end-notification {
                        position: fixed;
                        top: 120px;
                        left: 50%;
                        transform: translateX(-50%);
                        background: rgba(100, 100, 100, 0.9);
                        color: white;
                        padding: 12px 25px;
                        border-radius: 10px;
                        font-family: 'Comic Sans MS', 'Arial', sans-serif;
                        font-size: 16px;
                        font-weight: bold;
                        z-index: 999;
                        animation: notificationSlideIn 0.3s ease-out;
                    }
                    @media (max-width: 600px) {
                        #candy-meter-container {
                            width: 150px;
                            bottom: 15px;
                        }
                        #candy-meter-label {
                            font-size: 11px;
                        }
                        #candy-meter-bar {
                            height: 14px;
                        }
                        #sugar-rush-timer {
                            font-size: 12px;
                            bottom: 60px;
                            padding: 4px 10px;
                        }
                        .sugar-rush-notification {
                            top: auto;
                            bottom: 70px;
                            left: auto;
                            right: 10px;
                            transform: none;
                            padding: 8px 12px;
                            border-radius: 8px;
                            font-size: 12px;
                            animation: mobileSlideIn 0.3s ease-out;
                        }
                        .sugar-rush-notification .icon {
                            font-size: 18px;
                            display: inline;
                            margin-bottom: 0;
                            margin-right: 5px;
                        }
                        .sugar-rush-notification .title {
                            font-size: 13px;
                            display: inline;
                            margin-bottom: 0;
                        }
                        .sugar-rush-notification .description {
                            display: none;
                        }
                        .sugar-rush-end-notification {
                            top: auto;
                            bottom: 70px;
                            left: auto;
                            right: 10px;
                            transform: none;
                            padding: 8px 12px;
                            font-size: 12px;
                            animation: mobileSlideIn 0.3s ease-out;
                        }
                    }
                `;
                document.head.appendChild(style);
            }

            // Create candy meter container
            const container = document.createElement('div');
            container.id = 'candy-meter-container';
            container.innerHTML = `
                <div id="candy-meter-label">🍭 Sugar Rush 🍬</div>
                <div id="candy-meter-bar">
                    <div id="candy-meter-fill"></div>
                </div>
            `;
            document.body.appendChild(container);
            this.domElements.candyMeter = container;
            this.domElements.candyMeterFill = document.getElementById('candy-meter-fill');
        }

        // Update meter fill - shows actual decay during Sugar Rush!
        if (this.domElements.candyMeterFill) {
            // Show actual meter value - during Sugar Rush this drains and must be refilled
            const maxValue = this.isSugarRush ? 100 : this.candyMeterMax; // Use 100 as max during Sugar Rush
            const percent = Math.min((this.candyMeter / maxValue) * 100, 100);
            // Always show at least 2% so bar is visible when low
            this.domElements.candyMeterFill.style.width = `${Math.max(percent, this.candyMeter > 0 ? 2 : 0)}%`;

            // Change color based on urgency during Sugar Rush
            if (this.isSugarRush) {
                const config = this.sugarRushConfigs[this.sugarRushLevel];
                const threshold = config ? config.meterThreshold : 0;
                if (this.candyMeter < threshold + 15) {
                    // Warning - close to level down!
                    this.domElements.candyMeterFill.style.background = 'linear-gradient(90deg, #FF4444 0%, #FF6B6B 50%, #FF4444 100%)';
                } else {
                    // Normal rainbow gradient
                    this.domElements.candyMeterFill.style.background = 'linear-gradient(90deg, #FF69B4 0%, #FFD700 25%, #87CEEB 50%, #98FB98 75%, #FF69B4 100%)';
                }
            }
        }

        // Update meter label to show decay percentage during Sugar Rush
        const meterLabel = document.getElementById('candy-meter-label');
        if (meterLabel) {
            if (this.isSugarRush) {
                const percent = Math.round(this.candyMeter);
                meterLabel.textContent = `🍭 ${percent}% 🍬`;
            } else if (this.sugarRushCooldown > 0) {
                meterLabel.textContent = `🍭 Cooldown ${Math.ceil(this.sugarRushCooldown)}s 🍬`;
            } else {
                meterLabel.textContent = '🍭 Sugar Rush 🍬';
            }
        }

        // Show/hide Sugar Rush timer
        if (this.isSugarRush) {
            if (!this.domElements.sugarRushTimer) {
                const timer = document.createElement('div');
                timer.id = 'sugar-rush-timer';
                document.body.appendChild(timer);
                this.domElements.sugarRushTimer = timer;
            }
            const config = this.sugarRushConfigs[this.sugarRushLevel];
            const levelIndicator = '⭐'.repeat(this.sugarRushLevel);
            this.domElements.sugarRushTimer.textContent = `${levelIndicator} ${config.name} ${levelIndicator}`;
            this.domElements.sugarRushTimer.style.display = 'block';

            // Always show candy meter during Sugar Rush so player sees the decay!
            if (this.domElements.candyMeter) {
                this.domElements.candyMeter.style.display = 'block';
            }
        } else {
            // Hide timer when not in Sugar Rush
            if (this.domElements.sugarRushTimer) {
                this.domElements.sugarRushTimer.style.display = 'none';
            }
            // Show candy meter and reset color
            if (this.domElements.candyMeter) {
                this.domElements.candyMeter.style.display = 'block';
            }
            if (this.domElements.candyMeterFill) {
                // Reset to normal rainbow gradient
                this.domElements.candyMeterFill.style.background = 'linear-gradient(90deg, #FF69B4 0%, #FFD700 25%, #87CEEB 50%, #98FB98 75%, #FF69B4 100%)';
            }
        }
    }

    showPowerUpNotification(type, message) {
        const icons = {
            'magnet': '🧲',
            'shield': '🛡️',
            'speed': '⚡',
            'multiplier': '✨',
            'flight': '🎈',
            'giant': '🍄'
        };

        const titles = {
            'magnet': 'COIN MAGNET',
            'shield': 'SHIELD',
            'speed': 'SUPER SPEED',
            'multiplier': '2X MULTIPLIER',
            'flight': 'FLIGHT MODE',
            'giant': 'GIANT MODE'
        };

        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'power-up-notification';
        notification.innerHTML = `
            <span class="icon">${icons[type]}</span>
            <div class="title">${titles[type]}</div>
            <div class="description">${message}</div>
        `;

        document.body.appendChild(notification);

        // Remove after 2 seconds
        setTimeout(() => {
            notification.style.animation = 'notificationSlideIn 0.3s ease-out reverse';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 2000);
    }

    render() {
        requestAnimationFrame(() => this.render());

        // Calculate delta time
        const currentTime = performance.now();
        const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.033); // Cap at 33ms (~30 FPS min) to prevent skipping
        this.lastTime = currentTime;

        // PERFORMANCE: Cache frame time for all systems (avoids Date.now() calls)
        this.frameTime = currentTime;

        // Update FPS counter
        this.frameCount++;
        this.fpsUpdateTime += deltaTime;
        if (this.fpsUpdateTime >= 0.5) { // Update FPS display every 0.5 seconds
            this.currentFPS = Math.round(this.frameCount / this.fpsUpdateTime);
            this.domElements.fps.textContent = this.currentFPS;
            this.frameCount = 0;
            this.fpsUpdateTime = 0;
        }

        // PERFORMANCE: Update all animations in one pass (no separate RAF callbacks)
        this.updateAnimations(deltaTime);

        // Update game
        this.update(deltaTime);

        // Update death camera even when game is not running
        // This ensures the dramatic camera spin animation plays after death
        if (this.camera.isDeathCamera) {
            this.camera.update(this.player.getPosition());
            // Keep dizzy stars swirling during death screen
            this.updateDizzyStars();
        }

        // Render scene
        this.gameScene.render(this.camera.getCamera());
    }

    handleResize() {
        this.camera.handleResize();
        this.gameScene.handleResize();
    }

    // PERFORMANCE: Initialize shared geometries and materials (reuse instead of recreate)
    initSharedResources() {
        // Shared particle geometry for explosions
        this.sharedParticleGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
        this.sharedSpeedTrailGeo = new THREE.SphereGeometry(0.15, 6, 6);

        // Pre-create particle pool
        for (let i = 0; i < this.maxPoolSize; i++) {
            const particle = new THREE.Mesh(
                this.sharedParticleGeo,
                new THREE.MeshBasicMaterial({ transparent: true, opacity: 1 })
            );
            particle.visible = false;
            particle.userData = { active: false, velocity: { x: 0, y: 0, z: 0 }, life: 0, maxLife: 0 };
            this.particlePool.push(particle);
            this.gameScene.getScene().add(particle);
        }
    }

    // PERFORMANCE: Get particle from pool instead of creating new one
    getParticleFromPool(color) {
        for (let i = 0; i < this.particlePool.length; i++) {
            const p = this.particlePool[i];
            if (!p.userData.active) {
                p.userData.active = true;
                p.visible = true;
                p.material.color.setHex(color);
                p.material.opacity = 1;
                p.scale.set(1, 1, 1);
                this.activeParticles.push(p);
                return p;
            }
        }
        return null; // Pool exhausted
    }

    // PERFORMANCE: Return particle to pool
    returnParticleToPool(particle) {
        particle.userData.active = false;
        particle.visible = false;
        const idx = this.activeParticles.indexOf(particle);
        if (idx !== -1) {
            this.activeParticles.splice(idx, 1);
        }
    }

    // PERFORMANCE: Update all animations in one place (no separate RAF callbacks)
    updateAnimations(deltaTime) {
        // Update active particles
        for (let i = this.activeParticles.length - 1; i >= 0; i--) {
            const p = this.activeParticles[i];
            p.userData.life -= deltaTime;

            if (p.userData.life <= 0) {
                this.returnParticleToPool(p);
                continue;
            }

            // Update position
            p.position.x += p.userData.velocity.x * deltaTime;
            p.position.y += p.userData.velocity.y * deltaTime;
            p.position.z += p.userData.velocity.z * deltaTime;

            // Apply gravity if flagged
            if (p.userData.gravity) {
                p.userData.velocity.y -= 15 * deltaTime;
            }

            // Update rotation if flagged
            if (p.userData.rotationSpeed) {
                p.rotation.x += p.userData.rotationSpeed.x * deltaTime;
                p.rotation.y += p.userData.rotationSpeed.y * deltaTime;
                p.rotation.z += p.userData.rotationSpeed.z * deltaTime;
            }

            // Fade out
            const lifeRatio = p.userData.life / p.userData.maxLife;
            p.material.opacity = lifeRatio;

            // Shrink if flagged
            if (p.userData.shrink) {
                const scale = lifeRatio;
                p.scale.set(scale, scale, scale);
            }
        }

        // Update queued animations (screen shake, floating text, etc.)
        for (let i = this.animations.length - 1; i >= 0; i--) {
            const anim = this.animations[i];
            anim.elapsed += deltaTime * 1000; // Convert to ms for compatibility
            const progress = Math.min(anim.elapsed / anim.duration, 1);

            if (anim.update(progress, deltaTime)) {
                // Animation complete
                if (anim.onComplete) anim.onComplete();
                this.animations.splice(i, 1);
            }
        }
    }

    // ============================================
    // DEATH ANIMATION EFFECTS
    // ============================================

    triggerDeathEffects() {
        const playerPos = this.player.getPosition();

        // Hide HUD during death camera for unobstructed view
        const hud = document.getElementById('hud');
        if (hud) {
            hud.style.opacity = '0';
            hud.style.transition = 'opacity 0.3s ease-out';
        }

        // Hide power-up display during death
        if (this.domElements.powerUpDisplay) {
            this.domElements.powerUpDisplay.style.opacity = '0';
        }

        // Hide candy meter and sugar rush timer during death
        if (this.domElements.candyMeter) {
            this.domElements.candyMeter.style.opacity = '0';
        }
        if (this.domElements.sugarRushTimer) {
            this.domElements.sugarRushTimer.style.display = 'none';
        }

        // End Sugar Rush if active
        if (this.isSugarRush) {
            this.removeSugarRushEffects();
            this.isSugarRush = false;
            this.sugarRushLevel = 0;
        }

        // Screen flash
        this.screenFlash();

        // Screen shake
        this.screenShake();

        // Particle burst from character
        this.createDeathParticles(playerPos);

        // Comic impact text
        this.showImpactText();

        // Create persistent dizzy stars that orbit until restart
        this.createDizzyStars(playerPos);
    }

    createDizzyStars(playerPos) {
        // Clean up any existing stars
        this.cleanupDizzyStars();

        const starCount = 5;
        const starGeometry = new THREE.OctahedronGeometry(0.12, 0);
        const starColors = [0xFFD700, 0xFFFFFF, 0xFF69B4, 0x87CEEB, 0xFFB6C1];

        for (let i = 0; i < starCount; i++) {
            const starMaterial = new THREE.MeshStandardMaterial({
                color: starColors[i % starColors.length],
                emissive: starColors[i % starColors.length],
                emissiveIntensity: 0.8,
                flatShading: true,
            });
            const star = new THREE.Mesh(starGeometry, starMaterial);
            star.userData.index = i;
            star.userData.orbitOffset = (i * Math.PI * 2) / starCount;
            this.gameScene.getScene().add(star);
            this.dizzyStars.push(star);
        }

        // Store player position for orbit center
        this.dizzyStarsCenter = playerPos.clone();
        this.dizzyStarsStartTime = performance.now();
    }

    updateDizzyStars() {
        if (this.dizzyStars.length === 0) return;

        const elapsed = (performance.now() - this.dizzyStarsStartTime) * 0.003;
        const playerPos = this.player.getPosition();

        // Update orbit center to follow player (in case of death animation movement)
        const centerY = playerPos.y + 1.8; // Above head

        this.dizzyStars.forEach((star, i) => {
            const angle = elapsed + star.userData.orbitOffset;
            const orbitRadius = 0.6;

            star.position.set(
                playerPos.x + Math.cos(angle) * orbitRadius,
                centerY + Math.sin(elapsed * 2 + i) * 0.15, // Bobbing
                playerPos.z + Math.sin(angle) * orbitRadius
            );

            // Spin the stars
            star.rotation.y = elapsed * 3;
            star.rotation.z = elapsed * 2;
        });
    }

    cleanupDizzyStars() {
        this.dizzyStars.forEach(star => {
            this.gameScene.getScene().remove(star);
            star.geometry.dispose();
            star.material.dispose();
        });
        this.dizzyStars = [];
    }

    screenFlash() {
        // Create white flash overlay
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: white;
            opacity: 0.8;
            pointer-events: none;
            z-index: 9999;
            transition: opacity 0.3s ease-out;
        `;
        document.body.appendChild(flash);

        // Fade out and remove
        requestAnimationFrame(() => {
            flash.style.opacity = '0';
            setTimeout(() => flash.remove(), 300);
        });
    }

    screenShake() {
        const camera = this.camera.getCamera();
        const originalPosition = camera.position.clone();
        const intensity = 0.3;
        const duration = 400;
        const startTime = performance.now();

        const shake = () => {
            const elapsed = performance.now() - startTime;
            const progress = elapsed / duration;

            if (progress < 1) {
                // Decreasing intensity shake
                const currentIntensity = intensity * (1 - progress);
                camera.position.x = originalPosition.x + (Math.random() - 0.5) * currentIntensity;
                camera.position.y = originalPosition.y + (Math.random() - 0.5) * currentIntensity;
                requestAnimationFrame(shake);
            } else {
                // Reset camera position
                camera.position.copy(originalPosition);
            }
        };

        shake();
    }

    createDeathParticles(position) {
        // Burst of colorful particles (hearts and stars)
        const particleCount = 20;
        const colors = [0xFF69B4, 0xFFD700, 0xFF6B9D, 0xFFB6C1, 0x87CEEB, 0xFFFFFF];

        for (let i = 0; i < particleCount; i++) {
            const particle = this.getParticleFromPool(colors[i % colors.length]);
            if (!particle) continue;

            // Position at character
            particle.position.set(
                position.x + (Math.random() - 0.5) * 0.5,
                position.y + 1 + Math.random() * 0.5,
                position.z + (Math.random() - 0.5) * 0.5
            );

            // Random outward velocity (explosion)
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 3 + Math.random() * 4;
            const upSpeed = 5 + Math.random() * 5;

            particle.userData.velocity = {
                x: Math.cos(angle) * speed,
                y: upSpeed,
                z: Math.sin(angle) * speed
            };

            particle.userData.gravity = true;
            particle.userData.life = 1.0 + Math.random() * 0.5;
            particle.userData.maxLife = particle.userData.life;
            particle.userData.shrink = true;
            particle.userData.rotationSpeed = {
                x: (Math.random() - 0.5) * 10,
                y: (Math.random() - 0.5) * 10,
                z: (Math.random() - 0.5) * 10
            };

            // Random scale for variety
            const scale = 0.5 + Math.random() * 1.0;
            particle.scale.set(scale, scale, scale);
        }
    }

    showImpactText() {
        // Comic-style impact text
        const texts = ['OOPS!', 'OOF!', 'BONK!', 'OUCH!', 'OH NO!'];
        const text = texts[Math.floor(Math.random() * texts.length)];

        const impactDiv = document.createElement('div');
        impactDiv.textContent = text;
        impactDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0) rotate(-15deg);
            font-family: 'Comic Sans MS', 'Chalkboard', cursive, sans-serif;
            font-size: 80px;
            font-weight: bold;
            color: #FF69B4;
            text-shadow:
                3px 3px 0 #FFD700,
                -3px -3px 0 #FFD700,
                3px -3px 0 #FFD700,
                -3px 3px 0 #FFD700,
                0 5px 10px rgba(0,0,0,0.3);
            pointer-events: none;
            z-index: 10000;
            animation: impactPop 0.8s ease-out forwards;
        `;

        // Add keyframe animation if not already present
        if (!document.getElementById('impact-text-style')) {
            const style = document.createElement('style');
            style.id = 'impact-text-style';
            style.textContent = `
                @keyframes impactPop {
                    0% {
                        transform: translate(-50%, -50%) scale(0) rotate(-15deg);
                        opacity: 1;
                    }
                    30% {
                        transform: translate(-50%, -50%) scale(1.3) rotate(5deg);
                        opacity: 1;
                    }
                    50% {
                        transform: translate(-50%, -50%) scale(1) rotate(-3deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translate(-50%, -50%) scale(1.5) rotate(0deg);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(impactDiv);

        // Remove after animation
        setTimeout(() => impactDiv.remove(), 800);
    }

    // Local scores methods (personal best scores stored on device)
    loadLocalScores() {
        try {
            const saved = localStorage.getItem('helloKittyLocalScores');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    }

    saveLocalScores() {
        try {
            localStorage.setItem('helloKittyLocalScores', JSON.stringify(this.localScores));
        } catch (e) {
            console.warn('Could not save local scores:', e);
        }
    }

    addLocalScore(initials, score, distance, coins, candies) {
        this.localScores.push({
            initials: initials,
            score: score,
            distance: distance,
            coins: coins,
            candies: candies,
            timestamp: Date.now()
        });

        // Sort by score (highest first)
        this.localScores.sort((a, b) => b.score - a.score);

        // Keep only top 10
        this.localScores = this.localScores.slice(0, 10);

        this.saveLocalScores();
    }

    // Leaderboard methods (Firebase-backed)
    checkHighScore(score) {
        // Check if score makes it to global top 10
        if (this.highScores.length < 10) return true;
        return score > this.highScores[this.highScores.length - 1].score;
    }

    checkLocalHighScore(score) {
        // Check if score makes it to personal top 10
        if (this.localScores.length < 10) return true;
        return score > this.localScores[this.localScores.length - 1].score;
    }

    async saveHighScore() {
        const initials = document.getElementById('initials-input').value.trim().toUpperCase();

        if (initials.length !== 3) {
            alert('Please enter exactly 3 initials!');
            return;
        }

        const finalScore = Math.floor(this.score);
        const finalDistance = Math.floor(this.distance);
        const finalCoins = this.coins;
        const finalCandies = this.candyCollected;

        // Always save to local scores first
        this.addLocalScore(initials, finalScore, finalDistance, finalCoins, finalCandies);

        // Show saving indicator
        const saveBtn = document.getElementById('save-score-button');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;

        try {
            // Submit to Firebase
            await this.leaderboard.submitScore(initials, finalScore, finalDistance, finalCoins, finalCandies);

            // Refresh global leaderboard
            this.highScores = await this.leaderboard.getTopScores(10);

            // Hide input, show leaderboards
            document.getElementById('new-high-score').style.display = 'none';
            this.displayLeaderboard(initials, finalScore);
            this.displayLocalLeaderboard(initials, finalScore);

            // Play celebration sound
            this.audio.playMilestoneSound();
        } catch (error) {
            console.error('Error saving score:', error);
            alert('Score saved locally. Will sync when online.');

            // Hide input anyway
            document.getElementById('new-high-score').style.display = 'none';
            this.displayLeaderboard(initials, finalScore);
            this.displayLocalLeaderboard(initials, finalScore);
        } finally {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }
    }

    displayLeaderboard(highlightInitials = null, highlightScore = null) {
        const leaderboardList = document.getElementById('leaderboard-list');
        leaderboardList.innerHTML = '';

        if (this.highScores.length === 0) {
            leaderboardList.innerHTML = '<p style="text-align: center; color: #FF69B4;">No global scores yet!</p>';
            return;
        }

        let highlightedEntry = null;
        const scoreToHighlight = highlightScore || Math.floor(this.score);

        this.highScores.forEach((entry, index) => {
            const div = document.createElement('div');
            div.className = 'leaderboard-entry';

            // Highlight the newly added score
            if (highlightInitials && entry.initials === highlightInitials && entry.score === scoreToHighlight) {
                div.classList.add('highlight');
                highlightedEntry = div;
            }

            div.innerHTML = `
                <span class="leaderboard-rank">${index + 1}.</span>
                <span class="leaderboard-initials">${entry.initials}</span>
                <span class="leaderboard-score">${entry.score.toLocaleString()}</span>
            `;

            leaderboardList.appendChild(div);
        });

        // Smooth scroll to highlighted entry after DOM updates
        if (highlightedEntry) {
            setTimeout(() => {
                highlightedEntry.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }, 100);
        }
    }

    displayLocalLeaderboard(highlightInitials = null, highlightScore = null) {
        const localList = document.getElementById('local-leaderboard-list');
        if (!localList) return;

        localList.innerHTML = '';

        if (this.localScores.length === 0) {
            localList.innerHTML = '<p style="text-align: center; color: #87CEEB;">Play to set your records!</p>';
            return;
        }

        let highlightedEntry = null;
        const scoreToHighlight = highlightScore || Math.floor(this.score);

        this.localScores.forEach((entry, index) => {
            const div = document.createElement('div');
            div.className = 'leaderboard-entry';

            // Highlight the newly added score
            if (highlightInitials && entry.initials === highlightInitials && entry.score === scoreToHighlight) {
                div.classList.add('highlight');
                highlightedEntry = div;
            }

            div.innerHTML = `
                <span class="leaderboard-rank">${index + 1}.</span>
                <span class="leaderboard-initials">${entry.initials}</span>
                <span class="leaderboard-score">${entry.score.toLocaleString()}</span>
            `;

            localList.appendChild(div);
        });

        if (highlightedEntry) {
            setTimeout(() => {
                highlightedEntry.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }, 100);
        }
    }
}

// Start the game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
