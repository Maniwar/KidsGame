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

        // Initialize game systems
        this.init();
    }

    init() {
        // Graphics
        this.gameScene = new GameScene();
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

        // Setup UI
        this.setupUI();

        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());

        // Start render loop (menu visible initially)
        this.render();
    }

    setupUI() {
        // Start button
        const startButton = document.getElementById('start-button');
        startButton.addEventListener('click', () => this.startGame());

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

        // Initialize and start audio
        this.audio.init();
        this.audio.playBackgroundMusic();

        // Clean up any active power-ups from previous game
        // This removes their visual meshes and effects
        for (const [type] of this.activePowerUps) {
            this.deactivatePowerUp(type);
        }

        // Clean up any lingering speed trail particles
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
        this.updateHUD();

        this.isRunning = true;
        this.isPaused = false;
        this.lastTime = performance.now();
    }

    restartGame() {
        // Hide game over screen
        document.getElementById('game-over-screen').classList.remove('active');

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
            const attractSpeed = 15; // How fast coins move toward player

            const collectibles = this.world.getCollectibles();
            for (const collectible of collectibles) {
                if (collectible.isCollected) continue;

                const dx = playerPos.x - collectible.position.x;
                const dz = playerPos.z - collectible.position.z;
                const distance = Math.sqrt(dx * dx + dz * dz);

                if (distance < magnetRadius) {
                    // Move coin toward player
                    collectible.position.x += (dx / distance) * attractSpeed * deltaTime;
                    collectible.position.z += (dz / distance) * attractSpeed * deltaTime;
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
        const particles = [];
        const particleCount = 12;

        for (let i = 0; i < particleCount; i++) {
            const particleGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
            const particleMat = new THREE.MeshBasicMaterial({
                color: Math.random() > 0.5 ? 0xFFAA00 : 0xFF6600,
                transparent: true,
                opacity: 1
            });

            const particle = new THREE.Mesh(particleGeo, particleMat);
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

            this.gameScene.getScene().add(particle);
            particles.push(particle);
        }

        // Animate explosion
        const duration = 600;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;

            if (progress >= 1) {
                particles.forEach(p => {
                    this.gameScene.getScene().remove(p);
                    p.geometry.dispose();
                    p.material.dispose();
                });
                return;
            }

            particles.forEach((particle) => {
                particle.position.x += particle.userData.velocity.x * 0.016;
                particle.position.y += particle.userData.velocity.y * 0.016;
                particle.position.z += particle.userData.velocity.z * 0.016;
                particle.userData.velocity.y -= 15 * 0.016; // Gravity

                particle.rotation.x += particle.userData.rotationSpeed.x * 0.016;
                particle.rotation.y += particle.userData.rotationSpeed.y * 0.016;
                particle.rotation.z += particle.userData.rotationSpeed.z * 0.016;

                particle.material.opacity = 1 - progress;
            });

            requestAnimationFrame(animate);
        };

        animate();
    }

    screenShake(intensity = 0.3, duration = 200) {
        const camera = this.camera.getCamera();
        const originalPosition = camera.position.clone();
        const startTime = Date.now();

        const shake = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed > duration) {
                camera.position.copy(originalPosition);
                return;
            }

            const progress = elapsed / duration;
            const currentIntensity = intensity * (1 - progress);

            camera.position.x = originalPosition.x + (Math.random() - 0.5) * currentIntensity;
            camera.position.y = originalPosition.y + (Math.random() - 0.5) * currentIntensity;

            requestAnimationFrame(shake);
        };

        shake();
    }

    createFloatingText(text, position, color = 0xFFFFFF) {
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
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);

        sprite.position.copy(position);
        sprite.position.y += 1;
        sprite.scale.set(2, 1, 1);

        this.gameScene.getScene().add(sprite);

        // Animate floating up and fading
        const duration = 1000;
        const startTime = Date.now();
        const startY = sprite.position.y;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;

            if (progress >= 1) {
                this.gameScene.getScene().remove(sprite);
                texture.dispose();
                spriteMaterial.dispose();
                return;
            }

            sprite.position.y = startY + progress * 3;
            sprite.material.opacity = 1 - progress;

            requestAnimationFrame(animate);
        };

        animate();
    }

    updatePowerUpVisuals(deltaTime) {
        // Animate shield bubble
        if (this.shieldMesh) {
            this.shieldMesh.rotation.y += deltaTime * 2;
            const pulse = Math.sin(Date.now() * 0.003) * 0.1 + 0.3;
            this.shieldMesh.material.opacity = pulse;
        }

        // Animate multiplier ring
        if (this.multiplierRing) {
            this.multiplierRing.rotation.z += deltaTime * 3;
            const pulse = Math.sin(Date.now() * 0.005) * 0.2 + 0.6;
            this.multiplierRing.material.opacity = pulse;
        }

        // Animate magnet ring
        if (this.magnetRing) {
            this.magnetRing.rotation.z += deltaTime * 4;
            const pulse = Math.sin(Date.now() * 0.004) * 0.2 + 0.5;
            this.magnetRing.material.opacity = pulse;
        }

        // Create speed trail particles
        if (this.activePowerUps.has('speed') && this.speedTrailParticles) {
            // Spawn trail particle every few frames
            if (Math.random() < 0.3) {
                const playerPos = this.player.getPosition();
                const trailGeo = new THREE.SphereGeometry(0.15, 6, 6);
                const hue = (Date.now() % 1000) / 1000;
                const color = new THREE.Color().setHSL(hue, 1, 0.5);
                const trailMat = new THREE.MeshBasicMaterial({
                    color: color,
                    transparent: true,
                    opacity: 0.8
                });

                const trail = new THREE.Mesh(trailGeo, trailMat);
                trail.position.copy(playerPos);
                trail.position.y += 0.5;
                trail.userData.life = 0.5;
                trail.userData.maxLife = 0.5;

                this.gameScene.getScene().add(trail);
                this.speedTrailParticles.push(trail);
            }

            // Update and fade existing trail particles
            this.speedTrailParticles = this.speedTrailParticles.filter(particle => {
                particle.userData.life -= deltaTime;
                const lifeRatio = particle.userData.life / particle.userData.maxLife;
                particle.material.opacity = lifeRatio;
                particle.scale.multiplyScalar(0.95);

                if (particle.userData.life <= 0) {
                    this.gameScene.getScene().remove(particle);
                    particle.geometry.dispose();
                    particle.material.dispose();
                    return false;
                }
                return true;
            });
        }

        // Animate cloud
        if (this.cloudMesh) {
            this.cloudMesh.rotation.y += deltaTime;
            const bob = Math.sin(Date.now() * 0.002) * 0.1;
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

                    // Visual feedback - explosion and screen shake!
                    this.createObstacleExplosion(obstacle.getPosition());
                    this.screenShake(0.4, 150);
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

                // Hit an obstacle - play death animation then game over
                if (this.isRunning) {
                    this.isRunning = false; // Stop game immediately
                    this.player.playDeathAnimation(() => {
                        this.gameOver();
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

                    // Hit a moving obstacle - play death animation then game over
                    if (this.isRunning) {
                        this.isRunning = false; // Stop game immediately
                        this.player.playDeathAnimation(() => {
                            this.gameOver();
                        });
                    }
                    return;
                }
            }
        }
    }

    checkCollision(playerPos, objectBox) {
        // Simple distance-based collision
        const distance = Math.sqrt(
            Math.pow(playerPos.x - objectBox.center.x, 2) +
            Math.pow(playerPos.z - objectBox.center.z, 2)
        );

        // Player radius + object radius
        const collisionDistance = 0.4 + objectBox.radius;

        // Not close enough to collide
        if (distance > collisionDistance) {
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
        document.getElementById('score').textContent = Math.floor(this.score);
        document.getElementById('coins').textContent = this.coins;
        document.getElementById('distance').textContent = Math.floor(this.distance) + 'm';

        // Update power-up indicators
        this.updatePowerUpHUD();
    }

    updatePowerUpHUD() {
        let powerUpHTML = '';
        const icons = {
            'magnet': '🧲',
            'shield': '🛡️',
            'speed': '⚡',
            'multiplier': '✨',
            'flight': '🎈',
            'giant': '🍄'
        };

        for (const [type, data] of this.activePowerUps) {
            const timeLeft = Math.ceil(data.duration);
            powerUpHTML += `<div class="power-up-indicator">${icons[type]} ${timeLeft}s</div>`;
        }

        // Create or update power-up display
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
        powerUpDisplay.innerHTML = powerUpHTML;

        // Add styles for power-up indicators
        if (!document.getElementById('power-up-styles')) {
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
            `;
            document.head.appendChild(style);
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
        const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1); // Cap at 100ms
        this.lastTime = currentTime;

        // Update FPS counter
        this.frameCount++;
        this.fpsUpdateTime += deltaTime;
        if (this.fpsUpdateTime >= 0.5) { // Update FPS display every 0.5 seconds
            this.currentFPS = Math.round(this.frameCount / this.fpsUpdateTime);
            document.getElementById('fps').textContent = this.currentFPS;
            this.frameCount = 0;
            this.fpsUpdateTime = 0;
        }

        // Update game
        this.update(deltaTime);

        // Render scene
        this.gameScene.render(this.camera.getCamera());
    }

    handleResize() {
        this.camera.handleResize();
        this.gameScene.handleResize();
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
