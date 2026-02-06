// Player Data Manager
// Uses Recovery Codes instead of Firebase Auth - no orphaned accounts!
// Recovery code format: KITTY-XXXX-XXXX (easy to read/write down)
// Only saves to Firebase when player has actual progress (coins > 0 or items purchased)

export class PlayerDataManager {
    constructor() {
        this.db = null;
        this.recoveryCode = null;
        this.isInitialized = false;
        this.data = this.getDefaultData();
        this.listeners = new Set();
        this.syncPending = false;
        this.firebaseFns = null;
        this.hasProgress = false; // Track if player has made any progress worth saving
    }

    getDefaultData() {
        return {
            totalCoins: 0,
            bestMilestones: 0, // Best milestone count (synced across devices)
            // Default items are free: default outfit + no-clothes options + default bow
            unlockedItems: ['yellow_shirt', 'blue_overalls', 'red_bow', 'none_shirt', 'none_overalls'],
            equippedItems: {
                shirt: 'yellow_shirt',
                overalls: 'blue_overalls',
                bow: 'red_bow'
            },
            lastUpdated: Date.now()
        };
    }

    async init() {
        // Load local data first (immediate availability)
        this.loadLocalData();

        // Get or generate recovery code
        this.recoveryCode = this.getOrCreateRecoveryCode();

        try {
            // Firebase config
            const firebaseConfig = {
                apiKey: "AIzaSyCC1eUkZW_30a5h2U9e8SOlXgCg3V6EDSE",
                authDomain: "kidsgame-8dc5a.firebaseapp.com",
                databaseURL: "https://kidsgame-8dc5a-default-rtdb.firebaseio.com",
                projectId: "kidsgame-8dc5a",
                storageBucket: "kidsgame-8dc5a.firebasestorage.app",
                messagingSenderId: "97196037909",
                appId: "1:97196037909:web:284433a3bd2292ce8bbb1c"
            };

            // Dynamically import Firebase modules (no Auth needed!)
            const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
            const { getDatabase, ref, set, get } =
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
            this.firebaseFns = { ref, set, get };

            this.isInitialized = true;
            console.log('PlayerDataManager initialized with recovery code:', this.recoveryCode);

            // Sync with Firebase if we have progress
            await this.syncWithFirebase();

            return true;
        } catch (error) {
            console.error('Failed to initialize PlayerDataManager:', error);
            this.isInitialized = false;
            return false;
        }
    }

