import * as THREE from 'three';

/**
 * CharacterManager - Handles unlockable characters and skins
 *
 * Characters: Different Sanrio friends with unique looks
 * Skins: Color variations for each character
 */
export class CharacterManager {
    constructor() {
        this.characters = this.defineCharacters();
        this.loadUnlocks();
        this.selectedCharacter = localStorage.getItem('selectedCharacter') || 'hello-kitty';
        this.selectedSkin = localStorage.getItem('selectedSkin') || 'classic';
    }

    defineCharacters() {
        return {
            'hello-kitty': {
                name: 'Hello Kitty',
                description: 'The iconic white kitty with a red bow',
                price: 0, // Free (default)
                color: '#FFFFFF',
                skins: {
                    'classic': { name: 'Classic', color: '#FF0000', bowColor: 0xFF0000, accentColor: 0xFF0000, price: 0 },
                    'pink-princess': { name: 'Pink Princess', color: '#FF69B4', bowColor: 0xFF69B4, accentColor: 0xFFB6C1, price: 500 },
                    'ocean-blue': { name: 'Ocean Blue', color: '#4169E1', bowColor: 0x4169E1, accentColor: 0x87CEEB, price: 500 },
                    'golden': { name: 'Golden', color: '#FFD700', bowColor: 0xFFD700, accentColor: 0xFFA500, price: 1500 },
                    'rainbow': { name: 'Rainbow', color: 'linear-gradient(135deg, #FF69B4, #87CEEB)', bowColor: 0xFF69B4, accentColor: 0x87CEEB, price: 2000, special: 'rainbow' }
                }
            },
            'my-melody': {
                name: 'My Melody',
                description: 'Sweet pink bunny with a hood',
                price: 1000,
                color: '#FFB6C1',
                bodyColor: 0xFFFFFF,
                headColor: 0xFFB6C1, // Pink hood
                earColor: 0xFFB6C1,
                skins: {
                    'classic': { name: 'Classic', color: '#FFB6C1', hoodColor: 0xFFB6C1, flowerColor: 0xFF69B4, price: 0 },
                    'baby-blue': { name: 'Baby Blue', color: '#87CEEB', hoodColor: 0x87CEEB, flowerColor: 0x4169E1, price: 500 }
                }
            },
            'cinnamoroll': {
                name: 'Cinnamoroll',
                description: 'Fluffy white puppy with big ears',
                price: 1500,
                color: '#87CEEB',
                bodyColor: 0xFFFFFF,
                earColor: 0xFFFFFF,
                cheekColor: 0xFFB6C1,
                skins: {
                    'classic': { name: 'Classic', color: '#87CEEB', eyeColor: 0x4169E1, cheekColor: 0xFFB6C1, price: 0 },
                    'sleepy': { name: 'Sleepy', color: '#FFD700', eyeColor: 0x4169E1, cheekColor: 0xFFD700, price: 500 }
                }
            },
            'kuromi': {
                name: 'Kuromi',
                description: 'Mischievous bunny with a black hood',
                price: 2000,
                color: '#2F2F2F',
                bodyColor: 0xFFFFFF,
                headColor: 0x2F2F2F, // Black hood
                earColor: 0x2F2F2F,
                skullColor: 0xFFFFFF,
                skins: {
                    'classic': { name: 'Classic', color: '#2F2F2F', hoodColor: 0x2F2F2F, accentColor: 0xFF69B4, price: 0 },
                    'purple-punk': { name: 'Purple Punk', color: '#4B0082', hoodColor: 0x4B0082, accentColor: 0x9400D3, price: 750 }
                }
            },
            'pompompurin': {
                name: 'Pompompurin',
                description: 'Golden retriever with a beret',
                price: 1500,
                color: '#FFD700',
                bodyColor: 0xFFD700,
                beretColor: 0x8B4513,
                skins: {
                    'classic': { name: 'Classic', color: '#FFD700', bodyColor: 0xFFD700, beretColor: 0x8B4513, price: 0 },
                    'caramel': { name: 'Caramel', color: '#D2691E', bodyColor: 0xD2691E, beretColor: 0x8B0000, price: 500 }
                }
            },
            'keroppi': {
                name: 'Keroppi',
                description: 'Cheerful green frog',
                price: 1000,
                color: '#32CD32',
                bodyColor: 0x32CD32,
                eyeColor: 0xFFFFFF,
                cheekColor: 0xFF6347,
                skins: {
                    'classic': { name: 'Classic', color: '#32CD32', bodyColor: 0x32CD32, cheekColor: 0xFF6347, price: 0 },
                    'tropical': { name: 'Tropical', color: '#00CED1', bodyColor: 0x00CED1, cheekColor: 0xFF69B4, price: 500 }
                }
            }
        };
    }

