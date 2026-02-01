// Game Constants
export const GAME_CONFIG = {
    // Lane system
    LANE_WIDTH: 2,
    NUM_LANES: 3,
    LANE_POSITIONS: [-2, 0, 2], // Left, Center, Right

    // Player
    PLAYER_START_SPEED: 25, // Much faster starting speed
    PLAYER_MAX_SPEED: 40, // High max speed for intense gameplay
    PLAYER_ACCELERATION: 1.5, // Rapid acceleration
    PLAYER_JUMP_FORCE: 12,
    PLAYER_GRAVITY: -30,
    PLAYER_HEIGHT: 1,
    PLAYER_SLIDE_HEIGHT: 0.5,

    // Movement
    LANE_SWITCH_DURATION: 0.2, // seconds
    JUMP_DURATION: 0.6,

    // World generation
    CHUNK_LENGTH: 50,
    VISIBLE_CHUNKS: 3,

    // Obstacles
    OBSTACLE_SPAWN_DISTANCE: 20,
    MIN_OBSTACLE_DISTANCE: 12,

    // Collectibles
    COIN_SPAWN_CHANCE: 0.7,
    GEM_SPAWN_CHANCE: 0.1,

    // Scoring
    DISTANCE_POINT_MULTIPLIER: 1,
    COIN_VALUE: 1,
    NEAR_MISS_BONUS: 10,
    FLOWER_POINTS: 5,

    // Player Health
    PLAYER_MAX_HEALTH: 3,
    PLAYER_INVINCIBILITY_DURATION: 2, // seconds after taking damage

    // Enemies
    ENEMY_SPAWN_INTERVAL: 3, // seconds
    ENEMY_SPEED: 8, // slower than player so they chase
    ENEMY_DAMAGE: 1,
    ENEMY_HEALTH: 2,

    // Towers
    TOWER_PLACEMENT_COST: 10, // coins
    TOWER_ATTACK_RANGE: 8,
    TOWER_ATTACK_SPEED: 1, // attacks per second
    TOWER_DAMAGE: 1,

    // Projectiles
    PROJECTILE_SPEED: 15,
};

// Colors (kawaii palette)
export const COLORS = {
    PRIMARY_PINK: 0xFFB7C5,
    SECONDARY_PINK: 0xFF69B4,
    SOFT_WHITE: 0xFFF5F5,
    SKY_BLUE: 0x87CEEB,
    SUNSET_ORANGE: 0xFFB347,
    GRASS_GREEN: 0x90EE90,
    GOLD: 0xFFD700,
    PURPLE: 0xDDA0DD,
    RED: 0xFF0000,
};

// Character colors (Hello Kitty)
export const HELLO_KITTY_COLORS = {
    BODY: 0xFFFFFF,
    BOW: 0xFF0000,
    NOSE: 0xFFD700,
    EYES: 0x000000,
};

// Input key mappings
export const KEYS = {
    LEFT: ['ArrowLeft', 'KeyA'],
    RIGHT: ['ArrowRight', 'KeyD'],
    JUMP: ['ArrowUp', 'KeyW', 'Space'],
    SLIDE: ['ArrowDown', 'KeyS'],
};

// Tower types
export const TOWER_TYPES = {
    BASIC: {
        name: 'Bow Tower',
        cost: 10,
        damage: 1,
        range: 8,
        attackSpeed: 1,
        color: 0xFFB7C5, // Pink
    },
    FAST: {
        name: 'Star Shooter',
        cost: 20,
        damage: 1,
        range: 6,
        attackSpeed: 2,
        color: 0xFFD700, // Gold
    },
    STRONG: {
        name: 'Heart Cannon',
        cost: 30,
        damage: 3,
        range: 10,
        attackSpeed: 0.5,
        color: 0xFF69B4, // Hot Pink
    },
};

// Enemy colors
export const ENEMY_COLORS = {
    BASIC: 0x8B008B, // Dark purple (not too scary)
    FAST: 0xFF6347, // Tomato red
    STRONG: 0x4B0082, // Indigo
};
