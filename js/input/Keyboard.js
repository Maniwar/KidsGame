import { KEYS } from '../utils/Constants.js';

export class KeyboardController {
    constructor() {
        this.keys = new Set();
        this.justPressed = new Set();

        // Store bound handlers for cleanup
        this.boundKeyDown = this.handleKeyDown.bind(this);
        this.boundKeyUp = this.handleKeyUp.bind(this);

        this.setupEventListeners();
    }

    handleKeyDown(e) {
        // Don't capture keys if user is typing in an input field
        if (this.isTypingInInput()) {
            return;
        }

        // Prevent default behavior for game keys (like space scrolling the page)
        if (this.isGameKey(e.code)) {
            e.preventDefault();
        }

        // Only add to justPressed if it wasn't already pressed (prevents repeat while holding)
        if (!this.keys.has(e.code)) {
            this.justPressed.add(e.code);
        }
        this.keys.add(e.code);
    }

    handleKeyUp(e) {
        // Don't capture keys if user is typing in an input field
        if (this.isTypingInInput()) {
            return;
        }
        this.keys.delete(e.code);
        this.justPressed.delete(e.code);
    }

    setupEventListeners() {
        window.addEventListener('keydown', this.boundKeyDown);
        window.addEventListener('keyup', this.boundKeyUp);
    }

    destroy() {
        window.removeEventListener('keydown', this.boundKeyDown);
        window.removeEventListener('keyup', this.boundKeyUp);
        this.keys.clear();
        this.justPressed.clear();
    }

    update() {
        // Clear justPressed at the end of each frame
        this.justPressed.clear();
    }

    isTypingInInput() {
        const activeElement = document.activeElement;
        return activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA'
        );
    }

    isGameKey(code) {
        return [...KEYS.LEFT, ...KEYS.RIGHT, ...KEYS.JUMP, ...KEYS.SLIDE].includes(code);
    }

    isPressed(keyGroup) {
        return keyGroup.some(key => this.keys.has(key));
    }

    isJustPressed(keyGroup) {
        return keyGroup.some(key => this.justPressed.has(key));
    }

    isLeftPressed() {
        return this.isPressed(KEYS.LEFT);
    }

    isRightPressed() {
        return this.isPressed(KEYS.RIGHT);
    }

    isJumpPressed() {
        return this.isPressed(KEYS.JUMP);
    }

    isJumpJustPressed() {
        return this.isJustPressed(KEYS.JUMP);
    }

    isSlidePressed() {
        return this.isPressed(KEYS.SLIDE);
    }

    isSlideJustPressed() {
        return this.isJustPressed(KEYS.SLIDE);
    }

    reset() {
        this.keys.clear();
        this.justPressed.clear();
    }
}