    // Generate a human-readable recovery code
    // Format: KITTY-XXXX-XXXX (no confusing characters like 0/O, 1/l/I)
    generateRecoveryCode() {
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // No 0,O,1,I,L
        let code = 'KITTY-';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        code += '-';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    // Get existing code or create a new one
    getOrCreateRecoveryCode() {
        let code = localStorage.getItem('helloKittyRecoveryCode');
        if (!code) {
            code = this.generateRecoveryCode();
            localStorage.setItem('helloKittyRecoveryCode', code);
        }
        return code;
    }

    // Get the recovery code (for display in settings)
    getRecoveryCode() {
        return this.recoveryCode;
    }

    // Convert recovery code to Firebase-safe path (replace dashes)
    codeToPath(code) {
        return code.replace(/-/g, '_');
    }

    // Restore account using a recovery code
    async restoreFromCode(code) {
        // Normalize code format
        code = code.toUpperCase().trim();
        console.log('[Firebase] Restore attempt with code:', code);

        // Validate format: KITTY-XXXX-XXXX
        const pattern = /^KITTY-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;
        if (!pattern.test(code)) {
            console.log('[Firebase] Invalid code format');
            return { success: false, error: 'Invalid code format. Should be KITTY-XXXX-XXXX' };
        }

        if (!this.isInitialized || !this.db) {
            console.log('[Firebase] Not initialized for restore');
            return { success: false, error: 'Not connected to server. Try again later.' };
        }

        try {
            const { ref, get } = this.firebaseFns;
            const codePath = this.codeToPath(code);
            console.log('[Firebase] Looking up path:', `players/${codePath}`);
            const userRef = ref(this.db, `players/${codePath}`);

            const snapshot = await get(userRef);
            console.log('[Firebase] Snapshot exists:', snapshot.exists());

            if (!snapshot.exists()) {
                return { success: false, error: 'No account found with this code.' };
            }

            const remoteData = snapshot.val();

            // Merge data (take the best of both)
            this.data.totalCoins = Math.max(this.data.totalCoins, remoteData.totalCoins || 0);
            this.data.bestMilestones = Math.max(this.data.bestMilestones || 0, remoteData.bestMilestones || 0);

            // Merge unlocked items
            const remoteUnlocked = remoteData.unlockedItems || [];
            const allUnlocked = new Set([...this.data.unlockedItems, ...remoteUnlocked]);
            this.data.unlockedItems = Array.from(allUnlocked);

            // Use remote equipped items if available
            if (remoteData.equippedItems) {
                if (this.data.unlockedItems.includes(remoteData.equippedItems.shirt)) {
                    this.data.equippedItems.shirt = remoteData.equippedItems.shirt;
                }
                if (this.data.unlockedItems.includes(remoteData.equippedItems.overalls)) {
                    this.data.equippedItems.overalls = remoteData.equippedItems.overalls;
                }
                if (this.data.unlockedItems.includes(remoteData.equippedItems.bow)) {
                    this.data.equippedItems.bow = remoteData.equippedItems.bow;
                }
            }

            // Switch to the restored recovery code
            this.recoveryCode = code;
            localStorage.setItem('helloKittyRecoveryCode', code);
            this.hasProgress = true;

            // Save merged data
            this.saveLocalData();
            await this.saveToFirebaseImmediate();
            this.notifyListeners();

            return {
                success: true,
                coins: this.data.totalCoins,
                items: this.data.unlockedItems.length
            };
        } catch (error) {
            console.error('Restore failed:', error);
            return { success: false, error: 'Failed to restore. Try again later.' };
        }
    }

    // Check if player has made progress worth saving
    checkHasProgress() {
        const defaults = this.getDefaultData();
        // Has progress if coins > 0, milestones > 0, or has more items than default
        this.hasProgress = this.data.totalCoins > 0 ||
            (this.data.bestMilestones || 0) > 0 ||
            this.data.unlockedItems.length > defaults.unlockedItems.length;
        return this.hasProgress;
    }

    // Load data from localStorage
    loadLocalData() {
        try {
            const saved = localStorage.getItem('helloKittyPlayerData');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Merge with defaults to ensure all fields exist
                this.data = { ...this.getDefaultData(), ...parsed };
                // Merge equipped items to ensure bow slot exists
                this.data.equippedItems = {
                    ...this.getDefaultData().equippedItems,
                    ...this.data.equippedItems
                };
                // Ensure all free items are always unlocked
                const freeItems = ['yellow_shirt', 'blue_overalls', 'red_bow', 'none_shirt', 'none_overalls'];
                for (const item of freeItems) {
                    if (!this.data.unlockedItems.includes(item)) {
                        this.data.unlockedItems.push(item);
                    }
                }
                this.checkHasProgress();
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
        if (!this.isInitialized || !this.db || !this.recoveryCode) return;

        // Only sync if player has progress (prevents database flooding)
        if (!this.checkHasProgress()) {
            console.log('No progress to sync yet');
            return;
        }

        try {
            const { ref, get, set } = this.firebaseFns;
            const codePath = this.codeToPath(this.recoveryCode);
            const userRef = ref(this.db, `players/${codePath}`);

            const snapshot = await get(userRef);

            if (snapshot.exists()) {
                const remoteData = snapshot.val();
                // Merge: take the higher values, union of unlocked items
                this.data.totalCoins = Math.max(this.data.totalCoins, remoteData.totalCoins || 0);
                this.data.bestMilestones = Math.max(this.data.bestMilestones || 0, remoteData.bestMilestones || 0);

                // Merge unlocked items (union)
                const remoteUnlocked = remoteData.unlockedItems || [];
                const allUnlocked = new Set([...this.data.unlockedItems, ...remoteUnlocked]);
                this.data.unlockedItems = Array.from(allUnlocked);

                // Use remote equipped items if available
                if (remoteData.equippedItems) {
                    if (this.data.unlockedItems.includes(remoteData.equippedItems.shirt)) {
                        this.data.equippedItems.shirt = remoteData.equippedItems.shirt;
                    }
                    if (this.data.unlockedItems.includes(remoteData.equippedItems.overalls)) {
                        this.data.equippedItems.overalls = remoteData.equippedItems.overalls;
                    }
                    if (this.data.unlockedItems.includes(remoteData.equippedItems.bow)) {
                        this.data.equippedItems.bow = remoteData.equippedItems.bow;
                    }
                }
            }

            this.data.lastUpdated = Date.now();

            // Save merged data back to Firebase and locally
            await set(userRef, this.data);
            this.saveLocalData();
            this.notifyListeners();

        } catch (error) {
            console.error('Firebase sync error:', error);
        }
    }

    // Save data to Firebase immediately
    async saveToFirebaseImmediate() {
        // Only save if player has progress
        if (!this.checkHasProgress()) {
            console.log('[Firebase] Skipping save - no progress yet');
            this.saveLocalData();
            return;
        }

        if (!this.isInitialized || !this.db || !this.recoveryCode) {
            console.log('[Firebase] Skipping save - not initialized', { isInitialized: this.isInitialized, hasDb: !!this.db, code: this.recoveryCode });
            this.saveLocalData();
            return;
        }

        try {
            const { ref, set } = this.firebaseFns;
            const codePath = this.codeToPath(this.recoveryCode);
            const userRef = ref(this.db, `players/${codePath}`);
            this.data.lastUpdated = Date.now();
            console.log('[Firebase] Saving to path:', `players/${codePath}`, 'data:', this.data);
            await set(userRef, this.data);
            console.log('[Firebase] Save successful!');
            this.saveLocalData();
        } catch (error) {
            console.error('[Firebase] Failed to save:', error);
            this.saveLocalData();
        }
    }

    // Save data to Firebase (debounced)
    async saveToFirebase() {
        // Only save if player has progress
        if (!this.checkHasProgress()) {
            console.log('[Firebase] Debounced save skipped - no progress');
            this.saveLocalData();
            return;
        }

        if (!this.isInitialized || !this.db || !this.recoveryCode) {
            console.log('[Firebase] Debounced save skipped - not initialized');
            this.saveLocalData();
            return;
        }

        // Debounce Firebase writes
        if (this.syncPending) return;
        this.syncPending = true;

        setTimeout(async () => {
            try {
                const { ref, set } = this.firebaseFns;
                const codePath = this.codeToPath(this.recoveryCode);
                const userRef = ref(this.db, `players/${codePath}`);
                this.data.lastUpdated = Date.now();
                console.log('[Firebase] Debounced save to:', `players/${codePath}`);
                await set(userRef, this.data);
                console.log('[Firebase] Debounced save successful!');
                this.saveLocalData();
            } catch (error) {
                console.error('[Firebase] Debounced save failed:', error);
                this.saveLocalData();
            }
            this.syncPending = false;
        }, 1000); // 1 second debounce
    }

    // Add coins to total (called at end of each game session)
    addCoins(amount) {
        if (amount <= 0) return;
        this.data.totalCoins += Math.floor(amount);
        this.hasProgress = true;
        this.saveToFirebase();
        this.notifyListeners();
    }

    // Get total lifetime coins
    getTotalCoins() {
        return this.data.totalCoins;
    }

    // Get best milestones (synced across devices)
    getBestMilestones() {
        return this.data.bestMilestones || 0;
    }

    // Update best milestones if new value is higher
    updateBestMilestones(count) {
        if (count > (this.data.bestMilestones || 0)) {
            this.data.bestMilestones = count;
            this.hasProgress = true;
            this.saveToFirebase();
            this.notifyListeners();
            return true;
        }
        return false;
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
            this.hasProgress = true;
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
        if (!['shirt', 'overalls', 'bow'].includes(slot)) {
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
