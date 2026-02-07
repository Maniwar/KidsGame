export class TouchController {
    constructor() {
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;

        this.swipeThreshold = 30; // Minimum distance for a swipe (responsive)
        this.tapThreshold = 10; // Maximum movement for a tap

        // Hold-to-move support
        this.isHolding = false;
        this.holdStartX = 0;
        this.holdStartY = 0;
        this.currentTouchX = 0;
        this.currentTouchY = 0;
        this.lastHoldMoveTime = 0;
        this.holdMoveInterval = 130; // Trigger move every 130ms while holding (snappy)
        this.holdMoveThreshold = 25; // Minimum horizontal distance from start to trigger hold-move
        this.holdUpdateId = null;

        this.onSwipeLeft = null;
        this.onSwipeRight = null;
        this.onSwipeUp = null;
        this.onSwipeDown = null;
        this.onTap = null;
        this.onHoldLeft = null;
        this.onHoldRight = null;

        // Store bound handlers for cleanup
        this.boundTouchStart = this.handleTouchStart.bind(this);
        this.boundTouchEnd = this.handleTouchEnd.bind(this);
        this.boundTouchMove = this.handleTouchMove.bind(this);
        this.canvas = null;

        this.setupEventListeners();
    }

    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;

        // Initialize hold tracking
        this.isHolding = true;
        this.holdStartX = touch.clientX;
        this.holdStartY = touch.clientY;
        this.currentTouchX = touch.clientX;
        this.currentTouchY = touch.clientY;
        this.lastHoldMoveTime = performance.now();

        // Start hold update loop
        this.startHoldUpdate();
    }

    handleTouchEnd(e) {
        e.preventDefault();
        const touch = e.changedTouches[0];
        this.touchEndX = touch.clientX;
        this.touchEndY = touch.clientY;

        // Stop hold tracking
        this.isHolding = false;
        this.stopHoldUpdate();

        this.handleSwipe();
    }

    handleTouchMove(e) {
        e.preventDefault();
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            this.currentTouchX = touch.clientX;
            this.currentTouchY = touch.clientY;
        }
    }

    setupEventListeners() {
        this.canvas = document.getElementById('game-canvas');

        this.canvas.addEventListener('touchstart', this.boundTouchStart, { passive: false });
        this.canvas.addEventListener('touchend', this.boundTouchEnd, { passive: false });
        this.canvas.addEventListener('touchmove', this.boundTouchMove, { passive: false });
    }

    destroy() {
        this.stopHoldUpdate();
        if (this.canvas) {
            this.canvas.removeEventListener('touchstart', this.boundTouchStart);
            this.canvas.removeEventListener('touchend', this.boundTouchEnd);
            this.canvas.removeEventListener('touchmove', this.boundTouchMove);
        }
        this.onSwipeLeft = null;
        this.onSwipeRight = null;
        this.onSwipeUp = null;
        this.onSwipeDown = null;
        this.onTap = null;
        this.onHoldLeft = null;
        this.onHoldRight = null;
    }

    startHoldUpdate() {
        // Clear any existing update loop
        this.stopHoldUpdate();

        const update = () => {
            if (!this.isHolding) return;

            const now = performance.now();
            const deltaX = this.currentTouchX - this.holdStartX;
            const deltaY = this.currentTouchY - this.holdStartY;
            const absDeltaX = Math.abs(deltaX);
            const absDeltaY = Math.abs(deltaY);

            // Only trigger if mostly horizontal movement and past threshold
            if (absDeltaX > this.holdMoveThreshold && absDeltaX > absDeltaY) {
                if (now - this.lastHoldMoveTime >= this.holdMoveInterval) {
                    if (deltaX < 0 && this.onHoldLeft) {
                        this.onHoldLeft();
                    } else if (deltaX > 0 && this.onHoldRight) {
                        this.onHoldRight();
                    }
                    this.lastHoldMoveTime = now;
                }
            }

            this.holdUpdateId = requestAnimationFrame(update);
        };

        this.holdUpdateId = requestAnimationFrame(update);
    }

    stopHoldUpdate() {
        if (this.holdUpdateId) {
            cancelAnimationFrame(this.holdUpdateId);
            this.holdUpdateId = null;
        }
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

    setHoldLeftCallback(callback) {
        this.onHoldLeft = callback;
    }

    setHoldRightCallback(callback) {
        this.onHoldRight = callback;
    }
}
