// Cosmetic Shop
// Defines all available cosmetic items and handles purchases
//
// ECONOMY BALANCE (based on leaderboard data):
// - Top players: ~4000 coins per run
// - Good players: ~1500-2500 coins per run
// - Average players: ~500-1000 coins per run
// - Beginners: ~100-300 coins per run
//
// PRICE TIERS:
// - Free (0): Defaults + "no clothes" options
// - Starter (150-400): Achievable in 1 decent run
// - Common (600-1200): 2-3 runs for average player
// - Uncommon (1500-2500): 3-5 runs, or 1 great run
// - Rare (3000-5000): Multiple sessions required
// - Legendary (10000+): Long-term goal, flex item

export const COSMETIC_ITEMS = {
    // === SHIRTS ===
    yellow_shirt: {
        id: 'yellow_shirt',
        name: 'Yellow Shirt',
        slot: 'shirt',
        color: 0xFFD700,
        price: 0, // Free - default
        description: 'Classic yellow shirt',
        isDefault: true
    },
    pink_shirt: {
        id: 'pink_shirt',
        name: 'Pink Shirt',
        slot: 'shirt',
        color: 0xFF69B4, // Hot pink
        price: 200, // Starter - first purchase for beginners
        description: 'Cute pink shirt'
    },
    red_shirt: {
        id: 'red_shirt',
        name: 'Red Shirt',
        slot: 'shirt',
        color: 0xFF4444,
        price: 600, // Common
        description: 'Bold red shirt'
    },
    purple_shirt: {
        id: 'purple_shirt',
        name: 'Purple Shirt',
        slot: 'shirt',
        color: 0x9370DB, // Medium purple
        price: 800, // Common
        description: 'Royal purple shirt'
    },
    mint_shirt: {
        id: 'mint_shirt',
        name: 'Mint Shirt',
        slot: 'shirt',
        color: 0x98FF98, // Pale green
        price: 1500, // Uncommon
        description: 'Fresh mint green shirt'
    },
    orange_shirt: {
        id: 'orange_shirt',
        name: 'Orange Shirt',
        slot: 'shirt',
        color: 0xFF8C00, // Dark orange
        price: 2000, // Uncommon
        description: 'Bright orange shirt'
    },
    black_shirt: {
        id: 'black_shirt',
        name: 'Black Shirt',
        slot: 'shirt',
        color: 0x2F2F2F, // Dark gray/black
        price: 3500, // Rare
        description: 'Sleek black shirt'
    },
    rainbow_shirt: {
        id: 'rainbow_shirt',
        name: 'Rainbow Shirt',
        slot: 'shirt',
        color: 0xFF69B4, // Base pink (special effect handled in Player)
        isRainbow: true,
        price: 10000, // Legendary
        description: 'Magical color-changing shirt!'
    },
    none_shirt: {
        id: 'none_shirt',
        name: 'No Shirt',
        slot: 'shirt',
        color: 0xFFFFFF, // White (matches body)
        price: 0, // Free - gives options without grind
        description: 'Just the fur!'
    },

    // === PASTEL SHIRTS ===
    pastel_pink_shirt: {
        id: 'pastel_pink_shirt',
        name: 'Pastel Pink Shirt',
        slot: 'shirt',
        color: 0xFFB5C2,
        price: 1200, // Common
        description: 'Soft dreamy pink',
        collection: 'pastel'
    },
    pastel_blue_shirt: {
        id: 'pastel_blue_shirt',
        name: 'Pastel Blue Shirt',
        slot: 'shirt',
        color: 0xB5D4FF,
        price: 1200, // Common
        description: 'Gentle sky blue',
        collection: 'pastel'
    },
    pastel_lavender_shirt: {
        id: 'pastel_lavender_shirt',
        name: 'Pastel Lavender Shirt',
        slot: 'shirt',
        color: 0xD4B5FF,
        price: 1800, // Uncommon
        description: 'Lovely lavender dream',
        collection: 'pastel'
    },
    pastel_mint_shirt: {
        id: 'pastel_mint_shirt',
        name: 'Pastel Mint Shirt',
        slot: 'shirt',
        color: 0xB5FFD9,
        price: 1800, // Uncommon
        description: 'Cool minty fresh',
        collection: 'pastel'
    },
    pastel_peach_shirt: {
        id: 'pastel_peach_shirt',
        name: 'Pastel Peach Shirt',
        slot: 'shirt',
        color: 0xFFD4B5,
        price: 2200, // Uncommon
        description: 'Warm peachy glow',
        collection: 'pastel'
    },

    // === SPARKLE SHIRTS ===
    sparkle_pink_shirt: {
        id: 'sparkle_pink_shirt',
        name: 'Sparkle Pink Shirt',
        slot: 'shirt',
        color: 0xFF69B4,
        isSparkle: true,
        price: 5000, // Rare
        description: 'Shimmering pink sparkles!',
        collection: 'sparkle'
    },
    sparkle_gold_shirt: {
        id: 'sparkle_gold_shirt',
        name: 'Sparkle Gold Shirt',
        slot: 'shirt',
        color: 0xFFD700,
        isSparkle: true,
        price: 5000, // Rare
        description: 'Glittering golden shine!',
        collection: 'sparkle'
    },
    sparkle_silver_shirt: {
        id: 'sparkle_silver_shirt',
        name: 'Sparkle Silver Shirt',
        slot: 'shirt',
        color: 0xC0C0C0,
        isSparkle: true,
        price: 7000, // Rare
        description: 'Dazzling silver shimmer!',
        collection: 'sparkle'
    },

    // === OVERALLS ===
    blue_overalls: {
        id: 'blue_overalls',
        name: 'Blue Overalls',
        slot: 'overalls',
        color: 0x4169E1, // Royal blue
        pocketColor: 0x3158B8, // Darker blue
        price: 0, // Free - default
        description: 'Classic blue overalls',
        isDefault: true
    },
    purple_overalls: {
        id: 'purple_overalls',
        name: 'Purple Overalls',
        slot: 'overalls',
        color: 0x8A2BE2, // Blue violet
        pocketColor: 0x7222C9,
        price: 300, // Starter - early win
        description: 'Stylish purple overalls'
    },
    pink_overalls: {
        id: 'pink_overalls',
        name: 'Pink Overalls',
        slot: 'overalls',
        color: 0xFF1493, // Deep pink
        pocketColor: 0xDB1180,
        price: 900, // Common
        description: 'Adorable pink overalls'
    },
    red_overalls: {
        id: 'red_overalls',
        name: 'Red Overalls',
        slot: 'overalls',
        color: 0xDC143C, // Crimson
        pocketColor: 0xB81030,
        price: 1200, // Common
        description: 'Sporty red overalls'
    },
    green_overalls: {
        id: 'green_overalls',
        name: 'Green Overalls',
        slot: 'overalls',
        color: 0x32CD32, // Lime green
        pocketColor: 0x28A428,
        price: 2200, // Uncommon
        description: 'Nature green overalls'
    },
    black_overalls: {
        id: 'black_overalls',
        name: 'Black Overalls',
        slot: 'overalls',
        color: 0x2F2F2F, // Dark gray/black
        pocketColor: 0x1F1F1F,
        price: 4000, // Rare - prestige item
        description: 'Sleek black overalls'
    },
    rainbow_overalls: {
        id: 'rainbow_overalls',
        name: 'Rainbow Overalls',
        slot: 'overalls',
        color: 0xFF69B4, // Base pink (special effect handled in Player)
        pocketColor: 0x69B4FF,
        isRainbow: true,
        price: 10000, // Legendary
        description: 'Magical color-changing overalls!'
    },
    none_overalls: {
        id: 'none_overalls',
        name: 'No Overalls',
        slot: 'overalls',
        color: 0xFFFFFF, // White (matches body)
        pocketColor: 0xFFFFFF,
        price: 0, // Free - gives options without grind
        description: 'Just the fur!'
    },

    // === PASTEL OVERALLS ===
    pastel_pink_overalls: {
        id: 'pastel_pink_overalls',
        name: 'Pastel Pink Overalls',
        slot: 'overalls',
        color: 0xFFB5C2,
        pocketColor: 0xF0A0B0,
        price: 1500, // Uncommon
        description: 'Soft dreamy pink overalls',
        collection: 'pastel'
    },
    pastel_blue_overalls: {
        id: 'pastel_blue_overalls',
        name: 'Pastel Blue Overalls',
        slot: 'overalls',
        color: 0xB5D4FF,
        pocketColor: 0xA0C4F0,
        price: 1500, // Uncommon
        description: 'Gentle sky blue overalls',
        collection: 'pastel'
    },
    pastel_lavender_overalls: {
        id: 'pastel_lavender_overalls',
        name: 'Pastel Lavender Overalls',
        slot: 'overalls',
        color: 0xD4B5FF,
        pocketColor: 0xC4A0F0,
        price: 2000, // Uncommon
        description: 'Lovely lavender overalls',
        collection: 'pastel'
    },
    pastel_mint_overalls: {
        id: 'pastel_mint_overalls',
        name: 'Pastel Mint Overalls',
        slot: 'overalls',
        color: 0xB5FFD9,
        pocketColor: 0xA0F0C8,
        price: 2000, // Uncommon
        description: 'Cool minty overalls',
        collection: 'pastel'
    },
    pastel_peach_overalls: {
        id: 'pastel_peach_overalls',
        name: 'Pastel Peach Overalls',
        slot: 'overalls',
        color: 0xFFD4B5,
        pocketColor: 0xF0C4A0,
        price: 2500, // Uncommon
        description: 'Warm peachy overalls',
        collection: 'pastel'
    },

    // === SPARKLE OVERALLS ===
    sparkle_pink_overalls: {
        id: 'sparkle_pink_overalls',
        name: 'Sparkle Pink Overalls',
        slot: 'overalls',
        color: 0xFF69B4,
        pocketColor: 0xDB5599,
        isSparkle: true,
        price: 5000, // Rare
        description: 'Shimmering pink sparkle overalls!',
        collection: 'sparkle'
    },
    sparkle_gold_overalls: {
        id: 'sparkle_gold_overalls',
        name: 'Sparkle Gold Overalls',
        slot: 'overalls',
        color: 0xFFD700,
        pocketColor: 0xDAB800,
        isSparkle: true,
        price: 5000, // Rare
        description: 'Glittering golden overalls!',
        collection: 'sparkle'
    },
    sparkle_silver_overalls: {
        id: 'sparkle_silver_overalls',
        name: 'Sparkle Silver Overalls',
        slot: 'overalls',
        color: 0xC0C0C0,
        pocketColor: 0xA0A0A0,
        isSparkle: true,
        price: 7000, // Rare
        description: 'Dazzling silver overalls!',
        collection: 'sparkle'
    },

    // === BOWS ===
    red_bow: {
        id: 'red_bow',
        name: 'Red Bow',
        slot: 'bow',
        color: 0xFF0000, // Classic red
        price: 0, // Free - default
        description: 'Classic Hello Kitty bow',
        isDefault: true
    },
    pink_bow: {
        id: 'pink_bow',
        name: 'Pink Bow',
        slot: 'bow',
        color: 0xFF69B4, // Hot pink
        price: 150, // Starter - first purchase possible!
        description: 'Pretty pink bow'
    },
    purple_bow: {
        id: 'purple_bow',
        name: 'Purple Bow',
        slot: 'bow',
        color: 0x9370DB, // Medium purple
        price: 400, // Starter
        description: 'Royal purple bow'
    },
    blue_bow: {
        id: 'blue_bow',
        name: 'Blue Bow',
        slot: 'bow',
        color: 0x4169E1, // Royal blue
        price: 400, // Starter
        description: 'Cool blue bow'
    },
    gold_bow: {
        id: 'gold_bow',
        name: 'Gold Bow',
        slot: 'bow',
        color: 0xFFD700, // Gold
        price: 1000, // Common
        description: 'Shiny gold bow'
    },
    mint_bow: {
        id: 'mint_bow',
        name: 'Mint Bow',
        slot: 'bow',
        color: 0x98FF98, // Pale green
        price: 1400, // Uncommon
        description: 'Fresh mint bow'
    },
    orange_bow: {
        id: 'orange_bow',
        name: 'Orange Bow',
        slot: 'bow',
        color: 0xFF8C00, // Dark orange
        price: 1800, // Uncommon
        description: 'Bright orange bow'
    },
    black_bow: {
        id: 'black_bow',
        name: 'Black Bow',
        slot: 'bow',
        color: 0x2F2F2F, // Dark gray/black
        price: 3500, // Rare
        description: 'Elegant black bow'
    },
    rainbow_bow: {
        id: 'rainbow_bow',
        name: 'Rainbow Bow',
        slot: 'bow',
        color: 0xFF69B4, // Base pink (special effect handled in Player)
        isRainbow: true,
        price: 12000, // Legendary - THE flex item!
        description: 'Magical color-changing bow!'
    },

    // === PASTEL BOWS ===
    pastel_pink_bow: {
        id: 'pastel_pink_bow',
        name: 'Pastel Pink Bow',
        slot: 'bow',
        color: 0xFFB5C2,
        price: 800, // Common
        description: 'Soft dreamy pink bow',
        collection: 'pastel'
    },
    pastel_blue_bow: {
        id: 'pastel_blue_bow',
        name: 'Pastel Blue Bow',
        slot: 'bow',
        color: 0xB5D4FF,
        price: 800, // Common
        description: 'Gentle sky blue bow',
        collection: 'pastel'
    },
    pastel_lavender_bow: {
        id: 'pastel_lavender_bow',
        name: 'Pastel Lavender Bow',
        slot: 'bow',
        color: 0xD4B5FF,
        price: 1200, // Common
        description: 'Lovely lavender bow',
        collection: 'pastel'
    },
    pastel_mint_bow: {
        id: 'pastel_mint_bow',
        name: 'Pastel Mint Bow',
        slot: 'bow',
        color: 0xB5FFD9,
        price: 1200, // Common
        description: 'Cool minty bow',
        collection: 'pastel'
    },
    pastel_peach_bow: {
        id: 'pastel_peach_bow',
        name: 'Pastel Peach Bow',
        slot: 'bow',
        color: 0xFFD4B5,
        price: 1600, // Uncommon
        description: 'Warm peachy bow',
        collection: 'pastel'
    },

    // === SPARKLE BOWS ===
    sparkle_pink_bow: {
        id: 'sparkle_pink_bow',
        name: 'Sparkle Pink Bow',
        slot: 'bow',
        color: 0xFF69B4,
        isSparkle: true,
        price: 6000, // Rare
        description: 'Shimmering pink sparkle bow!',
        collection: 'sparkle'
    },
    sparkle_gold_bow: {
        id: 'sparkle_gold_bow',
        name: 'Sparkle Gold Bow',
        slot: 'bow',
        color: 0xFFD700,
        isSparkle: true,
        price: 6000, // Rare
        description: 'Glittering golden bow!',
        collection: 'sparkle'
    },
    sparkle_silver_bow: {
        id: 'sparkle_silver_bow',
        name: 'Sparkle Silver Bow',
        slot: 'bow',
        color: 0xC0C0C0,
        isSparkle: true,
        price: 8000, // Rare
        description: 'Dazzling silver bow!',
        collection: 'sparkle'
    }
};

