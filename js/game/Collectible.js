import * as THREE from 'three';
import { COLORS, GAME_CONFIG } from '../utils/Constants.js';

// PERFORMANCE: Static shared geometries and materials (created once, reused by all coins)
let sharedCoinGeometry = null;
let sharedCoinMaterial = null;
let sharedGemGeometry = null;

function getSharedCoinGeometry() {
    if (!sharedCoinGeometry) {
        // VISIBILITY: Big chunky coins (0.5 radius) - easy to see for kids
        // PERFORMANCE: Reduced segments from 32 to 16 - barely noticeable difference
        sharedCoinGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.15, 16);
    }
    return sharedCoinGeometry;
}

function getSharedCoinMaterial() {
    if (!sharedCoinMaterial) {
        sharedCoinMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFD700,
            metalness: 0.95,
            roughness: 0.05,
            emissive: 0xFFD700,
            emissiveIntensity: 0.5, // VISIBILITY: Increased glow from 0.2 to 0.5
        });
    }
    return sharedCoinMaterial;
}

function getSharedGemGeometry() {
    if (!sharedGemGeometry) {
        // VISIBILITY: Larger gems (0.35 vs 0.25) for better visibility
        sharedGemGeometry = new THREE.OctahedronGeometry(0.35, 0);
    }
    return sharedGemGeometry;
}

export class Collectible {
    constructor(scene, lane, zPosition, type = 'coin') {
        this.scene = scene;
        this.lane = lane;
        this.type = type;
        this.isCollected = false;
        this.isActive = true;

        this.position = new THREE.Vector3(
            GAME_CONFIG.LANE_POSITIONS[lane],
            1.0, // VISIBILITY: Higher floating height (1.0 vs 0.8) for better visibility
            zPosition
        );

        // Value based on type
        this.value = this.getValueForType(type);

        // Animation - VISIBILITY: Enhanced bobbing for more noticeable movement
        this.rotationSpeed = 2.5; // Faster spin
        this.bobSpeed = 4; // Faster bob (4 vs 3)
        this.bobAmount = 0.3; // Larger bob (0.3 vs 0.2)
        this.bobOffset = Math.random() * Math.PI * 2;

        this.createMesh();
    }

    getValueForType(type) {
        switch (type) {
            case 'coin':
                return GAME_CONFIG.COIN_VALUE;
            case 'blue-gem':
                return 10;
            case 'pink-gem':
                return 25;
            case 'star-gem':
                return 50;
            case 'rainbow-gem':
                return 100;
            default:
                return 1;
        }
    }

    createMesh() {
        this.group = new THREE.Group();

        switch (this.type) {
            case 'coin':
                this.createCoin();
                break;
            case 'blue-gem':
                this.createGem(0x4169E1); // Royal blue
                break;
            case 'pink-gem':
                this.createGem(COLORS.SECONDARY_PINK);
                break;
            case 'star-gem':
                this.createGem(COLORS.GOLD);
                break;
            case 'rainbow-gem':
                this.createRainbowGem();
                break;
            default:
                this.createCoin();
        }

        this.group.position.copy(this.position);
        this.scene.add(this.group);
    }

    createCoin() {
        // PERFORMANCE: Use shared geometry and material for coins
        this.mesh = new THREE.Mesh(getSharedCoinGeometry(), getSharedCoinMaterial());
        this.mesh.rotation.x = Math.PI / 2; // Lay flat so it spins vertically
        this.mesh.castShadow = true;
        this.group.add(this.mesh);

        this.collisionRadius = 0.55; // Match bigger coin size
        // Mark that we're using shared resources (don't dispose in cleanup)
        this.usesSharedGeometry = true;
    }

