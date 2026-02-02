import * as THREE from 'three';
import { COLORS, GAME_CONFIG } from '../utils/Constants.js';

// Shared geometries for performance
let sharedLollipopStickGeo = null;
let sharedSprinkleGeo = null;

function getSharedLollipopStickGeo() {
    if (!sharedLollipopStickGeo) {
        sharedLollipopStickGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6);
    }
    return sharedLollipopStickGeo;
}

function getSharedSprinkleGeo() {
    if (!sharedSprinkleGeo) {
        sharedSprinkleGeo = new THREE.CapsuleGeometry(0.02, 0.06, 2, 4);
    }
    return sharedSprinkleGeo;
}

// Candy colors palette - bright and appetizing!
const CANDY_COLORS = {
    LOLLIPOP_SWIRL: [0xFF69B4, 0xFFFFFF], // Pink and white swirl
    LOLLIPOP_RAINBOW: [0xFF6B6B, 0xFFE66D, 0x4ECDC4, 0x95E1D3],
    WRAPPED_COLORS: [0xFF69B4, 0x87CEEB, 0xFFD700, 0x98FB98, 0xDDA0DD],
    CUPCAKE_FROSTING: [0xFFB6C1, 0x87CEEB, 0xE6E6FA, 0xFFDAB9],
    DONUT_FROSTING: [0xFF69B4, 0x87CEEB, 0xFFD700, 0x98FB98],
    ICE_CREAM: [0xFFF0F5, 0xFFDAB9, 0xD2691E, 0x98FB98],
    COOKIE_STAR: 0xFFD700,
};

export class Candy {
    constructor(scene, lane, zPosition, type = 'lollipop') {
        this.scene = scene;
        this.lane = lane;
        this.type = type;
        this.isCollected = false;
        this.isActive = true;

        this.position = new THREE.Vector3(
            GAME_CONFIG.LANE_POSITIONS[lane],
            1.8, // Float higher for better visibility
            zPosition
        );

        // Candy meter fill value based on type (rarer = more fill)
        this.meterValue = this.getMeterValueForType(type);

        // Animation properties
        this.rotationSpeed = 2.0;
        this.bobSpeed = 3.5;
        this.bobAmount = 0.25;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.animTime = 0;

        this.createMesh();
    }

    getMeterValueForType(type) {
        switch (type) {
            case 'lollipop':
                return 10;
            case 'wrapped-candy':
                return 8;
            case 'cupcake':
                return 15;
            case 'donut':
                return 12;
            case 'ice-cream':
                return 12;
            case 'star-cookie':
                return 25; // Rare, fills meter more!
            default:
                return 10;
        }
    }

    createMesh() {
        this.group = new THREE.Group();

        switch (this.type) {
            case 'lollipop':
                this.createLollipop();
                break;
            case 'wrapped-candy':
                this.createWrappedCandy();
                break;
            case 'cupcake':
                this.createCupcake();
                break;
            case 'donut':
                this.createDonut();
                break;
            case 'ice-cream':
                this.createIceCream();
                break;
            case 'star-cookie':
                this.createStarCookie();
                break;
            default:
                this.createLollipop();
        }

        // Scale up all candy to be more visible (1.8x bigger)
        const candyScale = 1.8;
        this.mesh.scale.set(candyScale, candyScale, candyScale);
        this.collisionRadius *= candyScale; // Scale collision radius too

        // Add sparkle ring around candy
        this.createSparkleRing();

        this.group.position.copy(this.position);
        this.scene.add(this.group);
    }

