import * as THREE from 'three';
import { GAME_CONFIG } from '../utils/Constants.js';

// Finish Line - milestone checkpoints that reward players and offer outfit changes
export class FinishLine {
    constructor(scene, zPosition, lineNumber) {
        this.scene = scene;
        this.zPosition = zPosition;
        this.lineNumber = lineNumber; // Which finish line this is (1, 2, 3, etc.)
        this.isCrossed = false;
        this.isActive = true;

        this.position = new THREE.Vector3(0, 0, zPosition);

        // Create the finish line visual
        this.createFinishLine();
    }

    createFinishLine() {
        this.group = new THREE.Group();

        // Calculate lane width for full coverage
        const laneWidth = GAME_CONFIG.LANE_WIDTH || 2.5;
        const totalWidth = laneWidth * 3 + 2; // Cover all 3 lanes plus margins

        // Checkered banner across the road
        const bannerHeight = 1.5;
        const bannerGeometry = new THREE.PlaneGeometry(totalWidth, bannerHeight);

        // Create checkered pattern texture (square canvas for square pattern)
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        // Draw checkered pattern - 2x2 squares per texture tile
        const squareSize = 32;
        for (let x = 0; x < canvas.width; x += squareSize) {
            for (let y = 0; y < canvas.height; y += squareSize) {
                const isWhite = ((x / squareSize) + (y / squareSize)) % 2 === 0;
                ctx.fillStyle = isWhite ? '#FFFFFF' : '#FF0000';
                ctx.fillRect(x, y, squareSize, squareSize);
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        // Calculate repeat to maintain square appearance on rectangular banner
        // Banner aspect ratio: totalWidth / bannerHeight ≈ 6.33
        // Want 2 rows of squares, so repeatY = 2, repeatX = 2 * aspectRatio
        const aspectRatio = totalWidth / bannerHeight;
        texture.repeat.set(Math.round(2 * aspectRatio), 2);

        const bannerMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            side: THREE.DoubleSide,
            emissive: 0xFFFFFF,
            emissiveIntensity: 0.2
        });

        // Main banner (horizontal, spanning across road)
        const banner = new THREE.Mesh(bannerGeometry, bannerMaterial);
        banner.position.set(0, 3.5, 0); // Above player height
        banner.rotation.x = Math.PI * 0.1; // Slight tilt toward player
        this.group.add(banner);

        // Support poles on each side
        const poleGeometry = new THREE.CylinderGeometry(0.15, 0.15, 5, 8);
        const poleMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFD700, // Gold poles
            metalness: 0.8,
            roughness: 0.2
        });

        const leftPole = new THREE.Mesh(poleGeometry, poleMaterial);
        leftPole.position.set(-totalWidth / 2 - 0.5, 2.5, 0);
        this.group.add(leftPole);

        const rightPole = new THREE.Mesh(poleGeometry, poleMaterial);
        rightPole.position.set(totalWidth / 2 + 0.5, 2.5, 0);
        this.group.add(rightPole);

        // Milestone number display
        this.createMilestoneNumber();

        // Ground stripe (checkered pattern on the road)
        const stripeHeight = 2;
        const stripeGeometry = new THREE.PlaneGeometry(totalWidth, stripeHeight);
        // Clone texture with different repeat for ground stripe dimensions
        const stripeTexture = texture.clone();
        stripeTexture.needsUpdate = true;
        const stripeAspectRatio = totalWidth / stripeHeight;
        stripeTexture.repeat.set(Math.round(2 * stripeAspectRatio), 2);
        const stripeMaterial = new THREE.MeshStandardMaterial({
            map: stripeTexture,
            side: THREE.DoubleSide,
            emissive: 0xFFFFFF,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.9
        });

        const groundStripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
        groundStripe.position.set(0, 0.02, 0); // Just above ground
        groundStripe.rotation.x = -Math.PI / 2; // Flat on ground
        this.group.add(groundStripe);

        // Glowing effect particles/aura
        this.createGlowEffect();

        this.group.position.copy(this.position);
        this.scene.add(this.group);
    }

    createMilestoneNumber() {
        // Create a canvas with the milestone number
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // Background with gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#FFD700');
        gradient.addColorStop(1, '#FFA500');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Border
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 8;
        ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

        // Milestone text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.fillText(`MILE ${this.lineNumber}`, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const signGeometry = new THREE.PlaneGeometry(2.5, 1.25);
        const signMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            side: THREE.DoubleSide,
            emissive: 0xFFD700,
            emissiveIntensity: 0.3
        });

        const sign = new THREE.Mesh(signGeometry, signMaterial);
        sign.position.set(0, 5.5, 0); // Above the banner
        this.group.add(sign);
    }

    createGlowEffect() {
        // Glowing rings on ground
        const ringGeometry = new THREE.RingGeometry(4, 4.5, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFD700,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });

        this.glowRing = new THREE.Mesh(ringGeometry, ringMaterial);
        this.glowRing.position.set(0, 0.03, 0);
        this.glowRing.rotation.x = -Math.PI / 2;
        this.group.add(this.glowRing);

        // Second ring for layered effect
        const ring2Geometry = new THREE.RingGeometry(5, 5.3, 32);
        const ring2Material = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });

        this.glowRing2 = new THREE.Mesh(ring2Geometry, ring2Material);
        this.glowRing2.position.set(0, 0.025, 0);
        this.glowRing2.rotation.x = -Math.PI / 2;
        this.group.add(this.glowRing2);
    }

    update(deltaTime, playerZ) {
        if (!this.isActive) return;

        // Remove if too far behind player
        if (this.zPosition > playerZ + 50) {
            this.isActive = false;
            return;
        }

        // Animate glow rings
        if (this.glowRing && !this.isCrossed) {
            this.glowRing.rotation.z += deltaTime * 0.5;
            this.glowRing.material.opacity = 0.4 + Math.sin(Date.now() * 0.003) * 0.2;
        }
        if (this.glowRing2 && !this.isCrossed) {
            this.glowRing2.rotation.z -= deltaTime * 0.3;
            this.glowRing2.material.opacity = 0.2 + Math.sin(Date.now() * 0.004) * 0.15;
        }
    }

    // Check if player is crossing this finish line
    checkCrossing(playerZ) {
        if (this.isCrossed) return false;

        // Player crosses when they pass the finish line Z position
        if (playerZ < this.zPosition && playerZ > this.zPosition - 3) {
            return true;
        }
        return false;
    }

    // Mark as crossed and trigger celebration effect
    markCrossed() {
        this.isCrossed = true;

        // Change colors to indicate crossed
        if (this.glowRing) {
            this.glowRing.material.color.setHex(0x00FF00); // Green
            this.glowRing.material.opacity = 0.8;
        }
        if (this.glowRing2) {
            this.glowRing2.material.color.setHex(0x00FF00);
            this.glowRing2.material.opacity = 0.6;
        }
    }

    // Get bonus coins for crossing (increases with each milestone)
    getBonusCoins() {
        // Base 100 coins + 50 per milestone number
        return 100 + (this.lineNumber * 50);
    }

    dispose() {
        if (this.group) {
            this.scene.remove(this.group);
            this.group.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
            });
        }
    }
}
