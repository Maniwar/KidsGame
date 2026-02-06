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
            isRainbowOveralls: overallsItem.isRainbow || false
        };
    }
}
