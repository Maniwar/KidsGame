import * as THREE from 'three';
import { GAME_CONFIG, COLORS } from '../utils/Constants.js';

export class Projectile {
    constructor(scene, startPosition, targetEnemy, damage, color = COLORS.PRIMARY_PINK) {
        this.scene = scene;
        this.position = startPosition.clone();
        this.target = targetEnemy;
        this.damage = damage;
        this.speed = GAME_CONFIG.PROJECTILE_SPEED;
        this.isActive = true;

        this.createMesh(color);
    }

    createMesh(color) {
        // Create a cute sparkle/star projectile
        const geometry = new THREE.SphereGeometry(0.15, 8, 8);
        const material = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.5,
            flatShading: true,
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);

        // Add a little glow effect
        const glowGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.3,
        });

        this.glow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.mesh.add(this.glow);
    }

    update(deltaTime) {
        if (!this.isActive) return false;

        // If target is dead or null, deactivate
        if (!this.target || !this.target.isAlive) {
            this.deactivate();
            return false;
        }

        // Move toward target
        const targetPos = this.target.getPosition();
        const direction = new THREE.Vector3()
            .subVectors(targetPos, this.position)
            .normalize();

        this.position.add(direction.multiplyScalar(this.speed * deltaTime));
        this.mesh.position.copy(this.position);

        // Rotate for effect
        this.mesh.rotation.x += deltaTime * 10;
        this.mesh.rotation.y += deltaTime * 10;

        // Check if we hit the target
        const distance = this.position.distanceTo(targetPos);
        if (distance < 0.5) {
            this.hit();
            return false;
        }

        // Check if projectile went too far (cleanup)
        if (distance > 50) {
            this.deactivate();
            return false;
        }

        return true;
    }

    hit() {
        // Deal damage to target
        if (this.target && this.target.isAlive) {
            this.target.takeDamage(this.damage);
        }

        // Create hit effect (sparkles)
        this.createHitEffect();

        this.deactivate();
    }

    createHitEffect() {
        // Simple particle burst effect
        const particleCount = 8;
        const particles = [];

        for (let i = 0; i < particleCount; i++) {
            const geometry = new THREE.SphereGeometry(0.05, 4, 4);
            const material = new THREE.MeshBasicMaterial({
                color: this.mesh.material.color,
            });

            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(this.position);

            // Random direction
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 2;
            particle.userData.velocity = new THREE.Vector3(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                (Math.random() - 0.5) * speed
            );

            this.scene.add(particle);
            particles.push(particle);

            // Animate and remove
            let life = 0.3;
            const animate = () => {
                life -= 0.016;
                if (life <= 0) {
                    this.scene.remove(particle);
                    particle.geometry.dispose();
                    particle.material.dispose();
                    return;
                }

                particle.position.add(particle.userData.velocity.clone().multiplyScalar(0.016));
                particle.userData.velocity.y -= 5 * 0.016; // Gravity
                particle.scale.multiplyScalar(0.95);

                requestAnimationFrame(animate);
            };
            animate();
        }
    }

    deactivate() {
        this.isActive = false;
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        if (this.glow) {
            this.glow.geometry.dispose();
            this.glow.material.dispose();
        }
    }

    dispose() {
        this.deactivate();
    }
}
