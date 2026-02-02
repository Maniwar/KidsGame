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

    // Orbit camera around character after death with gentle sway
    startDeathCamera(playerPosition, callback) {
        this.isDeathCamera = true;
        this.deathCameraTarget = playerPosition.clone();
        this.deathCameraAngle = 0;
        this.deathCameraCallback = callback;

        // Store original position for smooth transition
        this.deathCameraStartPos = this.camera.position.clone();
        this.deathCameraStartTime = performance.now();
        this.deathCameraDuration = 1200; // 1.2 seconds for initial spin

        // Camera position: IN FRONT of character, at face height
        this.deathCameraEndPos = new THREE.Vector3(
            playerPosition.x,
            playerPosition.y + 1.2, // Camera at face height
            playerPosition.z - 3.5  // In front of character
        );

        // Look BELOW the character to push kitty UP in the frame
        // (whatever the camera looks at gets centered - so look very low to push kitty high)
        this.deathCameraFacePos = new THREE.Vector3(
            playerPosition.x,
            playerPosition.y - 2.5, // Look way below ground - dramatic tilt down
            playerPosition.z
        );
    }

    updateDeathCamera() {
        const elapsed = performance.now() - this.deathCameraStartTime;
        const progress = Math.min(elapsed / this.deathCameraDuration, 1);

        // Easing function for smooth animation
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);

        if (progress < 1) {
            // Initial spin around to front
            const angle = Math.PI * easeOutCubic; // 0 to 180 degrees
            const radius = 4.5 - easeOutCubic * 1.0; // Start far, end closer
            const height = 2.5 - easeOutCubic * 1.3; // Start high, end at face level (1.2)

            const camX = this.deathCameraTarget.x + Math.sin(angle) * radius;
            const camY = this.deathCameraTarget.y + height;
            const camZ = this.deathCameraTarget.z + Math.cos(angle) * radius;

            this.camera.position.set(camX, camY, camZ);
            this.camera.lookAt(this.deathCameraFacePos);

        } else {
            // Continuous gentle sway around character
            const idleTime = (elapsed - this.deathCameraDuration) * 0.001;

            // Sway side to side and slight up/down
            const swayX = Math.sin(idleTime * 0.6) * 0.4; // Side to side
            const swayY = Math.sin(idleTime * 0.4) * 0.15; // Subtle up and down
            const swayZ = Math.cos(idleTime * 0.5) * 0.2; // Forward/back

            this.camera.position.set(
                this.deathCameraEndPos.x + swayX,
                this.deathCameraEndPos.y + swayY,
                this.deathCameraEndPos.z + swayZ
            );
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
