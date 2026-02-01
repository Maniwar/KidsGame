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
    }

    update(playerPosition) {
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

    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }

    getCamera() {
        return this.camera;
    }
}
