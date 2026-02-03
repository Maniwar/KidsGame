import * as THREE from 'three';
import { GAME_CONFIG, HELLO_KITTY_COLORS, COLORS } from '../utils/Constants.js';

export class Player {
    constructor(scene, characterManager = null) {
        this.scene = scene;
        this.characterManager = characterManager;

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

        // Create character
        this.createCharacter();
    }

    createCharacter() {
        this.character = new THREE.Group();

        // Get selected character type from manager
        let characterType = 'hello-kitty';
        if (this.characterManager) {
            characterType = this.characterManager.selectedCharacter;
        }

        // Create the appropriate character mesh
        switch (characterType) {
            case 'my-melody':
                this.createMyMelody();
                break;
            case 'cinnamoroll':
                this.createCinnamoroll();
                break;
            case 'kuromi':
                this.createKuromi();
                break;
            case 'pompompurin':
                this.createPompompurin();
                break;
            case 'keroppi':
                this.createKeroppi();
                break;
            default:
                this.createHelloKitty();
        }

        // Store animation parts (set by each character creator)
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

    createHelloKitty() {
        // Get bow color from character manager (skin), or use default
        let bowColor = HELLO_KITTY_COLORS.BOW;
        if (this.characterManager) {
            const skin = this.characterManager.getSelectedSkin();
            if (skin && skin.bowColor) {
                bowColor = skin.bowColor;
            }
        }

        // Materials with better appearance
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: HELLO_KITTY_COLORS.BODY,
            flatShading: false,
            roughness: 0.6,
            metalness: 0.05,
        });

        const bowMaterial = new THREE.MeshStandardMaterial({
            color: bowColor,
            flatShading: false,
            roughness: 0.5,
            metalness: 0.1,
        });
        this.bowMaterial = bowMaterial; // Store reference for skin changes

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

        // Head (larger sphere - wider like Hello Kitty!)
        const headGeometry = new THREE.SphereGeometry(0.5, 24, 24);
        this.head = new THREE.Mesh(headGeometry, bodyMaterial);
        this.head.castShadow = true;
        this.head.position.y = 1.2;
        this.head.scale.set(1.25, 0.95, 1.1); // Much wider, slightly flatter
        this.character.add(this.head);

        // Ears (spheres with slight elongation)
        const earGeometry = new THREE.SphereGeometry(0.15, 16, 16);
        const leftEar = new THREE.Mesh(earGeometry, bodyMaterial);
        leftEar.position.set(-0.38, 1.6, -0.05);
        leftEar.scale.set(0.9, 1.3, 0.9); // Taller ears
        leftEar.castShadow = true;
        this.character.add(leftEar);

        const rightEar = new THREE.Mesh(earGeometry, bodyMaterial);
        rightEar.position.set(0.38, 1.6, -0.05);
        rightEar.scale.set(0.9, 1.3, 0.9);
        rightEar.castShadow = true;
        this.character.add(rightEar);