    createLollipop() {
        const lollipopGroup = new THREE.Group();

        // White stick
        const stickMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFAF0,
            roughness: 0.3,
        });
        const stick = new THREE.Mesh(getSharedLollipopStickGeo(), stickMaterial);
        stick.position.y = -0.3;
        lollipopGroup.add(stick);

        // Swirl candy head - created with layered discs for swirl effect
        const candyGroup = new THREE.Group();
        const swirlColors = CANDY_COLORS.LOLLIPOP_SWIRL;
        const segments = 12;
        const radius = 0.28;

        // Main candy disc
        const discGeometry = new THREE.CylinderGeometry(radius, radius, 0.08, 24);
        const pinkMaterial = new THREE.MeshStandardMaterial({
            color: swirlColors[0],
            emissive: swirlColors[0],
            emissiveIntensity: 0.2,
            flatShading: true,
        });
        const mainDisc = new THREE.Mesh(discGeometry, pinkMaterial);
        mainDisc.rotation.x = Math.PI / 2;
        candyGroup.add(mainDisc);

        // Add swirl pattern with white segments - flat on the candy face
        for (let i = 0; i < segments; i += 2) {
            const angle = (i / segments) * Math.PI * 2;
            // Box lies flat on the disc face (XY plane after disc rotation)
            const swirlGeo = new THREE.BoxGeometry(0.05, radius * 0.7, 0.09);
            const whiteMaterial = new THREE.MeshStandardMaterial({
                color: swirlColors[1],
            });
            const swirl = new THREE.Mesh(swirlGeo, whiteMaterial);
            // Position on the XY plane (disc face) with slight Z offset to sit on top
            swirl.position.set(
                Math.cos(angle) * radius * 0.4,
                Math.sin(angle) * radius * 0.4,
                0.05
            );
            swirl.rotation.z = angle; // Rotate around Z to radiate from center
            candyGroup.add(swirl);
        }

        // Center highlight
        const centerGeo = new THREE.SphereGeometry(0.06, 8, 8);
        const highlightMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            emissive: 0xFFFFFF,
            emissiveIntensity: 0.3,
        });
        const center = new THREE.Mesh(centerGeo, highlightMaterial);
        candyGroup.add(center);

        candyGroup.position.y = 0.15;
        lollipopGroup.add(candyGroup);

        this.mesh = lollipopGroup;
        this.group.add(this.mesh);
        this.collisionRadius = 0.4;
    }

    createWrappedCandy() {
        const candyGroup = new THREE.Group();

        // Pick random wrapper color
        const wrapperColor = CANDY_COLORS.WRAPPED_COLORS[
            Math.floor(Math.random() * CANDY_COLORS.WRAPPED_COLORS.length)
        ];

        // Main candy body (rounded rectangle)
        const bodyGeometry = new THREE.CapsuleGeometry(0.15, 0.25, 8, 12);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: wrapperColor,
            metalness: 0.4,
            roughness: 0.3,
            emissive: wrapperColor,
            emissiveIntensity: 0.15,
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.rotation.z = Math.PI / 2;
        candyGroup.add(body);

        // Wrapper twist ends
        const twistGeometry = new THREE.ConeGeometry(0.12, 0.2, 6);
        const twistMaterial = new THREE.MeshStandardMaterial({
            color: wrapperColor,
            metalness: 0.5,
            roughness: 0.2,
            transparent: true,
            opacity: 0.8,
        });

        // Left twist
        const leftTwist = new THREE.Mesh(twistGeometry, twistMaterial);
        leftTwist.position.x = -0.28;
        leftTwist.rotation.z = Math.PI / 2;
        candyGroup.add(leftTwist);

        // Right twist
        const rightTwist = new THREE.Mesh(twistGeometry, twistMaterial);
        rightTwist.position.x = 0.28;
        rightTwist.rotation.z = -Math.PI / 2;
        candyGroup.add(rightTwist);

        // Add stripe decoration
        const stripeGeometry = new THREE.TorusGeometry(0.16, 0.02, 4, 12);
        const stripeMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            emissive: 0xFFFFFF,
            emissiveIntensity: 0.2,
        });
        const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
        stripe.rotation.y = Math.PI / 2;
        candyGroup.add(stripe);

        this.mesh = candyGroup;
        this.group.add(this.mesh);
        this.collisionRadius = 0.4;
    }

    createCupcake() {
        const cupcakeGroup = new THREE.Group();

        // Cupcake wrapper/base (fluted cup shape)
        const wrapperGeometry = new THREE.CylinderGeometry(0.18, 0.12, 0.18, 12);
        const wrapperMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFB6C1,
            flatShading: true,
        });
        const wrapper = new THREE.Mesh(wrapperGeometry, wrapperMaterial);
        wrapper.position.y = -0.1;
        cupcakeGroup.add(wrapper);

        // Cake part
        const cakeGeometry = new THREE.CylinderGeometry(0.16, 0.18, 0.1, 12);
        const cakeMaterial = new THREE.MeshStandardMaterial({
            color: 0xDEB887,
            flatShading: true,
        });
        const cake = new THREE.Mesh(cakeGeometry, cakeMaterial);
        cake.position.y = 0.04;
        cupcakeGroup.add(cake);

        // Frosting swirl (multiple spheres stacked)
        const frostingColor = CANDY_COLORS.CUPCAKE_FROSTING[
            Math.floor(Math.random() * CANDY_COLORS.CUPCAKE_FROSTING.length)
        ];
        const frostingMaterial = new THREE.MeshStandardMaterial({
            color: frostingColor,
            emissive: frostingColor,
            emissiveIntensity: 0.15,
            flatShading: true,
        });

        // Bottom frosting layer
        const frost1Geo = new THREE.SphereGeometry(0.15, 8, 8);
        const frost1 = new THREE.Mesh(frost1Geo, frostingMaterial);
        frost1.position.y = 0.15;
        frost1.scale.y = 0.6;
        cupcakeGroup.add(frost1);

        // Middle frosting layer
        const frost2Geo = new THREE.SphereGeometry(0.12, 8, 8);
        const frost2 = new THREE.Mesh(frost2Geo, frostingMaterial);
        frost2.position.y = 0.25;
        frost2.scale.y = 0.7;
        cupcakeGroup.add(frost2);

        // Top frosting swirl
        const frost3Geo = new THREE.ConeGeometry(0.08, 0.12, 8);
        const frost3 = new THREE.Mesh(frost3Geo, frostingMaterial);
        frost3.position.y = 0.35;
        cupcakeGroup.add(frost3);

        // Cherry on top!
        const cherryGeometry = new THREE.SphereGeometry(0.06, 8, 8);
        const cherryMaterial = new THREE.MeshStandardMaterial({
            color: 0xFF0000,
            emissive: 0xFF0000,
            emissiveIntensity: 0.3,
        });
        const cherry = new THREE.Mesh(cherryGeometry, cherryMaterial);
        cherry.position.y = 0.44;
        cupcakeGroup.add(cherry);

        // Cherry stem
        const stemGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.08, 4);
        const stemMat = new THREE.MeshStandardMaterial({ color: 0x228B22 });
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = 0.5;
        stem.rotation.z = 0.3;
        cupcakeGroup.add(stem);

        this.mesh = cupcakeGroup;
        this.group.add(this.mesh);
        this.collisionRadius = 0.35;
    }

    createDonut() {
        const donutGroup = new THREE.Group();

        // Donut base
        const donutGeometry = new THREE.TorusGeometry(0.18, 0.1, 12, 24);
        const donutMaterial = new THREE.MeshStandardMaterial({
            color: 0xDEB887,
            flatShading: true,
        });
        const donut = new THREE.Mesh(donutGeometry, donutMaterial);
        donut.rotation.x = Math.PI / 2;
        donutGroup.add(donut);

        // Frosting layer
        const frostingColor = CANDY_COLORS.DONUT_FROSTING[
            Math.floor(Math.random() * CANDY_COLORS.DONUT_FROSTING.length)
        ];
        const frostingGeometry = new THREE.TorusGeometry(0.18, 0.08, 12, 24);
        const frostingMaterial = new THREE.MeshStandardMaterial({
            color: frostingColor,
            emissive: frostingColor,
            emissiveIntensity: 0.2,
        });
        const frosting = new THREE.Mesh(frostingGeometry, frostingMaterial);
        frosting.rotation.x = Math.PI / 2;
        frosting.position.y = 0.05;
        donutGroup.add(frosting);

        // Colorful sprinkles!
        const sprinkleColors = [0xFF69B4, 0xFFD700, 0x87CEEB, 0x98FB98, 0xFFB347, 0xDDA0DD];
        for (let i = 0; i < 12; i++) {
            const sprinkleMat = new THREE.MeshStandardMaterial({
                color: sprinkleColors[i % sprinkleColors.length],
            });
            const sprinkle = new THREE.Mesh(getSharedSprinkleGeo(), sprinkleMat);

            const angle = (i / 12) * Math.PI * 2;
            const radius = 0.12 + Math.random() * 0.08;
            sprinkle.position.set(
                Math.cos(angle) * radius,
                0.12,
                Math.sin(angle) * radius
            );
            sprinkle.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            donutGroup.add(sprinkle);
        }

        // Donut tumbles in all directions - see update() for multi-axis rotation

        this.mesh = donutGroup;
        this.group.add(this.mesh);
        this.collisionRadius = 0.35;
    }

    createIceCream() {
        const iceCreamGroup = new THREE.Group();

        // Waffle cone - flipped so point is at bottom
        const coneGeometry = new THREE.ConeGeometry(0.12, 0.35, 8);
        const coneMaterial = new THREE.MeshStandardMaterial({
            color: 0xD2691E,
            flatShading: true,
        });
        const cone = new THREE.Mesh(coneGeometry, coneMaterial);
        cone.rotation.x = Math.PI; // Flip cone so point faces down
        cone.position.y = -0.15;
        iceCreamGroup.add(cone);

        // Waffle pattern (crossed lines)
        const lineMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
        });
        for (let i = 0; i < 4; i++) {
            const lineGeo = new THREE.BoxGeometry(0.01, 0.25, 0.01);
            const line = new THREE.Mesh(lineGeo, lineMaterial);
            const angle = (i / 4) * Math.PI;
            line.position.set(
                Math.cos(angle) * 0.06,
                -0.1,
                Math.sin(angle) * 0.06
            );
            line.rotation.y = angle;
            iceCreamGroup.add(line);
        }

        // Ice cream scoops
        const scoopColor = CANDY_COLORS.ICE_CREAM[
            Math.floor(Math.random() * CANDY_COLORS.ICE_CREAM.length)
        ];
        const scoopMaterial = new THREE.MeshStandardMaterial({
            color: scoopColor,
            emissive: scoopColor,
            emissiveIntensity: 0.1,
        });

        // Main scoop
        const scoopGeometry = new THREE.SphereGeometry(0.16, 12, 12);
        const mainScoop = new THREE.Mesh(scoopGeometry, scoopMaterial);
        mainScoop.position.y = 0.12;
        iceCreamGroup.add(mainScoop);

        // Small top dollop
        const topGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const topScoop = new THREE.Mesh(topGeometry, scoopMaterial);
        topScoop.position.y = 0.28;
        iceCreamGroup.add(topScoop);

        // Swirl top
        const swirlGeometry = new THREE.ConeGeometry(0.05, 0.1, 8);
        const swirl = new THREE.Mesh(swirlGeometry, scoopMaterial);
        swirl.position.y = 0.38;
        iceCreamGroup.add(swirl);

        this.mesh = iceCreamGroup;
        this.group.add(this.mesh);
        this.collisionRadius = 0.35;
    }

    createStarCookie() {
        const cookieGroup = new THREE.Group();

        // Star-shaped cookie using octahedron scaled
        const starGeometry = new THREE.OctahedronGeometry(0.25, 0);
        const cookieMaterial = new THREE.MeshStandardMaterial({
            color: CANDY_COLORS.COOKIE_STAR,
            emissive: CANDY_COLORS.COOKIE_STAR,
            emissiveIntensity: 0.4,
            metalness: 0.3,
            roughness: 0.4,
        });
        const star = new THREE.Mesh(starGeometry, cookieMaterial);
        star.scale.set(1.2, 0.3, 1.2);
        cookieGroup.add(star);

        // Sparkle points on the star
        const sparkleGeometry = new THREE.SphereGeometry(0.04, 6, 6);
        const sparkleMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            emissive: 0xFFFFFF,
            emissiveIntensity: 0.8,
        });

        for (let i = 0; i < 5; i++) {
            const sparkle = new THREE.Mesh(sparkleGeometry, sparkleMaterial);
            const angle = (i / 5) * Math.PI * 2;
            sparkle.position.set(
                Math.cos(angle) * 0.15,
                0.05,
                Math.sin(angle) * 0.15
            );
            cookieGroup.add(sparkle);
        }

        // Center gem
        const gemGeometry = new THREE.OctahedronGeometry(0.08, 0);
        const gemMaterial = new THREE.MeshStandardMaterial({
            color: 0xFF69B4,
            emissive: 0xFF69B4,
            emissiveIntensity: 0.6,
        });
        const gem = new THREE.Mesh(gemGeometry, gemMaterial);
        gem.position.y = 0.08;
        cookieGroup.add(gem);

        this.mesh = cookieGroup;
        this.group.add(this.mesh);
        this.collisionRadius = 0.4;
        this.isRare = true;
    }

    createSparkleRing() {
        // Sweet sparkle effect around candy - scaled up to match larger candy
        const ringGeometry = new THREE.TorusGeometry(0.6, 0.03, 8, 16);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF69B4,
            transparent: true,
            opacity: 0.5,
        });
        this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
        this.ring.rotation.x = Math.PI / 2;
        this.group.add(this.ring);

        // Add ground glow - larger for bigger candy
        const glowGeometry = new THREE.CircleGeometry(0.8, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF69B4,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide,
        });
        this.groundGlow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.groundGlow.rotation.x = -Math.PI / 2;
        this.groundGlow.position.y = -1.75; // Lower to match higher floating candy
        this.group.add(this.groundGlow);
    }

    update(deltaTime, playerZ) {
        if (this.isCollected) return;

        this.animTime += deltaTime;

        // Rotate candy - donuts tumble in all directions!
        if (this.type === 'donut') {
            this.mesh.rotation.x += this.rotationSpeed * deltaTime * 1.2;
            this.mesh.rotation.y += this.rotationSpeed * deltaTime * 0.8;
            this.mesh.rotation.z += this.rotationSpeed * deltaTime * 0.5;
        } else {
            this.mesh.rotation.y += this.rotationSpeed * deltaTime;
        }

        // Bob up and down
        const bobY = Math.sin(this.animTime * this.bobSpeed + this.bobOffset) * this.bobAmount;
        this.group.position.y = this.position.y + bobY;

        // Pulse ring
        if (this.ring) {
            const pulse = (Math.sin(this.animTime * 3) + 1) * 0.5;
            this.ring.material.opacity = 0.2 + pulse * 0.4;
            this.ring.rotation.z += deltaTime * 0.5;
        }

        // Pulse ground glow
        if (this.groundGlow) {
            const glowPulse = 0.2 + Math.sin(this.animTime * 2.5) * 0.15;
            this.groundGlow.material.opacity = glowPulse;
        }

        // Rainbow color cycle for star cookie (rare)
        if (this.isRare) {
            const hue = (this.animTime * 0.3) % 1;
            this.ring.material.color.setHSL(hue, 1, 0.6);
            if (this.groundGlow) {
                this.groundGlow.material.color.setHSL(hue, 1, 0.5);
            }
        }

        // Check if far behind player
        if (this.position.z > playerZ + 20) {
            this.isActive = false;
        }
    }

    collect() {
        if (this.isCollected) return this.meterValue;

        this.isCollected = true;
        this.createCollectionEffect();

        setTimeout(() => {
            this.dispose();
        }, 400);

        return this.meterValue;
    }

    createCollectionEffect() {
        // Sweet sparkle burst!
        const particles = [];
        const particleCount = 10;
        const colors = [0xFF69B4, 0xFFD700, 0xFF6B9D, 0x87CEEB, 0xFFB6C1];

        for (let i = 0; i < particleCount; i++) {
            const particleGeo = new THREE.SphereGeometry(0.06, 6, 6);
            const particleMat = new THREE.MeshBasicMaterial({
                color: colors[i % colors.length],
                transparent: true,
                opacity: 1,
            });

            const particle = new THREE.Mesh(particleGeo, particleMat);
            particle.position.copy(this.position);
            particle.position.y += 0.5;

            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 2 + Math.random() * 2;
            particle.userData.velocity = {
                x: Math.cos(angle) * speed,
                y: 3 + Math.random() * 2,
                z: Math.sin(angle) * speed
            };

            this.scene.add(particle);
            particles.push(particle);
        }

        // Animate particles
        const duration = 500;
        const startTime = performance.now();
        const scene = this.scene;

        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = elapsed / duration;

            if (progress >= 1) {
                particles.forEach(p => {
                    scene.remove(p);
                    p.geometry.dispose();
                    p.material.dispose();
                });
                return;
            }

            particles.forEach((particle) => {
                particle.position.x += particle.userData.velocity.x * 0.016;
                particle.position.y += particle.userData.velocity.y * 0.016;
                particle.position.z += particle.userData.velocity.z * 0.016;
                particle.userData.velocity.y -= 0.15; // Gravity
                particle.material.opacity = 1 - progress;
                const scale = 1 - progress * 0.5;
                particle.scale.set(scale, scale, scale);
            });

            // Candy flies up
            this.group.position.y = this.position.y + (progress * 8);
            this.group.traverse((child) => {
                if (child.material) {
                    child.material.opacity = 1 - progress;
                    child.material.transparent = true;
                }
            });

            requestAnimationFrame(animate);
        };

        animate();
    }

    getBoundingBox() {
        return {
            center: this.position,
            radius: this.collisionRadius
        };
    }

    getPosition() {
        return this.position;
    }

    dispose() {
        this.isActive = false;
        this.scene.remove(this.group);
        this.group.traverse((child) => {
            if (child.geometry && child.geometry !== getSharedLollipopStickGeo() && child.geometry !== getSharedSprinkleGeo()) {
                child.geometry.dispose();
            }
            if (child.material) {
                child.material.dispose();
            }
        });
    }
}
