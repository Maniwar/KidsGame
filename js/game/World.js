import { Obstacle } from './Obstacle.js';
import { Collectible } from './Collectible.js';
import { PowerUp } from './PowerUp.js';
import { Candy } from './Candy.js';
import { GAME_CONFIG } from '../utils/Constants.js';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.obstacles = [];
        this.collectibles = [];
        this.powerUps = [];
        this.candies = []; // New candy collectibles!

        this.chunkLength = GAME_CONFIG.CHUNK_LENGTH;
        this.nextChunkZ = -this.chunkLength; // Start ahead of player
        this.chunksGenerated = 0;

        // Obstacle types (low = jump, tall = slide)
        this.obstacleTypes = ['low', 'tall'];
        this.collectibleTypes = ['coin', 'blue-gem', 'pink-gem'];
        this.powerUpTypes = ['magnet', 'shield', 'speed', 'multiplier', 'flight', 'giant'];
        // Candy types - different sweets to collect!
        this.candyTypes = ['lollipop', 'wrapped-candy', 'cupcake', 'donut', 'ice-cream', 'star-cookie'];

        // Generate initial chunks
        for (let i = 0; i < 3; i++) {
            this.generateChunk();
        }
    }

    generateChunk() {
        const chunkStartZ = this.nextChunkZ;
        const chunkEndZ = chunkStartZ - this.chunkLength;

        // Increase difficulty over time
        const difficultyMultiplier = 1 + (this.chunksGenerated * 0.05);

        // Generate obstacles
        let lastObstacleZ = chunkStartZ;
        while (lastObstacleZ > chunkEndZ) {
            // Random spacing between obstacles - more space for reaction time
            const spacing = GAME_CONFIG.MIN_OBSTACLE_DISTANCE + Math.random() * 15;
            lastObstacleZ -= spacing;

            if (lastObstacleZ < chunkEndZ) break;

            // Random lane
            const lane = Math.floor(Math.random() * GAME_CONFIG.NUM_LANES);

            // Random obstacle type
            const type = this.obstacleTypes[Math.floor(Math.random() * this.obstacleTypes.length)];

            const obstacle = new Obstacle(this.scene, lane, lastObstacleZ, type);
            this.obstacles.push(obstacle);
        }

        // Generate collectibles (coins and gems) - spaced further apart
        let lastCoinZ = chunkStartZ;
        while (lastCoinZ > chunkEndZ) {
            const spacing = 4 + Math.random() * 4; // More space between coin positions
            lastCoinZ -= spacing;

            if (lastCoinZ < chunkEndZ) break;

            // Chance for collectible
            if (Math.random() < GAME_CONFIG.COIN_SPAWN_CHANCE) {
                // Determine type (mostly coins, occasional gems)
                let type = 'coin';
                const gemRoll = Math.random();

                if (gemRoll < 0.05) {
                    type = 'pink-gem'; // 5% pink gem
                } else if (gemRoll < 0.1) {
                    type = 'blue-gem'; // 5% blue gem
                } else if (gemRoll < 0.12) {
                    type = 'star-gem'; // 2% star gem
                } else if (gemRoll < 0.13) {
                    type = 'rainbow-gem'; // 1% rainbow gem
                }

                // Sometimes create patterns (line of coins across lanes)
                if (Math.random() < 0.3 && type === 'coin') {
                    // Line pattern across all lanes
                    for (let lane = 0; lane < GAME_CONFIG.NUM_LANES; lane++) {
                        const collectible = new Collectible(this.scene, lane, lastCoinZ, 'coin');
                        this.collectibles.push(collectible);
                    }
                } else if (Math.random() < 0.2 && type === 'coin') {
                    // Zigzag pattern
                    for (let i = 0; i < 5; i++) {
                        const lane = i % 2;
                        const z = lastCoinZ - i * 1.5;
                        const collectible = new Collectible(this.scene, lane, z, 'coin');
                        this.collectibles.push(collectible);
                    }
                    lastCoinZ -= 7.5;
                } else {
                    // Single collectible in random lane
                    const lane = Math.floor(Math.random() * GAME_CONFIG.NUM_LANES);
                    const collectible = new Collectible(this.scene, lane, lastCoinZ, type);
                    this.collectibles.push(collectible);
                }
            }
        }

        // Generate power-ups (rare, ~1 per chunk)
        if (Math.random() < 0.3) { // 30% chance of power-up in chunk
            const powerUpZ = chunkStartZ - Math.random() * this.chunkLength;
            const lane = Math.floor(Math.random() * GAME_CONFIG.NUM_LANES);
            const type = this.powerUpTypes[Math.floor(Math.random() * this.powerUpTypes.length)];

            const powerUp = new PowerUp(this.scene, lane, powerUpZ, type);
            this.powerUps.push(powerUp);
        }

        // Generate candies - sweet collectibles for Sugar Rush meter!
        let lastCandyZ = chunkStartZ;
        while (lastCandyZ > chunkEndZ) {
            const spacing = 8 + Math.random() * 8; // Candies are rarer than coins
            lastCandyZ -= spacing;

            if (lastCandyZ < chunkEndZ) break;

            // 25% chance of candy at each position
            if (Math.random() < 0.25) {
                // Determine candy type (weighted - star cookie is rare)
                let type = 'lollipop';
                const candyRoll = Math.random();

                if (candyRoll < 0.03) {
                    type = 'star-cookie'; // 3% - rare, fills meter a lot!
                } else if (candyRoll < 0.18) {
                    type = 'cupcake'; // 15%
                } else if (candyRoll < 0.35) {
                    type = 'donut'; // 17%
                } else if (candyRoll < 0.52) {
                    type = 'ice-cream'; // 17%
                } else if (candyRoll < 0.72) {
                    type = 'wrapped-candy'; // 20%
                }
                // else lollipop - 28% (most common)

                const lane = Math.floor(Math.random() * GAME_CONFIG.NUM_LANES);
                const candy = new Candy(this.scene, lane, lastCandyZ, type);
                this.candies.push(candy);
            }
        }

        this.nextChunkZ = chunkEndZ;
        this.chunksGenerated++;
    }

    update(deltaTime, playerZ) {
        // Generate new chunk if player is getting close
        if (playerZ < this.nextChunkZ + this.chunkLength * 2) {
            this.generateChunk();
        }

        // PERFORMANCE: In-place removal instead of filter() (avoids new array allocation)
        // Update and cleanup obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            obstacle.update(deltaTime, playerZ);
            if (!obstacle.isActive) {
                obstacle.dispose();
                // Swap with last element and pop (O(1) removal)
                this.obstacles[i] = this.obstacles[this.obstacles.length - 1];
                this.obstacles.pop();
            }
        }

        // Update and cleanup collectibles
        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const collectible = this.collectibles[i];
            collectible.update(deltaTime, playerZ);
            if (!collectible.isActive) {
                collectible.dispose();
                this.collectibles[i] = this.collectibles[this.collectibles.length - 1];
                this.collectibles.pop();
            }
        }

        // Update and cleanup power-ups
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            powerUp.update(deltaTime, playerZ);
            if (!powerUp.isActive) {
                powerUp.dispose();
                this.powerUps[i] = this.powerUps[this.powerUps.length - 1];
                this.powerUps.pop();
            }
        }

        // Update and cleanup candies
        for (let i = this.candies.length - 1; i >= 0; i--) {
            const candy = this.candies[i];
            candy.update(deltaTime, playerZ);
            if (!candy.isActive) {
                candy.dispose();
                this.candies[i] = this.candies[this.candies.length - 1];
                this.candies.pop();
            }
        }
    }

    getObstacles() {
        return this.obstacles;
    }

    getCollectibles() {
        return this.collectibles;
    }

    getPowerUps() {
        return this.powerUps;
    }

    getCandies() {
        return this.candies;
    }

    reset() {
        // Clean up all objects
        this.obstacles.forEach(o => o.dispose());
        this.collectibles.forEach(c => c.dispose());
        this.powerUps.forEach(p => p.dispose());
        this.candies.forEach(c => c.dispose());

        this.obstacles = [];
        this.collectibles = [];
        this.powerUps = [];
        this.candies = [];
        this.nextChunkZ = -this.chunkLength;
        this.chunksGenerated = 0;

        // Generate initial chunks
        for (let i = 0; i < 3; i++) {
            this.generateChunk();
        }
    }
}
