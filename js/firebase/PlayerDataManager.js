// Player Data Manager
// Handles persistent player data including lifetime coins, unlocked cosmetics, and equipped items
// Uses Firebase for cloud sync with localStorage fallback

export class PlayerDataManager {
    constructor() {
        this.db = null;
        this.isInitialized = false;
        this.deviceId = this.getOrCreateDeviceId();
        this.data = this.getDefaultData();
        this.listeners = new Set();
        this.syncPending = false;
        this.firebaseFns = null;
    }

    getDefaultData() {
        return {
            totalCoins: 0,
            unlockedItems: ['yellow_shirt', 'blue_overalls'], // Default items are free
            equippedItems: {
                shirt: 'yellow_shirt',
                overalls: 'blue_overalls'
            },
            lastUpdated: Date.now()
        };
    }

    getOrCreateDeviceId() {
        let deviceId = localStorage.getItem('helloKittyDeviceId');
        if (!deviceId) {
            deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('helloKittyDeviceId', deviceId);
        }
        return deviceId;
    }

    async init() {
        // Load local data first (immediate availability)
        this.loadLocalData();

        try {
            // Firebase config (same as LeaderboardManager)
            const firebaseConfig = {
                apiKey: "AIzaSyCC1eUkZW_30a5h2U9e8SOlXgCg3V6EDSE",
                authDomain: "kidsgame-8dc5a.firebaseapp.com",
                databaseURL: "https://kidsgame-8dc5a-default-rtdb.firebaseio.com",
                projectId: "kidsgame-8dc5a",
                storageBucket: "kidsgame-8dc5a.firebasestorage.app",
                messagingSenderId: "97196037909",
                appId: "1:97196037909:web:284433a3bd2292ce8bbb1c"
            };

            // Dynamically import Firebase modules
            const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
            const { getDatabase, ref, set, get, onValue } =
                await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js');

            // Initialize Firebase (reuse if already initialized)
            let app;
            const existingApps = getApps();
            if (existingApps.length > 0) {
                app = existingApps[0];
            } else {
                app = initializeApp(firebaseConfig);
            }

            this.db = getDatabase(app);
            this.firebaseFns = { ref, set, get, onValue };

            this.isInitialized = true;
            console.log('PlayerDataManager initialized successfully');

            // Sync with Firebase (merge remote data)
            await this.syncWithFirebase();

            return true;
        } catch (error) {
            console.error('Failed to initialize PlayerDataManager:', error);
            this.isInitialized = false;
            return false;
        }
    }