    loadUnlocks() {
        const saved = localStorage.getItem('unlockedCharacters');
        if (saved) {
            this.unlockedCharacters = JSON.parse(saved);
        } else {
            // Default unlocks
            this.unlockedCharacters = {
                'hello-kitty': ['classic']
            };
            this.saveUnlocks();
        }
    }

    saveUnlocks() {
        localStorage.setItem('unlockedCharacters', JSON.stringify(this.unlockedCharacters));
    }

    isCharacterUnlocked(characterId) {
        return this.unlockedCharacters.hasOwnProperty(characterId);
    }

    isSkinUnlocked(characterId, skinId) {
        return this.unlockedCharacters[characterId]?.includes(skinId) || false;
    }

    unlockCharacter(characterId) {
        if (!this.unlockedCharacters[characterId]) {
            this.unlockedCharacters[characterId] = ['classic']; // Unlock with default skin
            this.saveUnlocks();
            return true;
        }
        return false;
    }

    unlockSkin(characterId, skinId) {
        if (this.unlockedCharacters[characterId] && !this.unlockedCharacters[characterId].includes(skinId)) {
            this.unlockedCharacters[characterId].push(skinId);
            this.saveUnlocks();
            return true;
        }
        return false;
    }

    selectCharacter(characterId, skinId = null) {
        if (this.isCharacterUnlocked(characterId)) {
            this.selectedCharacter = characterId;
            // If skin not specified, use 'classic' or keep current if it's valid
            if (skinId && this.isSkinUnlocked(characterId, skinId)) {
                this.selectedSkin = skinId;
            } else {
                this.selectedSkin = 'classic';
            }
            localStorage.setItem('selectedCharacter', characterId);
            localStorage.setItem('selectedSkin', this.selectedSkin);
            return true;
        }
        return false;
    }

    selectSkin(skinId) {
        if (this.isSkinUnlocked(this.selectedCharacter, skinId)) {
            this.selectedSkin = skinId;
            localStorage.setItem('selectedSkin', skinId);
            return true;
        }
        return false;
    }

    getSelectedCharacter() {
        return this.characters[this.selectedCharacter];
    }

    getSelectedSkin() {
        const character = this.characters[this.selectedCharacter];
        return character?.skins[this.selectedSkin] || character?.skins['classic'];
    }

    getCharacterPrice(characterId) {
        return this.characters[characterId]?.price || 0;
    }

    getSkinPrice(characterId, skinId) {
        return this.characters[characterId]?.skins[skinId]?.price || 0;
    }

    /**
     * Create the 3D character mesh based on selected character and skin
     */
    createCharacterMesh(scene) {
        const characterId = this.selectedCharacter;
        const skin = this.getSelectedSkin();

        switch (characterId) {
            case 'hello-kitty':
                return this.createHelloKitty(scene, skin);
            case 'my-melody':
                return this.createMyMelody(scene, skin);
            case 'cinnamoroll':
                return this.createCinnamoroll(scene, skin);
            case 'kuromi':
                return this.createKuromi(scene, skin);
            case 'pompompurin':
                return this.createPompompurin(scene, skin);
            case 'keroppi':
                return this.createKeroppi(scene, skin);
            default:
                return this.createHelloKitty(scene, skin);
        }
    }

