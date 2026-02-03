import * as THREE from 'three';
import { COLORS } from '../utils/Constants.js';

export class PowerUp {
    constructor(scene, lane, zPosition, type) {
        this.scene = scene;
        this.lane = lane;
        this.type = type; // 'magnet', 'shield', 'speed', 'multiplier', 'flight', 'giant'
        this.isCollected = false;
        this.isActive = true;

        this.position = new THREE.Vector3(
            this.getLaneX(lane),
            1.2, // Floating higher than coins
            zPosition
        );

        // Animation
        this.rotationSpeed = 1.5;
        this.bobSpeed = 2.5;
        this.bobAmount = 0.25;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.pulseTime = 0;

        this.createMesh();
    }

    getLaneX(lane) {
        const lanePositions = [-2, 0, 2];
        return lanePositions[lane];
    }

    createMesh() {
        this.group = new THREE.Group();

        switch (this.type) {
            case 'magnet':
                this.createMagnet();
                break;
            case 'shield':
                this.createShield();
                break;
            case 'speed':
                this.createSpeed();
                break;
            case 'multiplier':
                this.createMultiplier();
                break;
            case 'flight':
                this.createFlight();
                break;
            case 'giant':
                this.createGiant();
                break;
            default:
                this.createMagnet();
        }

        this.group.position.copy(this.position);
        this.scene.add(this.group);
    }

    createMagnet() {
        // Horseshoe magnet shape
        const magnetGroup = new THREE.Group();

        // Red half
        const halfGeometry = new THREE.TorusGeometry(0.25, 0.08, 8, 16, Math.PI);
        const redMaterial = new THREE.MeshStandardMaterial({
            color: 0xFF0000,
            metalness: 0.8,
            roughness: 0.2,
            emissive: 0xFF0000,
            emissiveIntensity: 0.3,
        });
        const redHalf = new THREE.Mesh(halfGeometry, redMaterial);
        redHalf.rotation.y = Math.PI / 2;
        magnetGroup.add(redHalf);

        // Blue half
        const blueMaterial = new THREE.MeshStandardMaterial({
            color: 0x0000FF,
            metalness: 0.8,
            roughness: 0.2,
            emissive: 0x0000FF,
            emissiveIntensity: 0.3,
        });
        const blueHalf = new THREE.Mesh(halfGeometry, blueMaterial);
        blueHalf.rotation.y = -Math.PI / 2;
        magnetGroup.add(blueHalf);

        this.mesh = magnetGroup;
        // Scale up for better visibility
        this.mesh.scale.set(1.8, 1.8, 1.8);
        this.group.add(this.mesh);

        this.collisionRadius = 0.5;
    }

    createShield() {
        // Bubble shield
        const shieldGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const shieldMaterial = new THREE.MeshStandardMaterial({
            color: 0x00FFFF,
            metalness: 0.3,
            roughness: 0.1,
            transparent: true,
            opacity: 0.6,
            emissive: 0x00FFFF,
            emissiveIntensity: 0.4,
        });

        this.mesh = new THREE.Mesh(shieldGeometry, shieldMaterial);

        // Inner core
        const coreGeometry = new THREE.SphereGeometry(0.15, 12, 12);
        const coreMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            emissive: 0x00FFFF,
            emissiveIntensity: 0.8,
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        this.mesh.add(core);

        // Scale up for better visibility
        this.mesh.scale.set(1.8, 1.8, 1.8);
        this.group.add(this.mesh);

        this.collisionRadius = 0.5;
    }