    // VISIBILITY: Add a glowing circle on the ground beneath collectibles
    addGroundGlow(color) {
        const glowGeometry = new THREE.CircleGeometry(0.5, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide,
        });
        this.groundGlow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.groundGlow.rotation.x = -Math.PI / 2; // Lay flat on ground
        this.groundGlow.position.y = -0.95; // Just above ground level (relative to collectible)
        this.group.add(this.groundGlow);
    }

    createGem(color) {
        // PERFORMANCE: Use shared geometry, only material is unique per gem color
        const gemMaterial = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.9,
            roughness: 0.1,
            flatShading: true,
            emissive: color,
            emissiveIntensity: 0.5, // VISIBILITY: Increased glow from 0.2 to 0.5
        });

        this.mesh = new THREE.Mesh(getSharedGemGeometry(), gemMaterial);
        this.group.add(this.mesh);

        // VISIBILITY: Add ground glow indicator
        this.addGroundGlow(color);

        this.collisionRadius = 0.45; // VISIBILITY: Larger collision radius for bigger gems
    }

    createRainbowGem() {
        // Special rainbow gem (cycles through colors) - slightly larger
        const gemMaterial = new THREE.MeshStandardMaterial({
            color: 0xFF00FF,
            metalness: 0.9,
            roughness: 0.1,
            flatShading: true,
            emissive: 0xFF00FF,
            emissiveIntensity: 0.6, // VISIBILITY: Increased glow from 0.4 to 0.6
        });

        // PERFORMANCE: Use shared geometry scaled up slightly
        this.mesh = new THREE.Mesh(getSharedGemGeometry(), gemMaterial);
        this.mesh.scale.set(1.3, 1.3, 1.3); // VISIBILITY: Larger scale (1.3 vs 1.2)
        this.group.add(this.mesh);

        // VISIBILITY: Add ground glow indicator (rainbow colored)
        this.addGroundGlow(0xFF00FF);

        this.collisionRadius = 0.5; // VISIBILITY: Larger collision radius
        this.isRainbow = true;
    }

    update(deltaTime, playerZ) {
        if (this.isCollected) return;

        // OPTIMIZED: Cache time value to reduce Date.now() calls
        this.animTime = (this.animTime || 0) + deltaTime;

        // Spin on axis like a real coin!
        this.mesh.rotation.z += this.rotationSpeed * deltaTime;

        // Bob up and down - use cached time
        const bobTime = this.animTime * this.bobSpeed + this.bobOffset;
        const bobY = Math.sin(bobTime) * this.bobAmount;
        this.group.position.y = this.position.y + bobY;

        // VISIBILITY: Pulse the ground glow opacity
        if (this.groundGlow) {
            const glowPulse = 0.3 + Math.sin(this.animTime * 3) * 0.15;
            this.groundGlow.material.opacity = glowPulse;
        }

        // Rainbow color cycling - reduced frequency
        if (this.isRainbow) {
            const hue = (this.animTime * 0.5) % 1;
            this.mesh.material.color.setHSL(hue, 1, 0.5);
            this.mesh.material.emissive.setHSL(hue, 1, 0.5);
            // VISIBILITY: Also cycle ground glow color for rainbow gems
            if (this.groundGlow) {
                this.groundGlow.material.color.setHSL(hue, 1, 0.5);
            }
        }

        // Check if far behind player (cleanup)
        if (this.position.z > playerZ + 20) {
            this.isActive = false;
        }
    }

    collect() {
        if (this.isCollected) return this.value;

        this.isCollected = true;

        // Create collection effect
        this.createCollectionEffect();

        // Remove from scene after animation
        setTimeout(() => {
            this.dispose();
        }, 300);

        return this.value;
    }

    createCollectionEffect() {
        // Trigger UI shake and glow
        const coinsElement = document.getElementById('coins');
        if (coinsElement) {
            coinsElement.classList.add('coin-collect-shake', 'coin-collect-glow');
            setTimeout(() => {
                coinsElement.classList.remove('coin-collect-shake', 'coin-collect-glow');
            }, 400);
        }

        // PERFORMANCE: Simplified collection effect - just fly up and fade
        // Removed particle burst to reduce allocations (the UI feedback is enough)
        const duration = 500;
        const startTime = performance.now();
        const startY = this.position.y;
        const scene = this.scene;
        const group = this.group;
        const mesh = this.mesh;

        // PERFORMANCE: Use simpler animation loop with performance.now()
        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = elapsed / duration;

            if (progress >= 1) {
                return;
            }

            // Coin shoots straight up with easing
            const easeOut = 1 - Math.pow(1 - progress, 3); // Cubic ease out
            group.position.y = startY + (easeOut * 15); // Fly up 15 units

            // Fade out as it goes up
            group.traverse((child) => {
                if (child.material) {
                    child.material.opacity = 1 - progress;
                    child.material.transparent = true;
                }
            });

            // Slight spin as it flies up
            mesh.rotation.y += 0.2;

            requestAnimationFrame(animate);
        };

        animate();
    }

    createUISparkles() {
        // OPTIMIZED: Removed DOM particle explosion - it causes jank on lower-end devices
        // The CSS animation on the coin counter is enough visual feedback
    }

    getBoundingBox() {
        return {
            center: this.position,
            radius: this.collisionRadius
        };
    }

    getPosition() {
        return this.position;
    }

    dispose() {
        this.isActive = false;
        this.scene.remove(this.group);
        // PERFORMANCE: Don't dispose shared geometries/materials
        if (!this.usesSharedGeometry) {
            this.group.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }
    }
}
