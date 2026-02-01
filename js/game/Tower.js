import * as THREE from 'three';
import { TOWER_TYPES } from '../utils/Constants.js';
import { Projectile } from './Projectile.js';

export class Tower {
    constructor(scene, lane, zPosition, type = 'BASIC') {
        this.scene = scene;
        this.lane = lane;
        this.type = type;
        this.config = TOWER_TYPES[type];

        this.position = new THREE.Vector3(
            lane === 0 ? -2 : lane === 1 ? 0 : 2, // Lane positions
            0,
            zPosition
        );

        this.attackCooldown = 0;
        this.attackInterval = 1 / this.config.attackSpeed; // seconds between attacks
        this.projectiles = [];

        this.createMesh();
    }

    createMesh() {
        this.group = new THREE.Group();

        // Base platform
        const baseGeometry = new THREE.CylinderGeometry(0.4, 0.5, 0.2, 8);
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: this.config.color,
            flatShading: true,
            roughness: 0.6,
        });

        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.castShadow = true;
        base.position.y = 0.1;
        this.group.add(base);

        // Tower body
        const bodyGeometry = new THREE.CylinderGeometry(0.2, 0.3, 0.6, 6);
        this.body = new THREE.Mesh(bodyGeometry, baseMaterial);
        this.body.castShadow = true;
        this.body.position.y = 0.5;
        this.group.add(this.body);

        // Top decoration (depends on type)
        if (this.type === 'BASIC') {
            // Bow
            const bowGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.1);
            const bowMaterial = new THREE.MeshStandardMaterial({
                color: 0xFF69B4,
                flatShading: true,
            });
            const bow = new THREE.Mesh(bowGeometry, bowMaterial);
            bow.position.y = 0.9;
            this.group.add(bow);
        } else if (this.type === 'FAST') {
            // Star
            const starGeometry = new THREE.SphereGeometry(0.15, 5, 5);
            const starMaterial = new THREE.MeshStandardMaterial({
                color: 0xFFD700,
                emissive: 0xFFD700,
                emissiveIntensity: 0.3,
                flatShading: true,
            });
            const star = new THREE.Mesh(starGeometry, starMaterial);
            star.position.y = 0.9;
            this.group.add(star);
        } else if (this.type === 'STRONG') {
            // Heart
            const heartGeometry = new THREE.SphereGeometry(0.15, 8, 8);
            const heartMaterial = new THREE.MeshStandardMaterial({
                color: 0xFF1493,
                flatShading: true,
            });
            const heart = new THREE.Mesh(heartGeometry, heartMaterial);
            heart.position.y = 0.9;
            this.group.add(heart);
        }

        // Attack range indicator (subtle circle)
        const rangeGeometry = new THREE.RingGeometry(
            this.config.range - 0.1,
            this.config.range,
            32
        );
        const rangeMaterial = new THREE.MeshBasicMaterial({
            color: this.config.color,
            transparent: true,
            opacity: 0.1,
            side: THREE.DoubleSide,
        });

        this.rangeIndicator = new THREE.Mesh(rangeGeometry, rangeMaterial);
        this.rangeIndicator.rotation.x = -Math.PI / 2;
        this.rangeIndicator.position.y = 0.05;
        this.group.add(this.rangeIndicator);

        // Position the group
        this.group.position.copy(this.position);
        this.scene.add(this.group);
    }

    update(deltaTime, enemies) {
        // Update attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }

        // Find enemies in range
        if (this.attackCooldown <= 0) {
            const target = this.findTarget(enemies);

            if (target) {
                this.attack(target);
                this.attackCooldown = this.attackInterval;
            }
        }

        // Update projectiles
        this.projectiles = this.projectiles.filter(projectile => {
            return projectile.update(deltaTime);
        });

        // Rotate body for visual feedback
        this.body.rotation.y += deltaTime * 0.5;
    }

    findTarget(enemies) {
        let closestEnemy = null;
        let closestDistance = this.config.range;

        for (const enemy of enemies) {
            if (!enemy.isAlive) continue;

            const distance = this.position.distanceTo(enemy.getPosition());

            if (distance < closestDistance) {
                closestDistance = distance;
                closestEnemy = enemy;
            }
        }

        return closestEnemy;
    }

    attack(enemy) {
        // Create projectile
        const startPos = this.position.clone();
        startPos.y = 0.8; // Shoot from top of tower

        const projectile = new Projectile(
            this.scene,
            startPos,
            enemy,
            this.config.damage,
            this.config.color
        );

        this.projectiles.push(projectile);

        // Visual feedback - quick scale pulse
        this.body.scale.set(1.2, 0.9, 1.2);
        setTimeout(() => {
            this.body.scale.set(1, 1, 1);
        }, 100);
    }

    getPosition() {
        return this.position;
    }

    dispose() {
        this.scene.remove(this.group);

        // Dispose all projectiles
        this.projectiles.forEach(p => p.dispose());
        this.projectiles = [];

        // Dispose geometries and materials
        this.group.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
    }
}