    createSpeed() {
        // Lightning bolt
        const boltGroup = new THREE.Group();

        // Main bolt body (simplified lightning shape)
        const boltGeometry = new THREE.BoxGeometry(0.12, 0.5, 0.08);
        const boltMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFF00,
            emissive: 0xFFFF00,
            emissiveIntensity: 0.8,
        });

        const topBolt = new THREE.Mesh(boltGeometry, boltMaterial);
        topBolt.position.y = 0.15;
        boltGroup.add(topBolt);

        const bottomBolt = new THREE.Mesh(boltGeometry, boltMaterial);
        bottomBolt.position.y = -0.15;
        bottomBolt.position.x = 0.1;
        boltGroup.add(bottomBolt);

        // Star points
        for (let i = 0; i < 4; i++) {
            const starGeometry = new THREE.ConeGeometry(0.08, 0.15, 3);
            const star = new THREE.Mesh(starGeometry, boltMaterial);
            const angle = (i / 4) * Math.PI * 2;
            star.position.set(Math.cos(angle) * 0.25, 0, Math.sin(angle) * 0.25);
            star.rotation.z = Math.PI / 2;
            star.rotation.y = angle;
            boltGroup.add(star);
        }

        this.mesh = boltGroup;
        // Scale up for better visibility
        this.mesh.scale.set(1.8, 1.8, 1.8);
        this.group.add(this.mesh);

        this.collisionRadius = 0.5;
    }

    createMultiplier() {
        // 2x symbol
        const group = new THREE.Group();

        // Star background
        const starGeometry = new THREE.OctahedronGeometry(0.3, 0);
        const starMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFD700,
            metalness: 0.9,
            roughness: 0.1,
            emissive: 0xFFD700,
            emissiveIntensity: 0.5,
        });
        const star = new THREE.Mesh(starGeometry, starMaterial);
        group.add(star);

        // "2" number (simplified as shapes)
        const twoMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            emissive: 0xFFFFFF,
            emissiveIntensity: 0.6,
        });

        // Create "2x" using simple shapes
        const digitGeometry = new THREE.BoxGeometry(0.15, 0.25, 0.05);
        const two = new THREE.Mesh(digitGeometry, twoMaterial);
        two.position.z = 0.16;
        group.add(two);

        this.mesh = group;
        // Scale up for better visibility
        this.mesh.scale.set(1.8, 1.8, 1.8);
        this.group.add(this.mesh);

        this.collisionRadius = 0.5;
    }

    createFlight() {
        // Balloon
        const balloonGeometry = new THREE.SphereGeometry(0.25, 16, 16);
        balloonGeometry.scale(1, 1.3, 1); // Elongate vertically
        const balloonMaterial = new THREE.MeshStandardMaterial({
            color: COLORS.SECONDARY_PINK,
            metalness: 0.2,
            roughness: 0.3,
            emissive: COLORS.SECONDARY_PINK,
            emissiveIntensity: 0.3,
        });

        this.mesh = new THREE.Mesh(balloonGeometry, balloonMaterial);
        this.group.add(this.mesh);

        // String
        const stringGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 4);
        const stringMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
        });
        const string = new THREE.Mesh(stringGeometry, stringMaterial);
        string.position.y = -0.35;
        this.mesh.add(string);

        // Knot at bottom
        const knotGeometry = new THREE.SphereGeometry(0.05, 6, 6);
        const knot = new THREE.Mesh(knotGeometry, balloonMaterial);
        knot.position.y = -0.55;
        this.mesh.add(knot);

        // Scale up for better visibility
        this.mesh.scale.set(1.8, 1.8, 1.8);

        this.collisionRadius = 0.5;
    }

    createGiant() {
        // Mushroom
        const mushroomGroup = new THREE.Group();

        // Cap
        const capGeometry = new THREE.SphereGeometry(0.3, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const capMaterial = new THREE.MeshStandardMaterial({
            color: 0xFF0000,
            flatShading: true,
            emissive: 0xFF0000,
            emissiveIntensity: 0.2,
        });
        const cap = new THREE.Mesh(capGeometry, capMaterial);
        cap.position.y = 0.15;
        mushroomGroup.add(cap);

        // White spots on cap
        const spotGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const spotMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
        });
        for (let i = 0; i < 3; i++) {
            const spot = new THREE.Mesh(spotGeometry, spotMaterial);
            const angle = (i / 3) * Math.PI * 2;
            spot.position.set(Math.cos(angle) * 0.15, 0.25, Math.sin(angle) * 0.15);
            mushroomGroup.add(spot);
        }

        // Stem
        const stemGeometry = new THREE.CylinderGeometry(0.12, 0.1, 0.3, 12);
        const stemMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFAF0,
            flatShading: true,
        });
        const stem = new THREE.Mesh(stemGeometry, stemMaterial);
        stem.position.y = -0.05;
        mushroomGroup.add(stem);

        this.mesh = mushroomGroup;
        // Scale up mushroom for better visibility
        this.mesh.scale.set(1.8, 1.8, 1.8);
        this.group.add(this.mesh);

        this.collisionRadius = 0.5; // Larger collision for bigger mushroom
    }

    update(deltaTime, playerZ) {
        if (this.isCollected) return;

        // Cache time
        this.animTime = (this.animTime || 0) + deltaTime;

        // Rotate
        this.mesh.rotation.y += this.rotationSpeed * deltaTime;

        // Bob up and down
        const bobTime = this.animTime * this.bobSpeed + this.bobOffset;
        const bobY = Math.sin(bobTime) * this.bobAmount;
        this.group.position.y = this.position.y + bobY;

        // Check if far behind player (cleanup)
        if (this.position.z > playerZ + 20) {
            this.isActive = false;
        }
    }

    collect() {
        if (this.isCollected) return null;

        this.isCollected = true;

        // Create collection effect
        this.createCollectionEffect();

        // Remove from scene after animation
        setTimeout(() => {
            this.dispose();
        }, 300);

        return this.type;
    }

    createCollectionEffect() {
        // PERFORMANCE FIX: Removed particle burst that created new geometries
        // Just animate the power-up flying up and fading
        const duration = 300;
        const startTime = performance.now();
        const startY = this.position.y;
        const group = this.group;

        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = elapsed / duration;

            if (progress >= 1) {
                return; // Animation complete, dispose() will be called by setTimeout
            }

            // Power-up flies up with easing
            const easeOut = 1 - Math.pow(1 - progress, 2);
            group.position.y = startY + (easeOut * 6);

            // Fade out and scale up slightly
            const scale = 1 + progress * 0.3;
            group.scale.set(scale, scale, scale);
            group.traverse((child) => {
                if (child.material) {
                    child.material.opacity = 1 - progress;
                    child.material.transparent = true;
                }
            });

            requestAnimationFrame(animate);
        };

        animate();
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
