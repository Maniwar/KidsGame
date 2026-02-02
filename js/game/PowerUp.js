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
        this.group.add(this.mesh);

        // Sparkle effect
        this.createSparkleRing(0x00FFFF);
        this.collisionRadius = 0.4;
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
        this.group.add(this.mesh);

        // Inner core
        const coreGeometry = new THREE.SphereGeometry(0.15, 12, 12);
        const coreMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            emissive: 0x00FFFF,
            emissiveIntensity: 0.8,
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        this.mesh.add(core);

        this.createSparkleRing(0x00FFFF);
        this.collisionRadius = 0.35;
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
        this.group.add(this.mesh);

        this.createSparkleRing(0xFFFF00);
        this.collisionRadius = 0.35;
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
        this.group.add(this.mesh);

        this.createSparkleRing(0xFFD700);
        this.collisionRadius = 0.35;
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

        this.createSparkleRing(COLORS.SECONDARY_PINK);
        this.collisionRadius = 0.35;
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

        this.createSparkleRing(0xFF0000);
        this.collisionRadius = 0.5; // Larger collision for bigger mushroom
    }

    createSparkleRing(color) {
        const ringGeometry = new THREE.TorusGeometry(0.4, 0.03, 8, 16);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.5,
        });

        this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
        this.ring.rotation.x = Math.PI / 2;
        this.group.add(this.ring);
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

        // Pulse ring
        if (this.ring) {
            this.pulseTime += deltaTime * 3;
            const pulse = (Math.sin(this.pulseTime) + 1) * 0.5;
            this.ring.material.opacity = 0.3 + pulse * 0.4;
            this.ring.rotation.z += deltaTime;
        }

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
        // Sparkle burst
        const particles = [];
        const particleCount = 8;

        for (let i = 0; i < particleCount; i++) {
            const particleGeo = new THREE.SphereGeometry(0.08, 6, 6);
            const particleMat = new THREE.MeshBasicMaterial({
                color: this.ring ? this.ring.material.color : 0xFFFFFF,
                transparent: true,
                opacity: 1,
            });

            const particle = new THREE.Mesh(particleGeo, particleMat);
            particle.position.copy(this.position);

            const angle = (i / particleCount) * Math.PI * 2;
            particle.userData.velocity = {
                x: Math.cos(angle) * 3,
                y: 2,
                z: Math.sin(angle) * 3
            };

            this.scene.add(particle);
            particles.push(particle);
        }

        // Animate particles
        const duration = 400;
        const startTime = Date.now();

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

            particles.forEach((particle) => {
                particle.position.x += particle.userData.velocity.x * 0.02;
                particle.position.y += particle.userData.velocity.y * 0.02;
                particle.position.z += particle.userData.velocity.z * 0.02;
                particle.material.opacity = Math.max(0, 1 - progress);
            });

            // Power-up flies up
            this.group.position.y = this.position.y + (progress * 10);
            this.group.traverse((child) => {
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
