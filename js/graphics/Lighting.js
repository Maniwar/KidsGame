import * as THREE from 'three';

export class GameLighting {
    constructor(scene) {
        this.scene = scene;
        this.setupLights();
    }

    setupLights() {
        // Ambient light for overall soft illumination
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(this.ambientLight);

        // Directional light (sun) for shadows and definition
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.directionalLight.position.set(10, 20, 10);
        this.directionalLight.castShadow = true;

        // Configure shadow properties
        // PERFORMANCE: Tighter shadow frustum reduces wasted shadow map pixels
        this.directionalLight.shadow.camera.left = -15;
        this.directionalLight.shadow.camera.right = 15;
        this.directionalLight.shadow.camera.top = 15;
        this.directionalLight.shadow.camera.bottom = -15;
        this.directionalLight.shadow.camera.near = 1;
        this.directionalLight.shadow.camera.far = 60;
        // PERFORMANCE: Reduced shadow map from 2048 to 1024 - big mobile perf gain
        this.directionalLight.shadow.mapSize.width = 1024;
        this.directionalLight.shadow.mapSize.height = 1024;
        // PERFORMANCE: Add shadow bias to reduce artifacts at lower resolution
        this.directionalLight.shadow.bias = -0.001;

        this.scene.add(this.directionalLight);

        // Hemisphere light for nice gradient (sky to ground)
        this.hemisphereLight = new THREE.HemisphereLight(
            0x87CEEB, // Sky color (blue)
            0xFFB7C5, // Ground color (pink)
            0.4
        );
        this.scene.add(this.hemisphereLight);

        // Add a soft fill light from the side
        this.fillLight = new THREE.DirectionalLight(0xFFB7C5, 0.3);
        this.fillLight.position.set(-10, 5, 5);
        this.scene.add(this.fillLight);
    }

    updateLightPosition(playerZ) {
        // Keep directional light following the player
        this.directionalLight.position.z = playerZ - 10;
        this.directionalLight.target.position.z = playerZ;
        this.directionalLight.target.updateMatrixWorld();
    }

    // For future day/night cycle
    setTimeOfDay(timePercent) {
        // timePercent: 0 = dawn, 0.25 = day, 0.5 = dusk, 0.75 = night, 1.0 = dawn
        // To be implemented in Phase 3
    }
}