export class CosmeticShop {
    constructor(playerDataManager) {
        this.playerData = playerDataManager;
    }

    // Get all items for a specific slot
    getItemsBySlot(slot) {
        return Object.values(COSMETIC_ITEMS).filter(item => item.slot === slot);
    }

    // Get all shirts
    getShirts() {
        return this.getItemsBySlot('shirt');
    }

    // Get all overalls
    getOveralls() {
        return this.getItemsBySlot('overalls');
    }

    // Get all bows
    getBows() {
        return this.getItemsBySlot('bow');
    }

    // Get item by ID
    getItem(itemId) {
        return COSMETIC_ITEMS[itemId] || null;
    }

    // Check if player can afford an item
    canAfford(itemId) {
        const item = this.getItem(itemId);
        if (!item) return false;
        return this.playerData.getTotalCoins() >= item.price;
    }

    // Check if item is already owned
    isOwned(itemId) {
        return this.playerData.isItemUnlocked(itemId);
    }

    // Purchase an item
    purchase(itemId) {
        const item = this.getItem(itemId);
        if (!item) {
            return { success: false, error: 'Item not found' };
        }

        if (this.isOwned(itemId)) {
            return { success: false, error: 'Already owned' };
        }

        if (!this.canAfford(itemId)) {
            return { success: false, error: 'Not enough coins', needed: item.price, have: this.playerData.getTotalCoins() };
        }

        // Process purchase
        if (this.playerData.spendCoins(item.price)) {
            this.playerData.unlockItem(itemId);
            return { success: true, item: item };
        }

        return { success: false, error: 'Purchase failed' };
    }

