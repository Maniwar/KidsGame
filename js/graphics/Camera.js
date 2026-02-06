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

        // Celebration camera state
        this.isCelebrationCamera = false;
        this.celebrationCameraTarget = null;
    }

    update(playerPosition) {
        // If in death camera mode, orbit around character face
        if (this.isDeathCamera && this.deathCameraTarget) {
            this.updateDeathCamera();
            return;
        }

        // If in return camera mode (spinning back during countdown)
        if (this.isReturnCamera && this.returnCameraTarget) {
            this.updateReturnCamera();
            return;
        }

        // If in celebration camera mode, orbit around character
        if (this.isCelebrationCamera && this.celebrationCameraTarget) {
            this.updateCelebrationCamera();
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

        // Look at the GROUND in front of kitty - this centers the ground in frame,
        // pushing kitty to the upper portion of the screen
        this.deathCameraFacePos = new THREE.Vector3(
            playerPosition.x,
            -0.5, // Below ground level to push kitty higher
            playerPosition.z + 3 // Further in front of kitty
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

    // Celebration camera - spins around to see Kitty's face celebrating (like death camera)
    startCelebrationCamera(playerPosition) {
        this.isCelebrationCamera = true;
        this.celebrationCameraTarget = playerPosition.clone();
        this.celebrationCameraStartTime = performance.now();
        this.celebrationCameraDuration = 1000; // 1 second spin

        // Spin parameters (same as used in updateCelebrationCamera)
        this.celebrationStartRadius = 5;
        this.celebrationEndRadius = 4; // radius at end of spin
        this.celebrationStartHeight = 3;
        this.celebrationEndHeight = 1.5;

        // Look at Kitty's face/upper body
        this.celebrationLookAt = new THREE.Vector3(
            playerPosition.x,
            playerPosition.y + 1.0, // Face height
            playerPosition.z
        );
    }

    updateCelebrationCamera() {
        if (!this.isCelebrationCamera) return false;

        const elapsed = performance.now() - this.celebrationCameraStartTime;
        const progress = Math.min(elapsed / this.celebrationCameraDuration, 1);

        // Smooth easing
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);

        // Spin around from behind to front
        // angle: 0 (behind) -> PI (in front)
        const angle = Math.PI * easeOutCubic;
        const radius = this.celebrationStartRadius - easeOutCubic * (this.celebrationStartRadius - this.celebrationEndRadius);
        const height = this.celebrationStartHeight - easeOutCubic * (this.celebrationStartHeight - this.celebrationEndHeight);

        let camX = this.celebrationCameraTarget.x + Math.sin(angle) * radius;
        let camY = this.celebrationCameraTarget.y + height;
        let camZ = this.celebrationCameraTarget.z + Math.cos(angle) * radius;

        // After spin completes, add gentle sway
        if (progress >= 1) {
            const idleTime = (elapsed - this.celebrationCameraDuration) * 0.001;
            camX += Math.sin(idleTime * 0.8) * 0.4;
            camY += Math.sin(idleTime * 0.5) * 0.15;
            camZ += Math.cos(idleTime * 0.6) * 0.2;
        }

        this.camera.position.set(camX, camY, camZ);
        this.camera.lookAt(this.celebrationLookAt);

        return true;
    }

    // Reset celebration camera back to normal gameplay position
    resetCelebrationCamera(playerPosition) {
        this.isCelebrationCamera = false;
        this.isReturnCamera = false;
        this.celebrationCameraTarget = null;

        // If player position provided, snap camera to correct gameplay position
        if (playerPosition) {
            this.camera.position.set(
                playerPosition.x + this.cameraOffset.x,
                playerPosition.y + this.cameraOffset.y,
                playerPosition.z + this.cameraOffset.z
            );
            // Look at point ahead of player
            const lookAt = new THREE.Vector3(
                playerPosition.x + this.lookAtOffset.x,
                playerPosition.y + this.lookAtOffset.y,
                playerPosition.z + this.lookAtOffset.z
            );
            this.camera.lookAt(lookAt);
        }
    }

    // Start spinning camera back to behind Kitty (during countdown)
    startReturnCamera(playerPosition) {
        this.isCelebrationCamera = false; // Stop celebration sway
        this.isReturnCamera = true;
        this.returnCameraTarget = playerPosition.clone();
        this.returnCameraStartTime = performance.now();
        this.returnCameraDuration = 2100; // Match 3-2-1 countdown timing (3 x 700ms)

        // Start from in-front position (where celebration ends)
        this.returnStartRadius = this.celebrationEndRadius || 4;
        this.returnStartHeight = this.celebrationEndHeight || 1.5;

        // End at gameplay camera position (behind and above)
        this.returnEndRadius = 5; // Distance behind player
        this.returnEndHeight = 5; // cameraOffset.y

        // Start looking at Kitty, transition to looking ahead
        this.returnStartLookAt = new THREE.Vector3(
            playerPosition.x,
            playerPosition.y + 1.0,
            playerPosition.z
        );
        this.returnEndLookAt = new THREE.Vector3(
            playerPosition.x + this.lookAtOffset.x,
            playerPosition.y + this.lookAtOffset.y,
            playerPosition.z + this.lookAtOffset.z
        );
    }

    updateReturnCamera() {
        if (!this.isReturnCamera) return false;

        const elapsed = performance.now() - this.returnCameraStartTime;
        const progress = Math.min(elapsed / this.returnCameraDuration, 1);

        // Smooth easing
        const easeInOutCubic = progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        // Spin from front (PI) back to behind (0)
        // angle: PI (in front) -> 0 (behind)
        const angle = Math.PI * (1 - easeInOutCubic);
        const radius = this.returnStartRadius + easeInOutCubic * (this.returnEndRadius - this.returnStartRadius);
        const height = this.returnStartHeight + easeInOutCubic * (this.returnEndHeight - this.returnStartHeight);

        const camX = this.returnCameraTarget.x + Math.sin(angle) * radius;
        const camY = this.returnCameraTarget.y + height;
        const camZ = this.returnCameraTarget.z + Math.cos(angle) * radius;

        this.camera.position.set(camX, camY, camZ);

        // Interpolate lookAt from Kitty to ahead
        const lookAt = new THREE.Vector3().lerpVectors(
            this.returnStartLookAt,
            this.returnEndLookAt,
            easeInOutCubic
        );
        this.camera.lookAt(lookAt);

        // When complete, camera is in gameplay position
        if (progress >= 1) {
            this.isReturnCamera = false;
        }

        return true;
    }

    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }

    getCamera() {
        return this.camera;
    }
}
