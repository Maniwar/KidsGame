import * as THREE from 'three';
import { COLORS, GAME_CONFIG } from '../utils/Constants.js';

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
        // MARIO-STYLE SPINNING GOLD COIN - Flat, shiny, unmistakably a coin!

        // Main coin disc - smaller and thinner
        const coinGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.08, 32);
        const coinMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFD700, // Classic gold
            metalness: 0.95,
            roughness: 0.05,
            emissive: 0xFFD700, // Match the gold color
            emissiveIntensity: 0.2,
        });

        this.mesh = new THREE.Mesh(coinGeometry, coinMaterial);
        this.mesh.rotation.x = Math.PI / 2; // Lay flat so it spins vertically
        this.mesh.castShadow = true;
        this.group.add(this.mesh);

        // Star emblem in center - simple 4-pointed star shape (scaled down)
        const starGroup = new THREE.Group();
        starGroup.rotation.x = Math.PI / 2;

        // Create 4-pointed star using 4 diamond shapes
        const diamondShape = new THREE.Shape();
        diamondShape.moveTo(0, 0.1);
        diamondShape.lineTo(0.03, 0.03);
        diamondShape.lineTo(0.1, 0);
        diamondShape.lineTo(0.03, -0.03);
        diamondShape.lineTo(0, -0.1);
        diamondShape.lineTo(-0.03, -0.03);
        diamondShape.lineTo(-0.1, 0);
        diamondShape.lineTo(-0.03, 0.03);
        diamondShape.lineTo(0, 0.1);

        const starGeometry = new THREE.ShapeGeometry(diamondShape);
        const starMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFAA,
            metalness: 1.0,
            roughness: 0.0,
            emissive: 0xFFFF00,
            emissiveIntensity: 0.6,
        });

        // Front star
        const frontStar = new THREE.Mesh(starGeometry, starMaterial);
        frontStar.position.z = 0.045;
        starGroup.add(frontStar);

        // Back star
        const backStar = new THREE.Mesh(starGeometry, starMaterial);
        backStar.position.z = -0.045;
        backStar.rotation.z = Math.PI; // Rotate for variety
        starGroup.add(backStar);

        this.mesh.add(starGroup);

        // No glow - clean coin look!
        this.collisionRadius = 0.3;
    }

    createGem(color) {
        // Diamond shape using octahedron
        const gemGeometry = new THREE.OctahedronGeometry(0.25, 0);
        const gemMaterial = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.9,
            roughness: 0.1,
            flatShading: true,
            emissive: color,
            emissiveIntensity: 0.2,
        });

        this.mesh = new THREE.Mesh(gemGeometry, gemMaterial);
        this.group.add(this.mesh);

        // Sparkle effect
        const sparkleGeometry = new THREE.SphereGeometry(0.35, 8, 8);
        const sparkleMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.2,
        });

        this.glow = new THREE.Mesh(sparkleGeometry, sparkleMaterial);
        this.group.add(this.glow);

        this.collisionRadius = 0.35;
    }

    createRainbowGem() {
        // Special rainbow gem (cycles through colors)
        const gemGeometry = new THREE.OctahedronGeometry(0.3, 0);
        const gemMaterial = new THREE.MeshStandardMaterial({
            color: 0xFF00FF,
            metalness: 0.9,
            roughness: 0.1,
            flatShading: true,
            emissive: 0xFF00FF,
            emissiveIntensity: 0.4,
        });

        this.mesh = new THREE.Mesh(gemGeometry, gemMaterial);
        this.group.add(this.mesh);

        // Larger glow
        const sparkleGeometry = new THREE.SphereGeometry(0.45, 8, 8);
        const sparkleMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.3,
        });

        this.glow = new THREE.Mesh(sparkleGeometry, sparkleMaterial);
        this.group.add(this.glow);

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

        // Create small sparkle burst at collection point
        const particles = [];
        const particleCount = 4;

        for (let i = 0; i < particleCount; i++) {
            const particleGeo = new THREE.SphereGeometry(0.05, 4, 4);
            const particleMat = new THREE.MeshBasicMaterial({
                color: 0xFFD700,
                transparent: true,
                opacity: 1,
            });

            const particle = new THREE.Mesh(particleGeo, particleMat);
            particle.position.copy(this.position);

            const angle = (i / particleCount) * Math.PI * 2;
            particle.userData.velocity = {
                x: Math.cos(angle) * 2,
                y: 1,
                z: Math.sin(angle) * 2
            };

            this.scene.add(particle);
            particles.push(particle);
        }

        // Coin flies straight up into the sky
        const duration = 500;
        const startTime = Date.now();
        const startY = this.position.y;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;

            if (progress >= 1) {
                particles.forEach(p => {
                    this.scene.remove(p);
                    p.geometry.dispose();
                    p.material.dispose();
                });
                return;
            }

            // Sparkle particles burst outward and fade quickly
            particles.forEach((particle) => {
                particle.position.x += particle.userData.velocity.x * 0.015;
                particle.position.y += particle.userData.velocity.y * 0.015;
                particle.position.z += particle.userData.velocity.z * 0.015;
                particle.material.opacity = Math.max(0, 1 - progress * 2); // Fade faster
            });

            // Coin shoots straight up with easing
            const easeOut = 1 - Math.pow(1 - progress, 3); // Cubic ease out
            this.group.position.y = startY + (easeOut * 15); // Fly up 15 units

            // Fade out as it goes up
            this.group.traverse((child) => {
                if (child.material) {
                    child.material.opacity = 1 - progress;
                    child.material.transparent = true;
                }
            });

            // Slight spin as it flies up
            this.mesh.rotation.y += 0.2;

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
        this.group.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
    }
}
