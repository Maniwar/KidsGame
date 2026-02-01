import * as THREE from 'three';
import { GAME_CONFIG, ENEMY_COLORS } from '../utils/Constants.js';

export class Enemy {
    constructor(scene, lane, zPosition, type = 'BASIC') {
        this.scene = scene;
        this.lane = lane;
        this.type = type;
        this.health = GAME_CONFIG.ENEMY_HEALTH;
        this.maxHealth = GAME_CONFIG.ENEMY_HEALTH;
        this.damage = GAME_CONFIG.ENEMY_DAMAGE;
        this.speed = GAME_CONFIG.ENEMY_SPEED;
        this.isAlive = true;

        this.position = new THREE.Vector3(
            GAME_CONFIG.LANE_POSITIONS[lane],
            0.5,
            zPosition
        );

        this.createMesh();
    }

    createMesh() {
        this.group = new THREE.Group();

        // Simple enemy design (cute blob monster)
        const bodyGeometry = new THREE.SphereGeometry(0.4, 12, 12);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: ENEMY_COLORS[this.type],
            flatShading: true,
            roughness: 0.8,
        });

        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.castShadow = true;
        this.body.position.y = 0.4;
        this.group.add(this.body);

        // Eyes (white with black pupils - not scary, just cute)
        const eyeWhiteGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const eyeWhiteMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            flatShading: true,
        });

        const leftEyeWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial);
        leftEyeWhite.position.set(-0.15, 0.5, 0.3);
        this.group.add(leftEyeWhite);

        const rightEyeWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial);
        rightEyeWhite.position.set(0.15, 0.5, 0.3);
        this.group.add(rightEyeWhite);

        // Pupils
        const pupilGeometry = new THREE.SphereGeometry(0.05, 6, 6);
        const pupilMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            flatShading: true,
        });

        const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        leftPupil.position.set(-0.15, 0.5, 0.35);
        this.group.add(leftPupil);

        const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        rightPupil.position.set(0.15, 0.5, 0.35);
        this.group.add(rightPupil);

        // Position group
        this.group.position.copy(this.position);
        this.scene.add(this.group);
    }

    update(deltaTime, playerPosition) {
        if (!this.isAlive) return;

        // Chase the player - move toward player's Z position
        const directionToPlayer = playerPosition.z - this.position.z;

        if (directionToPlayer < 0) {
            // Player is behind, move backward (chase)
            this.position.z -= this.speed * deltaTime;
        } else {
            // Player is ahead, move forward (chase)
            this.position.z += this.speed * deltaTime;
        }

        // Bobbing animation
        const bobOffset = Math.sin(Date.now() * 0.005) * 0.1;
        this.group.position.set(
            this.position.x,
            this.position.y + bobOffset,
            this.position.z
        );

        // Slight rotation for personality
        this.group.rotation.y += deltaTime;
    }

    takeDamage(amount) {
        this.health -= amount;

        if (this.health <= 0) {
            this.die();
        } else {
            // Flash red when hit
            this.flashDamage();
        }
    }

    flashDamage() {
        const originalColor = this.body.material.color.getHex();
        this.body.material.color.setHex(0xFF0000);

        setTimeout(() => {
            this.body.material.color.setHex(originalColor);
        }, 100);
    }

    die() {
        this.isAlive = false;
        this.scene.remove(this.group);
    }

    getPosition() {
        return this.position;
    }

    getBoundingBox() {
        // Simple sphere collision
        return {
            center: this.position,
            radius: 0.4
        };
    }

    dispose() {
        this.scene.remove(this.group);
        this.body.geometry.dispose();
        this.body.material.dispose();
    }
}
