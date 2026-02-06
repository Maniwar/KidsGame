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
        // Increased values (+50%) for faster Sugar Rush activation = more fun!
        switch (type) {
            case 'lollipop':
                return 15;
            case 'wrapped-candy':
                return 12;
            case 'cupcake':
                return 22;
            case 'donut':
                return 18;
            case 'ice-cream':
                return 18;
            case 'strawberry':
                return 15;
            case 'cherry':
                return 18;
            case 'cake':
                return 28;
            case 'cake-slice':
                return 22;
            case 'star-cookie':
                return 40; // Rare jackpot - nearly fills half the meter!
            case 'watermelon':
                return 20; // Refreshing summer treat!
            default:
                return 15;
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
            case 'strawberry':
                this.createStrawberry();
                break;
            case 'cherry':
                this.createCherry();
                break;
            case 'cake':
                this.createCake();
                break;
            case 'cake-slice':
                this.createCakeSlice();
                break;
            case 'star-cookie':
                this.createStarCookie();
                break;
            case 'watermelon':
                this.createWatermelon();
                break;
            default:
                this.createLollipop();
        }

        // Scale up all candy to be more visible (1.8x bigger)
        const candyScale = 1.8;
        this.mesh.scale.set(candyScale, candyScale, candyScale);
        this.collisionRadius *= candyScale; // Scale collision radius too

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

        // Wrapper twist ends (triangles with flat end facing outward like 🍬)
        const twistGeometry = new THREE.ConeGeometry(0.1, 0.18, 4);
        const twistMaterial = new THREE.MeshStandardMaterial({
            color: wrapperColor,
            metalness: 0.5,
            roughness: 0.2,
            transparent: true,
            opacity: 0.8,
        });

        // Left twist - flat end faces left, point faces candy
        const leftTwist = new THREE.Mesh(twistGeometry, twistMaterial);
        leftTwist.position.x = -0.3;
        leftTwist.rotation.z = -Math.PI / 2; // Flip: flat end outward
        candyGroup.add(leftTwist);

        // Right twist - flat end faces right, point faces candy
        const rightTwist = new THREE.Mesh(twistGeometry, twistMaterial);
        rightTwist.position.x = 0.3;
        rightTwist.rotation.z = Math.PI / 2; // Flip: flat end outward
        candyGroup.add(rightTwist);

        // Add stripe decoration - wraps around the horizontal candy body
        const stripeGeometry = new THREE.TorusGeometry(0.16, 0.02, 4, 12);
        const stripeMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            emissive: 0xFFFFFF,
            emissiveIntensity: 0.2,
        });
        const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
        stripe.rotation.z = Math.PI / 2; // Rotate to wrap around horizontal body
        candyGroup.add(stripe);

        this.mesh = candyGroup;
        this.group.add(this.mesh);
        this.collisionRadius = 0.4;
    }

    createCupcake() {
        const cupcakeGroup = new THREE.Group();

        // Cupcake wrapper/base (fluted cup shape) - wider and shorter
        const wrapperGeometry = new THREE.CylinderGeometry(0.2, 0.14, 0.14, 12);
        const wrapperMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFB6C1,
            flatShading: true,
        });
        const wrapper = new THREE.Mesh(wrapperGeometry, wrapperMaterial);
        wrapper.position.y = -0.07;
        cupcakeGroup.add(wrapper);

        // Cake part - wider
        const cakeGeometry = new THREE.CylinderGeometry(0.18, 0.2, 0.08, 12);
        const cakeMaterial = new THREE.MeshStandardMaterial({
            color: 0xDEB887,
            flatShading: true,
        });
        const cake = new THREE.Mesh(cakeGeometry, cakeMaterial);
        cake.position.y = 0.02;
        cupcakeGroup.add(cake);

        // Frosting swirl - single dome instead of stacked spheres
        const frostingColor = CANDY_COLORS.CUPCAKE_FROSTING[
            Math.floor(Math.random() * CANDY_COLORS.CUPCAKE_FROSTING.length)
        ];
        const frostingMaterial = new THREE.MeshStandardMaterial({
            color: frostingColor,
            emissive: frostingColor,
            emissiveIntensity: 0.15,
            flatShading: true,
        });

        // Main frosting dome - wider, less tall
        const frostingGeo = new THREE.SphereGeometry(0.16, 12, 12);
        const frosting = new THREE.Mesh(frostingGeo, frostingMaterial);
        frosting.position.y = 0.12;
        frosting.scale.set(1.1, 0.7, 1.1); // Wider and flatter
        cupcakeGroup.add(frosting);

        // Small swirl tip on top
        const tipGeo = new THREE.ConeGeometry(0.06, 0.08, 8);
        const tip = new THREE.Mesh(tipGeo, frostingMaterial);
        tip.position.y = 0.22;
        cupcakeGroup.add(tip);

        // Cherry on top!
        const cherryGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const cherryMaterial = new THREE.MeshStandardMaterial({
            color: 0xFF0000,
            emissive: 0xFF0000,
            emissiveIntensity: 0.3,
        });
        const cherry = new THREE.Mesh(cherryGeometry, cherryMaterial);
        cherry.position.y = 0.28;
        cupcakeGroup.add(cherry);

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

    createStrawberry() {
        const strawberryGroup = new THREE.Group();

        // Main strawberry body (red, slightly elongated sphere)
        const bodyGeometry = new THREE.SphereGeometry(0.18, 12, 12);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0xFF2D2D,
            emissive: 0xFF2D2D,
            emissiveIntensity: 0.2,
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.scale.set(1, 1.3, 1); // Elongate vertically
        strawberryGroup.add(body);

        // Seeds (small yellow dots)
        const seedGeometry = new THREE.SphereGeometry(0.02, 4, 4);
        const seedMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFD700,
            emissive: 0xFFD700,
            emissiveIntensity: 0.3,
        });

        for (let i = 0; i < 16; i++) {
            const seed = new THREE.Mesh(seedGeometry, seedMaterial);
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI * 0.7 + 0.3; // Avoid top and bottom
            const r = 0.17;
            seed.position.set(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.cos(phi) * 1.3 - 0.05,
                r * Math.sin(phi) * Math.sin(theta)
            );
            strawberryGroup.add(seed);
        }

        // Green leaf top
        const leafGeometry = new THREE.ConeGeometry(0.12, 0.08, 5);
        const leafMaterial = new THREE.MeshStandardMaterial({
            color: 0x228B22,
            emissive: 0x228B22,
            emissiveIntensity: 0.1,
        });
        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        leaf.position.y = 0.22;
        leaf.rotation.x = Math.PI; // Flip so it sits on top
        strawberryGroup.add(leaf);

        // Small stem
        const stemGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.08, 6);
        const stemMaterial = new THREE.MeshStandardMaterial({
            color: 0x2E7D32,
        });
        const stem = new THREE.Mesh(stemGeometry, stemMaterial);
        stem.position.y = 0.28;
        strawberryGroup.add(stem);

        this.mesh = strawberryGroup;
        this.group.add(this.mesh);
        this.collisionRadius = 0.3;
    }

    createCherry() {
        const cherryGroup = new THREE.Group();

        // Two cherries (pair)
        const cherryGeometry = new THREE.SphereGeometry(0.12, 12, 12);
        const cherryMaterial = new THREE.MeshStandardMaterial({
            color: 0xDC143C,
            emissive: 0xDC143C,
            emissiveIntensity: 0.3,
            metalness: 0.3,
            roughness: 0.4,
        });

        // Left cherry
        const leftCherry = new THREE.Mesh(cherryGeometry, cherryMaterial);
        leftCherry.position.set(-0.1, -0.05, 0);
        cherryGroup.add(leftCherry);

        // Right cherry
        const rightCherry = new THREE.Mesh(cherryGeometry, cherryMaterial);
        rightCherry.position.set(0.1, -0.08, 0);
        cherryGroup.add(rightCherry);

        // Highlight spots on cherries (shiny)
        const highlightGeometry = new THREE.SphereGeometry(0.03, 6, 6);
        const highlightMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            emissive: 0xFFFFFF,
            emissiveIntensity: 0.5,
        });

        const leftHighlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
        leftHighlight.position.set(-0.06, 0.02, 0.08);
        cherryGroup.add(leftHighlight);

        const rightHighlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
        rightHighlight.position.set(0.14, -0.01, 0.08);
        cherryGroup.add(rightHighlight);

        // Stems - positioned so bottom connects to cherry tops
        const stemMaterial = new THREE.MeshStandardMaterial({
            color: 0x228B22,
        });

        // Left cherry top is at (-0.1, 0.07, 0) - stem angles outward (rotation.z negative)
        // For cylinder bottom to touch cherry top with rotation, calculate center position
        const leftStemGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.18, 6);
        const leftStem = new THREE.Mesh(leftStemGeo, stemMaterial);
        leftStem.position.set(-0.07, 0.16, 0);
        leftStem.rotation.z = -0.3; // Tilt outward so bottom reaches left cherry
        cherryGroup.add(leftStem);

        // Right cherry top is at (0.1, 0.04, 0) - stem angles outward (rotation.z positive)
        const rightStemGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.2, 6);
        const rightStem = new THREE.Mesh(rightStemGeo, stemMaterial);
        rightStem.position.set(0.07, 0.14, 0);
        rightStem.rotation.z = 0.3; // Tilt outward so bottom reaches right cherry
        cherryGroup.add(rightStem);

        // Small leaf at top where stems meet (stems converge around y=0.24)
        const leafGeometry = new THREE.SphereGeometry(0.05, 6, 6);
        const leafMaterial = new THREE.MeshStandardMaterial({
            color: 0x2E7D32,
            emissive: 0x2E7D32,
            emissiveIntensity: 0.1,
        });
        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        leaf.scale.set(1.5, 0.5, 1);
        leaf.position.set(0, 0.24, 0);
        cherryGroup.add(leaf);

        this.mesh = cherryGroup;
        this.group.add(this.mesh);
        this.collisionRadius = 0.25;
    }

    createCake() {
        const cakeGroup = new THREE.Group();

        // Cake base layer (bottom tier)
        const baseGeometry = new THREE.CylinderGeometry(0.22, 0.24, 0.15, 16);
        const cakeMaterial = new THREE.MeshStandardMaterial({
            color: 0xF5DEB3, // Wheat color for sponge
            flatShading: true,
        });
        const base = new THREE.Mesh(baseGeometry, cakeMaterial);
        base.position.y = -0.08;
        cakeGroup.add(base);

        // Middle frosting layer
        const frostingGeometry = new THREE.CylinderGeometry(0.23, 0.23, 0.03, 16);
        const frostingMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFB6C1, // Light pink frosting
            emissive: 0xFFB6C1,
            emissiveIntensity: 0.2,
        });
        const middleFrosting = new THREE.Mesh(frostingGeometry, frostingMaterial);
        middleFrosting.position.y = 0.02;
        cakeGroup.add(middleFrosting);

        // Top cake layer
        const topGeometry = new THREE.CylinderGeometry(0.2, 0.22, 0.12, 16);
        const topCake = new THREE.Mesh(topGeometry, cakeMaterial);
        topCake.position.y = 0.1;
        cakeGroup.add(topCake);

        // Top frosting swirl
        const topFrostingGeo = new THREE.SphereGeometry(0.18, 12, 12);
        const topFrosting = new THREE.Mesh(topFrostingGeo, frostingMaterial);
        topFrosting.scale.set(1, 0.4, 1);
        topFrosting.position.y = 0.2;
        cakeGroup.add(topFrosting);

        // Cherry on top
        const cherryGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const cherryMaterial = new THREE.MeshStandardMaterial({
            color: 0xFF0000,
            emissive: 0xFF0000,
            emissiveIntensity: 0.3,
        });
        const cherry = new THREE.Mesh(cherryGeometry, cherryMaterial);
        cherry.position.y = 0.28;
        cakeGroup.add(cherry);

        // Decorative dots around the cake
        const dotGeometry = new THREE.SphereGeometry(0.025, 6, 6);
        const dotMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            emissive: 0xFFFFFF,
            emissiveIntensity: 0.3,
        });
        for (let i = 0; i < 8; i++) {
            const dot = new THREE.Mesh(dotGeometry, dotMaterial);
            const angle = (i / 8) * Math.PI * 2;
            dot.position.set(
                Math.cos(angle) * 0.2,
                0.2,
                Math.sin(angle) * 0.2
            );
            cakeGroup.add(dot);
        }

        this.mesh = cakeGroup;
        this.group.add(this.mesh);
        this.collisionRadius = 0.35;
    }

    createCakeSlice() {
        const sliceGroup = new THREE.Group();

        // Create a triangular cake slice using a custom shape
        // Bottom sponge layer
        const sliceShape = new THREE.Shape();
        sliceShape.moveTo(0, 0);
        sliceShape.lineTo(0.25, -0.12);
        sliceShape.lineTo(0.25, 0.12);
        sliceShape.lineTo(0, 0);

        const extrudeSettings = {
            depth: 0.18,
            bevelEnabled: false,
        };

        const sliceGeometry = new THREE.ExtrudeGeometry(sliceShape, extrudeSettings);
        const spongeMaterial = new THREE.MeshStandardMaterial({
            color: 0xF5DEB3, // Wheat/sponge color
            flatShading: true,
        });
        const sponge = new THREE.Mesh(sliceGeometry, spongeMaterial);
        sponge.rotation.y = Math.PI / 2;
        sponge.position.set(0.09, -0.05, 0);
        sliceGroup.add(sponge);

        // Frosting layer on top
        const frostingShape = new THREE.Shape();
        frostingShape.moveTo(0, 0);
        frostingShape.lineTo(0.26, -0.13);
        frostingShape.lineTo(0.26, 0.13);
        frostingShape.lineTo(0, 0);

        const frostingExtrudeSettings = {
            depth: 0.04,
            bevelEnabled: false,
        };

        const frostingGeometry = new THREE.ExtrudeGeometry(frostingShape, frostingExtrudeSettings);
        const frostingMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFB6C1, // Light pink
            emissive: 0xFFB6C1,
            emissiveIntensity: 0.2,
        });
        const frosting = new THREE.Mesh(frostingGeometry, frostingMaterial);
        frosting.rotation.y = Math.PI / 2;
        frosting.position.set(0.09, 0.08, 0);
        sliceGroup.add(frosting);

        // Strawberry filling stripe (middle layer visible on cut side)
        const fillingGeometry = new THREE.BoxGeometry(0.22, 0.03, 0.16);
        const fillingMaterial = new THREE.MeshStandardMaterial({
            color: 0xFF6B6B, // Strawberry red
            emissive: 0xFF6B6B,
            emissiveIntensity: 0.2,
        });
        const filling = new THREE.Mesh(fillingGeometry, fillingMaterial);
        filling.position.set(0.12, 0.02, 0);
        sliceGroup.add(filling);

        // Small strawberry piece on top
        const strawberryGeo = new THREE.SphereGeometry(0.04, 6, 6);
        const strawberryMat = new THREE.MeshStandardMaterial({
            color: 0xFF2D2D,
            emissive: 0xFF2D2D,
            emissiveIntensity: 0.2,
        });
        const strawberry = new THREE.Mesh(strawberryGeo, strawberryMat);
        strawberry.scale.set(1, 0.7, 1);
        strawberry.position.set(0.15, 0.14, 0);
        sliceGroup.add(strawberry);

        this.mesh = sliceGroup;
        this.group.add(this.mesh);
        this.collisionRadius = 0.3;
    }

    createWatermelon() {
        const watermelonGroup = new THREE.Group();

        // Create a wider watermelon slice with curved back using quadratic curve
        const sliceShape = new THREE.Shape();
        sliceShape.moveTo(0, 0); // Point/tip
        sliceShape.lineTo(0.35, -0.22); // Bottom right (wider)
        // Curved back edge instead of straight line
        sliceShape.quadraticCurveTo(0.42, 0, 0.35, 0.22); // Rounded back
        sliceShape.lineTo(0, 0); // Back to tip

        const extrudeSettings = {
            depth: 0.14,
            bevelEnabled: false,
        };

        // Red watermelon flesh
        const fleshGeometry = new THREE.ExtrudeGeometry(sliceShape, extrudeSettings);
        const fleshMaterial = new THREE.MeshStandardMaterial({
            color: 0xFF4757, // Bright watermelon red
            emissive: 0xFF4757,
            emissiveIntensity: 0.2,
            flatShading: true,
        });
        const flesh = new THREE.Mesh(fleshGeometry, fleshMaterial);
        flesh.rotation.y = Math.PI / 2;
        flesh.position.set(0.07, 0, 0);
        watermelonGroup.add(flesh);

        // Thin green rind (curved to match flesh)
        const rindShape = new THREE.Shape();
        rindShape.moveTo(0.34, -0.21);
        rindShape.quadraticCurveTo(0.41, 0, 0.34, 0.21); // Inner curve
        rindShape.lineTo(0.37, 0.23); // Outer edge
        rindShape.quadraticCurveTo(0.45, 0, 0.37, -0.23); // Outer curve
        rindShape.lineTo(0.34, -0.21);

        const rindGeometry = new THREE.ExtrudeGeometry(rindShape, extrudeSettings);
        const rindMaterial = new THREE.MeshStandardMaterial({
            color: 0x2ED573, // Bright green
            emissive: 0x2ED573,
            emissiveIntensity: 0.15,
            flatShading: true,
        });
        const rind = new THREE.Mesh(rindGeometry, rindMaterial);
        rind.rotation.y = Math.PI / 2;
        rind.position.set(0.07, 0, 0);
        watermelonGroup.add(rind);

        // Black seeds - small and flat against the flesh
        const seedGeometry = new THREE.SphereGeometry(0.015, 5, 5);
        const seedMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a, // True black
            roughness: 0.3,
        });

        // Seeds positioned in flesh's local coordinates (before rotation)
        // Shape is in XY plane, extruded in Z. Front face is at z = depth (0.14)
        const seedPositions = [
            { x: 0.12, y: 0.06 },
            { x: 0.20, y: -0.04 },
            { x: 0.16, y: -0.10 },
            { x: 0.25, y: 0.08 },
            { x: 0.10, y: -0.02 },
            { x: 0.22, y: 0.00 },
            { x: 0.15, y: 0.10 },
        ];

        // Add seeds on front face - flush with surface
        seedPositions.forEach(pos => {
            const seed = new THREE.Mesh(seedGeometry, seedMaterial);
            seed.position.set(pos.x, pos.y, 0.14); // Flush with front face
            seed.scale.set(0.6, 1.2, 0.3); // Flatter teardrop
            seed.rotation.z = Math.random() * 0.6 - 0.3;
            flesh.add(seed);
        });

        // Add seeds on back face
        seedPositions.slice(0, 4).forEach(pos => {
            const seed = new THREE.Mesh(seedGeometry, seedMaterial);
            seed.position.set(pos.x + 0.02, pos.y - 0.02, 0.0);
            seed.scale.set(0.6, 1.2, 0.3);
            seed.rotation.z = Math.random() * 0.6 - 0.3;
            flesh.add(seed);
        });

        this.mesh = watermelonGroup;
        this.group.add(this.mesh);
        this.collisionRadius = 0.4;
    }

    update(deltaTime, playerZ) {
        if (this.isCollected) return;

        this.animTime += deltaTime;

        // All candy tumbles in all directions for fun bouncy animation!
        this.mesh.rotation.x += this.rotationSpeed * deltaTime * 1.2;
        this.mesh.rotation.y += this.rotationSpeed * deltaTime * 0.8;
        this.mesh.rotation.z += this.rotationSpeed * deltaTime * 0.5;

        // Bob up and down
        const bobY = Math.sin(this.animTime * this.bobSpeed + this.bobOffset) * this.bobAmount;
        this.group.position.y = this.position.y + bobY;

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
        // PERFORMANCE FIX: Removed particle burst that created new geometries
        // Just animate the candy flying up and fading - no memory allocation
        const duration = 400;
        const startTime = performance.now();
        const startY = this.position.y;
        const group = this.group;

        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = elapsed / duration;

            if (progress >= 1) {
                return; // Animation complete, dispose() will be called by setTimeout
            }

            // Candy flies up with easing
            const easeOut = 1 - Math.pow(1 - progress, 3);
            group.position.y = startY + (easeOut * 5);

            // Fade out and scale down
            group.traverse((child) => {
                if (child.material) {
                    child.material.opacity = 1 - progress;
                    child.material.transparent = true;
                }
            });

            // Spin as it flies up
            group.rotation.y += 0.3;

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
