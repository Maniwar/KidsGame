// Firebase Leaderboard Manager
// Handles global leaderboard storage and retrieval using Firebase Realtime Database

export class LeaderboardManager {
    constructor() {
        this.db = null;
        this.isInitialized = false;
        this.localScores = this.loadLocalScores(); // Fallback cache
        this.listeners = [];
    }

    async init() {
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

            // Dynamically import Firebase modules
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
            const { getDatabase, ref, push, query, orderByChild, limitToLast, onValue, get } =
                await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js');

            // Initialize Firebase
            const app = initializeApp(firebaseConfig);
            this.db = getDatabase(app);

            // Store references to Firebase functions
            this.firebaseFns = { ref, push, query, orderByChild, limitToLast, onValue, get };

            this.isInitialized = true;
            console.log('Firebase Leaderboard initialized successfully');

            return true;
        } catch (error) {
            console.error('Failed to initialize Firebase:', error);
            this.isInitialized = false;
            return false;
        }
    }

    // Load local scores as fallback
    loadLocalScores() {
        try {
            const saved = localStorage.getItem('helloKittyHighScores');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    }

    // Save to local storage as backup
    saveLocalScores(scores) {
        try {
            localStorage.setItem('helloKittyHighScores', JSON.stringify(scores));
        } catch (e) {
            console.warn('Could not save to localStorage:', e);
        }
    }

    // Submit a new score to Firebase
    async submitScore(initials, score, distance, coins, candies) {
        const scoreData = {
            initials: initials.toUpperCase(),
            score: Math.floor(score),
            distance: Math.floor(distance),
            coins: coins,
            candies: candies,
            timestamp: Date.now()
        };

        // Always save locally first
        this.localScores.push(scoreData);
        this.localScores.sort((a, b) => b.score - a.score);
        this.localScores = this.localScores.slice(0, 10);
        this.saveLocalScores(this.localScores);

        if (!this.isInitialized || !this.db) {
            console.warn('Firebase not initialized, score saved locally only');
            return { success: true, local: true };
        }

        try {
            const { ref, push } = this.firebaseFns;
            const scoresRef = ref(this.db, 'leaderboard');
            await push(scoresRef, scoreData);
            console.log('Score submitted to Firebase');
            return { success: true, local: false };
        } catch (error) {
            console.error('Failed to submit score to Firebase:', error);
            return { success: true, local: true, error };
        }
    }

    // Get top scores from Firebase
    async getTopScores(limit = 10) {
        if (!this.isInitialized || !this.db) {
            console.warn('Firebase not initialized, returning local scores');
            return this.localScores.slice(0, limit);
        }

        try {
            const { ref, query, orderByChild, limitToLast, get } = this.firebaseFns;
            const scoresRef = ref(this.db, 'leaderboard');
            const topScoresQuery = query(scoresRef, orderByChild('score'), limitToLast(limit));

            const snapshot = await get(topScoresQuery);

            if (!snapshot.exists()) {
                return this.localScores.slice(0, limit);
            }

            const scores = [];
            snapshot.forEach((child) => {
                scores.push({
                    id: child.key,
                    ...child.val()
                });
            });

            // Sort descending (limitToLast gives ascending order)
            scores.sort((a, b) => b.score - a.score);

            // Update local cache
            this.localScores = scores.slice(0, 10);
            this.saveLocalScores(this.localScores);

            return scores;
        } catch (error) {
            console.error('Failed to fetch scores from Firebase:', error);
            return this.localScores.slice(0, limit);
        }
    }

    // Check if score qualifies for top 10
    async checkHighScore(score) {
        const topScores = await this.getTopScores(10);

        if (topScores.length < 10) return true;

        const lowestTopScore = topScores[topScores.length - 1].score;
        return score > lowestTopScore;
    }

    // Subscribe to real-time leaderboard updates
    subscribeToLeaderboard(callback, limit = 10) {
        if (!this.isInitialized || !this.db) {
            console.warn('Firebase not initialized, cannot subscribe');
            callback(this.localScores.slice(0, limit));
            return () => {};
        }

        try {
            const { ref, query, orderByChild, limitToLast, onValue } = this.firebaseFns;
            const scoresRef = ref(this.db, 'leaderboard');
            const topScoresQuery = query(scoresRef, orderByChild('score'), limitToLast(limit));

            const unsubscribe = onValue(topScoresQuery, (snapshot) => {
                const scores = [];
                snapshot.forEach((child) => {
                    scores.push({
                        id: child.key,
                        ...child.val()
                    });
                });

                // Sort descending
                scores.sort((a, b) => b.score - a.score);

                // Update local cache
                this.localScores = scores.slice(0, 10);
                this.saveLocalScores(this.localScores);

                callback(scores);
            }, (error) => {
                console.error('Leaderboard subscription error:', error);
                callback(this.localScores.slice(0, limit));
            });

            return unsubscribe;
        } catch (error) {
            console.error('Failed to subscribe to leaderboard:', error);
            callback(this.localScores.slice(0, limit));
            return () => {};
        }
    }
}
