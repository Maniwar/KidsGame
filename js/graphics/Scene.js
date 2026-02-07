import * as THREE from 'three';
import { COLORS } from '../utils/Constants.js';

export class GameScene {
    constructor(settings = {}) {
        this.settings = settings;
        this.scene = new THREE.Scene();
        this.renderer = null;
        this.backgroundObjects = [];
        this.clouds = [];
        this.buildings = [];
        this.decorations = [];
        this.sidewalkCharacters = [];
        this.groundSegments = [];
        this.movingObjects = []; // Objects that move toward player
        this.movingObstaclesCache = []; // PERFORMANCE: Cached list of obstacle-type moving objects
        this.streetLamps = []; // Track street lamps for cleanup/respawn
        this.trees = []; // Track trees for cleanup/respawn
        this.nextBuildingZ = -50;
        this.buildingSpacing = 25; // Space between buildings (accounts for long buildings)
        this.nextCharacterSpawnZ = -30;
        this.characterSpawnChance = 0.15; // OPTIMIZED: Reduced spawn rate for better FPS
        this.nextGroundSegmentZ = 200; // FIXED: Start much further ahead
        this.groundSegmentLength = 150; // FIXED: Longer segments to reduce gaps
        this.movingObjectSpawnChance = 0.12; // Increased from 0.08 for more action

        // Street lamp and tree spawning - OPTIMIZED spacing
        this.nextLampZ = -100;
        this.lampSpacing = 25; // PERFORMANCE: Increased from 15 to reduce lamp count
        this.nextTreeZ = -100;
        this.treeSpacing = 20; // PERFORMANCE: Increased from 12 to reduce tree count

        // PERFORMANCE: Accumulated animation time (replaces Date.now() calls)
        this.animTime = 0;

        // PERFORMANCE: Shared geometries and materials for trees/lamps
        this.sharedGeometries = {};
        this.sharedMaterials = {};
        this.initSharedTreeLampResources();

        this.setupRenderer();
        this.setupEnvironment();
    }

    // PERFORMANCE: Pre-create shared geometries and materials
    initSharedTreeLampResources() {
        // Lamp geometries
        this.sharedGeometries.lampPost = new THREE.CylinderGeometry(0.1, 0.12, 3, 6);
        this.sharedGeometries.lampSphere = new THREE.SphereGeometry(0.3, 6, 6);
        this.sharedGeometries.lampBox = new THREE.BoxGeometry(0.4, 0.5, 0.4);

        // Tree geometries (one size, scale via mesh.scale)
        this.sharedGeometries.trunk = new THREE.CylinderGeometry(0.15, 0.25, 2, 6);
        this.sharedGeometries.foliageSphere = new THREE.SphereGeometry(1.2, 6, 6);
        this.sharedGeometries.foliageCone = new THREE.ConeGeometry(1, 1.2, 6);

        // PERFORMANCE: Ground segment shared geometries
        this.sharedGeometries.laneMarker = new THREE.BoxGeometry(0.15, 0.03, 2);
        this.sharedGeometries.slab = new THREE.BoxGeometry(1.8, 0.06, 2.5);
        this.sharedGeometries.slabGap = new THREE.BoxGeometry(1.8, 0.03, 0.1);
        this.sharedGeometries.cobble = new THREE.CylinderGeometry(0.1, 0.1, 0.04, 6);
        this.sharedGeometries.grass = new THREE.ConeGeometry(0.15, 0.35, 4);
        this.sharedGeometries.flower = new THREE.SphereGeometry(0.08, 6, 6);
        this.sharedGeometries.cloudSphere = new THREE.SphereGeometry(1, 6, 6);

        // PERFORMANCE: Shared ground segment plane geometry and material (avoids creating new ones per segment)
        this.sharedGeometries.segmentPlane = null; // Lazy-init since groundSegmentLength needed
        this.sharedMaterials.segmentPlane = new THREE.MeshStandardMaterial({
            color: COLORS.PRIMARY_PINK,
            roughness: 0.8,
            metalness: 0.1,
        });

        // PERFORMANCE: Shared window geometry and material for buildings
        this.sharedMaterials.buildingWindow = new THREE.MeshStandardMaterial({
            color: 0x87CEEB,
            emissive: 0x87CEEB,
            emissiveIntensity: 0.3
        });
        this.sharedMaterials.sideWindow = new THREE.MeshStandardMaterial({
            color: 0x87CEEB,
            emissive: 0x87CEEB,
            emissiveIntensity: 0.4
        });
        this.sharedGeometries.sideWindow = new THREE.BoxGeometry(0.8, 1.2, 0.1);

        // Shared materials (will clone and modify color as needed)
        this.sharedMaterials.lampPost = new THREE.MeshStandardMaterial({ color: 0x696969, flatShading: true });
        this.sharedMaterials.trunk = new THREE.MeshStandardMaterial({ color: 0x8B4513, flatShading: true });
        this.sharedMaterials.laneMarker = new THREE.MeshStandardMaterial({
            color: COLORS.SOFT_WHITE,
            flatShading: true,
            emissive: COLORS.SOFT_WHITE,
            emissiveIntensity: 0.2
        });
        this.sharedMaterials.slab = new THREE.MeshStandardMaterial({
            color: 0xC8C8C8,
            roughness: 0.85,
            flatShading: true
        });
        this.sharedMaterials.slabGap = new THREE.MeshStandardMaterial({
            color: 0x808080,
            roughness: 0.95
        });
        this.sharedMaterials.cobble = new THREE.MeshStandardMaterial({
            color: 0xC0C0C0,
            flatShading: true,
            roughness: 0.9
        });
        this.sharedMaterials.grass = new THREE.MeshStandardMaterial({
            color: COLORS.GRASS_GREEN,
            flatShading: true,
        });
        // Pre-create flower materials for each color
        this.sharedMaterials.flowerPink = new THREE.MeshStandardMaterial({ color: 0xFF69B4, flatShading: true });
        this.sharedMaterials.flowerGold = new THREE.MeshStandardMaterial({ color: 0xFFD700, flatShading: true });
        this.sharedMaterials.flowerLightPink = new THREE.MeshStandardMaterial({ color: 0xFFB6C1, flatShading: true });
    }

    setupRenderer() {
        const canvas = document.getElementById('game-canvas');

        // PERFORMANCE: Detect mobile for optimized settings
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
                      || window.innerWidth < 768;

        // Use settings if provided, otherwise auto-detect
        const useAntialias = this.settings.antialias !== undefined
            ? this.settings.antialias
            : !isMobile;

        this.renderer = new THREE.WebGLRenderer({
            canvas,
            // Use setting from user preference or auto-detect
            antialias: useAntialias,
            alpha: false,
            // Always use high-performance to avoid slow fallback paths on some GPUs (Adreno, etc.)
            powerPreference: 'high-performance'
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        // PERFORMANCE: Limit pixel ratio - 1.5 on desktop, 1.0 on mobile for big FPS gain
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.0 : 1.5));
        this.renderer.shadowMap.enabled = true;
        // PERFORMANCE: PCFShadowMap is faster than PCFSoftShadowMap with minimal quality loss
        this.renderer.shadowMap.type = THREE.PCFShadowMap;

        // Sky gradient background
        this.renderer.setClearColor(new THREE.Color(0x87CEEB));
    }

    setupEnvironment() {
        // Sky gradient
        this.createSkyGradient();

        // OPTIMIZED: Disabled fog to prevent pink wall gaps between segments
        // this.scene.fog = new THREE.Fog(0xFFB7C5, 50, 200);

        // Ground
        this.createGround();

        // Background elements
        this.createBackgroundBuildings();
        this.createSideDecorations();
        this.createClouds();
    }

