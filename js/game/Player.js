import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GAME_CONFIG, HELLO_KITTY_COLORS, COLORS } from '../utils/Constants.js';

// PERFORMANCE: Pre-computed rainbow lookup table (avoids per-frame HSL→RGB trig math)
// 360 entries × 3 channels = 1080 floats, computed once at module load
const RAINBOW_LUT_SIZE = 360;
const RAINBOW_LUT = new Float32Array(RAINBOW_LUT_SIZE * 3);
const RAINBOW_LUT_DARK = new Float32Array(RAINBOW_LUT_SIZE * 3); // Lower lightness for pocket
const _lutColor = new THREE.Color();
for (let i = 0; i < RAINBOW_LUT_SIZE; i++) {
    _lutColor.setHSL(i / RAINBOW_LUT_SIZE, 0.85, 0.55);
    RAINBOW_LUT[i * 3] = _lutColor.r;
    RAINBOW_LUT[i * 3 + 1] = _lutColor.g;
    RAINBOW_LUT[i * 3 + 2] = _lutColor.b;
    _lutColor.setHSL(i / RAINBOW_LUT_SIZE, 0.85, 0.45);
    RAINBOW_LUT_DARK[i * 3] = _lutColor.r;
    RAINBOW_LUT_DARK[i * 3 + 1] = _lutColor.g;
    RAINBOW_LUT_DARK[i * 3 + 2] = _lutColor.b;
}

// Pre-allocated hue offsets for bow parts (avoids per-frame array allocation)
const BOW_HUE_OFFSETS = [0, 0.15, 0.3, 0.45, 0.6];

export class Player {
    constructor(scene, outfitColors = null) {
        this.scene = scene;

        // Position and movement
        this.currentLane = 1; // 0 = left, 1 = center, 2 = right
        this.targetX = GAME_CONFIG.LANE_POSITIONS[this.currentLane];
        this.speed = GAME_CONFIG.PLAYER_START_SPEED;
        this.position = new THREE.Vector3(0, 0, 0); // Feet on ground (character pivot is at feet)

        // Jump state
        this.isJumping = false;
        this.isSliding = false;
        this.velocityY = 0;
        this.jumpCount = 0; // Track number of jumps (0, 1, or 2 for double jump)
        this.canDoubleJump = true; // Allow double jump

        // Animation
        this.laneSwitchProgress = 0;
        this.laneSwitchStart = 0;
        this.bobOffset = 0;

        // Blinking animation
        this.blinkTimer = 0;
        this.blinkInterval = 3; // Blink every 3 seconds on average
        this.isBlinking = false;
        this.blinkDuration = 0.15; // How long a blink takes
        this.blinksRemaining = 1; // For occasional double blinks

        // Knocked out animation (game over screen)
        this.knockedOutTimer = 0;
        this.isKnockedOut = false;

        // Outfit colors (can be customized)
        this.outfitColors = outfitColors || {
            shirtColor: 0xFFD700,    // Gold/yellow (default)
            overallsColor: 0x4169E1, // Royal blue (default)
            pocketColor: 0x3158B8,   // Darker blue (default)
            bowColor: 0xFF0000,      // Red (default)
            isRainbowBow: false,
            isRainbowShirt: false,
            isRainbowOveralls: false
        };

        // Rainbow animation state
        this.rainbowHue = 0;

        // PERFORMANCE: Throttle rainbow visual updates to ~30fps (imperceptible vs 60fps for smooth hue cycling)
        this._rainbowUpdateAccum = 0;
        this._rainbowUpdateInterval = 1 / 30; // ~33ms between visual updates

        // Rainbow bow: merged geometry with vertex colors (5 draw calls → 1)
        this._bowColorAttr = null;     // BufferAttribute reference for fast updates
        this._bowPartRanges = [];      // [{start, count}, ...] vertex ranges per bow part

        // Celebration animation state
        this.isCelebrating = false;
        this.celebrationTimer = 0;

        // Create character
        this.createCharacter();
    }

