import * as THREE from 'three';
import { COLORS, GAME_CONFIG } from '../utils/Constants.js';

export class Obstacle {
    constructor(scene, lane, zPosition, type = 'low') {
        this.scene = scene;
        this.lane = lane;
        this.type = type;
        this.isActive = true;

        this.position = new THREE.Vector3(
            GAME_CONFIG.LANE_POSITIONS[lane],
            0,
            zPosition
        );

        this.createMesh();
    }

    createMesh() {
        this.group = new THREE.Group();

        // Create either LOW (jump) or TALL (slide) obstacles
        if (this.type === 'low') {
            this.createLowObstacle();
        } else {
            this.createTallObstacle();
        }

        this.group.position.copy(this.position);
        this.scene.add(this.group);
    }

    createLowObstacle() {
        // LOW OBSTACLE - SINGLE JUMP OVER IT (1.2-1.3 units high)
        // Random low obstacle type
        const types = ['crate', 'flowerpot', 'cone'];
        const chosen = types[Math.floor(Math.random() * types.length)];

        if (chosen === 'crate') {
            // Wooden crate - LARGER for visibility
            const crateGeometry = new THREE.BoxGeometry(1.5, 1.2, 1.5);
            const crateMaterial = new THREE.MeshStandardMaterial({
                color: 0xCD853F, // VISIBILITY: Brighter peru color for contrast
                emissive: 0x8B4513,
                emissiveIntensity: 0.15, // VISIBILITY: Subtle glow
                flatShading: true,
            });

            const crate = new THREE.Mesh(crateGeometry, crateMaterial);
            crate.position.y = 0.6;
            crate.castShadow = true;
            this.group.add(crate);

            this.height = 1.2;
            this.collisionRadius = 0.85;

            // VISIBILITY: Add ground warning stripe
            this.addWarningStripe('jump');
        } else if (chosen === 'flowerpot') {
            // Flower pot - LARGER for visibility
            const potGeometry = new THREE.CylinderGeometry(0.5, 0.4, 0.8, 8);
            const potMaterial = new THREE.MeshStandardMaterial({
                color: 0xD2691E,
                flatShading: true,
            });

            const pot = new THREE.Mesh(potGeometry, potMaterial);
            pot.position.y = 0.4;
            pot.castShadow = true;
            this.group.add(pot);

            // Flowers
            const flowerGeometry = new THREE.SphereGeometry(0.2, 8, 8);
            const flowerMaterial = new THREE.MeshStandardMaterial({
                color: COLORS.SECONDARY_PINK,
                flatShading: true,
            });

            for (let i = 0; i < 3; i++) {
                const flower = new THREE.Mesh(flowerGeometry, flowerMaterial);
                const angle = (i / 3) * Math.PI * 2;
                flower.position.set(
                    Math.cos(angle) * 0.3,
                    0.95,
                    Math.sin(angle) * 0.3
                );
                this.group.add(flower);
            }

            this.height = 1.15;
            this.collisionRadius = 0.6;

            // VISIBILITY: Add ground warning stripe
            this.addWarningStripe('jump');
        } else {
            // Traffic cone - visible and properly proportioned
            const coneGeometry = new THREE.ConeGeometry(0.55, 1.3, 8);
            const coneMaterial = new THREE.MeshStandardMaterial({
                color: 0xFF5500, // Bright orange
                emissive: 0xFF6600, // Strong orange glow
                emissiveIntensity: 0.6,
                flatShading: true,
            });

            const cone = new THREE.Mesh(coneGeometry, coneMaterial);
            cone.position.y = 0.75;
            cone.castShadow = true;
            this.group.add(cone);

            // White reflective stripes
            const stripeMaterial = new THREE.MeshStandardMaterial({
                color: 0xFFFFFF,
                emissive: 0xFFFFFF,
                emissiveIntensity: 0.4,
                flatShading: true,
            });

            // Lower stripe (radii follow cone taper to sit flush)
            const stripe1Geometry = new THREE.CylinderGeometry(0.37, 0.43, 0.14, 8);
            const stripe1 = new THREE.Mesh(stripe1Geometry, stripeMaterial);
            stripe1.position.y = 0.4;
            this.group.add(stripe1);

            // Upper stripe (radii follow cone taper to sit flush)
            const stripe2Geometry = new THREE.CylinderGeometry(0.19, 0.24, 0.12, 8);
            const stripe2 = new THREE.Mesh(stripe2Geometry, stripeMaterial);
            stripe2.position.y = 0.85;
            this.group.add(stripe2);

            // Square base plate
            const baseGeometry = new THREE.BoxGeometry(1.0, 0.1, 1.0);
            const baseMaterial = new THREE.MeshStandardMaterial({
                color: 0xFF5500,
                emissive: 0xFF6600,
                emissiveIntensity: 0.3,
                flatShading: true,
            });
            const base = new THREE.Mesh(baseGeometry, baseMaterial);
            base.position.y = 0.05;
            this.group.add(base);

            this.height = 1.3;
            this.collisionRadius = 0.6;

            // VISIBILITY: Add ground warning stripe
            this.addWarningStripe('jump');
        }
    }