    createHelloKitty(scene, skin) {
        const character = new THREE.Group();
        const bowColor = skin.bowColor || 0xFF0000;

        // Body - oval/egg shape
        const bodyGeometry = new THREE.SphereGeometry(0.35, 16, 16);
        bodyGeometry.scale(1, 1.2, 0.9);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            roughness: 0.8,
            metalness: 0.1
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.5;
        body.castShadow = true;
        character.add(body);

        // Head - larger round head
        const headGeometry = new THREE.SphereGeometry(0.42, 16, 16);
        headGeometry.scale(1.1, 1, 1);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            roughness: 0.8,
            metalness: 0.1
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.1;
        head.castShadow = true;
        character.add(head);

        // Ears
        const earGeometry = new THREE.SphereGeometry(0.15, 12, 12);
        earGeometry.scale(1, 1.3, 0.7);
        const earMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.8 });

        const leftEar = new THREE.Mesh(earGeometry, earMaterial);
        leftEar.position.set(-0.28, 1.48, 0);
        leftEar.rotation.z = 0.3;
        character.add(leftEar);

        const rightEar = new THREE.Mesh(earGeometry, earMaterial);
        rightEar.position.set(0.28, 1.48, 0);
        rightEar.rotation.z = -0.3;
        character.add(rightEar);

        // Bow (on right ear from viewer's perspective)
        const bowGroup = this.createBow(bowColor);
        bowGroup.position.set(0.35, 1.52, 0.08);
        bowGroup.rotation.z = -0.2;
        character.add(bowGroup);

        // Eyes
        const eyeGeometry = new THREE.SphereGeometry(0.06, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.14, 1.12, 0.38);
        character.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.14, 1.12, 0.38);
        character.add(rightEye);

        // Nose
        const noseGeometry = new THREE.SphereGeometry(0.045, 8, 8);
        const noseMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700, roughness: 0.5 });
        const nose = new THREE.Mesh(noseGeometry, noseMaterial);
        nose.position.set(0, 1.05, 0.42);
        character.add(nose);

        // Whiskers
        this.addWhiskers(character);

        // Arms
        this.addArms(character, 0xFFFFFF);

        // Legs
        this.addLegs(character, 0xFFFFFF);

        return { character, body, head, nose };
    }

    createMyMelody(scene, skin) {
        const character = new THREE.Group();
        const hoodColor = skin.hoodColor || 0xFFB6C1;
        const flowerColor = skin.flowerColor || 0xFF69B4;

        // Body
        const bodyGeometry = new THREE.SphereGeometry(0.32, 16, 16);
        bodyGeometry.scale(1, 1.1, 0.9);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.8 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.45;
        body.castShadow = true;
        character.add(body);

        // Head (white face area)
        const headGeometry = new THREE.SphereGeometry(0.38, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.8 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.0;
        head.castShadow = true;
        character.add(head);

        // Hood
        const hoodGeometry = new THREE.SphereGeometry(0.42, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6);
        const hoodMaterial = new THREE.MeshStandardMaterial({ color: hoodColor, roughness: 0.8 });
        const hood = new THREE.Mesh(hoodGeometry, hoodMaterial);
        hood.position.y = 1.05;
        hood.rotation.x = -0.2;
        character.add(hood);

        // Long bunny ears
        const earGeometry = new THREE.CapsuleGeometry(0.1, 0.5, 8, 16);
        const earMaterial = new THREE.MeshStandardMaterial({ color: hoodColor, roughness: 0.8 });

        const leftEar = new THREE.Mesh(earGeometry, earMaterial);
        leftEar.position.set(-0.2, 1.6, -0.05);
        leftEar.rotation.z = 0.2;
        character.add(leftEar);

        const rightEar = new THREE.Mesh(earGeometry, earMaterial);
        rightEar.position.set(0.2, 1.6, -0.05);
        rightEar.rotation.z = -0.2;
        character.add(rightEar);

        // Flower on hood
        const flowerGroup = this.createFlower(flowerColor);
        flowerGroup.position.set(0.3, 1.35, 0.2);
        character.add(flowerGroup);

        // Eyes
        const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.12, 1.02, 0.35);
        character.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.12, 1.02, 0.35);
        character.add(rightEye);

        // Nose
        const noseGeometry = new THREE.SphereGeometry(0.03, 8, 8);
        const noseMaterial = new THREE.MeshStandardMaterial({ color: 0xFF69B4 });
        const nose = new THREE.Mesh(noseGeometry, noseMaterial);
        nose.position.set(0, 0.95, 0.38);
        character.add(nose);

        this.addArms(character, 0xFFFFFF);
        this.addLegs(character, 0xFFFFFF);

        return { character, body, head, nose };
    }

    createCinnamoroll(scene, skin) {
        const character = new THREE.Group();

        // Body (chubby)
        const bodyGeometry = new THREE.SphereGeometry(0.35, 16, 16);
        bodyGeometry.scale(1.1, 1, 1);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.8 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.45;
        body.castShadow = true;
        character.add(body);

        // Head
        const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.8 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.0;
        head.castShadow = true;
        character.add(head);

        // Big floppy ears
        const earGeometry = new THREE.SphereGeometry(0.2, 12, 12);
        earGeometry.scale(0.6, 1.5, 0.4);
        const earMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.8 });

        const leftEar = new THREE.Mesh(earGeometry, earMaterial);
        leftEar.position.set(-0.35, 1.2, 0);
        leftEar.rotation.z = 0.8;
        character.add(leftEar);

        const rightEar = new THREE.Mesh(earGeometry, earMaterial);
        rightEar.position.set(0.35, 1.2, 0);
        rightEar.rotation.z = -0.8;
        character.add(rightEar);

        // Curly tail on head
        const tailGeometry = new THREE.TorusGeometry(0.08, 0.03, 8, 16, Math.PI * 1.5);
        const tailMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.8 });
        const tail = new THREE.Mesh(tailGeometry, tailMaterial);
        tail.position.set(0, 1.4, 0);
        tail.rotation.x = Math.PI / 2;
        character.add(tail);

        // Eyes (blue)
        const eyeGeometry = new THREE.SphereGeometry(0.07, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: skin.eyeColor || 0x4169E1 });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.13, 1.02, 0.36);
        character.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.13, 1.02, 0.36);
        character.add(rightEye);

        // Pink cheeks
        const cheekGeometry = new THREE.SphereGeometry(0.06, 8, 8);
        const cheekMaterial = new THREE.MeshStandardMaterial({ color: skin.cheekColor || 0xFFB6C1, roughness: 0.9 });

        const leftCheek = new THREE.Mesh(cheekGeometry, cheekMaterial);
        leftCheek.position.set(-0.25, 0.95, 0.3);
        character.add(leftCheek);

        const rightCheek = new THREE.Mesh(cheekGeometry, cheekMaterial);
        rightCheek.position.set(0.25, 0.95, 0.3);
        character.add(rightCheek);

        // Small nose
        const noseGeometry = new THREE.SphereGeometry(0.03, 8, 8);
        const noseMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const nose = new THREE.Mesh(noseGeometry, noseMaterial);
        nose.position.set(0, 0.95, 0.4);
        character.add(nose);

        this.addArms(character, 0xFFFFFF);
        this.addLegs(character, 0xFFFFFF);

        return { character, body, head, nose };
    }

    createKuromi(scene, skin) {
        const character = new THREE.Group();
        const hoodColor = skin.hoodColor || 0x2F2F2F;
        const accentColor = skin.accentColor || 0xFF69B4;

        // Body
        const bodyGeometry = new THREE.SphereGeometry(0.32, 16, 16);
        bodyGeometry.scale(1, 1.1, 0.9);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.8 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.45;
        body.castShadow = true;
        character.add(body);

        // Head (white face)
        const headGeometry = new THREE.SphereGeometry(0.38, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.8 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.0;
        head.castShadow = true;
        character.add(head);

        // Black hood
        const hoodGeometry = new THREE.SphereGeometry(0.42, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6);
        const hoodMaterial = new THREE.MeshStandardMaterial({ color: hoodColor, roughness: 0.8 });
        const hood = new THREE.Mesh(hoodGeometry, hoodMaterial);
        hood.position.y = 1.05;
        hood.rotation.x = -0.2;
        character.add(hood);

        // Pointy devil ears
        const earGeometry = new THREE.ConeGeometry(0.1, 0.4, 8);
        const earMaterial = new THREE.MeshStandardMaterial({ color: hoodColor, roughness: 0.8 });

        const leftEar = new THREE.Mesh(earGeometry, earMaterial);
        leftEar.position.set(-0.25, 1.5, 0);
        leftEar.rotation.z = 0.3;
        character.add(leftEar);

        const rightEar = new THREE.Mesh(earGeometry, earMaterial);
        rightEar.position.set(0.25, 1.5, 0);
        rightEar.rotation.z = -0.3;
        character.add(rightEar);

        // Pink skull on hood
        const skullGroup = this.createSkull(accentColor);
        skullGroup.position.set(0, 1.35, 0.35);
        skullGroup.scale.set(0.5, 0.5, 0.5);
        character.add(skullGroup);

        // Mischievous eyes
        const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.12, 1.02, 0.35);
        character.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.12, 1.02, 0.35);
        character.add(rightEye);

        // Nose
        const noseGeometry = new THREE.SphereGeometry(0.03, 8, 8);
        const noseMaterial = new THREE.MeshStandardMaterial({ color: accentColor });
        const nose = new THREE.Mesh(noseGeometry, noseMaterial);
        nose.position.set(0, 0.95, 0.38);
        character.add(nose);

        this.addArms(character, 0xFFFFFF);
        this.addLegs(character, 0xFFFFFF);

        return { character, body, head, nose };
    }

    createPompompurin(scene, skin) {
        const character = new THREE.Group();
        const bodyColor = skin.bodyColor || 0xFFD700;
        const beretColor = skin.beretColor || 0x8B4513;

        // Body (chubby golden retriever)
        const bodyGeometry = new THREE.SphereGeometry(0.38, 16, 16);
        bodyGeometry.scale(1.1, 1, 1);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.8 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.5;
        body.castShadow = true;
        character.add(body);

        // Head
        const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.8 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.05;
        head.castShadow = true;
        character.add(head);

        // Beret
        const beretGeometry = new THREE.SphereGeometry(0.25, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.4);
        const beretMaterial = new THREE.MeshStandardMaterial({ color: beretColor, roughness: 0.7 });
        const beret = new THREE.Mesh(beretGeometry, beretMaterial);
        beret.position.y = 1.4;
        beret.rotation.x = 0.2;
        character.add(beret);

        // Floppy ears
        const earGeometry = new THREE.SphereGeometry(0.15, 12, 12);
        earGeometry.scale(0.7, 1.2, 0.5);
        const earMaterial = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.8 });

        const leftEar = new THREE.Mesh(earGeometry, earMaterial);
        leftEar.position.set(-0.35, 1.1, 0);
        leftEar.rotation.z = 0.5;
        character.add(leftEar);

        const rightEar = new THREE.Mesh(earGeometry, earMaterial);
        rightEar.position.set(0.35, 1.1, 0);
        rightEar.rotation.z = -0.5;
        character.add(rightEar);

        // Eyes
        const eyeGeometry = new THREE.SphereGeometry(0.04, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.12, 1.08, 0.36);
        character.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.12, 1.08, 0.36);
        character.add(rightEye);

        // Nose
        const noseGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const noseMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const nose = new THREE.Mesh(noseGeometry, noseMaterial);
        nose.position.set(0, 1.0, 0.4);
        character.add(nose);

        this.addArms(character, bodyColor);
        this.addLegs(character, bodyColor);

        return { character, body, head, nose };
    }

    createKeroppi(scene, skin) {
        const character = new THREE.Group();
        const bodyColor = skin.bodyColor || 0x32CD32;
        const cheekColor = skin.cheekColor || 0xFF6347;

        // Body
        const bodyGeometry = new THREE.SphereGeometry(0.35, 16, 16);
        bodyGeometry.scale(1, 0.9, 0.9);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.8 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.45;
        body.castShadow = true;
        character.add(body);

        // Head (wider for frog)
        const headGeometry = new THREE.SphereGeometry(0.42, 16, 16);
        headGeometry.scale(1.2, 0.9, 1);
        const headMaterial = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.8 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 0.95;
        head.castShadow = true;
        character.add(head);

        // Big frog eyes (on top of head)
        const eyeBaseGeometry = new THREE.SphereGeometry(0.15, 12, 12);
        const eyeBaseMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.8 });

        const leftEyeBase = new THREE.Mesh(eyeBaseGeometry, eyeBaseMaterial);
        leftEyeBase.position.set(-0.18, 1.25, 0.15);
        character.add(leftEyeBase);

        const rightEyeBase = new THREE.Mesh(eyeBaseGeometry, eyeBaseMaterial);
        rightEyeBase.position.set(0.18, 1.25, 0.15);
        character.add(rightEyeBase);

        // Pupils
        const pupilGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

        const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        leftPupil.position.set(-0.18, 1.25, 0.28);
        character.add(leftPupil);

        const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        rightPupil.position.set(0.18, 1.25, 0.28);
        character.add(rightPupil);

        // Red cheeks
        const cheekGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const cheekMaterial = new THREE.MeshStandardMaterial({ color: cheekColor, roughness: 0.9 });

        const leftCheek = new THREE.Mesh(cheekGeometry, cheekMaterial);
        leftCheek.position.set(-0.3, 0.9, 0.3);
        character.add(leftCheek);

        const rightCheek = new THREE.Mesh(cheekGeometry, cheekMaterial);
        rightCheek.position.set(0.3, 0.9, 0.3);
        character.add(rightCheek);

        // Wide smile
        const smileGeometry = new THREE.TorusGeometry(0.15, 0.02, 8, 16, Math.PI);
        const smileMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const smile = new THREE.Mesh(smileGeometry, smileMaterial);
        smile.position.set(0, 0.85, 0.38);
        smile.rotation.x = Math.PI;
        character.add(smile);

        // Nose (small dot)
        const noseGeometry = new THREE.SphereGeometry(0.02, 8, 8);
        const noseMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const nose = new THREE.Mesh(noseGeometry, noseMaterial);
        nose.position.set(0, 0.92, 0.42);
        character.add(nose);

        this.addArms(character, bodyColor);
        this.addFrogLegs(character, bodyColor);

        return { character, body, head, nose };
    }

    // Helper methods for character parts
    createBow(color) {
        const bowGroup = new THREE.Group();
        const bowMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });

        // Left loop
        const loopGeometry = new THREE.SphereGeometry(0.1, 12, 12);
        loopGeometry.scale(1.2, 0.8, 0.5);
        const leftLoop = new THREE.Mesh(loopGeometry, bowMaterial);
        leftLoop.position.x = -0.08;
        bowGroup.add(leftLoop);

        // Right loop
        const rightLoop = new THREE.Mesh(loopGeometry, bowMaterial);
        rightLoop.position.x = 0.08;
        bowGroup.add(rightLoop);

        // Center knot
        const knotGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const knot = new THREE.Mesh(knotGeometry, bowMaterial);
        bowGroup.add(knot);

        return bowGroup;
    }

    createFlower(color) {
        const flowerGroup = new THREE.Group();

        // Petals
        const petalGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        petalGeometry.scale(1, 0.5, 1);
        const petalMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });

        for (let i = 0; i < 5; i++) {
            const petal = new THREE.Mesh(petalGeometry, petalMaterial);
            const angle = (i / 5) * Math.PI * 2;
            petal.position.set(Math.cos(angle) * 0.06, 0, Math.sin(angle) * 0.06);
            flowerGroup.add(petal);
        }

        // Center
        const centerGeometry = new THREE.SphereGeometry(0.03, 8, 8);
        const centerMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700 });
        const center = new THREE.Mesh(centerGeometry, centerMaterial);
        flowerGroup.add(center);

        return flowerGroup;
    }

    createSkull(color) {
        const skullGroup = new THREE.Group();

        // Main skull
        const skullGeometry = new THREE.SphereGeometry(0.15, 12, 12);
        skullGeometry.scale(1, 0.9, 0.8);
        const skullMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
        const skull = new THREE.Mesh(skullGeometry, skullMaterial);
        skullGroup.add(skull);

        // Eye sockets
        const socketGeometry = new THREE.SphereGeometry(0.04, 8, 8);
        const socketMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

        const leftSocket = new THREE.Mesh(socketGeometry, socketMaterial);
        leftSocket.position.set(-0.05, 0.02, 0.12);
        skullGroup.add(leftSocket);

        const rightSocket = new THREE.Mesh(socketGeometry, socketMaterial);
        rightSocket.position.set(0.05, 0.02, 0.12);
        skullGroup.add(rightSocket);

        return skullGroup;
    }

    addWhiskers(character) {
        const whiskerMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const whiskerGeometry = new THREE.CylinderGeometry(0.005, 0.005, 0.18, 4);

        // Left whiskers
        for (let i = 0; i < 3; i++) {
            const whisker = new THREE.Mesh(whiskerGeometry, whiskerMaterial);
            whisker.position.set(-0.2, 1.05 + (i - 1) * 0.04, 0.35);
            whisker.rotation.z = Math.PI / 2 + (i - 1) * 0.15;
            character.add(whisker);
        }

        // Right whiskers
        for (let i = 0; i < 3; i++) {
            const whisker = new THREE.Mesh(whiskerGeometry, whiskerMaterial);
            whisker.position.set(0.2, 1.05 + (i - 1) * 0.04, 0.35);
            whisker.rotation.z = -Math.PI / 2 - (i - 1) * 0.15;
            character.add(whisker);
        }
    }

    addArms(character, color) {
        const armGeometry = new THREE.CapsuleGeometry(0.08, 0.2, 8, 8);
        const armMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });

        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.38, 0.55, 0);
        leftArm.rotation.z = 0.3;
        character.add(leftArm);

        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.38, 0.55, 0);
        rightArm.rotation.z = -0.3;
        character.add(rightArm);
    }

    addLegs(character, color) {
        const legGeometry = new THREE.CapsuleGeometry(0.09, 0.15, 8, 8);
        const legMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });

        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.15, 0.12, 0);
        character.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.15, 0.12, 0);
        character.add(rightLeg);
    }

    addFrogLegs(character, color) {
        // Frog has bigger, more spread legs
        const legGeometry = new THREE.CapsuleGeometry(0.1, 0.12, 8, 8);
        const legMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });

        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.2, 0.1, 0.05);
        leftLeg.rotation.z = 0.3;
        character.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.2, 0.1, 0.05);
        rightLeg.rotation.z = -0.3;
        character.add(rightLeg);
    }
}
