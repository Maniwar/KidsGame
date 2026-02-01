import * as THREE from 'three';

export class GameCamera {
    constructor() {
        this.camera = new THREE.PerspectiveCamera(
            75, // FOV
            window.innerWidth / window.innerHeight, // Aspect ratio
            0.1, // Near plane
            1000 // Far plane
        );

        // Position camera ABOVE and BEHIND player for clear view ahead (endless runner style)
        this.cameraOffset = new THREE.Vector3(0, 5, 5);
        this.lookAtOffset = new THREE.Vector3(0, 1.5, -8);

        this.camera.position.copy(this.cameraOffset);
        this.camera.lookAt(this.lookAtOffset);

        // Death camera state
        this.isDeathCamera = false;
        this.deathCameraAngle = 0;
        this.deathCameraTarget = null;
    }

    update(playerPosition) {
        // If in death camera mode, orbit around character face
        if (this.isDeathCamera && this.deathCameraTarget) {
            this.updateDeathCamera();
            return;
        }

        // Smoothly follow the player with full 3D offset for diagonal view
        const targetPosition = new THREE.Vector3(
            playerPosition.x + this.cameraOffset.x,
            playerPosition.y + this.cameraOffset.y,
            playerPosition.z + this.cameraOffset.z
        );

        // Smooth camera movement (lerp)
        this.camera.position.lerp(targetPosition, 0.1);

        // Look at point ahead of the player
        const lookAtPosition = new THREE.Vector3(
            playerPosition.x + this.lookAtOffset.x,
            playerPosition.y + this.lookAtOffset.y,
            playerPosition.z + this.lookAtOffset.z
        );

        this.camera.lookAt(lookAtPosition);
    }

    // Dramatic spin to face close-up after death
    startDeathCamera(playerPosition, callback) {
        this.isDeathCamera = true;
        this.deathCameraTarget = playerPosition.clone();
        this.deathCameraAngle = 0;
        this.deathCameraCallback = callback;

        // Store original position for smooth transition
        this.deathCameraStartPos = this.camera.position.clone();
        this.deathCameraStartTime = performance.now();
        this.deathCameraDuration = 1200; // 1.2 seconds to spin around

        // Target: front-facing close-up of character face
        // Character faces -Z, so camera needs to be at +Z relative to character
        this.deathCameraEndPos = new THREE.Vector3(
            playerPosition.x,
            playerPosition.y + 1.5, // Face height
            playerPosition.z + 2.5  // In front of character
        );

        this.deathCameraFacePos = new THREE.Vector3(
            playerPosition.x,
            playerPosition.y + 1.3, // Look at face
            playerPosition.z
        );
    }

    updateDeathCamera() {
        const elapsed = performance.now() - this.deathCameraStartTime;
        const progress = Math.min(elapsed / this.deathCameraDuration, 1);

        // Easing function for smooth animation
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);

        if (progress < 1) {
            // Spin around the character while moving to front
            // Start from behind (+Z offset), spin 180 degrees to front
            const spinProgress = easeOutCubic;
            const angle = Math.PI * spinProgress; // 0 to PI (180 degrees)

            const radius = 4 - spinProgress * 1.5; // Start far, end closer
            const height = 5 - spinProgress * 3.5; // Start high, end at face level

            // Calculate orbital position
            const camX = this.deathCameraTarget.x + Math.sin(angle) * radius;
            const camY = this.deathCameraTarget.y + height;
            const camZ = this.deathCameraTarget.z + Math.cos(angle) * radius;

            this.camera.position.set(camX, camY, camZ);

            // Always look at the character's face
            this.camera.lookAt(this.deathCameraFacePos);

        } else {
            // Animation complete - hold at final position
            this.camera.position.copy(this.deathCameraEndPos);
            this.camera.lookAt(this.deathCameraFacePos);

            // Gentle idle sway
            const idleTime = (elapsed - this.deathCameraDuration) * 0.001;
            const swayX = Math.sin(idleTime * 0.8) * 0.1;
            const swayY = Math.sin(idleTime * 0.5) * 0.05;
            this.camera.position.x = this.deathCameraEndPos.x + swayX;
            this.camera.position.y = this.deathCameraEndPos.y + swayY;
            this.camera.lookAt(this.deathCameraFacePos);

            // Call callback once when spin completes
            if (this.deathCameraCallback) {
                this.deathCameraCallback();
                this.deathCameraCallback = null;
            }
        }
    }

    // Reset camera to normal gameplay mode
    resetDeathCamera() {
        this.isDeathCamera = false;
        this.deathCameraTarget = null;
        this.deathCameraCallback = null;
    }

    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }

    getCamera() {
        return this.camera;
    }
}