    createSkyGradient() {
        // Create a large sphere for sky gradient
        const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
        const skyMaterial = new THREE.ShaderMaterial({
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition).y;
                    // FIXED: Gradient from light blue (horizon) to sky blue (top) - no more pink!
                    vec3 skyColor = mix(vec3(0.75, 0.92, 0.98), vec3(0.53, 0.81, 0.92), max(h, 0.0));
                    gl_FragColor = vec4(skyColor, 1.0);
                }
            `,
            side: THREE.BackSide
        });

        this.sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(this.sky);
    }

    createGround() {
        // Main ground plane (extremely long to cover full playable area)
        const groundGeometry = new THREE.PlaneGeometry(200, 20000); // EXTENDED: Doubled length
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: COLORS.PRIMARY_PINK,
            roughness: 0.9,
            metalness: 0.1,
        });

        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.y = 0;
        this.ground.position.z = -10000; // EXTENDED: Center it even further ahead
        this.ground.receiveShadow = true;
        // PERFORMANCE: Ground never moves, skip per-frame matrix recalculation
        this.ground.matrixAutoUpdate = false;
        this.ground.updateMatrix();
        this.scene.add(this.ground);

        // Sidewalks (also very long)
        this.createSidewalks();

        // Create initial ground segments (lane markers) - 12 covers 1800m (spawn range is 1500m)
        for (let i = 0; i < 12; i++) {
            this.spawnGroundSegment(this.nextGroundSegmentZ);
            this.nextGroundSegmentZ -= this.groundSegmentLength;
        }
    }

    spawnGroundSegment(startZ) {
        const segmentGroup = new THREE.Group();
        const endZ = startZ - this.groundSegmentLength;

        // PERFORMANCE: Use shared geometry and material (all segments same size)
        if (!this.sharedGeometries.segmentPlane) {
            this.sharedGeometries.segmentPlane = new THREE.PlaneGeometry(8, this.groundSegmentLength);
        }

        const segmentPlane = new THREE.Mesh(this.sharedGeometries.segmentPlane, this.sharedMaterials.segmentPlane);
        segmentPlane.rotation.x = -Math.PI / 2;
        segmentPlane.position.y = 0.005;
        segmentPlane.position.z = startZ - this.groundSegmentLength / 2;
        segmentPlane.receiveShadow = true;
        segmentGroup.add(segmentPlane);

        // PERFORMANCE: Use shared geometries and materials for lane markers
        const dividerPositions = [-1, 1];
        dividerPositions.forEach(x => {
            for (let z = startZ; z > endZ; z -= 5) {
                const marker = new THREE.Mesh(this.sharedGeometries.laneMarker, this.sharedMaterials.laneMarker);
                marker.position.set(x, 0.05, z);
                segmentGroup.add(marker);
            }
        });

        // PERFORMANCE: Use shared geometries for slabs
        const slabDepth = 2.5;
        const gapSize = 0.1;

        for (let z = startZ; z > endZ; z -= (slabDepth + gapSize)) {
            // Left sidewalk slabs
            const leftSlab = new THREE.Mesh(this.sharedGeometries.slab, this.sharedMaterials.slab);
            leftSlab.position.set(-6, 0.08, z - slabDepth/2);
            leftSlab.receiveShadow = true;
            segmentGroup.add(leftSlab);

            // Gap after slab
            if (z - slabDepth - gapSize > endZ) {
                const leftGap = new THREE.Mesh(this.sharedGeometries.slabGap, this.sharedMaterials.slabGap);
                leftGap.position.set(-6, 0.065, z - slabDepth - gapSize/2);
                segmentGroup.add(leftGap);
            }

            // Right sidewalk slabs
            const rightSlab = new THREE.Mesh(this.sharedGeometries.slab, this.sharedMaterials.slab);
            rightSlab.position.set(6, 0.08, z - slabDepth/2);
            rightSlab.receiveShadow = true;
            segmentGroup.add(rightSlab);

            // Gap after slab
            if (z - slabDepth - gapSize > endZ) {
                const rightGap = new THREE.Mesh(this.sharedGeometries.slabGap, this.sharedMaterials.slabGap);
                rightGap.position.set(6, 0.065, z - slabDepth - gapSize/2);
                segmentGroup.add(rightGap);
            }
        }

        // PERFORMANCE: Use shared cobble geometry and material
        for (let z = startZ; z > endZ; z -= 8) {
            // Left sidewalk - 3 cobbles
            for (let i = 0; i < 3; i++) {
                const cobble = new THREE.Mesh(this.sharedGeometries.cobble, this.sharedMaterials.cobble);
                cobble.position.set(
                    -6 + (Math.random() - 0.5) * 1.5,
                    0.06,
                    z + (Math.random() - 0.5) * 2
                );
                cobble.rotation.y = Math.random() * Math.PI * 2;
                segmentGroup.add(cobble);
            }

            // Right sidewalk - 3 cobbles
            for (let i = 0; i < 3; i++) {
                const cobble = new THREE.Mesh(this.sharedGeometries.cobble, this.sharedMaterials.cobble);
                cobble.position.set(
                    6 + (Math.random() - 0.5) * 1.5,
                    0.06,
                    z + (Math.random() - 0.5) * 2
                );
                cobble.rotation.y = Math.random() * Math.PI * 2;
                segmentGroup.add(cobble);
            }
        }

        // PERFORMANCE: Use shared grass and flower geometries/materials
        const flowerMaterials = [this.sharedMaterials.flowerPink, this.sharedMaterials.flowerGold, this.sharedMaterials.flowerLightPink];

        for (let z = startZ; z > endZ; z -= 12) {
            // Left yard - just 2 grass spots
            for (let i = 0; i < 2; i++) {
                const grass = new THREE.Mesh(this.sharedGeometries.grass, this.sharedMaterials.grass);
                grass.position.set(
                    -9 - Math.random() * 2,
                    0.18,
                    z + (Math.random() - 0.5) * 3
                );
                segmentGroup.add(grass);

                // Maybe add a single flower
                if (Math.random() < 0.5) {
                    const flower = new THREE.Mesh(
                        this.sharedGeometries.flower,
                        flowerMaterials[Math.floor(Math.random() * flowerMaterials.length)]
                    );
                    flower.position.set(grass.position.x + 0.1, 0.35, grass.position.z);
                    segmentGroup.add(flower);
                }
            }

            // Right yard - just 2 grass spots
            for (let i = 0; i < 2; i++) {
                const grass = new THREE.Mesh(this.sharedGeometries.grass, this.sharedMaterials.grass);
                grass.position.set(
                    9 + Math.random() * 2,
                    0.18,
                    z + (Math.random() - 0.5) * 3
                );
                segmentGroup.add(grass);

                // Maybe add a single flower
                if (Math.random() < 0.5) {
                    const flower = new THREE.Mesh(
                        this.sharedGeometries.flower,
                        flowerMaterials[Math.floor(Math.random() * flowerMaterials.length)]
                    );
                    flower.position.set(grass.position.x - 0.1, 0.35, grass.position.z);
                    segmentGroup.add(flower);
                }
            }
        }

        segmentGroup.userData.startZ = startZ;
        segmentGroup.userData.endZ = endZ;

        // PERFORMANCE: Ground segments never move after placement - skip per-frame matrix recalc
        segmentGroup.traverse((child) => {
            child.matrixAutoUpdate = false;
            child.updateMatrix();
        });

        this.scene.add(segmentGroup);
        this.groundSegments.push(segmentGroup);
    }

    createSidewalks() {
        // EXTENDED: Sidewalks doubled in length to match ground plane
        const sidewalkGeometry = new THREE.BoxGeometry(4, 0.1, 20000);
        const sidewalkMaterial = new THREE.MeshStandardMaterial({
            color: 0xD3D3D3,
            roughness: 0.8
        });

        const leftSidewalk = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
        leftSidewalk.position.set(-6, 0.05, -10000);
        leftSidewalk.receiveShadow = true;
        // PERFORMANCE: Static object - skip per-frame matrix recalculation
        leftSidewalk.matrixAutoUpdate = false;
        leftSidewalk.updateMatrix();
        this.scene.add(leftSidewalk);

        const rightSidewalk = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
        rightSidewalk.position.set(6, 0.05, -10000);
        rightSidewalk.receiveShadow = true;
        // PERFORMANCE: Static object - skip per-frame matrix recalculation
        rightSidewalk.matrixAutoUpdate = false;
        rightSidewalk.updateMatrix();
        this.scene.add(rightSidewalk);

        // GREEN GRASS STRIPS - where buildings sit (earth/nature strip instead of pink)
        const grassStripGeometry = new THREE.PlaneGeometry(100, 20000);
        const grassStripMaterial = new THREE.MeshStandardMaterial({
            color: COLORS.GRASS_GREEN,
            roughness: 0.9,
            metalness: 0.1
        });

        // Left grass strip (beyond left sidewalk)
        const leftGrassStrip = new THREE.Mesh(grassStripGeometry, grassStripMaterial);
        leftGrassStrip.rotation.x = -Math.PI / 2;
        leftGrassStrip.position.set(-58, 0.02, -10000); // Positioned beyond sidewalk
        leftGrassStrip.receiveShadow = true;
        // PERFORMANCE: Static object - skip per-frame matrix recalculation
        leftGrassStrip.matrixAutoUpdate = false;
        leftGrassStrip.updateMatrix();
        this.scene.add(leftGrassStrip);

        // Right grass strip (beyond right sidewalk)
        const rightGrassStrip = new THREE.Mesh(grassStripGeometry, grassStripMaterial);
        rightGrassStrip.rotation.x = -Math.PI / 2;
        rightGrassStrip.position.set(58, 0.02, -10000); // Positioned beyond sidewalk
        rightGrassStrip.receiveShadow = true;
        // PERFORMANCE: Static object - skip per-frame matrix recalculation
        rightGrassStrip.matrixAutoUpdate = false;
        rightGrassStrip.updateMatrix();
        this.scene.add(rightGrassStrip);

        // Concrete sections are now added per segment in spawnGroundSegment()
    }

    createBackgroundBuildings() {
        // Create initial set of buildings - optimized count for better FPS
        for (let i = 0; i < 18; i++) { // OPTIMIZED: Reduced from 25 to 18 for better performance
            this.spawnBuilding(this.nextBuildingZ);
            this.nextBuildingZ -= this.buildingSpacing;
        }
    }

    spawnBuilding(z) {
        // Calculate progression factor based on distance (gets cooler the further you go!)
        const distance = Math.abs(z);
        const progression = Math.min(distance / 500, 1.5);

        // TIER 1: Basic cozy buildings (start of game)
        const basicTypes = [
            { width: 4, height: 8, depth: 3, color: 0xFFB7C5, roofType: 'cone', style: 'house' },
            { width: 3, height: 6, depth: 3, color: 0xFFE4E1, roofType: 'cone', style: 'house' },
            { width: 3.5, height: 7, depth: 3, color: 0xFFDAB9, roofType: 'cone', style: 'house' },
            // Wide shops
            { width: 8, height: 5, depth: 4, color: 0xFFC0CB, roofType: 'flat', style: 'shop' },
            { width: 7, height: 4, depth: 3.5, color: 0xFFE4B5, roofType: 'flat', style: 'shop' },
            // Long buildings (deep)
            { width: 5, height: 5, depth: 8, color: 0xF0E68C, roofType: 'flat', style: 'garage' },
        ];

        // TIER 2: Mixed neighborhood (medium progression)
        const mediumTypes = [
            { width: 5, height: 10, depth: 3, color: 0xFFC0CB, roofType: 'pyramid', style: 'apartment' },
            { width: 4.5, height: 12, depth: 3, color: 0xE6E6FA, roofType: 'flat', style: 'apartment' },
            // Wide buildings
            { width: 10, height: 6, depth: 4, color: 0xB0E0E6, roofType: 'flat', style: 'warehouse' },
            { width: 9, height: 7, depth: 4, color: 0xDDA0DD, roofType: 'flat', style: 'mall' },
            { width: 12, height: 5, depth: 5, color: 0x98FB98, roofType: 'flat', style: 'supermarket' },
            // Long buildings (deep)
            { width: 6, height: 6, depth: 10, color: 0xD2B48C, roofType: 'flat', style: 'depot' },
            { width: 8, height: 7, depth: 12, color: 0xC0C0C0, roofType: 'flat', style: 'factory' },
        ];

        // TIER 3: Downtown/city center (high progression)
        const advancedTypes = [
            { width: 6, height: 14, depth: 3.5, color: 0xFFB6C1, roofType: 'cone', style: 'tower' },
            { width: 5, height: 15, depth: 4, color: 0xDDA0DD, roofType: 'pyramid', style: 'tower' },
            { width: 7, height: 16, depth: 4, color: 0xB0E0E6, roofType: 'flat', style: 'skyscraper' },
            // Wide modern buildings
            { width: 14, height: 8, depth: 5, color: 0x87CEEB, roofType: 'flat', style: 'office' },
            { width: 12, height: 10, depth: 5, color: 0xE6E6FA, roofType: 'flat', style: 'hotel' },
            // Long buildings (deep)
            { width: 8, height: 8, depth: 14, color: 0xFFB6C1, roofType: 'flat', style: 'station' },
            { width: 10, height: 6, depth: 16, color: 0x98FB98, roofType: 'dome', style: 'hangar' },
        ];

        // TIER 4: Futuristic/special landmarks (very high progression)
        const epicTypes = [
            { width: 8, height: 18, depth: 5, color: 0xFFD700, roofType: 'pyramid', style: 'landmark' },
            { width: 16, height: 12, depth: 6, color: 0xFF69B4, roofType: 'dome', style: 'stadium' },
            { width: 6, height: 20, depth: 4, color: 0xC0C0C0, roofType: 'spire', style: 'spire' },
            // Long epic buildings
            { width: 12, height: 10, depth: 18, color: 0xE6E6FA, roofType: 'dome', style: 'convention' },
        ];

        // Select building pool based on progression
        let buildingPool = [...basicTypes];
        if (progression > 0.3) {
            buildingPool = [...buildingPool, ...mediumTypes];
        }
        if (progression > 0.7) {
            buildingPool = [...buildingPool, ...advancedTypes];
        }
        if (progression > 1.2 && Math.random() < 0.2) {
            // 20% chance for epic buildings at high progression
            buildingPool = [...buildingPool, ...epicTypes];
        }

        const type = buildingPool[Math.floor(Math.random() * buildingPool.length)];

        // Height variation based on style
        let heightVariation = 1;
        if (type.style === 'tower' || type.style === 'skyscraper' || type.style === 'spire') {
            heightVariation = 1 + (Math.random() * 0.2 * progression);
        } else if (type.style === 'shop' || type.style === 'warehouse') {
            heightVariation = 0.9 + (Math.random() * 0.2); // Slight variation for wide buildings
        }
        const adjustedHeight = Math.min(type.height * heightVariation, 22);

        // Create building on left side - position based on width to prevent overlap
        // Buildings edge should be at least 8 units from center (sidewalk edge)
        const leftX = -(8 + type.width / 2 + 1); // 1 unit buffer from sidewalk
        const leftBuilding = this.createBuilding(leftX, adjustedHeight / 2, z, type.width, adjustedHeight, type.depth, type.color, type.roofType, type.style);
        leftBuilding.userData.side = 'left';
        leftBuilding.userData.zPos = z;
        // PERFORMANCE: Buildings never move - skip per-frame matrix recalc
        leftBuilding.traverse((child) => { child.matrixAutoUpdate = false; child.updateMatrix(); });
        this.buildings.push(leftBuilding);

        // Create different building on right side for variety
        const rightType = buildingPool[Math.floor(Math.random() * buildingPool.length)];
        let rightHeightVar = 1;
        if (rightType.style === 'tower' || rightType.style === 'skyscraper') {
            rightHeightVar = 1 + (Math.random() * 0.2 * progression);
        }
        const rightAdjustedHeight = Math.min(rightType.height * rightHeightVar, 22);
        // Position based on width to prevent overlap
        const rightX = 8 + rightType.width / 2 + 1; // 1 unit buffer from sidewalk
        const rightBuilding = this.createBuilding(rightX, rightAdjustedHeight / 2, z, rightType.width, rightAdjustedHeight, rightType.depth, rightType.color, rightType.roofType, rightType.style);
        rightBuilding.userData.side = 'right';
        rightBuilding.userData.zPos = z;
        rightBuilding.traverse((child) => { child.matrixAutoUpdate = false; child.updateMatrix(); });
        this.buildings.push(rightBuilding);

        // Add special decorations at higher progression levels
        if (progression > 1.0 && Math.random() < 0.15) {
            this.addSpecialDecoration(z, progression);
        }
    }

    createBuilding(x, y, z, width, height, depth, color, roofType = 'cone', style = 'house') {
        const group = new THREE.Group();

        // Main building body
        const bodyGeometry = new THREE.BoxGeometry(width, height, depth);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: color,
            flatShading: true,
            roughness: 0.8
        });

        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        // Varied roof styles
        const roofColors = [COLORS.RED, 0xFF6B9D, 0xFFB6C1, 0xDDA0DD, 0xB0E0E6];
        const roofColor = roofColors[Math.floor(Math.random() * roofColors.length)];
        const roofMaterial = new THREE.MeshStandardMaterial({
            color: roofColor,
            flatShading: true
        });

        let roof;
        if (roofType === 'cone') {
            const roofGeometry = new THREE.ConeGeometry(width * 0.7, height * 0.2, 4);
            roof = new THREE.Mesh(roofGeometry, roofMaterial);
            roof.rotation.y = Math.PI / 4;
            roof.position.y = height / 2 + height * 0.1;
        } else if (roofType === 'pyramid') {
            const roofGeometry = new THREE.ConeGeometry(width * 0.8, height * 0.25, 4);
            roof = new THREE.Mesh(roofGeometry, roofMaterial);
            roof.rotation.y = 0;
            roof.position.y = height / 2 + height * 0.125;
        } else if (roofType === 'flat') {
            const roofGeometry = new THREE.BoxGeometry(width * 1.1, height * 0.08, depth * 1.1);
            roof = new THREE.Mesh(roofGeometry, roofMaterial);
            roof.position.y = height / 2 + height * 0.04;
        } else if (roofType === 'dome') {
            // Dome roof for stadiums/special buildings
            const roofGeometry = new THREE.SphereGeometry(width * 0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
            roof = new THREE.Mesh(roofGeometry, roofMaterial);
            roof.position.y = height / 2;
        } else if (roofType === 'spire') {
            // Tall spire for landmark buildings
            const roofGeometry = new THREE.ConeGeometry(width * 0.3, height * 0.4, 8);
            roof = new THREE.Mesh(roofGeometry, new THREE.MeshStandardMaterial({
                color: 0xFFD700,
                metalness: 0.6,
                roughness: 0.3,
                emissive: 0xFFD700,
                emissiveIntensity: 0.2
            }));
            roof.position.y = height / 2 + height * 0.2;
        }

        if (roof) {
            roof.castShadow = true;
            group.add(roof);
        }

        // PERFORMANCE: Use shared window material (same across all buildings)
        const windowMaterial = this.sharedMaterials.buildingWindow;

        // Calculate window grid - windows start above ground floor (2.5 units up from bottom)
        const groundFloorHeight = 2.5; // Height reserved for doors/awnings
        const windowAreaHeight = height - groundFloorHeight;
        const windowSpacingV = Math.max(1.5, windowAreaHeight / 4);
        const windowSpacingH = Math.max(1.8, width / 4);
        const numRows = Math.max(1, Math.min(5, Math.floor(windowAreaHeight / windowSpacingV)));
        const numCols = Math.max(2, Math.min(6, Math.floor(width / windowSpacingH)));

        const windowW = Math.min(width * 0.12, 0.9);
        const windowH = Math.min(height * 0.08, 0.7);
        const windowGeometry = new THREE.BoxGeometry(windowW, windowH, 0.1);

        // Window starting Y position (above ground floor)
        const windowStartY = -height / 2 + groundFloorHeight + windowSpacingV / 2;

        for (let row = 0; row < numRows; row++) {
            for (let col = 0; col < numCols; col++) {
                const window = new THREE.Mesh(windowGeometry, windowMaterial);
                const rowY = windowStartY + row * windowSpacingV;
                // Skip if window would be above the building
                if (rowY > height / 2 - 0.5) continue;
                const colOffset = ((col - (numCols - 1) / 2) * windowSpacingH);
                window.position.set(colOffset, rowY, depth / 2 + 0.05);
                group.add(window);
            }
        }

        // PERFORMANCE: Use shared side window material and geometry
        const sideWindowMat = this.sharedMaterials.sideWindow;
        const sideWindowGeo = this.sharedGeometries.sideWindow;

        // Style-specific decorations
        if (style === 'shop' || style === 'supermarket') {
            // Shop entrance door
            const doorMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, flatShading: true });
            const doorGeo = new THREE.BoxGeometry(1.2, 2, 0.1);
            const door = new THREE.Mesh(doorGeo, doorMat);
            door.position.set(0, -height / 2 + 1, depth / 2 + 0.05);
            group.add(door);
            // Side windows next to door
            if (width > 3) {
                const leftWin = new THREE.Mesh(sideWindowGeo, sideWindowMat);
                leftWin.position.set(-width / 4, -height / 2 + 1.1, depth / 2 + 0.05);
                group.add(leftWin);
                const rightWin = new THREE.Mesh(sideWindowGeo, sideWindowMat);
                rightWin.position.set(width / 4, -height / 2 + 1.1, depth / 2 + 0.05);
                group.add(rightWin);
            }
            // Awning over front - positioned above door level
            const awningGeo = new THREE.BoxGeometry(width * 0.95, 0.15, 1.5);
            const awningColors = [0xFF69B4, 0xFFB347, 0x98FB98, 0x87CEEB];
            const awningMat = new THREE.MeshStandardMaterial({
                color: awningColors[Math.floor(Math.random() * awningColors.length)],
                flatShading: true
            });
            const awning = new THREE.Mesh(awningGeo, awningMat);
            // Position above door: 2.2 units above building bottom
            const awningY = -height / 2 + 2.2;
            awning.position.set(0, awningY, depth / 2 + 0.7);
            awning.rotation.x = -0.2;
            group.add(awning);
        } else if (style === 'mall' || style === 'hotel') {
            // Double entrance doors
            const doorMat = new THREE.MeshStandardMaterial({ color: 0x4169E1, flatShading: true });
            const doorGeo = new THREE.BoxGeometry(0.8, 2.2, 0.1);
            const leftDoor = new THREE.Mesh(doorGeo, doorMat);
            leftDoor.position.set(-0.5, -height / 2 + 1.1, depth / 2 + 0.05);
            group.add(leftDoor);
            const rightDoor = new THREE.Mesh(doorGeo, doorMat);
            rightDoor.position.set(0.5, -height / 2 + 1.1, depth / 2 + 0.05);
            group.add(rightDoor);
            // Side windows next to double doors
            if (width > 4) {
                const leftWin = new THREE.Mesh(sideWindowGeo, sideWindowMat);
                leftWin.position.set(-width / 3, -height / 2 + 1.1, depth / 2 + 0.05);
                group.add(leftWin);
                const rightWin = new THREE.Mesh(sideWindowGeo, sideWindowMat);
                rightWin.position.set(width / 3, -height / 2 + 1.1, depth / 2 + 0.05);
                group.add(rightWin);
            }
            // Entrance canopy - positioned above door level
            const canopyGeo = new THREE.BoxGeometry(width * 0.4, 0.2, 2);
            const canopyMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, flatShading: true });
            const canopy = new THREE.Mesh(canopyGeo, canopyMat);
            // Position above entrance: 2.5 units above building bottom
            const canopyY = -height / 2 + 2.5;
            canopy.position.set(0, canopyY, depth / 2 + 1);
            group.add(canopy);
        } else if (style === 'skyscraper' || style === 'tower') {
            // Lobby entrance (glass doors)
            const doorMat = new THREE.MeshStandardMaterial({ color: 0x87CEEB, transparent: true, opacity: 0.7 });
            const doorGeo = new THREE.BoxGeometry(1.5, 2.2, 0.1);
            const door = new THREE.Mesh(doorGeo, doorMat);
            door.position.set(0, -height / 2 + 1.1, depth / 2 + 0.05);
            group.add(door);
            // Side windows next to lobby entrance
            if (width > 4) {
                const leftWin = new THREE.Mesh(sideWindowGeo, sideWindowMat);
                leftWin.position.set(-width / 3, -height / 2 + 1.1, depth / 2 + 0.05);
                group.add(leftWin);
                const rightWin = new THREE.Mesh(sideWindowGeo, sideWindowMat);
                rightWin.position.set(width / 3, -height / 2 + 1.1, depth / 2 + 0.05);
                group.add(rightWin);
            }
            // Antenna on top
            const antennaGeo = new THREE.CylinderGeometry(0.1, 0.15, height * 0.15, 6);
            const antennaMat = new THREE.MeshStandardMaterial({ color: 0xC0C0C0, metalness: 0.8 });
            const antenna = new THREE.Mesh(antennaGeo, antennaMat);
            antenna.position.y = height / 2 + height * 0.15;
            group.add(antenna);
        } else if (style === 'landmark') {
            // Decorative top ornament
            const ornamentGeo = new THREE.OctahedronGeometry(width * 0.15);
            const ornamentMat = new THREE.MeshStandardMaterial({
                color: 0xFFD700,
                metalness: 0.7,
                emissive: 0xFFD700,
                emissiveIntensity: 0.3
            });
            const ornament = new THREE.Mesh(ornamentGeo, ornamentMat);
            ornament.position.y = height / 2 + height * 0.3;
            group.add(ornament);
        } else if (style === 'warehouse' || style === 'depot' || style === 'factory') {
            // Loading dock doors at ground level
            const doorMat = new THREE.MeshStandardMaterial({ color: 0x444444, flatShading: true });
            const numDoors = Math.min(3, Math.floor(width / 3));
            const doorWidth = width * 0.2;
            const doorHeight = 2;
            const doorGeo = new THREE.BoxGeometry(doorWidth, doorHeight, 0.1);
            for (let i = 0; i < numDoors; i++) {
                const door = new THREE.Mesh(doorGeo, doorMat);
                const xOffset = (i - (numDoors - 1) / 2) * (width / numDoors);
                door.position.set(xOffset, -height / 2 + doorHeight / 2, depth / 2 + 0.05);
                group.add(door);
            }
        } else if (style === 'apartment') {
            // Entrance door
            const doorMat = new THREE.MeshStandardMaterial({ color: 0x654321, flatShading: true });
            const doorGeo = new THREE.BoxGeometry(1.0, 2, 0.1);
            const door = new THREE.Mesh(doorGeo, doorMat);
            door.position.set(0, -height / 2 + 1, depth / 2 + 0.05);
            group.add(door);
            // Side windows next to entrance
            if (width > 3) {
                const leftWin = new THREE.Mesh(sideWindowGeo, sideWindowMat);
                leftWin.position.set(-width / 4, -height / 2 + 1.1, depth / 2 + 0.05);
                group.add(leftWin);
                const rightWin = new THREE.Mesh(sideWindowGeo, sideWindowMat);
                rightWin.position.set(width / 4, -height / 2 + 1.1, depth / 2 + 0.05);
                group.add(rightWin);
            }
            // Balconies on front - start above ground floor
            const balconyMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, flatShading: true });
            const balconyGeo = new THREE.BoxGeometry(1.2, 0.1, 0.8);
            const railGeo = new THREE.BoxGeometry(1.2, 0.4, 0.05);
            const numBalconies = Math.min(4, Math.floor((height - 3) / 2.5));
            for (let i = 0; i < numBalconies; i++) {
                const yPos = -height / 2 + 3 + i * 2.5; // Start at 3 units up (above ground floor)
                if (yPos < height / 2 - 1) {
                    const balcony = new THREE.Mesh(balconyGeo, balconyMat);
                    balcony.position.set(0, yPos, depth / 2 + 0.4);
                    group.add(balcony);
                    const rail = new THREE.Mesh(railGeo, balconyMat);
                    rail.position.set(0, yPos + 0.25, depth / 2 + 0.75);
                    group.add(rail);
                }
            }
        } else if (style === 'office') {
            // Revolving door entrance
            const doorMat = new THREE.MeshStandardMaterial({ color: 0x87CEEB, transparent: true, opacity: 0.6 });
            const doorGeo = new THREE.BoxGeometry(2, 2.2, 0.1);
            const door = new THREE.Mesh(doorGeo, doorMat);
            door.position.set(0, -height / 2 + 1.1, depth / 2 + 0.05);
            group.add(door);
            // Side windows next to revolving door
            if (width > 5) {
                const leftWin = new THREE.Mesh(sideWindowGeo, sideWindowMat);
                leftWin.position.set(-width / 3 - 0.5, -height / 2 + 1.1, depth / 2 + 0.05);
                group.add(leftWin);
                const rightWin = new THREE.Mesh(sideWindowGeo, sideWindowMat);
                rightWin.position.set(width / 3 + 0.5, -height / 2 + 1.1, depth / 2 + 0.05);
                group.add(rightWin);
            }
            // Entrance columns
            const columnMat = new THREE.MeshStandardMaterial({ color: 0xD4AF37, flatShading: true });
            const columnGeo = new THREE.CylinderGeometry(0.3, 0.3, 3, 8);
            const leftCol = new THREE.Mesh(columnGeo, columnMat);
            leftCol.position.set(-width / 4, -height / 2 + 1.5, depth / 2 + 0.5);
            group.add(leftCol);
            const rightCol = new THREE.Mesh(columnGeo, columnMat);
            rightCol.position.set(width / 4, -height / 2 + 1.5, depth / 2 + 0.5);
            group.add(rightCol);
        } else if (style === 'garage') {
            // Large garage door
            const doorMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, flatShading: true });
            const doorGeo = new THREE.BoxGeometry(width * 0.6, 2.5, 0.1);
            const door = new THREE.Mesh(doorGeo, doorMat);
            door.position.set(0, -height / 2 + 1.25, depth / 2 + 0.05);
            group.add(door);
            // Side windows next to garage door
            const garageDoorWidth = width * 0.6;
            const sideSpace = (width - garageDoorWidth) / 2;
            if (sideSpace > 1) {
                const smallWindowGeo = new THREE.BoxGeometry(0.6, 0.6, 0.1);
                const leftWin = new THREE.Mesh(smallWindowGeo, sideWindowMat);
                leftWin.position.set(-width / 2 + sideSpace / 2, -height / 2 + 1.5, depth / 2 + 0.05);
                group.add(leftWin);
                const rightWin = new THREE.Mesh(smallWindowGeo, sideWindowMat);
                rightWin.position.set(width / 2 - sideSpace / 2, -height / 2 + 1.5, depth / 2 + 0.05);
                group.add(rightWin);
            }
        } else if (style === 'station' || style === 'convention') {
            // Clock tower on top
            const clockBaseMat = new THREE.MeshStandardMaterial({ color: 0x8B0000, flatShading: true });
            const clockBaseGeo = new THREE.BoxGeometry(2, 3, 2);
            const clockBase = new THREE.Mesh(clockBaseGeo, clockBaseMat);
            clockBase.position.y = height / 2 + 1.5;
            group.add(clockBase);
            // Clock face
            const clockFaceMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, emissive: 0xFFFFFF, emissiveIntensity: 0.3 });
            const clockFaceGeo = new THREE.CircleGeometry(0.8, 16);
            const clockFace = new THREE.Mesh(clockFaceGeo, clockFaceMat);
            clockFace.position.set(0, height / 2 + 2, 1.05);
            group.add(clockFace);
        } else if (style === 'hangar') {
            // Hangar door (large sliding door)
            const doorMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5 });
            const doorGeo = new THREE.BoxGeometry(width * 0.8, height * 0.7, 0.2);
            const door = new THREE.Mesh(doorGeo, doorMat);
            door.position.set(0, -height / 2 + (height * 0.35), depth / 2 + 0.1);
            group.add(door);
        } else if (style === 'stadium') {
            // Flags on stadium
            const flagPoleGeo = new THREE.CylinderGeometry(0.05, 0.05, 2, 6);
            const flagPoleMat = new THREE.MeshStandardMaterial({ color: 0xC0C0C0 });
            const flagGeo = new THREE.BoxGeometry(0.8, 0.5, 0.02);
            const flagColors = [0xFF69B4, 0x87CEEB, 0xFFD700, 0x98FB98];
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2;
                const flagPole = new THREE.Mesh(flagPoleGeo, flagPoleMat);
                flagPole.position.set(
                    Math.cos(angle) * (width / 2 - 1),
                    height / 2 + 1,
                    Math.sin(angle) * (depth / 2 - 1)
                );
                group.add(flagPole);
                const flagMat = new THREE.MeshStandardMaterial({ color: flagColors[i], side: THREE.DoubleSide });
                const flag = new THREE.Mesh(flagGeo, flagMat);
                flag.position.set(
                    Math.cos(angle) * (width / 2 - 1) + 0.4,
                    height / 2 + 1.7,
                    Math.sin(angle) * (depth / 2 - 1)
                );
                group.add(flag);
            }
        } else if (style === 'house') {
            // Cute house door
            const doorMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, flatShading: true });
            const doorGeo = new THREE.BoxGeometry(0.8, 1.8, 0.1);
            const door = new THREE.Mesh(doorGeo, doorMat);
            door.position.set(0, -height / 2 + 0.9, depth / 2 + 0.05);
            group.add(door);
            // Side windows next to house door
            if (width > 2.5) {
                const smallWindowGeo = new THREE.BoxGeometry(0.6, 0.8, 0.1);
                const leftWin = new THREE.Mesh(smallWindowGeo, sideWindowMat);
                leftWin.position.set(-width / 4, -height / 2 + 1, depth / 2 + 0.05);
                group.add(leftWin);
                const rightWin = new THREE.Mesh(smallWindowGeo, sideWindowMat);
                rightWin.position.set(width / 4, -height / 2 + 1, depth / 2 + 0.05);
                group.add(rightWin);
            }
        }

        group.position.set(x, y, z);
        this.scene.add(group);
        this.backgroundObjects.push(group);

        // OPTIMIZED: Removed building decorations to improve performance

        return group;
    }

    createSideDecorations() {
        // PERFORMANCE: Reduced initial spawn range
        // Create initial street lamps
        for (let z = -50; z < 100; z += this.lampSpacing) {
            this.createStreetLamp(-8, 0, z);
            this.createStreetLamp(8, 0, z + this.lampSpacing / 2);
            this.nextLampZ = z - this.lampSpacing;
        }

        // Create initial trees with variety
        for (let z = -50; z < 100; z += this.treeSpacing) {
            // PERFORMANCE: 50% chance per side
            if (Math.random() > 0.5) {
                this.createTree(-10 - Math.random() * 3, 0, z + Math.random() * 5);
            }
            if (Math.random() > 0.5) {
                this.createTree(10 + Math.random() * 3, 0, z + Math.random() * 5);
            }
            this.nextTreeZ = z - this.treeSpacing;
        }
    }

    createStreetLamp(x, y, z) {
        const group = new THREE.Group();

        // PERFORMANCE: Simplified lamp styles, no PointLights (use emissive only)
        const lampColors = [COLORS.GOLD, 0xFFE4B5, 0xFFF8DC, 0xFFDAB9];
        const lampColor = lampColors[Math.floor(Math.random() * lampColors.length)];
        const height = 2.8 + Math.random() * 0.7;

        // Post - use shared geometry, clone material only if needed
        const post = new THREE.Mesh(this.sharedGeometries.lampPost, this.sharedMaterials.lampPost);
        post.scale.y = height / 3;
        post.position.y = height / 2;
        group.add(post);

        // Lamp head - use shared geometry, emissive for glow (NO PointLight!)
        const isRound = Math.random() < 0.5;
        const lampGeo = isRound ? this.sharedGeometries.lampSphere : this.sharedGeometries.lampBox;
        const lampMaterial = new THREE.MeshStandardMaterial({
            color: lampColor,
            emissive: lampColor,
            emissiveIntensity: 0.6,
            flatShading: true
        });
        const lamp = new THREE.Mesh(lampGeo, lampMaterial);
        lamp.position.y = height;
        group.add(lamp);

        // NO POINT LIGHT - emissive material provides the glow effect

        group.position.set(x, y, z);
        group.userData.zPos = z;
        this.scene.add(group);
        this.streetLamps.push(group);
    }

    createTree(x, y, z) {
        const group = new THREE.Group();

        // PERFORMANCE: Calculate progression for variety (further = more types)
        const distance = Math.abs(z);
        const progression = Math.min(distance / 300, 1);

        // PERFORMANCE: Simplified tree types - max 2 meshes per tree
        const treeTypes = [
            // Basic round trees (always available)
            { type: 'round', foliageColor: 0x90EE90 },
            { type: 'round', foliageColor: 0x228B22 },
            { type: 'round', foliageColor: 0x32CD32 },
        ];

        // Cherry blossom (20%+ progression)
        if (progression > 0.2) {
            treeTypes.push({ type: 'round', foliageColor: 0xFFB7C5 });
            treeTypes.push({ type: 'round', foliageColor: 0xFF69B4 });
        }

        // Pine trees (40%+ progression) - use cone shape
        if (progression > 0.4) {
            treeTypes.push({ type: 'pine', foliageColor: 0x2E8B57 });
            treeTypes.push({ type: 'pine', foliageColor: 0x006400 });
        }

        // Magical trees (70%+ progression) - glowing
        if (progression > 0.7) {
            treeTypes.push({ type: 'magical', foliageColor: 0xDDA0DD });
            treeTypes.push({ type: 'magical', foliageColor: 0x87CEEB });
        }

        const treeStyle = treeTypes[Math.floor(Math.random() * treeTypes.length)];
        const scale = 0.8 + Math.random() * 0.5;

        // PERFORMANCE: Use shared trunk geometry, just scale it
        const trunk = new THREE.Mesh(this.sharedGeometries.trunk, this.sharedMaterials.trunk);
        trunk.scale.set(scale, scale, scale);
        trunk.position.y = scale;
        group.add(trunk);

        // PERFORMANCE: Use shared foliage geometry with new material (color varies)
        const isMagical = treeStyle.type === 'magical';
        const foliageMaterial = new THREE.MeshStandardMaterial({
            color: treeStyle.foliageColor,
            flatShading: true,
            emissive: isMagical ? treeStyle.foliageColor : 0x000000,
            emissiveIntensity: isMagical ? 0.3 : 0
        });

        const foliageGeo = treeStyle.type === 'pine' ? this.sharedGeometries.foliageCone : this.sharedGeometries.foliageSphere;
        const foliage = new THREE.Mesh(foliageGeo, foliageMaterial);
        foliage.scale.set(scale, scale, scale);
        foliage.position.y = 2 * scale + 0.6 * scale;
        group.add(foliage);

        group.position.set(x, y, z);
        group.userData.zPos = z;
        this.scene.add(group);
        this.trees.push(group);
    }

    createClouds() {
        // Floating clouds in the sky
        for (let i = 0; i < 15; i++) {
            const cloud = this.createCloud();
            cloud.position.set(
                (Math.random() - 0.5) * 100,
                15 + Math.random() * 10,
                (Math.random() - 0.5) * 200
            );
            this.scene.add(cloud);
            this.clouds.push(cloud);
        }
    }

    createCloud() {
        const group = new THREE.Group();
        // PERFORMANCE: Share cloud material across all clouds
        if (!this.sharedMaterials.cloud) {
            this.sharedMaterials.cloud = new THREE.MeshStandardMaterial({
                color: 0xFFFFFF,
                flatShading: true,
                roughness: 1
            });
        }

        // PERFORMANCE: Use shared sphere geometry with scale for size variation
        for (let i = 0; i < 5; i++) {
            const size = 1 + Math.random() * 0.5;
            const sphere = new THREE.Mesh(this.sharedGeometries.cloudSphere, this.sharedMaterials.cloud);
            sphere.scale.setScalar(size);
            sphere.position.set(
                (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 2
            );
            group.add(sphere);
        }

        return group;
    }

    update(deltaTime, playerZ) {
        // PERFORMANCE: Accumulate animation time (replaces Date.now() calls)
        this.animTime += deltaTime;
        const animTimeMs = this.animTime * 1000; // Convert to milliseconds for compatibility

        // FIXED: Move sky sphere to follow player so it's always centered around them
        if (this.sky) {
            this.sky.position.z = playerZ;
        }

        // Spawn segments ahead - 1500 units is plenty (camera far plane is 1000)
        let segmentsSpawned = 0;
        while (playerZ - this.nextGroundSegmentZ < 1500 && segmentsSpawned < 3) {
            this.spawnGroundSegment(this.nextGroundSegmentZ);
            this.nextGroundSegmentZ -= this.groundSegmentLength;
            segmentsSpawned++;
        }

        // PERFORMANCE: In-place removal instead of filter()
        // Cleanup old ground segments behind player
        for (let i = this.groundSegments.length - 1; i >= 0; i--) {
            const segment = this.groundSegments[i];
            if (segment.userData.endZ > playerZ + 100) {
                this.scene.remove(segment);
                segment.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
                this.groundSegments[i] = this.groundSegments[this.groundSegments.length - 1];
                this.groundSegments.pop();
            }
        }

        // Spawn new buildings ahead of player (600 units covers camera far plane)
        while (playerZ - this.nextBuildingZ < 600) {
            this.spawnBuilding(this.nextBuildingZ);
            this.nextBuildingZ -= this.buildingSpacing;
        }

        // PERFORMANCE: In-place removal for buildings with proper disposal
        for (let i = this.buildings.length - 1; i >= 0; i--) {
            const building = this.buildings[i];
            if (building.userData.zPos > playerZ + 50) {
                this.scene.remove(building);
                // MEMORY FIX: Dispose building geometries and materials
                building.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
                this.buildings[i] = this.buildings[this.buildings.length - 1];
                this.buildings.pop();
            }
        }

        // PERFORMANCE: In-place removal and cached animation time for decorations
        for (let i = this.decorations.length - 1; i >= 0; i--) {
            const decoration = this.decorations[i];

            // Animate floating elements using cached time
            if (decoration.type === 'balloon') {
                decoration.mesh.position.y += Math.sin(animTimeMs * 0.001) * deltaTime * 0.5;
                decoration.mesh.rotation.y += deltaTime * 0.5;
            }
            if (decoration.type === 'lantern') {
                const floatOffset = decoration.mesh.userData.floatOffset || 0;
                const floatSpeed = decoration.mesh.userData.floatSpeed || 1;
                decoration.mesh.position.y += Math.sin(animTimeMs * 0.001 * floatSpeed + floatOffset) * deltaTime * 0.3;
            }

            // Cleanup if too far behind
            if (decoration.zPos > playerZ + 50) {
                this.scene.remove(decoration.mesh);
                // MEMORY FIX: Dispose decoration geometries and materials
                decoration.mesh.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
                this.decorations[i] = this.decorations[this.decorations.length - 1];
                this.decorations.pop();
            }
        }

        // Animate clouds
        for (let i = 0, len = this.clouds.length; i < len; i++) {
            const cloud = this.clouds[i];
            cloud.position.z += deltaTime * 2;

            // Reset cloud position when it goes too far
            if (cloud.position.z > playerZ + 100) {
                cloud.position.z = playerZ - 100;
                cloud.position.x = (Math.random() - 0.5) * 100;
            }
        }

        // Spawn and cleanup street lamps
        this.updateStreetLamps(playerZ);

        // Spawn and cleanup trees
        this.updateTrees(playerZ);

        // Update sidewalk characters/critters
        this.updateSidewalkCharacters(deltaTime, playerZ);

        // Update moving objects coming toward player
        this.updateMovingObjects(deltaTime, playerZ);
    }

    handleResize() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        // OPTIMIZED: Limit pixel ratio to 1.5 for better performance
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    }

    render(camera) {
        this.renderer.render(this.scene, camera);
    }

    add(object) {
        this.scene.add(object);
    }

    remove(object) {
        this.scene.remove(object);
    }

    addSpecialDecoration(z, progression) {
        const decorationType = Math.floor(Math.random() * 5);

        switch (decorationType) {
            case 0: // Floating balloons
                this.createFloatingBalloons(z);
                break;
            case 1: // Banner between buildings
                this.createBanner(z);
                break;
            case 2: // Fountain or statue
                this.createFountain(z);
                break;
            case 3: // Rainbow arch
                if (progression > 1.5) {
                    this.createRainbowArch(z);
                }
                break;
            case 4: // Floating lanterns
                if (progression > 2.0) {
                    this.createFloatingLanterns(z);
                }
                break;
        }
    }

    createFloatingBalloons(z) {
        const balloonCount = 3 + Math.floor(Math.random() * 3);
        const xPos = Math.random() > 0.5 ? -10 : 10;

        for (let i = 0; i < balloonCount; i++) {
            const group = new THREE.Group();

            // Balloon
            const balloonGeometry = new THREE.SphereGeometry(0.5, 8, 8);
            const balloonColor = [0xFF69B4, 0xFFB6C1, 0xDDA0DD, 0x87CEEB, 0xFFD700][Math.floor(Math.random() * 5)];
            const balloonMaterial = new THREE.MeshStandardMaterial({
                color: balloonColor,
                flatShading: true
            });
            const balloon = new THREE.Mesh(balloonGeometry, balloonMaterial);
            balloon.position.y = 3 + i * 1.5;
            group.add(balloon);

            // String
            const stringGeometry = new THREE.CylinderGeometry(0.02, 0.02, 2 + i * 1.5, 4);
            const stringMaterial = new THREE.MeshStandardMaterial({
                color: 0xFFFFFF
            });
            const string = new THREE.Mesh(stringGeometry, stringMaterial);
            string.position.y = (2 + i * 1.5) / 2;
            group.add(string);

            group.position.set(
                xPos + (Math.random() - 0.5) * 2,
                0,
                z + (Math.random() - 0.5) * 5
            );

            this.scene.add(group);
            this.decorations.push({ mesh: group, zPos: z, type: 'balloon' });
        }
    }

    createBanner(z) {
        // Vertical hanging banner (like a flag between buildings)
        const bannerGeometry = new THREE.BoxGeometry(18, 2.5, 0.1); // Wide, tall, thin
        const bannerMaterial = new THREE.MeshStandardMaterial({
            color: 0xFF69B4,
            flatShading: true
        });
        const banner = new THREE.Mesh(bannerGeometry, bannerMaterial);
        banner.position.set(0, 8, z); // High up, hanging down
        this.scene.add(banner);
        this.decorations.push({ mesh: banner, zPos: z, type: 'banner' });
    }

    createFountain(z) {
        const group = new THREE.Group();

        // Base
        const baseGeometry = new THREE.CylinderGeometry(2, 2.5, 0.5, 8);
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0xD3D3D3,
            flatShading: true
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 0.25;
        group.add(base);

        // Water basin
        const basinGeometry = new THREE.CylinderGeometry(1.5, 1.5, 0.8, 8);
        const basinMaterial = new THREE.MeshStandardMaterial({
            color: 0x87CEEB,
            flatShading: true,
            transparent: true,
            opacity: 0.7
        });
        const basin = new THREE.Mesh(basinGeometry, basinMaterial);
        basin.position.y = 0.9;
        group.add(basin);

        // Central spout
        const spoutGeometry = new THREE.CylinderGeometry(0.2, 0.3, 1.5, 6);
        const spout = new THREE.Mesh(spoutGeometry, baseMaterial);
        spout.position.y = 1.5;
        group.add(spout);

        // Position fountain on sidewalk (side of road, not in play area)
        const side = Math.random() < 0.5 ? -1 : 1;
        group.position.set(side * 8, 0, z);
        this.scene.add(group);
        this.decorations.push({ mesh: group, zPos: z, type: 'fountain' });
    }

    createRainbowArch(z) {
        const group = new THREE.Group();
        const colors = [0xFF0000, 0xFF7F00, 0xFFFF00, 0x00FF00, 0x0000FF, 0x4B0082, 0x9400D3];

        colors.forEach((color, index) => {
            const arcGeometry = new THREE.TorusGeometry(
                10 - index * 0.3,
                0.2,
                8,
                32,
                Math.PI
            );
            const arcMaterial = new THREE.MeshStandardMaterial({
                color: color,
                flatShading: true,
                emissive: color,
                emissiveIntensity: 0.2
            });
            const arc = new THREE.Mesh(arcGeometry, arcMaterial);
            arc.rotation.x = Math.PI / 2;
            arc.position.y = 0;
            group.add(arc);
        });

        group.position.set(0, 0, z);
        group.rotation.y = Math.PI / 2;
        this.scene.add(group);
        this.decorations.push({ mesh: group, zPos: z, type: 'rainbow' });
    }

    createFloatingLanterns(z) {
        const lanternCount = 5 + Math.floor(Math.random() * 5);

        // PERFORMANCE: Share lantern geometry
        if (!this.sharedGeometries.lantern) {
            this.sharedGeometries.lantern = new THREE.CylinderGeometry(0.3, 0.3, 0.6, 6);
        }

        for (let i = 0; i < lanternCount; i++) {
            const group = new THREE.Group();

            // Lantern body
            const lanternColor = [0xFF69B4, 0xFFD700, 0xFF6B9D, 0xFFB6C1][Math.floor(Math.random() * 4)];
            const bodyMaterial = new THREE.MeshStandardMaterial({
                color: lanternColor,
                flatShading: true,
                emissive: lanternColor,
                emissiveIntensity: 0.8 // PERFORMANCE: Higher emissive replaces PointLight
            });
            const body = new THREE.Mesh(this.sharedGeometries.lantern, bodyMaterial);
            group.add(body);

            // PERFORMANCE: Removed PointLight - emissive material provides glow effect
            // PointLights are very expensive on mobile GPUs

            group.position.set(
                (Math.random() - 0.5) * 30,
                5 + Math.random() * 5,
                z + (Math.random() - 0.5) * 10
            );

            // Store animation data
            group.userData.floatOffset = Math.random() * Math.PI * 2;
            group.userData.floatSpeed = 0.5 + Math.random() * 0.5;

            this.scene.add(group);
            this.decorations.push({ mesh: group, zPos: z, type: 'lantern' });
        }
    }

    createSidewalkCharacter(z) {
        const characterTypes = [
            // Sanrio-style characters
            { type: 'cat', colors: [0xFFB7C5, 0xFF69B4], size: 0.8, speed: 0.5 },
            { type: 'bunny', colors: [0xFFF0F5, 0xFFB6C1], size: 0.7, speed: 0.6 },
            { type: 'bear', colors: [0xFFDAB9, 0xD2691E], size: 0.9, speed: 0.4 },
            { type: 'penguin', colors: [0x000000, 0xFFFFFF], size: 0.6, speed: 0.7 },
            { type: 'frog', colors: [0x90EE90, 0x228B22], size: 0.5, speed: 0.8 },
            // Small critters
            { type: 'bird', colors: [0x87CEEB, 0xFFD700], size: 0.3, speed: 1.2 },
            { type: 'butterfly', colors: [0xFF69B4, 0xDDA0DD], size: 0.2, speed: 0.3 },
        ];

        const type = characterTypes[Math.floor(Math.random() * characterTypes.length)];
        const side = Math.random() > 0.5 ? 'left' : 'right';
        const x = side === 'left' ? -7 : 7;
        const direction = Math.random() > 0.5 ? 1 : -1; // Walking forward or backward

        const group = new THREE.Group();

        // Create simple character based on type
        if (type.type === 'cat' || type.type === 'bunny' || type.type === 'bear' || type.type === 'penguin' || type.type === 'frog') {
            // Body
            const bodyGeometry = new THREE.SphereGeometry(type.size, 8, 8);
            const bodyMaterial = new THREE.MeshStandardMaterial({
                color: type.colors[0],
                flatShading: true
            });
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            body.position.y = type.size;
            body.castShadow = true;
            group.add(body);

            // Head
            const headGeometry = new THREE.SphereGeometry(type.size * 0.7, 8, 8);
            const head = new THREE.Mesh(headGeometry, bodyMaterial);
            head.position.y = type.size * 2;
            head.castShadow = true;
            group.add(head);

            // Ears (bunny gets long ears, cat gets triangular)
            if (type.type === 'bunny') {
                const earGeometry = new THREE.CapsuleGeometry(type.size * 0.15, type.size * 0.5, 4, 8);
                const earMaterial = new THREE.MeshStandardMaterial({
                    color: type.colors[1],
                    flatShading: true
                });
                const leftEar = new THREE.Mesh(earGeometry, earMaterial);
                leftEar.position.set(-type.size * 0.3, type.size * 2.5, 0);
                group.add(leftEar);
                const rightEar = new THREE.Mesh(earGeometry, earMaterial);
                rightEar.position.set(type.size * 0.3, type.size * 2.5, 0);
                group.add(rightEar);
            } else if (type.type === 'cat') {
                const earGeometry = new THREE.ConeGeometry(type.size * 0.2, type.size * 0.3, 3);
                const earMaterial = new THREE.MeshStandardMaterial({
                    color: type.colors[1],
                    flatShading: true
                });
                const leftEar = new THREE.Mesh(earGeometry, earMaterial);
                leftEar.position.set(-type.size * 0.3, type.size * 2.4, 0);
                group.add(leftEar);
                const rightEar = new THREE.Mesh(earGeometry, earMaterial);
                rightEar.position.set(type.size * 0.3, type.size * 2.4, 0);
                group.add(rightEar);
            }

            // Simple eyes
            const eyeGeometry = new THREE.SphereGeometry(type.size * 0.1, 4, 4);
            const eyeMaterial = new THREE.MeshStandardMaterial({
                color: 0x000000,
                flatShading: true
            });
            const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
            leftEye.position.set(-type.size * 0.25, type.size * 2.1, type.size * 0.5);
            group.add(leftEye);
            const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
            rightEye.position.set(type.size * 0.25, type.size * 2.1, type.size * 0.5);
            group.add(rightEye);

        } else if (type.type === 'bird') {
            // Simple bird - body + wings
            const bodyGeometry = new THREE.SphereGeometry(type.size, 6, 6);
            const bodyMaterial = new THREE.MeshStandardMaterial({
                color: type.colors[0],
                flatShading: true
            });
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            body.position.y = type.size + 0.5; // Flying height
            body.castShadow = true;
            group.add(body);

            // Wings
            const wingGeometry = new THREE.BoxGeometry(type.size * 0.6, type.size * 0.1, type.size * 0.3);
            const wingMaterial = new THREE.MeshStandardMaterial({
                color: type.colors[1],
                flatShading: true
            });
            const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
            leftWing.position.set(-type.size * 0.5, type.size + 0.5, 0);
            group.add(leftWing);
            group.userData.leftWing = leftWing;
            const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
            rightWing.position.set(type.size * 0.5, type.size + 0.5, 0);
            group.add(rightWing);
            group.userData.rightWing = rightWing;

        } else if (type.type === 'butterfly') {
            // Butterfly - body + colorful wings
            const bodyGeometry = new THREE.CapsuleGeometry(type.size * 0.1, type.size * 0.4, 4, 8);
            const bodyMaterial = new THREE.MeshStandardMaterial({
                color: 0x000000,
                flatShading: true
            });
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            body.position.y = type.size + 1;
            group.add(body);

            // Wings (flat, colorful)
            const wingGeometry = new THREE.CircleGeometry(type.size * 0.8, 6);
            const wingMaterial = new THREE.MeshStandardMaterial({
                color: type.colors[0],
                flatShading: true,
                side: THREE.DoubleSide
            });
            const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
            leftWing.position.set(-type.size * 0.6, type.size + 1, 0);
            leftWing.rotation.y = Math.PI / 6;
            group.add(leftWing);
            group.userData.leftWing = leftWing;

            const rightWingMaterial = new THREE.MeshStandardMaterial({
                color: type.colors[1],
                flatShading: true,
                side: THREE.DoubleSide
            });
            const rightWing = new THREE.Mesh(wingGeometry, rightWingMaterial);
            rightWing.position.set(type.size * 0.6, type.size + 1, 0);
            rightWing.rotation.y = -Math.PI / 6;
            group.add(rightWing);
            group.userData.rightWing = rightWing;
        }

        group.position.set(x, 0.05, z);
        group.userData.type = type.type;
        group.userData.speed = type.speed;
        group.userData.direction = direction;
        group.userData.zPos = z;
        group.userData.animTime = Math.random() * Math.PI * 2; // Random start phase

        this.scene.add(group);
        this.sidewalkCharacters.push(group);
    }

    createMovingObject(playerZ) {
        // Weighted spawn system - cars more common than buses for balanced difficulty
        const objectTypes = [
            { type: 'bird', size: 0.8, speed: 8, height: 3 + Math.random() * 4, weight: 15 },
            { type: 'butterfly', size: 0.6, speed: 5, height: 1.5 + Math.random() * 2, weight: 15 },
            { type: 'balloon', size: 1.2, speed: 3, height: 4 + Math.random() * 3, weight: 10 },
            { type: 'leaf', size: 0.4, speed: 6, height: 2 + Math.random() * 3, weight: 15 },
            // Cars: Common obstacle, jumpable - speed reduced for fairer reactions
            { type: 'car', size: 1.0, speed: 18, height: 0.20, weight: 30 },
            // Buses: Less common, must dodge - slower for fairness
            { type: 'bus', size: 1.2, speed: 14, height: 0.24, weight: 15 },
        ];

        // Weighted random selection for better balance
        const totalWeight = objectTypes.reduce((sum, t) => sum + t.weight, 0);
        let roll = Math.random() * totalWeight;
        let type = objectTypes[0];
        for (const t of objectTypes) {
            roll -= t.weight;
            if (roll <= 0) {
                type = t;
                break;
            }
        }
        const group = new THREE.Group();
        const spawnZ = playerZ - 200; // Spawn far ahead
        const lane = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
        const x = lane * 2; // Lane positions

        if (type.type === 'bird') {
            // Bird body
            const bodyGeometry = new THREE.SphereGeometry(type.size, 6, 6);
            const bodyMaterial = new THREE.MeshStandardMaterial({
                color: [0x87CEEB, 0xFFD700, 0xFF69B4][Math.floor(Math.random() * 3)],
                flatShading: true
            });
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            body.castShadow = true;
            group.add(body);

            // Wings
            const wingGeometry = new THREE.BoxGeometry(type.size * 1.5, type.size * 0.2, type.size * 0.5);
            const wingMaterial = new THREE.MeshStandardMaterial({
                color: 0xFFFFFF,
                flatShading: true
            });
            const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
            leftWing.position.set(-type.size * 0.8, 0, 0);
            group.add(leftWing);
            group.userData.leftWing = leftWing;

            const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
            rightWing.position.set(type.size * 0.8, 0, 0);
            group.add(rightWing);
            group.userData.rightWing = rightWing;

        } else if (type.type === 'butterfly') {
            // Butterfly body
            const bodyGeometry = new THREE.CapsuleGeometry(type.size * 0.2, type.size * 0.6, 4, 8);
            const body = new THREE.Mesh(bodyGeometry, new THREE.MeshStandardMaterial({
                color: 0x000000,
                flatShading: true
            }));
            group.add(body);

            // Colorful wings
            const wingGeometry = new THREE.CircleGeometry(type.size * 1.2, 6);
            const leftWingMaterial = new THREE.MeshStandardMaterial({
                color: [0xFF69B4, 0xDDA0DD, 0xFFB6C1][Math.floor(Math.random() * 3)],
                flatShading: true,
                side: THREE.DoubleSide
            });
            const leftWing = new THREE.Mesh(wingGeometry, leftWingMaterial);
            leftWing.position.set(-type.size * 0.8, 0, 0);
            leftWing.rotation.y = Math.PI / 6;
            group.add(leftWing);
            group.userData.leftWing = leftWing;

            const rightWing = new THREE.Mesh(wingGeometry, leftWingMaterial.clone());
            rightWing.position.set(type.size * 0.8, 0, 0);
            rightWing.rotation.y = -Math.PI / 6;
            group.add(rightWing);
            group.userData.rightWing = rightWing;

        } else if (type.type === 'balloon') {
            // Balloon
            const balloonGeometry = new THREE.SphereGeometry(type.size, 8, 8);
            const balloonColor = [0xFF69B4, 0x87CEEB, 0xFFD700, 0xDDA0DD][Math.floor(Math.random() * 4)];
            const balloon = new THREE.Mesh(balloonGeometry, new THREE.MeshStandardMaterial({
                color: balloonColor,
                flatShading: true
            }));
            balloon.castShadow = true;
            group.add(balloon);

            // String
            const stringGeometry = new THREE.CylinderGeometry(0.02, 0.02, 2, 4);
            const string = new THREE.Mesh(stringGeometry, new THREE.MeshStandardMaterial({
                color: 0xFFFFFF
            }));
            string.position.y = -1;
            group.add(string);

        } else if (type.type === 'leaf') {
            // Leaf (flat circle)
            const leafGeometry = new THREE.CircleGeometry(type.size, 6);
            const leafColor = [0x90EE90, 0xFFB7C5, 0xFFE4E1][Math.floor(Math.random() * 3)];
            const leaf = new THREE.Mesh(leafGeometry, new THREE.MeshStandardMaterial({
                color: leafColor,
                flatShading: true,
                side: THREE.DoubleSide
            }));
            group.add(leaf);

        } else if (type.type === 'car') {
            // Car - cute low-poly vehicle
            const carColors = [0xFF69B4, 0x87CEEB, 0xFFD700, 0xDDA0DD, 0xFF6B9D];
            const carColor = carColors[Math.floor(Math.random() * carColors.length)];

            // Car body (main box)
            const bodyGeometry = new THREE.BoxGeometry(type.size * 1.5, type.size * 0.8, type.size * 2);
            const bodyMaterial = new THREE.MeshStandardMaterial({
                color: carColor,
                flatShading: true
            });
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            body.position.y = type.size * 0.4;
            body.castShadow = true;
            group.add(body);

            // Car roof (smaller box on top)
            const roofGeometry = new THREE.BoxGeometry(type.size * 1.2, type.size * 0.5, type.size * 1.2);
            const roof = new THREE.Mesh(roofGeometry, bodyMaterial);
            roof.position.y = type.size * 1.05;
            roof.castShadow = true;
            group.add(roof);

            // Windows (light blue)
            const windowGeometry = new THREE.BoxGeometry(type.size * 1.15, type.size * 0.45, type.size * 0.5);
            const windowMaterial = new THREE.MeshStandardMaterial({
                color: 0x87CEEB,
                transparent: true,
                opacity: 0.7,
                flatShading: true
            });
            const frontWindow = new THREE.Mesh(windowGeometry, windowMaterial);
            frontWindow.position.set(0, type.size * 1.05, type.size * 0.6);
            group.add(frontWindow);

            const backWindow = new THREE.Mesh(windowGeometry, windowMaterial);
            backWindow.position.set(0, type.size * 1.05, -type.size * 0.6);
            group.add(backWindow);

            // Wheels (black circles)
            const wheelGeometry = new THREE.CylinderGeometry(type.size * 0.35, type.size * 0.35, type.size * 0.3, 8);
            const wheelMaterial = new THREE.MeshStandardMaterial({
                color: 0x222222,
                flatShading: true
            });

            // Front wheels
            const frontLeftWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            frontLeftWheel.rotation.z = Math.PI / 2;
            frontLeftWheel.position.set(-type.size * 0.8, type.size * 0.15, type.size * 0.8);
            frontLeftWheel.castShadow = true;
            group.add(frontLeftWheel);

            const frontRightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            frontRightWheel.rotation.z = Math.PI / 2;
            frontRightWheel.position.set(type.size * 0.8, type.size * 0.15, type.size * 0.8);
            frontRightWheel.castShadow = true;
            group.add(frontRightWheel);

            // Back wheels
            const backLeftWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            backLeftWheel.rotation.z = Math.PI / 2;
            backLeftWheel.position.set(-type.size * 0.8, type.size * 0.15, -type.size * 0.8);
            backLeftWheel.castShadow = true;
            group.add(backLeftWheel);

            const backRightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            backRightWheel.rotation.z = Math.PI / 2;
            backRightWheel.position.set(type.size * 0.8, type.size * 0.15, -type.size * 0.8);
            backRightWheel.castShadow = true;
            group.add(backRightWheel);

            // Headlights (yellow)
            const headlightGeometry = new THREE.SphereGeometry(type.size * 0.15, 6, 6);
            const headlightMaterial = new THREE.MeshStandardMaterial({
                color: 0xFFFF00,
                emissive: 0xFFFF00,
                emissiveIntensity: 0.5,
                flatShading: true
            });
            const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
            leftHeadlight.position.set(-type.size * 0.5, type.size * 0.4, type.size * 1.05);
            group.add(leftHeadlight);

            const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
            rightHeadlight.position.set(type.size * 0.5, type.size * 0.4, type.size * 1.05);
            group.add(rightHeadlight);

        } else if (type.type === 'bus') {
            // Bus - larger vehicle
            const busColors = [0xFFB7C5, 0xFFD700, 0xFF6B9D, 0xDDA0DD];
            const busColor = busColors[Math.floor(Math.random() * busColors.length)];

            // Bus body (tall box)
            const bodyGeometry = new THREE.BoxGeometry(type.size * 1.8, type.size * 1.6, type.size * 3.5);
            const bodyMaterial = new THREE.MeshStandardMaterial({
                color: busColor,
                flatShading: true
            });
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            body.position.y = type.size * 0.9;
            body.castShadow = true;
            group.add(body);

            // Front hood (smaller front section)
            const hoodGeometry = new THREE.BoxGeometry(type.size * 1.6, type.size * 1.2, type.size * 0.8);
            const hood = new THREE.Mesh(hoodGeometry, bodyMaterial);
            hood.position.set(0, type.size * 0.7, type.size * 2.15);
            hood.castShadow = true;
            group.add(hood);

            // Windows (multiple rows for bus)
            const windowGeometry = new THREE.BoxGeometry(type.size * 0.6, type.size * 0.5, type.size * 0.05);
            const windowMaterial = new THREE.MeshStandardMaterial({
                color: 0x87CEEB,
                transparent: true,
                opacity: 0.7,
                flatShading: true
            });

            // Side windows (3 on each side)
            for (let i = 0; i < 3; i++) {
                const leftWindow = new THREE.Mesh(windowGeometry, windowMaterial);
                leftWindow.rotation.y = Math.PI / 2;
                leftWindow.position.set(-type.size * 0.91, type.size * 1.2, type.size * (0.5 - i * 1.2));
                group.add(leftWindow);

                const rightWindow = new THREE.Mesh(windowGeometry, windowMaterial);
                rightWindow.rotation.y = -Math.PI / 2;
                rightWindow.position.set(type.size * 0.91, type.size * 1.2, type.size * (0.5 - i * 1.2));
                group.add(rightWindow);
            }

            // Front windshield
            const windshieldGeometry = new THREE.BoxGeometry(type.size * 1.5, type.size * 0.8, type.size * 0.05);
            const windshield = new THREE.Mesh(windshieldGeometry, windowMaterial);
            windshield.position.set(0, type.size * 1.1, type.size * 1.76);
            group.add(windshield);

            // Wheels (6 wheels for bus - 2 front, 4 back)
            const wheelGeometry = new THREE.CylinderGeometry(type.size * 0.4, type.size * 0.4, type.size * 0.3, 8);
            const wheelMaterial = new THREE.MeshStandardMaterial({
                color: 0x222222,
                flatShading: true
            });

            // Front wheels
            const frontLeftWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            frontLeftWheel.rotation.z = Math.PI / 2;
            frontLeftWheel.position.set(-type.size * 0.95, type.size * 0.2, type.size * 1.3);
            frontLeftWheel.castShadow = true;
            group.add(frontLeftWheel);

            const frontRightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            frontRightWheel.rotation.z = Math.PI / 2;
            frontRightWheel.position.set(type.size * 0.95, type.size * 0.2, type.size * 1.3);
            frontRightWheel.castShadow = true;
            group.add(frontRightWheel);

            // Back wheels (dual axle)
            for (let i = 0; i < 2; i++) {
                const backLeftWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
                backLeftWheel.rotation.z = Math.PI / 2;
                backLeftWheel.position.set(-type.size * 0.95, type.size * 0.2, -type.size * (0.8 + i * 0.8));
                backLeftWheel.castShadow = true;
                group.add(backLeftWheel);

                const backRightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
                backRightWheel.rotation.z = Math.PI / 2;
                backRightWheel.position.set(type.size * 0.95, type.size * 0.2, -type.size * (0.8 + i * 0.8));
                backRightWheel.castShadow = true;
                group.add(backRightWheel);
            }

            // Headlights (yellow)
            const headlightGeometry = new THREE.SphereGeometry(type.size * 0.2, 6, 6);
            const headlightMaterial = new THREE.MeshStandardMaterial({
                color: 0xFFFF00,
                emissive: 0xFFFF00,
                emissiveIntensity: 0.5,
                flatShading: true
            });
            const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
            leftHeadlight.position.set(-type.size * 0.6, type.size * 0.5, type.size * 2.55);
            group.add(leftHeadlight);

            const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
            rightHeadlight.position.set(type.size * 0.6, type.size * 0.5, type.size * 2.55);
            group.add(rightHeadlight);

            // Roof decoration (optional stripe)
            const stripeGeometry = new THREE.BoxGeometry(type.size * 1.85, type.size * 0.15, type.size * 3.6);
            const stripeMaterial = new THREE.MeshStandardMaterial({
                color: 0xFFFFFF,
                flatShading: true
            });
            const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
            stripe.position.y = type.size * 1.2;
            group.add(stripe);
        }

        group.position.set(x, type.height, spawnZ);
        group.userData.type = type.type;
        group.userData.speed = type.speed;
        group.userData.animTime = Math.random() * Math.PI * 2;
        group.userData.wobble = Math.random() * 2;

        // Only cars and buses are obstacles - flying objects (balloon, bird, butterfly, leaf) are decorative
        if (type.type === 'car' || type.type === 'bus') {
            group.userData.isObstacle = true;
            // Collision radius should be half the body width to fit in lanes
            group.userData.collisionRadius = (type.type === 'bus') ? type.size * 0.9 : type.size * 0.75;

            if (type.type === 'car') {
                // Car total height: body (0.8*size) + roof (0.5*size) ≈ 1.3*size = 1.3
                // Make it a low obstacle but require a good jump
                group.userData.obstacleHeight = 1.3;
                group.userData.obstacleType = 'low';
            } else {
                // Bus is tall - need to dodge, can't jump over
                group.userData.obstacleHeight = 2.0;
                group.userData.obstacleType = 'tall';
            }
        } else {
            // Flying objects (balloon, bird, butterfly, leaf) are NOT obstacles - purely decorative
            group.userData.isObstacle = false;
        }

        this.scene.add(group);
        this.movingObjects.push(group);
        // PERFORMANCE: Add to obstacle cache if it's an obstacle
        if (group.userData.isObstacle) {
            this.movingObstaclesCache.push(group);
        }
    }

    updateStreetLamps(playerZ) {
        // PERFORMANCE: Reduced spawn distance from 500 to 150
        while (playerZ - this.nextLampZ < 150) {
            this.createStreetLamp(-8, 0, this.nextLampZ);
            this.createStreetLamp(8, 0, this.nextLampZ - this.lampSpacing / 2);
            this.nextLampZ -= this.lampSpacing;
        }

        // PERFORMANCE: In-place removal for old lamps (don't dispose shared geometries)
        for (let i = this.streetLamps.length - 1; i >= 0; i--) {
            const lamp = this.streetLamps[i];
            if (lamp.userData.zPos > playerZ + 30) {
                this.scene.remove(lamp);
                // Only dispose materials (geometries are shared)
                lamp.traverse((child) => {
                    if (child.material && child.material !== this.sharedMaterials.lampPost) {
                        child.material.dispose();
                    }
                });
                this.streetLamps[i] = this.streetLamps[this.streetLamps.length - 1];
                this.streetLamps.pop();
            }
        }
    }

    updateTrees(playerZ) {
        // PERFORMANCE: Reduced spawn distance from 500 to 150
        while (playerZ - this.nextTreeZ < 150) {
            // PERFORMANCE: Reduced spawn chance from 75% to 50% per side
            if (Math.random() > 0.5) {
                this.createTree(-10 - Math.random() * 3, 0, this.nextTreeZ + Math.random() * 5);
            }
            if (Math.random() > 0.5) {
                this.createTree(10 + Math.random() * 3, 0, this.nextTreeZ + Math.random() * 5);
            }
            this.nextTreeZ -= this.treeSpacing;
        }

        // PERFORMANCE: In-place removal for old trees (don't dispose shared geometries)
        for (let i = this.trees.length - 1; i >= 0; i--) {
            const tree = this.trees[i];
            if (tree.userData.zPos > playerZ + 30) {
                this.scene.remove(tree);
                // Only dispose materials (geometries are shared)
                tree.traverse((child) => {
                    if (child.material && child.material !== this.sharedMaterials.trunk) {
                        child.material.dispose();
                    }
                });
                this.trees[i] = this.trees[this.trees.length - 1];
                this.trees.pop();
            }
        }
    }

    updateMovingObjects(deltaTime, playerZ) {
        // Spawn new moving objects
        if (Math.random() < this.movingObjectSpawnChance * deltaTime) {
            this.createMovingObject(playerZ);
        }

        // PERFORMANCE: Use indexed for-loop instead of forEach (avoids closure overhead)
        for (let i = 0, len = this.movingObjects.length; i < len; i++) {
            const obj = this.movingObjects[i];
            // Move toward player (positive Z direction)
            obj.position.z += obj.userData.speed * deltaTime;
            obj.userData.animTime += deltaTime * 5;

            // Animate based on type
            const objType = obj.userData.type;
            if (objType === 'bird' && obj.userData.leftWing) {
                const flapAmount = Math.sin(obj.userData.animTime * 10) * 0.4;
                obj.userData.leftWing.rotation.z = flapAmount;
                obj.userData.rightWing.rotation.z = -flapAmount;
            } else if (objType === 'butterfly' && obj.userData.leftWing) {
                const flapAmount = Math.sin(obj.userData.animTime * 8) * 0.6;
                obj.userData.leftWing.rotation.y = Math.PI / 6 + flapAmount;
                obj.userData.rightWing.rotation.y = -Math.PI / 6 - flapAmount;
            } else if (objType === 'balloon') {
                // Gentle bobbing
                obj.position.y += Math.sin(obj.userData.animTime * 2) * deltaTime * 0.5;
                obj.rotation.y += deltaTime * 0.3;
            } else if (objType === 'leaf') {
                // Spinning and swaying
                obj.rotation.z += deltaTime * 3;
                obj.position.x += Math.sin(obj.userData.animTime * 3) * deltaTime * obj.userData.wobble;
            }

            // Wobble side to side for all
            const wobble = Math.sin(obj.userData.animTime * 2) * 0.3;
            obj.position.x += wobble * deltaTime * 0.2;
        }

        // PERFORMANCE: In-place removal instead of filter()
        for (let i = this.movingObjects.length - 1; i >= 0; i--) {
            const obj = this.movingObjects[i];
            if (obj.position.z > playerZ + 20) {
                this.scene.remove(obj);
                // PERFORMANCE: Also remove from obstacle cache if present
                if (obj.userData.isObstacle) {
                    const cacheIdx = this.movingObstaclesCache.indexOf(obj);
                    if (cacheIdx !== -1) {
                        this.movingObstaclesCache[cacheIdx] = this.movingObstaclesCache[this.movingObstaclesCache.length - 1];
                        this.movingObstaclesCache.pop();
                    }
                }
                this.movingObjects[i] = this.movingObjects[this.movingObjects.length - 1];
                this.movingObjects.pop();
            }
        }
    }

    updateSidewalkCharacters(deltaTime, playerZ) {
        // Spawn new characters
        if (Math.random() < this.characterSpawnChance * deltaTime * 2) {
            const spawnZ = playerZ - 50 - Math.random() * 30;
            this.createSidewalkCharacter(spawnZ);
        }

        // PERFORMANCE: Use indexed for-loop instead of forEach (avoids closure overhead)
        for (let i = 0, len = this.sidewalkCharacters.length; i < len; i++) {
            const character = this.sidewalkCharacters[i];
            // Move along sidewalk
            character.position.z += character.userData.direction * character.userData.speed * deltaTime;
            character.userData.animTime += deltaTime * 3;

            // Animate based on type
            const charType = character.userData.type;
            if (charType === 'bird' && character.userData.leftWing) {
                const flapAmount = Math.sin(character.userData.animTime * 10) * 0.3;
                character.userData.leftWing.rotation.z = flapAmount;
                character.userData.rightWing.rotation.z = -flapAmount;

                // Bobbing flight
                character.position.y = 0.5 + Math.sin(character.userData.animTime * 5) * 0.2;
            } else if (charType === 'butterfly' && character.userData.leftWing) {
                const flapAmount = Math.sin(character.userData.animTime * 8) * 0.5;
                character.userData.leftWing.rotation.y = Math.PI / 6 + flapAmount;
                character.userData.rightWing.rotation.y = -Math.PI / 6 - flapAmount;

                // Gentle floating
                character.position.y = 1 + Math.sin(character.userData.animTime * 3) * 0.3;
            } else {
                // Gentle bobbing for walking characters
                character.rotation.y = Math.sin(character.userData.animTime * 2) * 0.1;
            }
        }

        // PERFORMANCE: In-place removal instead of filter()
        for (let i = this.sidewalkCharacters.length - 1; i >= 0; i--) {
            const character = this.sidewalkCharacters[i];
            const distance = Math.abs(character.position.z - playerZ);
            if (distance > 100) {
                this.scene.remove(character);
                this.sidewalkCharacters[i] = this.sidewalkCharacters[this.sidewalkCharacters.length - 1];
                this.sidewalkCharacters.pop();
            }
        }
    }

    getMovingObstacles() {
        // PERFORMANCE: Return cached obstacle list instead of filtering every frame
        return this.movingObstaclesCache;
    }

    reset() {
        // PERFORMANCE: Reset animation time
        this.animTime = 0;

        // Build sets of shared resources so we never dispose them during reset
        const sharedGeoSet = new Set(Object.values(this.sharedGeometries).filter(Boolean));
        const sharedMatSet = new Set(Object.values(this.sharedMaterials).filter(Boolean));

        // Helper function to properly dispose Three.js objects (skips shared resources)
        const disposeObject = (obj) => {
            this.scene.remove(obj);
            obj.traverse((child) => {
                if (child.geometry && !sharedGeoSet.has(child.geometry)) {
                    child.geometry.dispose();
                }
                if (child.material) {
                    // Handle both single materials and material arrays
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => {
                            if (!sharedMatSet.has(mat)) mat.dispose();
                        });
                    } else {
                        if (!sharedMatSet.has(child.material)) child.material.dispose();
                    }
                }
            });
        };

        // Clean up all spawned elements with proper disposal
        this.groundSegments.forEach(disposeObject);
        this.groundSegments = [];

        // MEMORY FIX: Buildings were not disposing geometry/materials
        this.buildings.forEach(disposeObject);
        this.buildings = [];

        // MEMORY FIX: backgroundObjects stale references were never cleared
        this.backgroundObjects = [];

        // MEMORY FIX: Decorations were not disposing geometry/materials
        this.decorations.forEach(decoration => {
            disposeObject(decoration.mesh);
        });
        this.decorations = [];

        // MEMORY FIX: Sidewalk characters were not disposing geometry/materials
        this.sidewalkCharacters.forEach(disposeObject);
        this.sidewalkCharacters = [];

        // MEMORY FIX: Moving objects (cars/buses) were not disposing geometry/materials
        this.movingObjects.forEach(disposeObject);
        this.movingObjects = [];
        this.movingObstaclesCache = []; // PERFORMANCE: Clear obstacle cache on reset

        // Clean up street lamps
        this.streetLamps.forEach(disposeObject);
        this.streetLamps = [];

        // Clean up trees
        this.trees.forEach(disposeObject);
        this.trees = [];

        // Reset spawn positions
        this.nextBuildingZ = -50;
        this.nextCharacterSpawnZ = -30;
        this.nextGroundSegmentZ = 100;
        this.nextLampZ = -100;
        this.nextTreeZ = -100;

        // Regenerate initial ground segments - 12 covers spawn range of 1500m
        for (let i = 0; i < 12; i++) {
            this.spawnGroundSegment(this.nextGroundSegmentZ);
            this.nextGroundSegmentZ -= this.groundSegmentLength;
        }

        // Regenerate initial buildings (optimized for FPS)
        for (let i = 0; i < 18; i++) { // OPTIMIZED: Reduced from 25 to 18
            this.spawnBuilding(this.nextBuildingZ);
            this.nextBuildingZ -= this.buildingSpacing;
        }

        // Regenerate initial street lamps and trees
        this.createSideDecorations();
    }

    getScene() {
        return this.scene;
    }
}