    createTallObstacle() {
        // TALL OBSTACLE - DOUBLE JUMP OVER OR SLIDE UNDER (2.3-3.2 units high)
        // Random tall obstacle type
        const types = ['barrier', 'banner', 'arch'];
        const chosen = types[Math.floor(Math.random() * types.length)];

        if (chosen === 'barrier') {
            // Barrier bar (like a parking gate) - LARGER for visibility
            // Poles
            const poleGeometry = new THREE.CylinderGeometry(0.15, 0.15, 2.8, 8);
            const poleMaterial = new THREE.MeshStandardMaterial({
                color: 0x696969,
                flatShading: true,
            });

            const leftPole = new THREE.Mesh(poleGeometry, poleMaterial);
            leftPole.position.set(-0.9, 1.4, 0);
            leftPole.castShadow = true;
            this.group.add(leftPole);

            const rightPole = new THREE.Mesh(poleGeometry, poleMaterial);
            rightPole.position.set(0.9, 1.4, 0);
            rightPole.castShadow = true;
            this.group.add(rightPole);

            // Barrier bar
            const barGeometry = new THREE.BoxGeometry(2.0, 0.2, 0.2);
            const barMaterial = new THREE.MeshStandardMaterial({
                color: 0xFF0000,
                emissive: 0xFF0000,
                emissiveIntensity: 0.5, // VISIBILITY: Increased glow from 0.3 to 0.5
                flatShading: true,
            });

            const bar = new THREE.Mesh(barGeometry, barMaterial);
            bar.position.y = 2.2;
            bar.castShadow = true;
            this.group.add(bar);

            // White stripes on bar
            for (let i = 0; i < 3; i++) {
                const stripeGeometry = new THREE.BoxGeometry(0.35, 0.22, 0.22);
                const stripeMaterial = new THREE.MeshStandardMaterial({
                    color: 0xFFFFFF,
                    flatShading: true,
                });

                const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
                stripe.position.set(-0.7 + i * 0.7, 2.2, 0);
                this.group.add(stripe);
            }

            this.height = 2.3;
            this.collisionRadius = 1.0;

            // VISIBILITY: Add ground warning stripe (slide indicator)
            this.addWarningStripe('slide');
        } else if (chosen === 'banner') {
            // Hanging banner - LARGER for visibility
            // Poles
            const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3.4, 8);
            const poleMaterial = new THREE.MeshStandardMaterial({
                color: 0x8B4513,
                flatShading: true,
            });

            const leftPole = new THREE.Mesh(poleGeometry, poleMaterial);
            leftPole.position.set(-1.0, 1.7, 0);
            leftPole.castShadow = true;
            this.group.add(leftPole);

            const rightPole = new THREE.Mesh(poleGeometry, poleMaterial);
            rightPole.position.set(1.0, 1.7, 0);
            rightPole.castShadow = true;
            this.group.add(rightPole);

            // Banner
            const bannerGeometry = new THREE.BoxGeometry(1.8, 0.7, 0.1);
            const bannerMaterial = new THREE.MeshStandardMaterial({
                color: COLORS.PRIMARY_PINK,
                flatShading: true,
            });

            const banner = new THREE.Mesh(bannerGeometry, bannerMaterial);
            banner.position.y = 2.6;
            banner.castShadow = true;
            this.group.add(banner);

            this.height = 3.0;
            this.collisionRadius = 1.0;

            // VISIBILITY: Add ground warning stripe (slide indicator)
            this.addWarningStripe('slide');
        } else {
            // Arch - LARGER for visibility
            const archGroup = new THREE.Group();

            // Left pillar
            const pillarGeometry = new THREE.BoxGeometry(0.5, 2.8, 0.5);
            const pillarMaterial = new THREE.MeshStandardMaterial({
                color: COLORS.SOFT_WHITE,
                flatShading: true,
            });

            const leftPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
            leftPillar.position.set(-0.9, 1.4, 0);
            leftPillar.castShadow = true;
            archGroup.add(leftPillar);

            const rightPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
            rightPillar.position.set(0.9, 1.4, 0);
            rightPillar.castShadow = true;
            archGroup.add(rightPillar);

            // Arch top
            const archGeometry = new THREE.BoxGeometry(2.2, 0.5, 0.5);
            const arch = new THREE.Mesh(archGeometry, pillarMaterial);
            arch.position.y = 3.0;
            arch.castShadow = true;
            archGroup.add(arch);

            this.group.add(archGroup);

            this.height = 3.2;
            this.collisionRadius = 1.0;

            // VISIBILITY: Add ground warning stripe (slide indicator)
            this.addWarningStripe('slide');
        }
    }

    addJumpIndicator() {
        // Green/Yellow upward arrow - BIGGER and more visible
        const arrowGeometry = new THREE.ConeGeometry(0.35, 0.7, 4);
        const arrowMaterial = new THREE.MeshStandardMaterial({
            color: 0x00FF00,
            emissive: 0x00FF00,
            emissiveIntensity: 0.7,
            flatShading: true,
        });

        const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        arrow.position.set(0, this.height + 0.6, 0);
        arrow.rotation.x = Math.PI; // Point up
        this.group.add(arrow);

        // Pulsing animation
        arrow.userData.pulseTime = 0;
    }

    addSlideIndicator() {
        // Red/Orange downward arrow - BIGGER and more visible
        const arrowGeometry = new THREE.ConeGeometry(0.35, 0.7, 4);
        const arrowMaterial = new THREE.MeshStandardMaterial({
            color: 0xFF0000,
            emissive: 0xFF0000,
            emissiveIntensity: 0.7,
            flatShading: true,
        });

        const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        arrow.position.set(0, 1.0, 0);
        // Arrow points down by default
        this.group.add(arrow);

        // Pulsing animation
        arrow.userData.pulseTime = 0;
    }

    // VISIBILITY: Add a colored warning stripe on the ground in front of obstacles
    addWarningStripe(type) {
        // Green for jump obstacles, yellow/orange for slide obstacles
        const color = type === 'jump' ? 0x00FF00 : 0xFFA500;

        const stripeGeometry = new THREE.PlaneGeometry(1.8, 0.4);
        const stripeMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
        });

        this.warningStripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
        this.warningStripe.rotation.x = -Math.PI / 2; // Lay flat on ground
        this.warningStripe.position.set(0, 0.02, 2.0); // In front of obstacle (toward player)
        this.warningStripe.userData.isWarningStripe = true;
        this.group.add(this.warningStripe);
    }

    update(deltaTime, playerZ) {
        // OPTIMIZED: Only pulse effects when close to player (within 30 units)
        const distanceToPlayer = Math.abs(this.position.z - playerZ);

        if (distanceToPlayer < 30) {
            // Update pulse time
            this.pulseTime = (this.pulseTime || 0) + deltaTime * 4;

            this.group.children.forEach(child => {
                if (child.userData.pulseTime !== undefined) {
                    child.userData.pulseTime += deltaTime * 5;
                    const pulse = (Math.sin(child.userData.pulseTime) + 1) * 0.5;
                    child.material.emissiveIntensity = 0.3 + pulse * 0.4;
                    child.scale.y = 1 + pulse * 0.2;
                }
            });

            // VISIBILITY: Pulse the warning stripe opacity
            if (this.warningStripe) {
                const stripePulse = 0.35 + Math.sin(this.pulseTime) * 0.2;
                this.warningStripe.material.opacity = stripePulse;
            }
        }

        // Check if obstacle is far behind player (cleanup)
        if (this.position.z > playerZ + 20) {
            this.isActive = false;
        }
    }

    getBoundingBox() {
        return {
            center: this.position,
            radius: this.collisionRadius,
            height: this.height
        };
    }

    getPosition() {
        return this.position;
    }

    dispose() {
        this.scene.remove(this.group);
        this.group.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
    }
}
