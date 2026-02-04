import * as THREE from 'three';
import { GAME_CONFIG, HELLO_KITTY_COLORS, COLORS } from '../utils/Constants.js';

export class Player {
    constructor(scene) {
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

        const bowMaterial = new THREE.MeshStandardMaterial({
            color: HELLO_KITTY_COLORS.BOW,
            flatShading: false,
            roughness: 0.5,
            metalness: 0.1,
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

        bowGroup.position.set(0.35, 0.35, 0.05); // Relative to head
        bowGroup.rotation.y = Math.PI / 2; // Rotate to face forward like reference
        this.bow = bowGroup;
        this.head.add(bowGroup);

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
        const armGeometry = new THREE.CylinderGeometry(0.09, 0.09, 0.3, 12);
        const shoulderGeometry = new THREE.SphereGeometry(0.11, 12, 12);
        const handGeometry = new THREE.SphereGeometry(0.12, 12, 12);

        // Left shoulder (connects arm to smaller body)
        const leftShoulder = new THREE.Mesh(shoulderGeometry, bodyMaterial);
        leftShoulder.position.set(-0.37, 0.58, 0);
        leftShoulder.castShadow = true;
        this.character.add(leftShoulder);

        // Left arm
        this.leftArm = new THREE.Mesh(armGeometry, bodyMaterial);
        this.leftArm.position.set(-0.37, 0.44, 0);
        this.leftArm.castShadow = true;
        this.character.add(this.leftArm);

        // Left hand (child of arm)
        this.leftHand = new THREE.Mesh(handGeometry, bodyMaterial);
        this.leftHand.position.y = -0.2; // At bottom of arm
        this.leftHand.castShadow = true;
        this.leftArm.add(this.leftHand);

        // Right shoulder (connects arm to smaller body)
        const rightShoulder = new THREE.Mesh(shoulderGeometry, bodyMaterial);
        rightShoulder.position.set(0.37, 0.58, 0);
        rightShoulder.castShadow = true;
        this.character.add(rightShoulder);

        // Right arm
        this.rightArm = new THREE.Mesh(armGeometry, bodyMaterial);
        this.rightArm.position.set(0.37, 0.44, 0);
        this.rightArm.castShadow = true;
        this.character.add(this.rightArm);

        // Right hand (child of arm)
        this.rightHand = new THREE.Mesh(handGeometry, bodyMaterial);
        this.rightHand.position.y = -0.2; // At bottom of arm
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
