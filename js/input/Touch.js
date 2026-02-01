export class TouchController {
    constructor() {
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;

        this.swipeThreshold = 50; // Minimum distance for a swipe
        this.tapThreshold = 10; // Maximum movement for a tap

        this.onSwipeLeft = null;
        this.onSwipeRight = null;
        this.onSwipeUp = null;
        this.onSwipeDown = null;
        this.onTap = null;

        this.setupEventListeners();
    }

    setupEventListeners() {
        const canvas = document.getElementById('game-canvas');

        // Touch start
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
        }, { passive: false });

        // Touch end - detect swipe direction
        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            this.touchEndX = touch.clientX;
            this.touchEndY = touch.clientY;

            this.handleSwipe();
        }, { passive: false });

        // Prevent touch move from scrolling
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
    }

    handleSwipe() {
        const deltaX = this.touchEndX - this.touchStartX;
        const deltaY = this.touchEndY - this.touchStartY;

        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        // Check if it's a tap (minimal movement)
        if (absDeltaX < this.tapThreshold && absDeltaY < this.tapThreshold) {
            if (this.onTap) {
                this.onTap(this.touchEndX, this.touchEndY);
            }
            return;
        }

        // Horizontal swipe (more horizontal than vertical)
        if (absDeltaX > absDeltaY && absDeltaX > this.swipeThreshold) {
            if (deltaX > 0) {
                // Swipe right
                if (this.onSwipeRight) this.onSwipeRight();
            } else {
                // Swipe left
                if (this.onSwipeLeft) this.onSwipeLeft();
            }
        }
        // Vertical swipe (more vertical than horizontal)
        else if (absDeltaY > absDeltaX && absDeltaY > this.swipeThreshold) {
            if (deltaY > 0) {
                // Swipe down
                if (this.onSwipeDown) this.onSwipeDown();
            } else {
                // Swipe up
                if (this.onSwipeUp) this.onSwipeUp();
            }
        }
    }

    // Helper methods to set callbacks
    setSwipeLeftCallback(callback) {
        this.onSwipeLeft = callback;
    }

    setSwipeRightCallback(callback) {
        this.onSwipeRight = callback;
    }

    setSwipeUpCallback(callback) {
        this.onSwipeUp = callback;
    }

    setSwipeDownCallback(callback) {
        this.onSwipeDown = callback;
    }

    setTapCallback(callback) {
        this.onTap = callback;
    }
}
