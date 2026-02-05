// Cosmetic Shop
// Defines all available cosmetic items and handles purchases

export const COSMETIC_ITEMS = {
    // Shirts
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
        price: 500,
        description: 'Cute pink shirt'
    },
    red_shirt: {
        id: 'red_shirt',
        name: 'Red Shirt',
        slot: 'shirt',
        color: 0xFF4444,
        price: 750,
        description: 'Bold red shirt'
    },
    purple_shirt: {
        id: 'purple_shirt',
        name: 'Purple Shirt',
        slot: 'shirt',
        color: 0x9370DB, // Medium purple
        price: 750,
        description: 'Royal purple shirt'
    },
    mint_shirt: {
        id: 'mint_shirt',
        name: 'Mint Shirt',
        slot: 'shirt',
        color: 0x98FF98, // Pale green
        price: 1000,
        description: 'Fresh mint green shirt'
    },
    orange_shirt: {
        id: 'orange_shirt',
        name: 'Orange Shirt',
        slot: 'shirt',
        color: 0xFF8C00, // Dark orange
        price: 1000,
        description: 'Bright orange shirt'
    },

    // Overalls
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
        price: 500,
        description: 'Stylish purple overalls'
    },
    pink_overalls: {
        id: 'pink_overalls',
        name: 'Pink Overalls',
        slot: 'overalls',
        color: 0xFF1493, // Deep pink
        pocketColor: 0xDB1180,
        price: 750,
        description: 'Adorable pink overalls'
    },
    red_overalls: {
        id: 'red_overalls',
        name: 'Red Overalls',
        slot: 'overalls',
        color: 0xDC143C, // Crimson
        pocketColor: 0xB81030,
        price: 750,
        description: 'Sporty red overalls'
    },
    green_overalls: {
        id: 'green_overalls',
        name: 'Green Overalls',
        slot: 'overalls',
        color: 0x32CD32, // Lime green
        pocketColor: 0x28A428,
        price: 1000,
        description: 'Nature green overalls'
    },
    black_overalls: {
        id: 'black_overalls',
        name: 'Black Overalls',
        slot: 'overalls',
        color: 0x2F2F2F, // Dark gray/black
        pocketColor: 0x1F1F1F,
        price: 1500,
        description: 'Sleek black overalls'
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

        return {
            totalCoins,
            shirts,
            overalls
        };
    }

    // Get color for equipped items (for Player class to use)
    getEquippedColors() {
        const shirtItem = this.getEquipped('shirt') || COSMETIC_ITEMS.yellow_shirt;
        const overallsItem = this.getEquipped('overalls') || COSMETIC_ITEMS.blue_overalls;

        return {
            shirtColor: shirtItem.color,
            overallsColor: overallsItem.color,
            pocketColor: overallsItem.pocketColor || overallsItem.color
        };
    }
}