    // Equip an item
    equip(itemId) {
        const item = this.getItem(itemId);
        if (!item) {
            return { success: false, error: 'Item not found' };
        }

        if (!this.isOwned(itemId)) {
            return { success: false, error: 'Item not owned' };
        }

        if (this.playerData.equipItem(item.slot, itemId)) {
            return { success: true, item: item };
        }

        return { success: false, error: 'Equip failed' };
    }

    // Get currently equipped item for a slot
    getEquipped(slot) {
        const itemId = this.playerData.getEquippedItem(slot);
        return this.getItem(itemId);
    }

    // Get shop data for UI display
    getShopData() {
        const totalCoins = this.playerData.getTotalCoins();
        const unlockedItems = this.playerData.getUnlockedItems();
        const equippedItems = this.playerData.getEquippedItems();

        const shirts = this.getShirts().map(item => ({
            ...item,
            owned: unlockedItems.includes(item.id),
            equipped: equippedItems.shirt === item.id,
            canAfford: totalCoins >= item.price
        }));

        const overalls = this.getOveralls().map(item => ({
            ...item,
            owned: unlockedItems.includes(item.id),
            equipped: equippedItems.overalls === item.id,
            canAfford: totalCoins >= item.price
        }));

        const bows = this.getBows().map(item => ({
            ...item,
            owned: unlockedItems.includes(item.id),
            equipped: equippedItems.bow === item.id,
            canAfford: totalCoins >= item.price
        }));

        return {
            totalCoins,
            shirts,
            overalls,
            bows
        };
    }

    // Get color for equipped items (for Player class to use)
    getEquippedColors() {
        const shirtItem = this.getEquipped('shirt') || COSMETIC_ITEMS.yellow_shirt;
        const overallsItem = this.getEquipped('overalls') || COSMETIC_ITEMS.blue_overalls;
        const bowItem = this.getEquipped('bow') || COSMETIC_ITEMS.red_bow;

        return {
            shirtColor: shirtItem.color,
            overallsColor: overallsItem.color,
            pocketColor: overallsItem.pocketColor || overallsItem.color,
            bowColor: bowItem.color,
            isRainbowBow: bowItem.isRainbow || false,
            isRainbowShirt: shirtItem.isRainbow || false,
            isRainbowOveralls: overallsItem.isRainbow || false,
            isSparkleShirt: shirtItem.isSparkle || false,
            isSparkleOveralls: overallsItem.isSparkle || false,
            isSparkleBow: bowItem.isSparkle || false
        };
    }
}