    // Load data from localStorage
    loadLocalData() {
        try {
            const saved = localStorage.getItem('helloKittyPlayerData');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Merge with defaults to ensure all fields exist
                this.data = { ...this.getDefaultData(), ...parsed };
                // Ensure default items are always unlocked
                if (!this.data.unlockedItems.includes('yellow_shirt')) {
                    this.data.unlockedItems.push('yellow_shirt');
                }
                if (!this.data.unlockedItems.includes('blue_overalls')) {
                    this.data.unlockedItems.push('blue_overalls');
                }
            }
        } catch (e) {
            console.warn('Could not load player data from localStorage:', e);
        }
    }

    // Save data to localStorage
    saveLocalData() {
        try {
            localStorage.setItem('helloKittyPlayerData', JSON.stringify(this.data));
        } catch (e) {
            console.warn('Could not save player data to localStorage:', e);
        }
    }

    // Sync with Firebase
    async syncWithFirebase() {
        if (!this.isInitialized || !this.db) return;

        try {
            const { ref, get, set } = this.firebaseFns;
            const userRef = ref(this.db, `users/${this.deviceId}`);

            const snapshot = await get(userRef);

            if (snapshot.exists()) {
                const remoteData = snapshot.val();
                // Merge: take the higher coin count, union of unlocked items
                this.data.totalCoins = Math.max(this.data.totalCoins, remoteData.totalCoins || 0);

                // Merge unlocked items (union)
                const remoteUnlocked = remoteData.unlockedItems || [];
                const allUnlocked = new Set([...this.data.unlockedItems, ...remoteUnlocked]);
                this.data.unlockedItems = Array.from(allUnlocked);

                // Use remote equipped items if local has defaults
                if (remoteData.equippedItems) {
                    // Only override if we have the items unlocked
                    if (this.data.unlockedItems.includes(remoteData.equippedItems.shirt)) {
                        this.data.equippedItems.shirt = remoteData.equippedItems.shirt;
                    }
                    if (this.data.unlockedItems.includes(remoteData.equippedItems.overalls)) {
                        this.data.equippedItems.overalls = remoteData.equippedItems.overalls;
                    }
                }

                this.data.lastUpdated = Date.now();
            }

            // Save merged data back to Firebase and locally
            await set(userRef, this.data);
            this.saveLocalData();
            this.notifyListeners();

        } catch (error) {
            console.error('Firebase sync error:', error);
        }
    }

    // Save data to Firebase (debounced)
    async saveToFirebase() {
        if (!this.isInitialized || !this.db) {
            this.saveLocalData();
            return;
        }

        // Debounce Firebase writes
        if (this.syncPending) return;
        this.syncPending = true;

        setTimeout(async () => {
            try {
                const { ref, set } = this.firebaseFns;
                const userRef = ref(this.db, `users/${this.deviceId}`);
                this.data.lastUpdated = Date.now();
                await set(userRef, this.data);
                this.saveLocalData();
            } catch (error) {
                console.error('Failed to save to Firebase:', error);
                this.saveLocalData(); // Ensure local save on Firebase failure
            }
            this.syncPending = false;
        }, 1000); // 1 second debounce
    }

    // Add coins to total (called at end of each game session)
    addCoins(amount) {
        if (amount <= 0) return;
        this.data.totalCoins += Math.floor(amount);
        this.saveToFirebase();
        this.notifyListeners();
    }

    // Get total lifetime coins
    getTotalCoins() {
        return this.data.totalCoins;
    }

    // Spend coins (returns true if successful)
    spendCoins(amount) {
        if (amount <= 0 || this.data.totalCoins < amount) {
            return false;
        }
        this.data.totalCoins -= amount;
        this.saveToFirebase();
        this.notifyListeners();
        return true;
    }

    // Check if item is unlocked
    isItemUnlocked(itemId) {
        return this.data.unlockedItems.includes(itemId);
    }

    // Unlock an item
    unlockItem(itemId) {
        if (!this.data.unlockedItems.includes(itemId)) {
            this.data.unlockedItems.push(itemId);
            this.saveToFirebase();
            this.notifyListeners();
        }
    }

    // Get all unlocked items
    getUnlockedItems() {
        return [...this.data.unlockedItems];
    }

    // Equip an item (must be unlocked first)
    equipItem(slot, itemId) {
        if (!this.isItemUnlocked(itemId)) {
            console.warn(`Cannot equip ${itemId} - not unlocked`);
            return false;
        }
        if (!['shirt', 'overalls'].includes(slot)) {
            console.warn(`Invalid slot: ${slot}`);
            return false;
        }
        this.data.equippedItems[slot] = itemId;
        this.saveToFirebase();
        this.notifyListeners();
        return true;
    }

    // Get equipped item for a slot
    getEquippedItem(slot) {
        return this.data.equippedItems[slot] || null;
    }

    // Get all equipped items
    getEquippedItems() {
        return { ...this.data.equippedItems };
    }

    // Subscribe to data changes
    addListener(callback) {
        this.listeners.add(callback);
        // Immediately call with current data
        callback(this.data);
        return () => this.listeners.delete(callback);
    }

    // Notify all listeners of data change
    notifyListeners() {
        for (const listener of this.listeners) {
            try {
                listener(this.data);
            } catch (e) {
                console.error('Listener error:', e);
            }
        }
    }
}