    createCharacter() {
        this.character = new THREE.Group();

        // Materials with better appearance
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: HELLO_KITTY_COLORS.BODY,
            flatShading: false,
            roughness: 0.6,
            metalness: 0.05,
        });

        const eyeMaterial = new THREE.MeshStandardMaterial({
            color: HELLO_KITTY_COLORS.EYES,
            flatShading: false,
        });

        const noseMaterial = new THREE.MeshStandardMaterial({
            color: HELLO_KITTY_COLORS.NOSE,
            flatShading: false,
            emissive: HELLO_KITTY_COLORS.NOSE,
            emissiveIntensity: 0.2,
        });

        // Body (smaller relative to head - Hello Kitty style)
        const bodyGeometry = new THREE.SphereGeometry(0.38, 24, 24);
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.castShadow = true;
        this.body.position.y = 0.45;
        this.body.scale.set(1, 1.05, 0.95); // Slightly taller
        this.character.add(this.body);

        // === Outfit: Customizable shirt and overalls ===
        this.overallsMaterial = new THREE.MeshStandardMaterial({
            color: this.outfitColors.overallsColor,
            flatShading: false,
        });
        this.shirtMaterial = new THREE.MeshStandardMaterial({
            color: this.outfitColors.shirtColor,
            flatShading: false,
        });
        // Button material - gold normally, but white when "no overalls" selected
        const isNoOveralls = this.outfitColors.overallsColor === 0xFFFFFF;
        this.buttonMaterial = new THREE.MeshStandardMaterial({
            color: isNoOveralls ? 0xFFFFFF : 0xFFD700,
            flatShading: false,
        });

        // Shirt - covers entire upper body
        const shirtGeometry = new THREE.SphereGeometry(0.39, 24, 24);
        this.shirt = new THREE.Mesh(shirtGeometry, this.shirtMaterial);
        this.shirt.position.y = 0.45;
        this.shirt.scale.set(1.01, 1.06, 0.96); // Slightly larger than body to cover it
        this.character.add(this.shirt);

        // Overalls (covers lower body, shirt shows above)
        const overallsGeometry = new THREE.SphereGeometry(0.40, 24, 24);
        this.overalls = new THREE.Mesh(overallsGeometry, this.overallsMaterial);
        this.overalls.position.y = 0.38;
        this.overalls.scale.set(1.03, 0.85, 0.99);
        this.character.add(this.overalls);

        // === SUSPENDER STRAPS ===
        // Straps at x = ±0.18 to go over the shoulders properly
        const strapX = 0.22; // Distance from center - wider to go over shoulders

        // Array to store all overalls-related meshes for visibility toggling
        this.overallsMeshes = [];

        // Overalls bib (front panel) - taller to connect to pants
        const bibGeometry = new THREE.BoxGeometry(0.46, 0.28, 0.04);
        this.bib = new THREE.Mesh(bibGeometry, this.overallsMaterial);
        this.bib.position.set(0, 0.63, 0.42);
        this.character.add(this.bib);
        this.overallsMeshes.push(this.bib);

        // Side connectors - connect bib to overalls on the sides
        const sideConnectorGeometry = new THREE.BoxGeometry(0.06, 0.20, 0.12);

        this.leftSideConnector = new THREE.Mesh(sideConnectorGeometry, this.overallsMaterial);
        this.leftSideConnector.position.set(-0.24, 0.56, 0.36);
        this.character.add(this.leftSideConnector);
        this.overallsMeshes.push(this.leftSideConnector);

        this.rightSideConnector = new THREE.Mesh(sideConnectorGeometry, this.overallsMaterial);
        this.rightSideConnector.position.set(0.24, 0.56, 0.36);
        this.character.add(this.rightSideConnector);
        this.overallsMeshes.push(this.rightSideConnector);

        // Pocket on bib
        const pocketGeometry = new THREE.BoxGeometry(0.14, 0.07, 0.02);
        this.pocketMaterial = new THREE.MeshStandardMaterial({
            color: this.outfitColors.pocketColor,
            flatShading: false,
        });
        this.pocket = new THREE.Mesh(pocketGeometry, this.pocketMaterial);
        this.pocket.position.set(0, 0.60, 0.45);
        this.character.add(this.pocket);
        this.overallsMeshes.push(this.pocket);

        // Strap dimensions - wider straps
        const strapWidth = 0.09;
        const strapThickness = 0.03;

        // Gold buttons at top of bib where straps attach
        const buttonGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.02, 12);

        this.leftButton = new THREE.Mesh(buttonGeometry, this.buttonMaterial);
        this.leftButton.position.set(-strapX, 0.68, 0.45);
        this.leftButton.rotation.x = Math.PI / 2;
        this.character.add(this.leftButton);
        this.overallsMeshes.push(this.leftButton);

        this.rightButton = new THREE.Mesh(buttonGeometry, this.buttonMaterial);
        this.rightButton.position.set(strapX, 0.68, 0.45);
        this.rightButton.rotation.x = Math.PI / 2;
        this.character.add(this.rightButton);
        this.overallsMeshes.push(this.rightButton);

        // Create continuous straps from bib over shoulders to back
        [-strapX, strapX].forEach(xPos => {
            // Full strap path from bib top, over shoulder, down the back to pants
            const strapPoints = [
                { y: 0.69, z: 0.43 },   // At bib top (button level)
                { y: 0.73, z: 0.38 },   // Rising from bib
                { y: 0.77, z: 0.30 },   // Going up
                { y: 0.80, z: 0.18 },   // Upper chest
                { y: 0.82, z: 0.05 },   // Shoulder front
                { y: 0.82, z: -0.08 },  // Top/over shoulder
                { y: 0.80, z: -0.20 },  // Down the back
                { y: 0.74, z: -0.30 },  // Upper back
                { y: 0.66, z: -0.36 },  // Mid back
                { y: 0.56, z: -0.34 },  // Lower back
                { y: 0.48, z: -0.28 },  // Into the overalls waistband
            ];

            // Create strap segments with overlap
            for (let i = 0; i < strapPoints.length - 1; i++) {
                const p1 = strapPoints[i];
                const p2 = strapPoints[i + 1];

                const dy = p2.y - p1.y;
                const dz = p2.z - p1.z;
                const length = Math.sqrt(dy * dy + dz * dz);
                const angle = Math.atan2(dz, dy);

                // Extra length for overlap between segments
                const segGeom = new THREE.BoxGeometry(strapWidth, length + 0.03, strapThickness);
                const segment = new THREE.Mesh(segGeom, this.overallsMaterial);
                segment.position.set(xPos, (p1.y + p2.y) / 2, (p1.z + p2.z) / 2);
                segment.rotation.x = angle;
                this.character.add(segment);
                this.overallsMeshes.push(segment); // Track strap segments too
            }
        });

        // Collar at neckline - more visible
        const collarGeometry = new THREE.TorusGeometry(0.18, 0.05, 8, 16);
        this.collar = new THREE.Mesh(collarGeometry, this.shirtMaterial);
        this.collar.position.y = 0.92;
        this.collar.rotation.x = Math.PI / 2;
        this.character.add(this.collar);

        // Store shirt meshes for visibility toggling
        this.shirtMeshes = [this.shirt, this.collar];

        // Apply initial visibility based on outfit colors
        this.updateOutfitVisibility();

        // Head (larger sphere - wider like Hello Kitty!)
        const headGeometry = new THREE.SphereGeometry(0.5, 24, 24);
        this.head = new THREE.Mesh(headGeometry, bodyMaterial);
        this.head.castShadow = true;
        this.head.position.y = 1.2;
        this.head.scale.set(1.25, 0.95, 1.1); // Much wider, slightly flatter
        this.character.add(this.head);

        // === All facial features are children of head so they move together ===
        // Positions are relative to head center (head is at y=1.2, so subtract 1.2)

        // Ears (spheres with slight elongation)
        const earGeometry = new THREE.SphereGeometry(0.15, 16, 16);
        const leftEar = new THREE.Mesh(earGeometry, bodyMaterial);
        leftEar.position.set(-0.38, 0.4, -0.05); // Relative to head
        leftEar.scale.set(0.9, 1.3, 0.9); // Taller ears
        leftEar.castShadow = true;
        this.head.add(leftEar);

        const rightEar = new THREE.Mesh(earGeometry, bodyMaterial);
        rightEar.position.set(0.38, 0.4, -0.05); // Relative to head
        rightEar.scale.set(0.9, 1.3, 0.9);
        rightEar.castShadow = true;
        this.head.add(rightEar);

        // Inner ear details (pink)
        const innerEarMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFB7D5,
            flatShading: false,
        });
        const innerEarGeometry = new THREE.SphereGeometry(0.08, 12, 12);
        const leftInnerEar = new THREE.Mesh(innerEarGeometry, innerEarMaterial);
        leftInnerEar.position.set(-0.38, 0.37, 0); // Relative to head
        leftInnerEar.scale.set(0.8, 1.2, 0.4);
        this.head.add(leftInnerEar);

        const rightInnerEar = new THREE.Mesh(innerEarGeometry, innerEarMaterial);
        rightInnerEar.position.set(0.38, 0.37, 0); // Relative to head
        rightInnerEar.scale.set(0.8, 1.2, 0.4);
        this.head.add(rightInnerEar);

        // Bow (Hello Kitty's signature feature - PERFORMANCE: merged into single geometry with vertex colors)
        // This reduces 5 separate meshes/materials/draw calls down to 1, eliminating per-frame
        // material state changes that caused the FPS drop with rainbow gear
        const bowColor = new THREE.Color(this.outfitColors.bowColor || HELLO_KITTY_COLORS.BOW);

        // Create base geometries
        const bowLoopGeometry = new THREE.SphereGeometry(0.32, 16, 16);
        const bowCenterGeometry = new THREE.SphereGeometry(0.15, 12, 12);
        const ribbonGeometry = new THREE.BoxGeometry(0.10, 0.25, 0.06);

        // Clone and bake transforms into each geometry (same positions/scales as before)
        const leftLoopGeo = bowLoopGeometry.clone();
        leftLoopGeo.scale(0.6, 1.1, 0.7);
        leftLoopGeo.translate(-0.27, 0, 0);

        const rightLoopGeo = bowLoopGeometry.clone();
        rightLoopGeo.scale(0.6, 1.1, 0.7);
        rightLoopGeo.translate(0.27, 0, 0);

        const centerGeo = bowCenterGeometry.clone();
        centerGeo.scale(1.4, 1.2, 1.0);

        const leftRibbonGeo = ribbonGeometry.clone();
        leftRibbonGeo.applyMatrix4(new THREE.Matrix4().makeRotationZ(-0.25));
        leftRibbonGeo.translate(-0.08, -0.18, 0);

        const rightRibbonGeo = ribbonGeometry.clone();
        rightRibbonGeo.applyMatrix4(new THREE.Matrix4().makeRotationZ(0.25));
        rightRibbonGeo.translate(0.08, -0.18, 0);

        // Order: left loop, center, right loop, left ribbon, right ribbon (matches BOW_HUE_OFFSETS)
        const bowParts = [leftLoopGeo, centerGeo, rightLoopGeo, leftRibbonGeo, rightRibbonGeo];

        // Add vertex color attribute to each part and track vertex ranges for per-part rainbow updates
        this._bowPartRanges = [];
        let vertexOffset = 0;
        for (const geo of bowParts) {
            const count = geo.attributes.position.count;
            const colors = new Float32Array(count * 3);
            for (let j = 0; j < count; j++) {
                colors[j * 3] = bowColor.r;
                colors[j * 3 + 1] = bowColor.g;
                colors[j * 3 + 2] = bowColor.b;
            }
            geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            this._bowPartRanges.push({ start: vertexOffset, count });
            vertexOffset += count;
        }

        // Merge all bow parts into single geometry (5 draw calls → 1)
        const mergedBowGeo = mergeGeometries(bowParts, false);

        // Single material with vertex colors (replaces 5 separate MeshStandardMaterials)
        this.bowMaterial = new THREE.MeshStandardMaterial({
            vertexColors: true,
            flatShading: false,
            roughness: 0.5,
            metalness: 0.1,
        });

        // Cache vertex color attribute for fast updates in rainbow animation
        this._bowColorAttr = mergedBowGeo.attributes.color;

        const bowMesh = new THREE.Mesh(mergedBowGeo, this.bowMaterial);
        bowMesh.castShadow = true;
        bowMesh.position.set(0.35, 0.42, 0.1); // Relative to head - raised up
        // Diagonal look: inner loop UP, outer loop DOWN
        bowMesh.rotation.set(0.2, 0, -0.5);
        this.bow = bowMesh;
        this.head.add(bowMesh);

        // Eyes (tall vertical ovals - Hello Kitty style)
        const eyeGeometry = new THREE.SphereGeometry(0.06, 16, 16);
        this.leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.leftEye.position.set(-0.22, 0.0, 0.54); // Relative to head
        this.leftEye.scale.set(0.8, 1.6, 0.5); // Tall vertical oval like reference
        this.head.add(this.leftEye);

        this.rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.rightEye.position.set(0.22, 0.0, 0.54); // Relative to head
        this.rightEye.scale.set(0.8, 1.6, 0.5); // Tall vertical oval like reference
        this.head.add(this.rightEye);

        // Store default eye scale for blinking
        this.eyeOpenScale = 1.6;

        // Nose (small oval)
        const noseGeometry = new THREE.SphereGeometry(0.055, 12, 12);
        this.nose = new THREE.Mesh(noseGeometry, noseMaterial);
        this.nose.position.set(0, -0.14, 0.5); // Relative to head
        this.nose.scale.set(0.9, 0.7, 0.9);
        this.head.add(this.nose);

        // Whiskers (3 per side - like Hello Kitty reference)
        // On front cheeks, centered around nose level, extending outward
        const whiskerGeometry = new THREE.BoxGeometry(0.32, 0.016, 0.016);
        const whiskerMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
        });

        // Whisker Y positions: equally spaced, bottom is anchor
        // Bottom at -0.22, then equal spacing of 0.10 upward
        const whiskerYPositions = [-0.02, -0.12, -0.22]; // Equal spacing

        // Left whiskers - emerging from inside cheek, extending outward
        const leftWhiskerAngles = [-0.12, 0, 0.12]; // Subtle fan
        for (let i = 0; i < 3; i++) {
            const whisker = new THREE.Mesh(whiskerGeometry, whiskerMaterial);
            whisker.position.set(-0.38, whiskerYPositions[i], 0.30); // Further back inside head
            whisker.rotation.z = leftWhiskerAngles[i];
            this.head.add(whisker);
        }

        // Right whiskers - emerging from inside cheek, extending outward
        const rightWhiskerAngles = [0.12, 0, -0.12]; // Subtle fan mirrored
        for (let i = 0; i < 3; i++) {
            const whisker = new THREE.Mesh(whiskerGeometry, whiskerMaterial);
            whisker.position.set(0.38, whiskerYPositions[i], 0.30); // Further back inside head
            whisker.rotation.z = rightWhiskerAngles[i];
            this.head.add(whisker);
        }

        // Arms with shoulder joints (adjusted for smaller body)
        // Arm geometry with pivot at TOP (shoulder) - translate geometry down
        const armGeometry = new THREE.CylinderGeometry(0.09, 0.09, 0.3, 12);
        armGeometry.translate(0, -0.15, 0); // Move geometry so top is at pivot point
        const shoulderGeometry = new THREE.SphereGeometry(0.11, 12, 12);
        const handGeometry = new THREE.SphereGeometry(0.12, 12, 12);

        // Left shoulder (connects arm to smaller body)
        const leftShoulder = new THREE.Mesh(shoulderGeometry, bodyMaterial);
        leftShoulder.position.set(-0.37, 0.58, 0);
        leftShoulder.castShadow = true;
        this.character.add(leftShoulder);

        // Left arm (pivot at shoulder position)
        this.leftArm = new THREE.Mesh(armGeometry.clone(), bodyMaterial);
        this.leftArm.position.set(-0.37, 0.55, 0); // At shoulder height
        this.leftArm.castShadow = true;
        this.character.add(this.leftArm);

        // Left hand (child of arm, at end of arm)
        this.leftHand = new THREE.Mesh(handGeometry, bodyMaterial);
        this.leftHand.position.y = -0.32; // At bottom of arm (0.3 arm + small offset)
        this.leftHand.castShadow = true;
        this.leftArm.add(this.leftHand);

        // Right shoulder (connects arm to smaller body)
        const rightShoulder = new THREE.Mesh(shoulderGeometry, bodyMaterial);
        rightShoulder.position.set(0.37, 0.58, 0);
        rightShoulder.castShadow = true;
        this.character.add(rightShoulder);

        // Right arm (pivot at shoulder position)
        this.rightArm = new THREE.Mesh(armGeometry.clone(), bodyMaterial);
        this.rightArm.position.set(0.37, 0.55, 0); // At shoulder height
        this.rightArm.castShadow = true;
        this.character.add(this.rightArm);

        // Right hand (child of arm, at end of arm)
        this.rightHand = new THREE.Mesh(handGeometry, bodyMaterial);
        this.rightHand.position.y = -0.32; // At bottom of arm (0.3 arm + small offset)
        this.rightHand.castShadow = true;
        this.rightArm.add(this.rightHand);

        // Legs (adjusted for smaller body) - positioned at hip with pivot at top
        const legGeometry = new THREE.CylinderGeometry(0.11, 0.11, 0.24, 12);
        this.leftLeg = new THREE.Mesh(legGeometry, bodyMaterial);
        this.leftLeg.position.set(-0.16, 0.26, 0); // Pivot at hip
        this.leftLeg.castShadow = true;
        this.character.add(this.leftLeg);

        this.rightLeg = new THREE.Mesh(legGeometry, bodyMaterial);
        this.rightLeg.position.set(0.16, 0.26, 0); // Pivot at hip
        this.rightLeg.castShadow = true;
        this.character.add(this.rightLeg);

        // Feet (adjusted for smaller body) - FIXED: Now children of legs so they move together!
        // Bigger, more visible feet! OPTIMIZED: Positioned to exactly touch ground at y=0
        const footGeometry = new THREE.SphereGeometry(0.18, 12, 12);
        this.leftFoot = new THREE.Mesh(footGeometry, bodyMaterial);
        this.leftFoot.position.set(0, -0.26, 0.08); // FIXED: -0.26 makes feet sit exactly on ground (leg is at 0.26)
        this.leftFoot.scale.set(1.2, 0.5, 1.3); // Wider, flatter, longer for better visibility
        this.leftFoot.castShadow = true;
        this.leftLeg.add(this.leftFoot); // Child of leg!

        this.rightFoot = new THREE.Mesh(footGeometry, bodyMaterial);
        this.rightFoot.position.set(0, -0.26, 0.08); // FIXED: -0.26 makes feet sit exactly on ground (leg is at 0.26)
        this.rightFoot.scale.set(1.2, 0.5, 1.3); // Wider, flatter, longer for better visibility
        this.rightFoot.castShadow = true;
        this.rightLeg.add(this.rightFoot); // Child of leg!

        // Store animation parts
        this.animationParts = {
            leftArm: this.leftArm,
            rightArm: this.rightArm,
            leftLeg: this.leftLeg,
            rightLeg: this.rightLeg,
        };

        // Character faces -Z (forward/movement direction), camera behind sees back
        this.character.position.copy(this.position);
        this.character.rotation.y = Math.PI; // 180° to face -Z
        this.scene.add(this.character);
    }

    moveLeft() {
        if (this.currentLane > 0) {
            this.currentLane--;
            this.targetX = GAME_CONFIG.LANE_POSITIONS[this.currentLane];
        }
    }

    moveRight() {
        if (this.currentLane < GAME_CONFIG.NUM_LANES - 1) {
            this.currentLane++;
            this.targetX = GAME_CONFIG.LANE_POSITIONS[this.currentLane];
        }
    }

    jump() {
        // Don't allow jumping while sliding
        if (this.isSliding) return;

        // First jump from ground
        if (!this.isJumping) {
            this.isJumping = true;
            this.velocityY = GAME_CONFIG.PLAYER_JUMP_FORCE;
            this.jumpCount = 1;
            this.canDoubleJump = true;
        }
        // Double jump while in air - full power for clearing tall obstacles!
        else if (this.canDoubleJump && this.jumpCount === 1) {
            this.velocityY = GAME_CONFIG.PLAYER_JUMP_FORCE * 1.1; // Actually stronger for tall obstacles!
            this.jumpCount = 2;
            this.canDoubleJump = false; // Can't triple jump!
        }
    }

    slide() {
        if (!this.isJumping && !this.isSliding) {
            this.isSliding = true;
            this.slideTimer = 0.5; // Slide duration in seconds
        }
    }

    // Update outfit colors (for cosmetic customization)
    setOutfitColors(colors) {
        if (colors.shirtColor !== undefined && this.shirtMaterial) {
            this.shirtMaterial.color.setHex(colors.shirtColor);
            this.outfitColors.shirtColor = colors.shirtColor;
        }
        if (colors.overallsColor !== undefined && this.overallsMaterial) {
            this.overallsMaterial.color.setHex(colors.overallsColor);
            this.outfitColors.overallsColor = colors.overallsColor;
            // Update button color: gold when overalls visible, doesn't matter when hidden
            if (this.buttonMaterial) {
                this.buttonMaterial.color.setHex(0xFFD700);
            }
        }
        if (colors.pocketColor !== undefined && this.pocketMaterial) {
            this.pocketMaterial.color.setHex(colors.pocketColor);
            this.outfitColors.pocketColor = colors.pocketColor;
        }
        if (colors.bowColor !== undefined && this._bowColorAttr) {
            // Update all vertex colors in merged bow geometry to the same color
            const c = _lutColor.setHex(colors.bowColor);
            const arr = this._bowColorAttr.array;
            for (let i = 0; i < arr.length; i += 3) {
                arr[i] = c.r;
                arr[i + 1] = c.g;
                arr[i + 2] = c.b;
            }
            this._bowColorAttr.needsUpdate = true;
            this.outfitColors.bowColor = colors.bowColor;
        }
        if (colors.isRainbowBow !== undefined) {
            this.outfitColors.isRainbowBow = colors.isRainbowBow;
        }
        if (colors.isRainbowShirt !== undefined) {
            this.outfitColors.isRainbowShirt = colors.isRainbowShirt;
        }
        if (colors.isRainbowOveralls !== undefined) {
            this.outfitColors.isRainbowOveralls = colors.isRainbowOveralls;
        }
        // Update visibility based on "no clothes" selections
        this.updateOutfitVisibility();
    }

    // Update outfit visibility - hide geometry when "no clothes" selected
    updateOutfitVisibility() {
        const isNoShirt = this.outfitColors.shirtColor === 0xFFFFFF;
        const isNoOveralls = this.outfitColors.overallsColor === 0xFFFFFF;

        // Toggle shirt visibility (shirt sphere + collar)
        if (this.shirtMeshes) {
            this.shirtMeshes.forEach(mesh => {
                mesh.visible = !isNoShirt;
            });
        }

        // Toggle overalls visibility (main sphere + bib + straps + buttons + pocket + connectors)
        if (this.overalls) {
            this.overalls.visible = !isNoOveralls;
        }
        if (this.overallsMeshes) {
            this.overallsMeshes.forEach(mesh => {
                mesh.visible = !isNoOveralls;
            });
        }
    }

    // Get current outfit colors
    getOutfitColors() {
        return { ...this.outfitColors };
    }

    // PERFORMANCE: Optimized rainbow color update with throttling and pre-computed LUT
    // - Throttled to ~30fps (imperceptible difference from 60fps for smooth hue cycling)
    // - Uses pre-computed rainbow lookup table (eliminates per-frame HSL→RGB trig math)
    // - Bow uses merged geometry vertex colors (1 buffer update instead of 5 material updates)
    updateRainbowColors(deltaTime) {
        // Always advance hue smoothly (even if we skip the visual update this frame)
        this.rainbowHue = (this.rainbowHue + deltaTime * 0.5) % 1;

        // Early exit if no rainbow items are active
        if (!this.outfitColors.isRainbowBow && !this.outfitColors.isRainbowShirt && !this.outfitColors.isRainbowOveralls) return;

        // Throttle visual updates to ~30fps - halves GPU state changes with no visible difference
        this._rainbowUpdateAccum += deltaTime;
        if (this._rainbowUpdateAccum < this._rainbowUpdateInterval) return;
        this._rainbowUpdateAccum = 0;

        // Rainbow bow - update vertex colors in merged geometry (1 draw call for all 5 parts)
        if (this.outfitColors.isRainbowBow && this._bowColorAttr) {
            const colors = this._bowColorAttr.array;
            for (let p = 0; p < 5; p++) {
                const lutIdx = Math.floor(((this.rainbowHue + BOW_HUE_OFFSETS[p]) % 1) * RAINBOW_LUT_SIZE) * 3;
                const r = RAINBOW_LUT[lutIdx], g = RAINBOW_LUT[lutIdx + 1], b = RAINBOW_LUT[lutIdx + 2];
                const range = this._bowPartRanges[p];
                const start = range.start * 3;
                const end = start + range.count * 3;
                for (let i = start; i < end; i += 3) {
                    colors[i] = r;
                    colors[i + 1] = g;
                    colors[i + 2] = b;
                }
            }
            this._bowColorAttr.needsUpdate = true;
        }

        // Rainbow shirt - LUT lookup instead of setHSL trig
        if (this.outfitColors.isRainbowShirt && this.shirtMaterial) {
            const lutIdx = Math.floor(((this.rainbowHue + 0.33) % 1) * RAINBOW_LUT_SIZE) * 3;
            this.shirtMaterial.color.setRGB(RAINBOW_LUT[lutIdx], RAINBOW_LUT[lutIdx + 1], RAINBOW_LUT[lutIdx + 2]);
        }

        // Rainbow overalls - LUT lookup instead of setHSL trig
        if (this.outfitColors.isRainbowOveralls && this.overallsMaterial) {
            const lutIdx = Math.floor(((this.rainbowHue + 0.66) % 1) * RAINBOW_LUT_SIZE) * 3;
            this.overallsMaterial.color.setRGB(RAINBOW_LUT[lutIdx], RAINBOW_LUT[lutIdx + 1], RAINBOW_LUT[lutIdx + 2]);
            if (this.pocketMaterial) {
                const pocketIdx = Math.floor(((this.rainbowHue + 0.86) % 1) * RAINBOW_LUT_SIZE) * 3;
                this.pocketMaterial.color.setRGB(RAINBOW_LUT_DARK[pocketIdx], RAINBOW_LUT_DARK[pocketIdx + 1], RAINBOW_LUT_DARK[pocketIdx + 2]);
            }
        }
    }

    update(deltaTime) {
        // Update rainbow colors for all rainbow items
        this.updateRainbowColors(deltaTime);

        // Move forward automatically
        this.position.z -= this.speed * deltaTime;

        // Smoothly move to target lane
        if (Math.abs(this.position.x - this.targetX) > 0.01) {
            const lerpSpeed = 15; // Snappy lane changes
            this.position.x += (this.targetX - this.position.x) * lerpSpeed * deltaTime;
        } else {
            this.position.x = this.targetX;
        }

        // Handle jumping
        if (this.isJumping) {
            this.velocityY += GAME_CONFIG.PLAYER_GRAVITY * deltaTime;
            this.position.y += this.velocityY * deltaTime;

            // Land (feet touch ground at y=0)
            if (this.position.y <= 0) {
                this.position.y = 0;
                this.isJumping = false;
                this.velocityY = 0;
                this.jumpCount = 0; // Reset jump count when landing
                this.canDoubleJump = true; // Can double jump again
            }
        }

        // Handle sliding
        if (this.isSliding) {
            this.slideTimer -= deltaTime;
            if (this.slideTimer <= 0) {
                this.isSliding = false;
            }
        }

        // Running bobbing animation - sync with leg movement for realistic running
        if (!this.isJumping) {
            this.bobOffset += deltaTime * 10; // Faster bobbing speed for running

            // FIXED: Compensate for leg swing causing feet to lift/drop
            // Legs swing ±0.7 rad, causing ~0.065 vertical displacement
            // Add this as base offset so lowest foot always touches ground
            const legCompensation = 0.065;
            const bobAmount = Math.abs(Math.sin(this.bobOffset * 2)) * 0.02; // Reduced bob for subtler effect
            this.character.position.y = this.position.y + legCompensation + bobAmount;
        } else {
            this.character.position.y = this.position.y + 0.065; // Same compensation when jumping
        }

        // Update character position
        this.character.position.x = this.position.x;
        this.character.position.z = this.position.z;

        // Scale for sliding (squash character)
        if (this.isSliding) {
            this.character.scale.y = 0.6;
        } else {
            this.character.scale.y = 1;
        }

        // OPTIMIZED: Running animations - cached calculations for better performance
        // Skip running animation if celebrating (celebration has its own animation)
        if (this.animationParts && !this.isCelebrating) {
            // Use bobOffset instead of Date.now() for better performance (already calculated above)
            const runTime = this.bobOffset * 0.5;

            // Pre-calculate sin values once
            const armSwing = Math.sin(runTime * 5) * 0.8;
            const legSwing = Math.sin(runTime * 5) * 0.7;

            // Arm swinging - with 180° rotation, negate for correct direction
            this.animationParts.leftArm.rotation.x = -armSwing;
            this.animationParts.rightArm.rotation.x = armSwing;

            // Leg running motion - with 180° rotation, negate for correct direction
            this.animationParts.leftLeg.rotation.x = -legSwing;
            this.animationParts.rightLeg.rotation.x = legSwing;

            // Bow bounce - add to base diagonal tilt (-0.5 rad = inner loop UP)
            if (this.bow) {
                this.bow.rotation.z = -0.5 + armSwing * 0.15; // Base tilt + bounce
            }

            // Head tilt when turning - only update when needed
            const distanceToTarget = Math.abs(this.position.x - this.targetX);
            if (distanceToTarget > 0.1) {
                this.head.rotation.z = Math.sign(this.targetX - this.position.x) * 0.2;
            } else if (Math.abs(this.head.rotation.z) > 0.01) {
                this.head.rotation.z *= 0.9;
            }
        }

        // Blinking animation (uses shared updateBlink method)
        this.updateBlink(deltaTime);

        // Increase speed over time
        this.speed = Math.min(
            this.speed + GAME_CONFIG.PLAYER_ACCELERATION * deltaTime,
            GAME_CONFIG.PLAYER_MAX_SPEED
        );
    }

    getPosition() {
        return this.position;
    }

    // Update blinking animation (can be called even when game is paused)
    updateBlink(deltaTime) {
        if (!this.leftEye || !this.rightEye) return;

        this.blinkTimer += deltaTime;
        if (!this.isBlinking && this.blinkTimer >= this.blinkInterval) {
            this.isBlinking = true;
            this.blinkTimer = 0;
            this.blinkInterval = 2 + Math.random() * 2;
            // 25% chance of double blink
            this.blinksRemaining = Math.random() < 0.25 ? 2 : 1;
        }

        if (this.isBlinking) {
            // Skip animation during pause between double blinks
            if (this.blinkTimer < 0) return;

            const blinkProgress = this.blinkTimer / this.blinkDuration;
            if (blinkProgress < 0.5) {
                const scaleY = this.eyeOpenScale * (1 - blinkProgress * 2 * 0.9);
                this.leftEye.scale.y = scaleY;
                this.rightEye.scale.y = scaleY;
            } else if (blinkProgress < 1) {
                const scaleY = this.eyeOpenScale * (0.1 + (blinkProgress - 0.5) * 2 * 0.9);
                this.leftEye.scale.y = scaleY;
                this.rightEye.scale.y = scaleY;
            } else {
                this.blinksRemaining--;
                if (this.blinksRemaining > 0) {
                    // Quick pause then blink again
                    this.blinkTimer = -0.08;
                } else {
                    this.isBlinking = false;
                    this.blinkTimer = 0;
                }
                this.leftEye.scale.y = this.eyeOpenScale;
                this.rightEye.scale.y = this.eyeOpenScale;
            }
        }
    }

    // Update knocked out animation (rubbing head, shaking head on game over screen)
    updateKnockedOutAnimation(deltaTime) {
        if (!this.isKnockedOut) return;

        this.knockedOutTimer += deltaTime;
        const t = this.knockedOutTimer;

        // Head shaking side to side (dazed look)
        if (this.head) {
            const headShake = Math.sin(t * 4) * 0.15; // Gentle side-to-side shake
            const headTilt = Math.sin(t * 2.5) * 0.08; // Slight forward/back wobble
            this.head.rotation.z = headShake;
            this.head.rotation.x = headTilt;
        }

        // Right arm rubbing head
        if (this.rightArm) {
            // Raise arm up to head
            const baseRaise = -1.8; // Arm raised up
            const rubMotion = Math.sin(t * 6) * 0.2; // Rubbing back and forth
            this.rightArm.rotation.x = baseRaise + rubMotion;
            this.rightArm.rotation.z = -0.5; // Angled inward toward head
        }

        // Left arm hanging or on hip
        if (this.leftArm) {
            const armSway = Math.sin(t * 2) * 0.1;
            this.leftArm.rotation.x = armSway;
            this.leftArm.rotation.z = 0.2; // Slightly out
        }

        // Body slight sway (woozy)
        if (this.character) {
            const bodySway = Math.sin(t * 1.5) * 0.05;
            this.character.rotation.z = bodySway;
        }
    }

    // Start knocked out animation (call when game over screen shows)
    startKnockedOutAnimation() {
        this.isKnockedOut = true;
        this.knockedOutTimer = 0;
    }

    // Stop knocked out animation and reset pose
    stopKnockedOutAnimation() {
        this.isKnockedOut = false;
        this.knockedOutTimer = 0;

        // Reset all rotations
        if (this.head) {
            this.head.rotation.z = 0;
            this.head.rotation.x = 0;
        }
        if (this.rightArm) {
            this.rightArm.rotation.x = 0;
            this.rightArm.rotation.z = 0;
        }
        if (this.leftArm) {
            this.leftArm.rotation.x = 0;
            this.leftArm.rotation.z = 0;
        }
        if (this.character) {
            this.character.rotation.z = 0;
        }
    }

    // Play celebration animation (jumping and cheering at finish line)
    // Loops continuously until stopCelebration() is called
    playCelebration() {
        if (this.isCelebrating) return;
        this.isCelebrating = true;
        this.celebrationStartTime = performance.now();

        const startY = 0; // Ground level
        const jumpHeight = 1.2;
        // Pattern: 3 jumps then a pause, each jump 800ms
        const jumpDuration = 800; // ms per jump cycle (slower)
        const jumpsPerSet = 3;
        const pauseDuration = 1200; // pause between jump sets
        const setDuration = (jumpDuration * jumpsPerSet) + pauseDuration;

        const animate = () => {
            if (!this.isCelebrating) return; // Stop if celebration ended

            const elapsed = performance.now() - this.celebrationStartTime;

            // Jump pattern: 3 jumps then pause
            const setProgress = elapsed % setDuration;
            let jumpY = 0;

            if (setProgress < jumpDuration * jumpsPerSet) {
                // During jumping phase
                const jumpCycle = (setProgress % jumpDuration) / jumpDuration;
                const jumpProgress = Math.sin(jumpCycle * Math.PI);
                jumpY = jumpProgress * jumpHeight;
            }
            // During pause phase, jumpY stays 0

            this.character.position.y = startY + jumpY + 0.065;

            // Arms raised HIGH over head and waving!
            // rotation.x of -PI points arms straight up (from hanging down to pointing up)
            if (this.leftArm) {
                this.leftArm.rotation.x = -Math.PI + Math.sin(elapsed * 0.015) * 0.25;
                this.leftArm.rotation.z = -0.5; // Tilt outward (away from body)
            }
            if (this.rightArm) {
                this.rightArm.rotation.x = -Math.PI + Math.sin(elapsed * 0.015 + Math.PI) * 0.25;
                this.rightArm.rotation.z = 0.5; // Tilt outward (away from body)
            }

            // Happy head bobbing
            if (this.head) {
                this.head.rotation.z = Math.sin(elapsed * 0.012) * 0.15;
                this.head.rotation.x = Math.sin(elapsed * 0.008) * 0.1;
            }

            // Body twist for excitement (oscillate around Math.PI to stay facing forward)
            if (this.character) {
                this.character.rotation.y = Math.PI + Math.sin(elapsed * 0.01) * 0.2;
            }

            // Keep animating while celebrating
            requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    }

    // Reset pose after celebration
    resetCelebrationPose() {
        if (this.leftArm) {
            this.leftArm.rotation.x = 0;
            this.leftArm.rotation.z = 0;
        }
        if (this.rightArm) {
            this.rightArm.rotation.x = 0;
            this.rightArm.rotation.z = 0;
        }
        if (this.head) {
            this.head.rotation.z = 0;
            this.head.rotation.x = 0;
        }
        if (this.character) {
            this.character.rotation.x = 0;
            this.character.rotation.y = Math.PI; // 180° to face forward (-Z direction)
            this.character.rotation.z = 0;
            this.character.position.y = 0.065; // Reset to ground level
        }
        if (this.group) {
            this.group.rotation.x = 0;
            this.group.rotation.y = 0;
            this.group.rotation.z = 0;
        }
    }

    // Force stop celebration and reset pose (called when resuming game)
    stopCelebration() {
        this.isCelebrating = false;
        this.resetCelebrationPose();
        // Also reset position Y to ground
        this.position.y = 0;
    }

    playDeathAnimation(callback, options = {}) {
        // Epic kid-friendly death animation with multiple effects
        const startTime = performance.now();
        const duration = 1500; // Longer for more drama
        const character = this.character;
        const position = this.position;
        const scene = this.scene;

        // Create dizzy stars that orbit the head
        const dizzyStars = this.createDizzyStars();

        // Create ghost trail meshes
        const ghostTrail = [];
        const ghostCount = 5;

        // Store original head position for X eyes effect
        const originalHeadY = this.head ? this.head.position.y : 0;

        // Trigger external effects if provided
        if (options.onImpact) {
            options.onImpact();
        }

        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Phase 1: Initial impact freeze (0-10%) - brief pause for impact
            // Phase 2: Spin up into air (10-60%)
            // Phase 3: Bouncy fall (60-100%)

            let height = 0;
            let spinY = Math.PI;
            let spinX = 0;
            let scale = 1;

            if (progress < 0.1) {
                // Phase 1: Impact freeze with squash
                const impactProgress = progress / 0.1;
                scale = 1 - impactProgress * 0.3; // Squash down
                character.scale.set(1.3, scale, 1.3);
            } else if (progress < 0.6) {
                // Phase 2: Spin up into air
                const flyProgress = (progress - 0.1) / 0.5;
                const easeOut = 1 - Math.pow(1 - flyProgress, 2);

                spinY = Math.PI + easeOut * Math.PI * 6; // Spin 6 times
                spinX = easeOut * Math.PI * 3; // Flip 3 times
                height = Math.sin(flyProgress * Math.PI) * 4; // Higher arc

                // Stretch while flying
                const stretch = 1 + Math.sin(flyProgress * Math.PI * 4) * 0.4;
                character.scale.set(1 / stretch, stretch, 1 / stretch);

                // Create ghost trail during flight
                if (elapsed % 80 < 16 && ghostTrail.length < ghostCount) {
                    const ghost = this.createGhostCopy();
                    if (ghost) {
                        ghost.position.copy(character.position);
                        ghost.rotation.copy(character.rotation);
                        scene.add(ghost);
                        ghostTrail.push({ mesh: ghost, opacity: 0.6, createdAt: elapsed });
                    }
                }
            } else {
                // Phase 3: Bouncy fall with multiple bounces
                const fallProgress = (progress - 0.6) / 0.4;

                // Multiple bounces with decreasing height
                const bounceCount = 3;
                const bounceProgress = fallProgress * bounceCount;
                const currentBounce = Math.floor(bounceProgress);
                const bouncePhase = bounceProgress - currentBounce;
                const bounceHeight = Math.pow(0.4, currentBounce) * 2; // Each bounce is 40% of previous

                height = Math.sin(bouncePhase * Math.PI) * bounceHeight;

                // Wobble spin during bounces
                spinY = Math.PI + Math.sin(fallProgress * Math.PI * 8) * 0.5;
                spinX = Math.sin(fallProgress * Math.PI * 6) * 0.3;

                // Squash on each bounce impact
                if (bouncePhase < 0.2) {
                    const squashAmount = (1 - bouncePhase / 0.2) * 0.3 * Math.pow(0.5, currentBounce);
                    character.scale.set(1 + squashAmount, 1 - squashAmount, 1 + squashAmount);
                } else {
                    character.scale.set(1, 1, 1);
                }
            }

            character.rotation.y = spinY;
            character.rotation.x = spinX;
            character.position.y = position.y + height + 0.065;

            // Update dizzy stars orbit
            if (dizzyStars) {
                const starTime = elapsed * 0.008;
                dizzyStars.forEach((star, i) => {
                    const angle = starTime + (i * Math.PI * 2 / dizzyStars.length);
                    const orbitRadius = 0.5;
                    const orbitHeight = 1.8 + height; // Follow character height
                    star.position.set(
                        character.position.x + Math.cos(angle) * orbitRadius,
                        orbitHeight + Math.sin(starTime * 2 + i) * 0.1,
                        character.position.z + Math.sin(angle) * orbitRadius
                    );
                    star.rotation.y = starTime * 3;
                    star.rotation.z = starTime * 2;
                });
            }

            // Fade out ghost trail
            ghostTrail.forEach((ghost, index) => {
                const age = elapsed - ghost.createdAt;
                ghost.opacity = Math.max(0, 0.6 - age / 400);
                ghost.mesh.traverse(child => {
                    if (child.material) {
                        child.material.opacity = ghost.opacity;
                        child.material.transparent = true;
                    }
                });
            });

            // Continue blinking during death animation
            if (this.leftEye && this.rightEye) {
                const blinkCycle = (elapsed / 1000) % (this.blinkDuration + 0.5); // Blink every 0.5s + duration
                if (blinkCycle < this.blinkDuration) {
                    const blinkProgress = blinkCycle / this.blinkDuration;
                    if (blinkProgress < 0.5) {
                        const scaleY = this.eyeOpenScale * (1 - blinkProgress * 2 * 0.9);
                        this.leftEye.scale.y = scaleY;
                        this.rightEye.scale.y = scaleY;
                    } else {
                        const scaleY = this.eyeOpenScale * (0.1 + (blinkProgress - 0.5) * 2 * 0.9);
                        this.leftEye.scale.y = scaleY;
                        this.rightEye.scale.y = scaleY;
                    }
                } else {
                    this.leftEye.scale.y = this.eyeOpenScale;
                    this.rightEye.scale.y = this.eyeOpenScale;
                }
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Cleanup
                character.rotation.set(0, Math.PI, 0);
                character.scale.set(1, 1, 1);
                character.position.y = position.y + 0.065;

                // Remove dizzy stars
                if (dizzyStars) {
                    dizzyStars.forEach(star => {
                        scene.remove(star);
                        star.geometry.dispose();
                        star.material.dispose();
                    });
                }

                // Remove ghost trail
                ghostTrail.forEach(ghost => {
                    scene.remove(ghost.mesh);
                    ghost.mesh.traverse(child => {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) child.material.dispose();
                    });
                });

                if (callback) callback();
            }
        };

        animate();
    }

    createDizzyStars() {
        const stars = [];
        const starCount = 5;
        const starGeometry = new THREE.OctahedronGeometry(0.1, 0);
        const starColors = [0xFFD700, 0xFFFFFF, 0xFF69B4, 0x87CEEB, 0xFFB6C1];

        for (let i = 0; i < starCount; i++) {
            const starMaterial = new THREE.MeshStandardMaterial({
                color: starColors[i % starColors.length],
                emissive: starColors[i % starColors.length],
                emissiveIntensity: 0.8,
                flatShading: true,
            });
            const star = new THREE.Mesh(starGeometry, starMaterial);
            this.scene.add(star);
            stars.push(star);
        }

        return stars;
    }

    createGhostCopy() {
        // Create a semi-transparent copy of the character for trail effect
        const ghost = new THREE.Group();

        // Simplified ghost - just a translucent sphere
        const ghostGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const ghostMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFB7C5, // Pink like Hello Kitty
            transparent: true,
            opacity: 0.5,
        });
        const ghostMesh = new THREE.Mesh(ghostGeometry, ghostMaterial);
        ghost.add(ghostMesh);

        return ghost;
    }

    reset() {
        this.position.set(0, 0, 0); // FIXED: Feet at ground level (y=0), not floating
        this.currentLane = 1;
        this.targetX = GAME_CONFIG.LANE_POSITIONS[1];
        this.speed = GAME_CONFIG.PLAYER_START_SPEED;
        this.isJumping = false;
        this.isSliding = false;
        this.velocityY = 0;
        this.jumpCount = 0;
        this.canDoubleJump = true;
        this.bobOffset = 0;
        // FIXED: Set character position with proper leg compensation
        this.character.position.set(0, 0.065, 0); // Add leg compensation offset
        this.character.position.z = 0;
        this.character.rotation.set(0, Math.PI, 0); // Face -Z direction (forward)
        this.character.scale.set(1, 1, 1);
    }
}