        // Inner ear details (pink)
        const innerEarMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFB7D5,
            flatShading: false,
        });
        const innerEarGeometry = new THREE.SphereGeometry(0.08, 12, 12);
        const leftInnerEar = new THREE.Mesh(innerEarGeometry, innerEarMaterial);
        leftInnerEar.position.set(-0.38, 1.57, 0);
        leftInnerEar.scale.set(0.8, 1.2, 0.4);
        this.character.add(leftInnerEar);

        const rightInnerEar = new THREE.Mesh(innerEarGeometry, innerEarMaterial);
        rightInnerEar.position.set(0.38, 1.57, 0);
        rightInnerEar.scale.set(0.8, 1.2, 0.4);
        this.character.add(rightInnerEar);

        // Bow (MUCH BIGGER - Hello Kitty's signature feature!)
        const bowGroup = new THREE.Group();

        // Left bow loop (bigger and more prominent)
        const bowLoopGeometry = new THREE.SphereGeometry(0.28, 16, 16);
        const leftBowLoop = new THREE.Mesh(bowLoopGeometry, bowMaterial);
        leftBowLoop.position.set(-0.22, 0, 0);
        leftBowLoop.scale.set(0.7, 1.1, 0.6);
        leftBowLoop.castShadow = true;
        bowGroup.add(leftBowLoop);

        // Right bow loop
        const rightBowLoop = new THREE.Mesh(bowLoopGeometry, bowMaterial);
        rightBowLoop.position.set(0.22, 0, 0);
        rightBowLoop.scale.set(0.7, 1.1, 0.6);
        rightBowLoop.castShadow = true;
        bowGroup.add(rightBowLoop);

        // Bow center (bigger)
        const bowCenterGeometry = new THREE.SphereGeometry(0.16, 12, 12);
        const bowCenter = new THREE.Mesh(bowCenterGeometry, bowMaterial);
        bowCenter.castShadow = true;
        bowGroup.add(bowCenter);

        // Bow ribbons hanging down
        const ribbonGeometry = new THREE.BoxGeometry(0.08, 0.25, 0.06);
        const leftRibbon = new THREE.Mesh(ribbonGeometry, bowMaterial);
        leftRibbon.position.set(-0.1, -0.15, 0);
        leftRibbon.rotation.z = -0.15;
        leftRibbon.castShadow = true;
        bowGroup.add(leftRibbon);

        const rightRibbon = new THREE.Mesh(ribbonGeometry, bowMaterial);
        rightRibbon.position.set(0.1, -0.15, 0);
        rightRibbon.rotation.z = 0.15;
        rightRibbon.castShadow = true;
        bowGroup.add(rightRibbon);

        bowGroup.position.set(0.35, 1.55, 0.05);
        this.bow = bowGroup;
        this.character.add(bowGroup);

        // Eyes (simple round black dots - Hello Kitty style, wider spacing!)
        const eyeGeometry = new THREE.SphereGeometry(0.08, 16, 16);
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.28, 1.22, 0.56);
        leftEye.scale.set(0.9, 1.2, 0.5);
        this.character.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.28, 1.22, 0.56);
        rightEye.scale.set(0.9, 1.2, 0.5);
        this.character.add(rightEye);

        // Nose (small oval)
        const noseGeometry = new THREE.SphereGeometry(0.055, 12, 12);
        this.nose = new THREE.Mesh(noseGeometry, noseMaterial);
        this.nose.position.set(0, 1.06, 0.5);
        this.nose.scale.set(0.9, 0.7, 0.9);
        this.character.add(this.nose);

        // Whiskers (3 per side)
        const whiskerGeometry = new THREE.BoxGeometry(0.35, 0.015, 0.015);
        const whiskerMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });

        const leftWhiskerAngles = [-0.15, 0, 0.15];
        for (let i = 0; i < 3; i++) {
            const whisker = new THREE.Mesh(whiskerGeometry, whiskerMaterial);
            whisker.position.set(-0.35, 1.15 - i * 0.06, 0.42);
            whisker.rotation.z = leftWhiskerAngles[i];
            this.character.add(whisker);
        }

        const rightWhiskerAngles = [0.15, 0, -0.15];
        for (let i = 0; i < 3; i++) {
            const whisker = new THREE.Mesh(whiskerGeometry, whiskerMaterial);
            whisker.position.set(0.35, 1.15 - i * 0.06, 0.42);
            whisker.rotation.z = rightWhiskerAngles[i];
            this.character.add(whisker);
        }

        // Arms and legs (shared helper)
        this.createLimbs(bodyMaterial);
    }

    createMyMelody() {
        // Get hood color from skin
        let hoodColor = 0xFFB6C1; // Default pink
        let flowerColor = 0xFF69B4;
        if (this.characterManager) {
            const skin = this.characterManager.getSelectedSkin();
            if (skin) {
                hoodColor = skin.hoodColor || hoodColor;
                flowerColor = skin.flowerColor || flowerColor;
            }
        }

        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF, roughness: 0.6, metalness: 0.05
        });
        const hoodMaterial = new THREE.MeshStandardMaterial({
            color: hoodColor, roughness: 0.5, metalness: 0.1
        });
        this.accentMaterial = hoodMaterial;

        // Body
        const bodyGeometry = new THREE.SphereGeometry(0.38, 24, 24);
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.castShadow = true;
        this.body.position.y = 0.45;
        this.body.scale.set(1, 1.05, 0.95);
        this.character.add(this.body);

        // Head (white face)
        const headGeometry = new THREE.SphereGeometry(0.45, 24, 24);
        this.head = new THREE.Mesh(headGeometry, bodyMaterial);
        this.head.castShadow = true;
        this.head.position.y = 1.15;
        this.head.scale.set(1.1, 1, 1);
        this.character.add(this.head);

        // Hood (covers top of head)
        const hoodGeometry = new THREE.SphereGeometry(0.5, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.6);
        const hood = new THREE.Mesh(hoodGeometry, hoodMaterial);
        hood.position.y = 1.2;
        hood.scale.set(1.15, 1, 1.05);
        hood.castShadow = true;
        this.character.add(hood);

        // Long bunny ears (from hood)
        const earGeometry = new THREE.CapsuleGeometry(0.12, 0.5, 8, 16);
        const leftEar = new THREE.Mesh(earGeometry, hoodMaterial);
        leftEar.position.set(-0.25, 1.75, -0.05);
        leftEar.rotation.z = 0.2;
        leftEar.castShadow = true;
        this.character.add(leftEar);

        const rightEar = new THREE.Mesh(earGeometry, hoodMaterial);
        rightEar.position.set(0.25, 1.75, -0.05);
        rightEar.rotation.z = -0.2;
        rightEar.castShadow = true;
        this.character.add(rightEar);

        // Inner ears (pink inside)
        const innerEarGeometry = new THREE.CapsuleGeometry(0.06, 0.35, 8, 16);
        const innerEarMaterial = new THREE.MeshStandardMaterial({ color: 0xFFB7D5 });
        const leftInnerEar = new THREE.Mesh(innerEarGeometry, innerEarMaterial);
        leftInnerEar.position.set(-0.25, 1.72, 0.02);
        leftInnerEar.rotation.z = 0.2;
        this.character.add(leftInnerEar);

        const rightInnerEar = new THREE.Mesh(innerEarGeometry, innerEarMaterial);
        rightInnerEar.position.set(0.25, 1.72, 0.02);
        rightInnerEar.rotation.z = -0.2;
        this.character.add(rightInnerEar);

        // Flower on hood (right side)
        const flowerMaterial = new THREE.MeshStandardMaterial({ color: flowerColor });
        const flowerCenter = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 12, 12),
            new THREE.MeshStandardMaterial({ color: 0xFFFF00 })
        );
        flowerCenter.position.set(0.38, 1.55, 0.15);
        this.character.add(flowerCenter);

        // Flower petals
        for (let i = 0; i < 5; i++) {
            const petal = new THREE.Mesh(
                new THREE.SphereGeometry(0.07, 8, 8),
                flowerMaterial
            );
            const angle = (i / 5) * Math.PI * 2;
            petal.position.set(
                0.38 + Math.cos(angle) * 0.1,
                1.55 + Math.sin(angle) * 0.1,
                0.12
            );
            petal.scale.set(1, 1, 0.5);
            this.character.add(petal);
        }

        // Eyes (oval, cute style)
        const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const eyeGeometry = new THREE.SphereGeometry(0.06, 16, 16);
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.18, 1.15, 0.42);
        leftEye.scale.set(0.8, 1.1, 0.5);
        this.character.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.18, 1.15, 0.42);
        rightEye.scale.set(0.8, 1.1, 0.5);
        this.character.add(rightEye);

        // Nose (tiny)
        const noseMaterial = new THREE.MeshStandardMaterial({ color: 0xFFB6C1 });
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), noseMaterial);
        nose.position.set(0, 1.05, 0.45);
        nose.scale.set(1, 0.7, 0.8);
        this.character.add(nose);

        this.createLimbs(bodyMaterial);
    }

    createCinnamoroll() {
        // Get colors from skin
        let eyeColor = 0x4169E1;
        let cheekColor = 0xFFB6C1;
        if (this.characterManager) {
            const skin = this.characterManager.getSelectedSkin();
            if (skin) {
                eyeColor = skin.eyeColor || eyeColor;
                cheekColor = skin.cheekColor || cheekColor;
            }
        }

        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF, roughness: 0.6, metalness: 0.05
        });

        // Body (chubby puppy)
        const bodyGeometry = new THREE.SphereGeometry(0.4, 24, 24);
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.castShadow = true;
        this.body.position.y = 0.48;
        this.body.scale.set(1, 1.1, 0.95);
        this.character.add(this.body);

        // Head (round and cute)
        const headGeometry = new THREE.SphereGeometry(0.48, 24, 24);
        this.head = new THREE.Mesh(headGeometry, bodyMaterial);
        this.head.castShadow = true;
        this.head.position.y = 1.18;
        this.head.scale.set(1.1, 1, 1);
        this.character.add(this.head);

        // Big floppy ears (Cinnamoroll's signature)
        const earGeometry = new THREE.SphereGeometry(0.35, 16, 16);
        const leftEar = new THREE.Mesh(earGeometry, bodyMaterial);
        leftEar.position.set(-0.55, 1.35, -0.1);
        leftEar.scale.set(0.5, 1.2, 0.4);
        leftEar.rotation.z = 0.8;
        leftEar.castShadow = true;
        this.character.add(leftEar);

        const rightEar = new THREE.Mesh(earGeometry, bodyMaterial);
        rightEar.position.set(0.55, 1.35, -0.1);
        rightEar.scale.set(0.5, 1.2, 0.4);
        rightEar.rotation.z = -0.8;
        rightEar.castShadow = true;
        this.character.add(rightEar);

        // Inner ear (light blue)
        const innerEarMaterial = new THREE.MeshStandardMaterial({ color: 0xADD8E6 });
        const innerEarGeometry = new THREE.SphereGeometry(0.2, 12, 12);
        const leftInnerEar = new THREE.Mesh(innerEarGeometry, innerEarMaterial);
        leftInnerEar.position.set(-0.5, 1.3, 0);
        leftInnerEar.scale.set(0.4, 0.9, 0.3);
        leftInnerEar.rotation.z = 0.8;
        this.character.add(leftInnerEar);

        const rightInnerEar = new THREE.Mesh(innerEarGeometry, innerEarMaterial);
        rightInnerEar.position.set(0.5, 1.3, 0);
        rightInnerEar.scale.set(0.4, 0.9, 0.3);
        rightInnerEar.rotation.z = -0.8;
        this.character.add(rightInnerEar);

        // Eyes (big blue eyes)
        const eyeMaterial = new THREE.MeshStandardMaterial({ color: eyeColor });
        const eyeWhiteMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
        const eyeGeometry = new THREE.SphereGeometry(0.12, 16, 16);

        // Eye whites
        const leftEyeWhite = new THREE.Mesh(eyeGeometry, eyeWhiteMaterial);
        leftEyeWhite.position.set(-0.2, 1.2, 0.42);
        leftEyeWhite.scale.set(0.9, 1, 0.5);
        this.character.add(leftEyeWhite);

        const rightEyeWhite = new THREE.Mesh(eyeGeometry, eyeWhiteMaterial);
        rightEyeWhite.position.set(0.2, 1.2, 0.42);
        rightEyeWhite.scale.set(0.9, 1, 0.5);
        this.character.add(rightEyeWhite);

        // Eye pupils
        const pupilGeometry = new THREE.SphereGeometry(0.07, 12, 12);
        const leftPupil = new THREE.Mesh(pupilGeometry, eyeMaterial);
        leftPupil.position.set(-0.2, 1.18, 0.5);
        leftPupil.scale.set(1, 1, 0.5);
        this.character.add(leftPupil);

        const rightPupil = new THREE.Mesh(pupilGeometry, eyeMaterial);
        rightPupil.position.set(0.2, 1.18, 0.5);
        rightPupil.scale.set(1, 1, 0.5);
        this.character.add(rightPupil);

        // Cheeks (rosy)
        const cheekMaterial = new THREE.MeshStandardMaterial({ color: cheekColor, transparent: true, opacity: 0.7 });
        const cheekGeometry = new THREE.SphereGeometry(0.08, 12, 12);
        const leftCheek = new THREE.Mesh(cheekGeometry, cheekMaterial);
        leftCheek.position.set(-0.35, 1.08, 0.35);
        leftCheek.scale.set(1, 0.7, 0.5);
        this.character.add(leftCheek);

        const rightCheek = new THREE.Mesh(cheekGeometry, cheekMaterial);
        rightCheek.position.set(0.35, 1.08, 0.35);
        rightCheek.scale.set(1, 0.7, 0.5);
        this.character.add(rightCheek);

        // Curly tail on forehead (Cinnamoroll's signature curl)
        const curlMaterial = new THREE.MeshStandardMaterial({ color: 0x4169E1 });
        const curlGeometry = new THREE.TorusGeometry(0.08, 0.025, 8, 16, Math.PI * 1.5);
        const curl = new THREE.Mesh(curlGeometry, curlMaterial);
        curl.position.set(0, 1.58, 0.25);
        curl.rotation.x = Math.PI * 0.3;
        this.character.add(curl);

        this.createLimbs(bodyMaterial);
    }

    createKuromi() {
        // Get colors from skin
        let hoodColor = 0x2F2F2F;
        let accentColor = 0xFF69B4;
        if (this.characterManager) {
            const skin = this.characterManager.getSelectedSkin();
            if (skin) {
                hoodColor = skin.hoodColor || hoodColor;
                accentColor = skin.accentColor || accentColor;
            }
        }

        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF, roughness: 0.6, metalness: 0.05
        });
        const hoodMaterial = new THREE.MeshStandardMaterial({
            color: hoodColor, roughness: 0.4, metalness: 0.1
        });
        this.accentMaterial = hoodMaterial;

        // Body
        const bodyGeometry = new THREE.SphereGeometry(0.38, 24, 24);
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.castShadow = true;
        this.body.position.y = 0.45;
        this.body.scale.set(1, 1.05, 0.95);
        this.character.add(this.body);

        // Head (white face)
        const headGeometry = new THREE.SphereGeometry(0.45, 24, 24);
        this.head = new THREE.Mesh(headGeometry, bodyMaterial);
        this.head.castShadow = true;
        this.head.position.y = 1.15;
        this.head.scale.set(1.1, 1, 1);
        this.character.add(this.head);

        // Black hood (jester style with points)
        const hoodGeometry = new THREE.SphereGeometry(0.5, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.55);
        const hood = new THREE.Mesh(hoodGeometry, hoodMaterial);
        hood.position.y = 1.22;
        hood.scale.set(1.18, 1.05, 1.08);
        hood.castShadow = true;
        this.character.add(hood);

        // Jester ear points (curved like devil horns)
        const earGeometry = new THREE.ConeGeometry(0.12, 0.5, 12);
        const leftEar = new THREE.Mesh(earGeometry, hoodMaterial);
        leftEar.position.set(-0.35, 1.65, -0.05);
        leftEar.rotation.z = 0.4;
        leftEar.rotation.x = -0.2;
        leftEar.castShadow = true;
        this.character.add(leftEar);

        const rightEar = new THREE.Mesh(earGeometry, hoodMaterial);
        rightEar.position.set(0.35, 1.65, -0.05);
        rightEar.rotation.z = -0.4;
        rightEar.rotation.x = -0.2;
        rightEar.castShadow = true;
        this.character.add(rightEar);

        // Pink inner ears
        const innerEarMaterial = new THREE.MeshStandardMaterial({ color: accentColor });
        const innerEarGeometry = new THREE.ConeGeometry(0.06, 0.3, 12);
        const leftInnerEar = new THREE.Mesh(innerEarGeometry, innerEarMaterial);
        leftInnerEar.position.set(-0.32, 1.6, 0.02);
        leftInnerEar.rotation.z = 0.4;
        this.character.add(leftInnerEar);

        const rightInnerEar = new THREE.Mesh(innerEarGeometry, innerEarMaterial);
        rightInnerEar.position.set(0.32, 1.6, 0.02);
        rightInnerEar.rotation.z = -0.4;
        this.character.add(rightInnerEar);

        // Skull emblem on forehead
        const skullMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
        const skull = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), skullMaterial);
        skull.position.set(0, 1.55, 0.35);
        skull.scale.set(1, 0.9, 0.5);
        this.character.add(skull);

        // Skull eyes (X shaped - using small cubes)
        const skullEyeMaterial = new THREE.MeshStandardMaterial({ color: hoodColor });
        const createX = (x, y, z) => {
            const bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.015, 0.01), skullEyeMaterial);
            bar1.position.set(x, y, z);
            bar1.rotation.z = Math.PI / 4;
            this.character.add(bar1);
            const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.015, 0.01), skullEyeMaterial);
            bar2.position.set(x, y, z);
            bar2.rotation.z = -Math.PI / 4;
            this.character.add(bar2);
        };
        createX(-0.04, 1.56, 0.42);
        createX(0.04, 1.56, 0.42);

        // Eyes (mischievous, slightly narrowed)
        const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const eyeGeometry = new THREE.SphereGeometry(0.06, 16, 16);
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.18, 1.15, 0.42);
        leftEye.scale.set(1, 0.8, 0.5);
        this.character.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.18, 1.15, 0.42);
        rightEye.scale.set(1, 0.8, 0.5);
        this.character.add(rightEye);

        // Smirk mouth
        const smirkMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const smirk = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, 0.01), smirkMaterial);
        smirk.position.set(0.03, 1.02, 0.45);
        smirk.rotation.z = 0.15;
        this.character.add(smirk);

        // Devil tail
        const tailMaterial = new THREE.MeshStandardMaterial({ color: hoodColor });
        const tailGeometry = new THREE.CylinderGeometry(0.03, 0.02, 0.4, 8);
        const tail = new THREE.Mesh(tailGeometry, tailMaterial);
        tail.position.set(0, 0.35, -0.35);
        tail.rotation.x = 0.5;
        this.character.add(tail);

        // Tail tip (heart or arrow shape)
        const tipMaterial = new THREE.MeshStandardMaterial({ color: accentColor });
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.1, 3), tipMaterial);
        tip.position.set(0, 0.15, -0.5);
        tip.rotation.x = Math.PI / 2;
        this.character.add(tip);

        this.createLimbs(bodyMaterial);
    }

    createPompompurin() {
        // Get colors from skin
        let bodyColor = 0xFFD700;
        let beretColor = 0x8B4513;
        if (this.characterManager) {
            const skin = this.characterManager.getSelectedSkin();
            if (skin) {
                bodyColor = skin.bodyColor || bodyColor;
                beretColor = skin.beretColor || beretColor;
            }
        }

        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: bodyColor, roughness: 0.6, metalness: 0.05
        });
        const beretMaterial = new THREE.MeshStandardMaterial({
            color: beretColor, roughness: 0.5, metalness: 0.1
        });
        this.accentMaterial = bodyMaterial;

        // Body (chubby golden retriever)
        const bodyGeometry = new THREE.SphereGeometry(0.42, 24, 24);
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.castShadow = true;
        this.body.position.y = 0.5;
        this.body.scale.set(1, 1, 0.95);
        this.character.add(this.body);

        // Head (round puppy face)
        const headGeometry = new THREE.SphereGeometry(0.48, 24, 24);
        this.head = new THREE.Mesh(headGeometry, bodyMaterial);
        this.head.castShadow = true;
        this.head.position.y = 1.18;
        this.head.scale.set(1.05, 0.95, 1);
        this.character.add(this.head);

        // Floppy ears (golden retriever style)
        const earGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const leftEar = new THREE.Mesh(earGeometry, bodyMaterial);
        leftEar.position.set(-0.4, 1.15, -0.1);
        leftEar.scale.set(0.6, 1.1, 0.5);
        leftEar.castShadow = true;
        this.character.add(leftEar);

        const rightEar = new THREE.Mesh(earGeometry, bodyMaterial);
        rightEar.position.set(0.4, 1.15, -0.1);
        rightEar.scale.set(0.6, 1.1, 0.5);
        rightEar.castShadow = true;
        this.character.add(rightEar);

        // Brown beret (signature accessory)
        const beretGeometry = new THREE.SphereGeometry(0.25, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
        const beret = new THREE.Mesh(beretGeometry, beretMaterial);
        beret.position.set(0, 1.58, 0.1);
        beret.scale.set(1.3, 0.6, 1.2);
        beret.castShadow = true;
        this.character.add(beret);

        // Beret stem
        const stemGeometry = new THREE.SphereGeometry(0.04, 8, 8);
        const stem = new THREE.Mesh(stemGeometry, beretMaterial);
        stem.position.set(0, 1.65, 0.1);
        this.character.add(stem);

        // Eyes (small, sleepy looking)
        const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const eyeGeometry = new THREE.SphereGeometry(0.04, 12, 12);
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.15, 1.18, 0.45);
        leftEye.scale.set(1, 0.7, 0.5);
        this.character.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.15, 1.18, 0.45);
        rightEye.scale.set(1, 0.7, 0.5);
        this.character.add(rightEye);

        // Nose (brown puppy nose)
        const noseMaterial = new THREE.MeshStandardMaterial({ color: 0x4A3728 });
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), noseMaterial);
        nose.position.set(0, 1.08, 0.46);
        nose.scale.set(1.2, 0.8, 0.8);
        this.character.add(nose);

        // Tail (small wagging tail)
        const tailGeometry = new THREE.SphereGeometry(0.1, 12, 12);
        const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
        tail.position.set(0, 0.45, -0.4);
        tail.scale.set(0.8, 0.8, 1);
        this.character.add(tail);

        this.createLimbs(bodyMaterial);
    }

    createKeroppi() {
        // Get colors from skin
        let bodyColor = 0x32CD32;
        let cheekColor = 0xFF6347;
        if (this.characterManager) {
            const skin = this.characterManager.getSelectedSkin();
            if (skin) {
                bodyColor = skin.bodyColor || bodyColor;
                cheekColor = skin.cheekColor || cheekColor;
            }
        }

        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: bodyColor, roughness: 0.6, metalness: 0.05
        });
        this.accentMaterial = bodyMaterial;

        // Body (frog body)
        const bodyGeometry = new THREE.SphereGeometry(0.4, 24, 24);
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.castShadow = true;
        this.body.position.y = 0.48;
        this.body.scale.set(1, 0.9, 0.95);
        this.character.add(this.body);

        // Belly (lighter green/white)
        const bellyMaterial = new THREE.MeshStandardMaterial({ color: 0x90EE90 });
        const bellyGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const belly = new THREE.Mesh(bellyGeometry, bellyMaterial);
        belly.position.set(0, 0.45, 0.15);
        belly.scale.set(0.9, 0.85, 0.5);
        this.character.add(belly);

        // Head (wide frog head)
        const headGeometry = new THREE.SphereGeometry(0.45, 24, 24);
        this.head = new THREE.Mesh(headGeometry, bodyMaterial);
        this.head.castShadow = true;
        this.head.position.y = 1.1;
        this.head.scale.set(1.2, 0.9, 1);
        this.character.add(this.head);

        // Big protruding eyes (frog's most distinctive feature)
        const eyeWhiteMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
        const eyeGeometry = new THREE.SphereGeometry(0.18, 16, 16);

        const leftEyeBall = new THREE.Mesh(eyeGeometry, eyeWhiteMaterial);
        leftEyeBall.position.set(-0.25, 1.4, 0.2);
        leftEyeBall.castShadow = true;
        this.character.add(leftEyeBall);

        const rightEyeBall = new THREE.Mesh(eyeGeometry, eyeWhiteMaterial);
        rightEyeBall.position.set(0.25, 1.4, 0.2);
        rightEyeBall.castShadow = true;
        this.character.add(rightEyeBall);

        // Pupils (big and expressive)
        const pupilMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const pupilGeometry = new THREE.SphereGeometry(0.08, 12, 12);

        const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        leftPupil.position.set(-0.25, 1.38, 0.35);
        leftPupil.scale.set(1, 1.2, 0.5);
        this.character.add(leftPupil);

        const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        rightPupil.position.set(0.25, 1.38, 0.35);
        rightPupil.scale.set(1, 1.2, 0.5);
        this.character.add(rightPupil);

        // Cheeks (rosy red circles)
        const cheekMaterial = new THREE.MeshStandardMaterial({ color: cheekColor });
        const cheekGeometry = new THREE.SphereGeometry(0.08, 12, 12);

        const leftCheek = new THREE.Mesh(cheekGeometry, cheekMaterial);
        leftCheek.position.set(-0.38, 1.05, 0.3);
        leftCheek.scale.set(1, 0.8, 0.5);
        this.character.add(leftCheek);

        const rightCheek = new THREE.Mesh(cheekGeometry, cheekMaterial);
        rightCheek.position.set(0.38, 1.05, 0.3);
        rightCheek.scale.set(1, 0.8, 0.5);
        this.character.add(rightCheek);

        // Wide smile (frog's happy expression)
        const smileMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const smileGeometry = new THREE.TorusGeometry(0.15, 0.015, 8, 16, Math.PI);
        const smile = new THREE.Mesh(smileGeometry, smileMaterial);
        smile.position.set(0, 1.0, 0.42);
        smile.rotation.x = Math.PI;
        this.character.add(smile);

        // V-shaped hair tuft
        const hairMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
        const hairGeometry = new THREE.ConeGeometry(0.05, 0.15, 8);
        const leftHair = new THREE.Mesh(hairGeometry, hairMaterial);
        leftHair.position.set(-0.08, 1.5, 0.2);
        leftHair.rotation.z = 0.3;
        this.character.add(leftHair);

        const rightHair = new THREE.Mesh(hairGeometry, hairMaterial);
        rightHair.position.set(0.08, 1.5, 0.2);
        rightHair.rotation.z = -0.3;
        this.character.add(rightHair);

        this.createLimbs(bodyMaterial);
    }

    // Shared limb creation for all characters
    createLimbs(bodyMaterial) {
        const armGeometry = new THREE.CylinderGeometry(0.09, 0.09, 0.3, 12);
        const shoulderGeometry = new THREE.SphereGeometry(0.11, 12, 12);
        const handGeometry = new THREE.SphereGeometry(0.12, 12, 12);

        // Left shoulder
        const leftShoulder = new THREE.Mesh(shoulderGeometry, bodyMaterial);
        leftShoulder.position.set(-0.37, 0.58, 0);
        leftShoulder.castShadow = true;
        this.character.add(leftShoulder);

        // Left arm
        this.leftArm = new THREE.Mesh(armGeometry, bodyMaterial);
        this.leftArm.position.set(-0.37, 0.44, 0);
        this.leftArm.castShadow = true;
        this.character.add(this.leftArm);

        // Left hand
        this.leftHand = new THREE.Mesh(handGeometry, bodyMaterial);
        this.leftHand.position.y = -0.2;
        this.leftHand.castShadow = true;
        this.leftArm.add(this.leftHand);

        // Right shoulder
        const rightShoulder = new THREE.Mesh(shoulderGeometry, bodyMaterial);
        rightShoulder.position.set(0.37, 0.58, 0);
        rightShoulder.castShadow = true;
        this.character.add(rightShoulder);

        // Right arm
        this.rightArm = new THREE.Mesh(armGeometry, bodyMaterial);
        this.rightArm.position.set(0.37, 0.44, 0);
        this.rightArm.castShadow = true;
        this.character.add(this.rightArm);

        // Right hand
        this.rightHand = new THREE.Mesh(handGeometry, bodyMaterial);
        this.rightHand.position.y = -0.2;
        this.rightHand.castShadow = true;
        this.rightArm.add(this.rightHand);

        // Legs
        const legGeometry = new THREE.CylinderGeometry(0.11, 0.11, 0.24, 12);
        this.leftLeg = new THREE.Mesh(legGeometry, bodyMaterial);
        this.leftLeg.position.set(-0.16, 0.26, 0);
        this.leftLeg.castShadow = true;
        this.character.add(this.leftLeg);

        this.rightLeg = new THREE.Mesh(legGeometry, bodyMaterial);
        this.rightLeg.position.set(0.16, 0.26, 0);
        this.rightLeg.castShadow = true;
        this.character.add(this.rightLeg);

        // Feet
        const footGeometry = new THREE.SphereGeometry(0.18, 12, 12);
        this.leftFoot = new THREE.Mesh(footGeometry, bodyMaterial);
        this.leftFoot.position.set(0, -0.26, 0.08);
        this.leftFoot.scale.set(1.2, 0.5, 1.3);
        this.leftFoot.castShadow = true;
        this.leftLeg.add(this.leftFoot);

        this.rightFoot = new THREE.Mesh(footGeometry, bodyMaterial);
        this.rightFoot.position.set(0, -0.26, 0.08);
        this.rightFoot.scale.set(1.2, 0.5, 1.3);
        this.rightFoot.castShadow = true;
        this.rightLeg.add(this.rightFoot);
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

    update(deltaTime) {
        // Move forward automatically
        this.position.z -= this.speed * deltaTime;

        // Smoothly move to target lane
        if (Math.abs(this.position.x - this.targetX) > 0.01) {
            const lerpSpeed = 10; // Higher = faster lane change
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
        if (this.animationParts) {
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

            // Bow bounce - reuse calculated value
            if (this.bow) {
                this.bow.rotation.z = armSwing * 0.1875; // Optimized calculation
            }

            // Head tilt when turning - only update when needed
            const distanceToTarget = Math.abs(this.position.x - this.targetX);
            if (distanceToTarget > 0.1) {
                this.head.rotation.z = Math.sign(this.targetX - this.position.x) * 0.2;
            } else if (Math.abs(this.head.rotation.z) > 0.01) {
                this.head.rotation.z *= 0.9;
            }
        }

        // Increase speed over time
        this.speed = Math.min(
            this.speed + GAME_CONFIG.PLAYER_ACCELERATION * deltaTime,
            GAME_CONFIG.PLAYER_MAX_SPEED
        );
    }

    getPosition() {
        return this.position;
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

    // Update character appearance based on selected skin
    // Note: For full character change, player must be recreated (done at game start)
    updateSkin() {
        if (!this.characterManager) return;

        const skin = this.characterManager.getSelectedSkin();
        if (!skin) return;

        // Update Hello Kitty bow color
        if (this.bowMaterial && skin.bowColor) {
            this.bowMaterial.color.setHex(skin.bowColor);
        }

        // Update accent material for other characters (hood, body, etc.)
        if (this.accentMaterial) {
            if (skin.hoodColor) {
                this.accentMaterial.color.setHex(skin.hoodColor);
            } else if (skin.bodyColor) {
                this.accentMaterial.color.setHex(skin.bodyColor);
            }
        }
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
