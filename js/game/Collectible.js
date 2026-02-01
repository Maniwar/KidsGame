import * as THREE from 'three';
import { COLORS, GAME_CONFIG } from '../utils/Constants.js';

// PERFORMANCE: Static shared geometries and materials (created once, reused by all coins)
let sharedCoinGeometry = null;
let sharedCoinMaterial = null;
let sharedGemGeometry = null;

function getSharedCoinGeometry() {
    if (!sharedCoinGeometry) {
        // PERFORMANCE: Reduced segments from 32 to 16 - barely noticeable difference
        sharedCoinGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.08, 16);
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
            emissiveIntensity: 0.2,
        });
    }
    return sharedCoinMaterial;
}

function getSharedGemGeometry() {
    if (!sharedGemGeometry) {
        sharedGemGeometry = new THREE.OctahedronGeometry(0.25, 0);
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
            0.8, // Floating height
            zPosition
        );

        // Value based on type
        this.value = this.getValueForType(type);

        // Animation
        this.rotationSpeed = 2;
        this.bobSpeed = 3;
        this.bobAmount = 0.2;
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

        // PERFORMANCE: Removed star emblem - too many vertices for minor visual detail
        // The gold coin is already clearly recognizable without it

        this.collisionRadius = 0.3;
        // Mark that we're using shared resources (don't dispose in cleanup)
        this.usesSharedGeometry = true;
    }

    createGem(color) {
        // PERFORMANCE: Use shared geometry, only material is unique per gem color
        const gemMaterial = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.9,
            roughness: 0.1,
            flatShading: true,
            emissive: color,
            emissiveIntensity: 0.2,
        });

        this.mesh = new THREE.Mesh(getSharedGemGeometry(), gemMaterial);
        this.group.add(this.mesh);

        // PERFORMANCE: Removed sparkle glow sphere - reduces draw calls
        // The emissive material already provides visual pop

        this.collisionRadius = 0.35;
    }

    createRainbowGem() {
        // Special rainbow gem (cycles through colors) - slightly larger
        const gemMaterial = new THREE.MeshStandardMaterial({
            color: 0xFF00FF,
            metalness: 0.9,
            roughness: 0.1,
            flatShading: true,
            emissive: 0xFF00FF,
            emissiveIntensity: 0.4,
        });

        // PERFORMANCE: Use shared geometry scaled up slightly
        this.mesh = new THREE.Mesh(getSharedGemGeometry(), gemMaterial);
        this.mesh.scale.set(1.2, 1.2, 1.2); // Slightly larger than regular gems
        this.group.add(this.mesh);

        // PERFORMANCE: Removed glow sphere - emissive is enough

        this.collisionRadius = 0.4;
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

        // Rainbow color cycling - reduced frequency
        if (this.isRainbow) {
            const hue = (this.animTime * 0.5) % 1;
            this.mesh.material.color.setHSL(hue, 1, 0.5);
            this.mesh.material.emissive.setHSL(hue, 1, 0.5);
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
