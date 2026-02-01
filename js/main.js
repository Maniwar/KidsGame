import * as THREE from 'three';
import { GameScene } from './graphics/Scene.js';
import { GameCamera } from './graphics/Camera.js';
import { GameLighting } from './graphics/Lighting.js';
import { Player } from './game/Player.js';
import { KeyboardController } from './input/Keyboard.js';
import { TouchController } from './input/Touch.js';
import { World } from './game/World.js';
import { AudioManager } from './audio/AudioManager.js';

class Game {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.score = 0;
        this.coins = 0;
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

        // Leaderboard
        this.highScores = this.loadHighScores();
        this.isNewHighScore = false;

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

        // Load settings first (before creating renderer)
        this.loadSettings();

        // Initialize game systems
        this.init();
    }

    init() {
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

        // Start render loop (menu visible initially)
        this.render();
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

        // Display leaderboard on start
        this.displayLeaderboard();

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
        this.distance = 0;
        this.activePowerUps.clear();
        this.coinMultiplier = 1;
        this.hasShield = false;
        this.invincibilityTimer = 0;
        this.lastHUDUpdate = 0; // MEMORY FIX: Reset HUD throttle timer
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

        // Display leaderboard
        this.displayLeaderboard();

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

        // Update HUD
        this.updateHUD();

        // Clear keyboard just-pressed state for next frame
        this.keyboard.update();
    }

    activatePowerUp(type) {
        const duration = 8; // 8 seconds

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
        const shieldGeometry = new THREE.SphereGeometry(0.8, 16, 16);
        const shieldMaterial = new THREE.MeshBasicMaterial({
            color: 0x00FFFF,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        this.shieldMesh = new THREE.Mesh(shieldGeometry, shieldMaterial);
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
        // PERFORMANCE: Create canvas texture (unavoidable for text, but use animation queue)
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 128;

        context.font = 'Bold 60px Arial';
        context.fillStyle = '#' + color.toString(16).padStart(6, '0');
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, 128, 64);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMaterial);

        sprite.position.copy(position);
        sprite.position.y += 1;
        sprite.scale.set(2, 1, 1);

        this.gameScene.getScene().add(sprite);

        const startY = sprite.position.y;
        const scene = this.gameScene.getScene();

        // PERFORMANCE: Use animation queue instead of separate RAF callback
        this.animations.push({
            elapsed: 0,
            duration: 1000,
            update: (progress) => {
                if (progress >= 1) {
                    scene.remove(sprite);
                    texture.dispose();
                    spriteMaterial.dispose();
                    return true; // Animation complete
                }

                sprite.position.y = startY + progress * 3;
                sprite.material.opacity = 1 - progress;
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
                this.coins += value * this.coinMultiplier; // Apply multiplier
                this.score += value * 10 * this.coinMultiplier; // Bonus points for collecting

                // Play appropriate sound
                if (collectible.type === 'coin') {
                    this.audio.playCoinSound();
                } else {
                    this.audio.playGemSound();
                }
            }
        }

        // Skip obstacle collisions if flying or giant
        const isFlyingOrGiant = this.activePowerUps.has('flight') || this.activePowerUps.has('giant');

        // Track if shield was consumed this frame to prevent multiple hits
        let shieldConsumedThisFrame = false;

        // Skip collision checks if invincible (after shield breaks)
        if (this.invincibilityTimer > 0) {
            return; // Still invincible, no collision damage
        }

        // Check obstacle collisions
        const obstacles = this.world.getObstacles();
        for (const obstacle of obstacles) {
            if (this.checkCollision(playerPos, obstacle.getBoundingBox())) {
                // Giant mode: smash through obstacles
                if (this.activePowerUps.has('giant')) {
                    obstacle.isActive = false; // Destroy obstacle
                    this.score += 50; // Bonus points

                    // Visual feedback - explosion particles and floating text
                    // (no screen shake to avoid jitter when smashing multiple obstacles)
                    this.createObstacleExplosion(obstacle.getPosition());
                    this.audio.playGemSound(); // Use gem sound for smash effect
                    this.createFloatingText('+50', obstacle.getPosition(), 0xFFAA00);

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

        // Check moving object collisions (birds, butterflies, etc.)
        // Skip if shield was consumed this frame
        if (!isFlyingOrGiant && !shieldConsumedThisFrame) {
            const movingObstacles = this.gameScene.getMovingObstacles();
            for (const movingObj of movingObstacles) {
                const boundingBox = {
                    center: movingObj.position,
                    radius: movingObj.userData.collisionRadius,
                    height: movingObj.userData.obstacleHeight
                };

                if (this.checkCollision(playerPos, boundingBox)) {
                    // Shield: protect once then remove
                    if (this.hasShield) {
                        this.deactivatePowerUp('shield');
                        this.audio.playShieldBreakSound();
                        this.invincibilityTimer = 1.0; // 1 second of invincibility after shield breaks
                        break; // Exit loop to prevent multiple hits
                    }

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
        this.domElements.distance.textContent = Math.floor(this.distance) + 'm';

        // Update power-up indicators
        this.updatePowerUpHUD();
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

        // Screen flash
        this.screenFlash();

        // Screen shake
        this.screenShake();

        // Particle burst from character
        this.createDeathParticles(playerPos);

        // Comic impact text
        this.showImpactText();
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

    // Leaderboard methods
    loadHighScores() {
        const saved = localStorage.getItem('helloKittyHighScores');
        return saved ? JSON.parse(saved) : [];
    }

    saveHighScores() {
        localStorage.setItem('helloKittyHighScores', JSON.stringify(this.highScores));
    }

    checkHighScore(score) {
        // Check if score makes it to top 10
        if (this.highScores.length < 10) return true;
        return score > this.highScores[this.highScores.length - 1].score;
    }

    saveHighScore() {
        const initials = document.getElementById('initials-input').value.trim().toUpperCase();

        if (initials.length !== 3) {
            alert('Please enter exactly 3 initials!');
            return;
        }

        const finalScore = Math.floor(this.score);

        // Add new score
        this.highScores.push({
            initials: initials,
            score: finalScore,
            date: Date.now()
        });

        // Sort by score (highest first)
        this.highScores.sort((a, b) => b.score - a.score);

        // Keep only top 10
        this.highScores = this.highScores.slice(0, 10);

        // Save to localStorage
        this.saveHighScores();

        // Hide input, show leaderboard
        document.getElementById('new-high-score').style.display = 'none';
        this.displayLeaderboard(initials);

        // Play celebration sound
        this.audio.playMilestoneSound();
    }

    displayLeaderboard(highlightInitials = null) {
        const leaderboardList = document.getElementById('leaderboard-list');
        leaderboardList.innerHTML = '';

        if (this.highScores.length === 0) {
            leaderboardList.innerHTML = '<p style="text-align: center; color: #FF69B4;">No scores yet! Be the first!</p>';
            return;
        }

        let highlightedEntry = null;

        this.highScores.forEach((entry, index) => {
            const div = document.createElement('div');
            div.className = 'leaderboard-entry';

            // Highlight the newly added score
            if (entry.initials === highlightInitials && entry.score === Math.floor(this.score)) {
                div.classList.add('highlight');
                highlightedEntry = div; // Save reference to scroll to it
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
}

// Start the game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
