export class AudioManager {
    constructor() {
        this.context = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.isInitialized = false;

        // Music system
        this.isMusicPlaying = false;
        this.musicScheduler = null;
        this.schedulerInterval = null;
        this.currentBeat = 0;
        this.tempo = 128; // BPM - upbeat but not too fast
        this.beatDuration = 60 / this.tempo; // seconds per beat

        // Settings
        this.musicVolume = 0.15; // Lower volume for less distraction
        this.sfxVolume = 0.5;
        this.musicEnabled = true;

        // Music theory - Key of C Major
        this.key = 'C';
        this.scale = 'major';

        // Note frequencies (equal temperament tuning)
        this.noteFrequencies = {
            'C2': 65.41, 'D2': 73.42, 'E2': 82.41, 'F2': 87.31, 'G2': 98.00, 'A2': 110.00, 'B2': 123.47,
            'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
            'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
            'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
            'C6': 1046.50, 'D6': 1174.66, 'E6': 1318.51, 'F6': 1396.91, 'G6': 1567.98
        };

        // Chord progression: I - V - vi - IV (C - G - Am - F)
        // This is THE most popular progression in pop music - uplifting and catchy
        this.chordProgression = [
            { root: 'C4', notes: ['C4', 'E4', 'G4'], name: 'C', roman: 'I' },    // Tonic - home
            { root: 'G3', notes: ['G3', 'B3', 'D4'], name: 'G', roman: 'V' },    // Dominant - tension
            { root: 'A3', notes: ['A3', 'C4', 'E4'], name: 'Am', roman: 'vi' },  // Relative minor - emotion
            { root: 'F3', notes: ['F3', 'A3', 'C4'], name: 'F', roman: 'IV' }    // Subdominant - movement
        ];

        // C Major Pentatonic scale (no semitones - perfect for melodies)
        // Removes F and B from C major scale to avoid dissonance
        this.pentatonicScale = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6'];

        // Song structure (in beats, 4/4 time)
        this.songStructure = {
            intro: 8,      // 2 bars
            verseA: 16,    // 4 bars - establish melody
            verseB: 16,    // 4 bars - develop melody
            chorus: 16,    // 4 bars - catchy hook
            bridge: 8,     // 2 bars - variation
            outro: 8       // 2 bars - resolve to tonic
        };

        // Procedural melody generation (replaces hard-coded patterns)
        this.melodyCache = {}; // Cache generated melodies
        this.lastNote = 0; // Track last note for smooth transitions
        this.sectionSeed = {}; // Seed for consistent regeneration per section

        // Rhythm patterns (1 = play, 0 = rest)
        this.rhythmPatterns = {
            kick:  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],  // Four-on-the-floor
            snare: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],  // Backbeat
            hihat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]   // Sixteenth notes
        };
    }

    init() {
        if (!this.isInitialized) {
            this.context = new (window.AudioContext || window.webkitAudioContext)();

            // Create gain nodes
            this.masterGain = this.context.createGain();
            this.masterGain.connect(this.context.destination);

            this.musicGain = this.context.createGain();
            this.musicGain.gain.value = this.musicVolume;
            this.musicGain.connect(this.masterGain);

            this.sfxGain = this.context.createGain();
            this.sfxGain.gain.value = this.sfxVolume;
            this.sfxGain.connect(this.masterGain);

            this.isInitialized = true;
        }
    }

    playBackgroundMusic() {
        if (!this.isInitialized || this.isMusicPlaying || !this.musicEnabled) return;

        this.isMusicPlaying = true;
        this.currentBeat = 0;
        this.nextBeatTime = this.context.currentTime;

        // Start the music scheduler - checks frequently but only schedules when needed
        this.schedulerInterval = setInterval(() => {
            this.scheduleMusic();
        }, 25); // Check every 25ms for smooth scheduling
    }

    scheduleMusic() {
        if (!this.isMusicPlaying) return;

        const scheduleAheadTime = 0.2; // Schedule 200ms ahead
        const currentTime = this.context.currentTime;

        // Schedule all beats that should happen in the next 200ms
        while (this.nextBeatTime < currentTime + scheduleAheadTime) {
            this.scheduleBeat(this.nextBeatTime);

            // Advance to next beat
            this.nextBeatTime += this.beatDuration;
            this.currentBeat++;

            // Loop back to start after song ends
            const totalBeats = Object.values(this.songStructure).reduce((a, b) => a + b, 0);
            if (this.currentBeat >= totalBeats) {
                this.currentBeat = 0;
            }
        }
    }

    scheduleBeat(beatTime) {
        // Determine which section we're in
        let section = 'intro';
        let sectionBeat = this.currentBeat;
        let totalBeats = 0;

        for (const [sectionName, duration] of Object.entries(this.songStructure)) {
            if (this.currentBeat < totalBeats + duration) {
                section = sectionName;
                sectionBeat = this.currentBeat - totalBeats;
                break;
            }
            totalBeats += duration;
        }

        // Get current chord (changes every 4 beats)
        const chordIndex = Math.floor((this.currentBeat % 16) / 4);
        const currentChord = this.chordProgression[chordIndex];

        // Play melody (skip first 4 beats of intro for gradual entrance)
        if (section !== 'intro' || this.currentBeat >= 4) {
            this.playMelodyNote(section, sectionBeat, beatTime);
        }

        // Play chord arpeggio (except in intro)
        if (section !== 'intro') {
            this.playChordArpeggio(currentChord, sectionBeat, beatTime);
        }

        // Play bass note (on beats 1 and 3 of each bar)
        if (this.currentBeat % 2 === 0) {
            this.playBassNote(currentChord.root, beatTime);
        }

        // Play percussion (except in intro and outro)
        if (section !== 'intro' && section !== 'outro') {
            this.playPercussion(sectionBeat % 16, beatTime);
        }
    }

    // === Procedural Melody Generation ===

    generateMelody(section, length, chordIndex) {
        // Generate a musically coherent melody for the given section
        const melody = [];
        let currentNote = this.lastNote || 0; // Start from last note or root

        // Get current chord tones mapped to pentatonic scale indices
        const chordTones = this.getChordTonesInPentatonic(chordIndex);

        // Different melodic contour shapes for different sections
        const contour = this.getContourForSection(section);

        for (let i = 0; i < length; i++) {
            // Emphasize chord tones on strong beats (downbeats and endings)
            const emphasizeChord = (i % 4 === 0) || (i === length - 1);

            // Generate next note based on music theory rules
            const nextNote = this.generateNextNote(
                currentNote,
                chordTones,
                emphasizeChord,
                contour,
                i / length // Progress through section (0 to 1)
            );

            melody.push(nextNote);
            currentNote = nextNote;
        }

        this.lastNote = currentNote; // Remember for smooth transitions
        return melody;
    }

    getChordTonesInPentatonic(chordIndex) {
        // Map chord notes to pentatonic scale indices
        const chord = this.chordProgression[chordIndex];
        const chordTones = [];

        // For each chord note, find matching notes in pentatonic scale
        chord.notes.forEach(noteName => {
            const pitchClass = noteName[0]; // Extract pitch class (C, D, E, etc.)

            // Find matching notes in pentatonic scale
            this.pentatonicScale.forEach((pentatonicNote, index) => {
                if (pentatonicNote[0] === pitchClass) {
                    chordTones.push(index);
                }
            });
        });

        return chordTones;
    }

    getContourForSection(section) {
        // Different melodic shapes create variety and structure
        const contours = {
            intro: 'gentle',      // Small movements, calm opening
            verseA: 'ascending',  // Rising energy, building up
            verseB: 'arch',       // Peak in middle, dramatic
            chorus: 'wave',       // Up and down, catchy and memorable
            bridge: 'descending', // Wind down, prepare for resolution
            outro: 'settling'     // Return to root, peaceful ending
        };

        return contours[section] || 'wave';
    }

    generateNextNote(currentNote, chordTones, emphasizeChord, contour, progress) {
        const scaleLength = this.pentatonicScale.length;
        const candidates = [];

        // Prefer stepwise motion for smoother, more singable melodies
        const maxJump = emphasizeChord ? 3 : 2;

        for (let step = -maxJump; step <= maxJump; step++) {
            const candidate = currentNote + step;

            // Stay within scale bounds
            if (candidate >= 0 && candidate < scaleLength) {
                let weight = 1.0;

                // Prefer stepwise motion (±1 step gets higher weight)
                if (Math.abs(step) === 1) weight *= 2.0;

                // Emphasize chord tones on strong beats for harmonic coherence
                if (emphasizeChord && chordTones.includes(candidate)) {
                    weight *= 3.0;
                }

                // Apply contour bias to shape the melody
                weight *= this.getContourWeight(step, contour, progress);

                // Avoid staying on same note (creates static melody)
                if (step === 0) weight *= 0.3;

                candidates.push({ note: candidate, weight });
            }
        }

        // Weighted random selection for musical variation
        return this.weightedRandom(candidates);
    }

    getContourWeight(step, contour, progress) {
        // Bias note selection based on desired melodic contour
        switch (contour) {
            case 'ascending':
                // Prefer upward motion throughout
                return step > 0 ? 1.5 : 1.0;

            case 'descending':
                // Prefer downward motion throughout
                return step < 0 ? 1.5 : 1.0;

            case 'arch':
                // Go up in first half, down in second half
                return progress < 0.5
                    ? (step > 0 ? 1.5 : 1.0)
                    : (step < 0 ? 1.5 : 1.0);

            case 'wave':
                // Alternating up/down creates memorable, catchy patterns
                const phase = progress * 4; // 4 waves per section
                return Math.sin(phase * Math.PI) > 0
                    ? (step > 0 ? 1.3 : 1.0)
                    : (step < 0 ? 1.3 : 1.0);

            case 'gentle':
                // Prefer small movements, calm and peaceful
                return Math.abs(step) <= 1 ? 1.5 : 0.8;

            case 'settling':
                // Move toward root (index 0) for resolution
                const distanceFromRoot = Math.abs(step);
                return step < 0 ? 1.3 : 1.0;

            default:
                return 1.0;
        }
    }

    weightedRandom(candidates) {
        // Select from candidates based on their weights
        const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
        let random = Math.random() * totalWeight;

        for (const candidate of candidates) {
            random -= candidate.weight;
            if (random <= 0) {
                return candidate.note;
            }
        }

        // Fallback to last candidate
        return candidates[candidates.length - 1].note;
    }

    // === Music Playback ===

    playMelodyNote(section, beat, time) {
        // Determine current chord for harmonic context
        const chordIndex = Math.floor((this.currentBeat % 16) / 4);

        // Generate unique cache key (section + chord)
        const cacheKey = `${section}_${chordIndex}`;

        // Generate new melody if not cached
        if (!this.melodyCache[cacheKey]) {
            const sectionLength = this.songStructure[section];
            this.melodyCache[cacheKey] = this.generateMelody(section, sectionLength, chordIndex);
        }

        // Get the procedurally generated melody
        const pattern = this.melodyCache[cacheKey];
        const noteIndex = beat % pattern.length;
        const scaleIndex = pattern[noteIndex];
        const note = this.pentatonicScale[scaleIndex];
        const freq = this.noteFrequencies[note];

        if (!freq) return;

        // Create oscillator for melody
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'triangle'; // Soft, pleasant tone
        osc.frequency.value = freq;

        // ADSR envelope for natural sound
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.08, time + 0.02);  // Attack
        gain.gain.linearRampToValueAtTime(0.06, time + 0.1);   // Decay
        gain.gain.setValueAtTime(0.06, time + this.beatDuration * 0.7); // Sustain
        gain.gain.linearRampToValueAtTime(0, time + this.beatDuration); // Release

        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + this.beatDuration);
    }

    playChordArpeggio(chord, beat, time) {
        // Play chord notes in sequence (arpeggio)
        const noteIndex = beat % chord.notes.length;
        const note = chord.notes[noteIndex];
        const freq = this.noteFrequencies[note];

        if (!freq) return;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'sine'; // Pure tone for harmony
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.03, time + 0.01);
        gain.gain.linearRampToValueAtTime(0.02, time + 0.05);
        gain.gain.linearRampToValueAtTime(0, time + this.beatDuration * 0.5);

        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + this.beatDuration * 0.5);
    }

    playBassNote(note, time) {
        const freq = this.noteFrequencies[note];
        if (!freq) return;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'sawtooth'; // Rich, warm bass tone
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.12, time + 0.01);
        gain.gain.linearRampToValueAtTime(0.08, time + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, time + this.beatDuration * 1.5);

        // Low-pass filter for warmth
        const filter = this.context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        filter.Q.value = 1;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + this.beatDuration * 2);
    }

    playPercussion(beat, time) {
        const beatIndex = beat % 16;

        // Kick drum
        if (this.rhythmPatterns.kick[beatIndex]) {
            this.playKick(time);
        }

        // Snare
        if (this.rhythmPatterns.snare[beatIndex]) {
            this.playSnare(time);
        }

        // Hi-hat (every other beat for subtlety)
        if (beatIndex % 2 === 0) {
            this.playHiHat(time);
        }
    }

    playKick(time) {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.1);

        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + 0.1);
    }

    playSnare(time) {
        // White noise for snare
        const noise = this.context.createBufferSource();
        const bufferSize = this.context.sampleRate * 0.1;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        noise.buffer = buffer;

        const filter = this.context.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1000;

        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        noise.start(time);
        noise.stop(time + 0.1);
    }

    playHiHat(time) {
        // High-frequency noise for hi-hat
        const noise = this.context.createBufferSource();
        const bufferSize = this.context.sampleRate * 0.05;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        noise.buffer = buffer;

        const filter = this.context.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 7000;

        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0.03, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        noise.start(time);
        noise.stop(time + 0.05);
    }

    stopBackgroundMusic() {
        this.isMusicPlaying = false;
        if (this.schedulerInterval) {
            clearInterval(this.schedulerInterval);
            this.schedulerInterval = null;
        }
        this.currentBeat = 0;
    }

    // === SFX Methods (keep existing) ===

    playCoinSound() {
        if (!this.isInitialized) return;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.frequency.value = 880; // A5
        osc.type = 'sine';

        gain.gain.setValueAtTime(0.3, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(this.context.currentTime);
        osc.stop(this.context.currentTime + 0.1);
    }

    playGemSound() {
        if (!this.isInitialized) return;

        const notes = [659.25, 783.99, 987.77]; // E5, G5, B5 - major triad
        const now = this.context.currentTime;

        notes.forEach((freq, index) => {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();

            osc.frequency.value = freq;
            osc.type = 'triangle';

            const startTime = now + index * 0.05;
            gain.gain.setValueAtTime(0.25, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(startTime);
            osc.stop(startTime + 0.3);
        });
    }

    playJumpSound() {
        if (!this.isInitialized) return;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.frequency.setValueAtTime(200, this.context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, this.context.currentTime + 0.1);
        osc.type = 'square';

        gain.gain.setValueAtTime(0.2, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(this.context.currentTime);
        osc.stop(this.context.currentTime + 0.15);
    }

    playSlideSound() {
        if (!this.isInitialized) return;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.frequency.setValueAtTime(400, this.context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, this.context.currentTime + 0.2);
        osc.type = 'sawtooth';

        gain.gain.setValueAtTime(0.15, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(this.context.currentTime);
        osc.stop(this.context.currentTime + 0.2);
    }

    playLaneChangeSound() {
        if (!this.isInitialized) return;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.frequency.value = 523.25; // C5
        osc.type = 'sine';

        gain.gain.setValueAtTime(0.1, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.08);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(this.context.currentTime);
        osc.stop(this.context.currentTime + 0.08);
    }

    playGameOverSound() {
        if (!this.isInitialized) return;

        const notes = [523.25, 493.88, 440.00, 392.00]; // C5-B4-A4-G4 descending
        const now = this.context.currentTime;

        notes.forEach((freq, index) => {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();

            osc.frequency.value = freq;
            osc.type = 'sine';

            const startTime = now + index * 0.15;
            gain.gain.setValueAtTime(0.2, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(startTime);
            osc.stop(startTime + 0.5);
        });
    }

    playMilestoneSound() {
        if (!this.isInitialized) return;

        // Fanfare: C-E-G-C (I chord arpeggio)
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4-E4-G4-C5
        const now = this.context.currentTime;

        notes.forEach((freq, index) => {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();

            osc.frequency.value = freq;
            osc.type = 'triangle';

            const startTime = now + index * 0.1;
            gain.gain.setValueAtTime(0.25, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(startTime);
            osc.stop(startTime + 0.5);
        });
    }

    playPowerUpSound() {
        if (!this.isInitialized) return;

        const notes = [392.00, 523.25, 659.25, 783.99, 1046.50]; // G-C-E-G-C
        const now = this.context.currentTime;

        notes.forEach((freq, index) => {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();

            osc.frequency.value = freq;
            osc.type = 'sine';

            const startTime = now + index * 0.05;
            gain.gain.setValueAtTime(0.25, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(startTime);
            osc.stop(startTime + 0.3);
        });
    }

    playShieldBreakSound() {
        if (!this.isInitialized) return;

        const noise = this.context.createBufferSource();
        const bufferSize = this.context.sampleRate * 0.3;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / bufferSize * 5);
        }

        noise.buffer = buffer;

        const filter = this.context.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1000;

        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0.3, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.3);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        noise.start(this.context.currentTime);
        noise.stop(this.context.currentTime + 0.3);
    }

    // Sweet candy collection sound - bubbly "pop" with sparkle
    playCandySound() {
        if (!this.isInitialized) return;

        const now = this.context.currentTime;

        // Main sweet "pop" - high frequency burst
        const pop = this.context.createOscillator();
        const popGain = this.context.createGain();

        pop.frequency.setValueAtTime(1200, now);
        pop.frequency.exponentialRampToValueAtTime(600, now + 0.08);
        pop.type = 'sine';

        popGain.gain.setValueAtTime(0.25, now);
        popGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        pop.connect(popGain);
        popGain.connect(this.sfxGain);

        pop.start(now);
        pop.stop(now + 0.1);

        // Sparkle overtone
        const sparkle = this.context.createOscillator();
        const sparkleGain = this.context.createGain();

        sparkle.frequency.value = 1800;
        sparkle.type = 'triangle';

        sparkleGain.gain.setValueAtTime(0.15, now + 0.02);
        sparkleGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        sparkle.connect(sparkleGain);
        sparkleGain.connect(this.sfxGain);

        sparkle.start(now + 0.02);
        sparkle.stop(now + 0.12);
    }

    // Sugar Rush activation - exciting whoosh with ascending fanfare
    playSugarRushSound() {
        if (!this.isInitialized) return;

        const now = this.context.currentTime;

        // Whoosh sweep
        const sweep = this.context.createOscillator();
        const sweepGain = this.context.createGain();

        sweep.frequency.setValueAtTime(200, now);
        sweep.frequency.exponentialRampToValueAtTime(2000, now + 0.3);
        sweep.type = 'sawtooth';

        sweepGain.gain.setValueAtTime(0.15, now);
        sweepGain.gain.linearRampToValueAtTime(0.25, now + 0.15);
        sweepGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

        // Filter for smooth sweep
        const sweepFilter = this.context.createBiquadFilter();
        sweepFilter.type = 'lowpass';
        sweepFilter.frequency.setValueAtTime(500, now);
        sweepFilter.frequency.exponentialRampToValueAtTime(4000, now + 0.3);

        sweep.connect(sweepFilter);
        sweepFilter.connect(sweepGain);
        sweepGain.connect(this.sfxGain);

        sweep.start(now);
        sweep.stop(now + 0.35);

        // Celebratory fanfare notes - C E G C E G C (ascending!)
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00];

        notes.forEach((freq, index) => {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();

            osc.frequency.value = freq;
            osc.type = 'triangle';

            const startTime = now + 0.1 + index * 0.04;
            gain.gain.setValueAtTime(0.2, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(startTime);
            osc.stop(startTime + 0.25);
        });
    }

    // Sugar Rush ending - gentle descending notes
    playSugarRushEndSound() {
        if (!this.isInitialized) return;

        const now = this.context.currentTime;

        // Gentle descending chime
        const notes = [783.99, 659.25, 523.25]; // G5-E5-C5

        notes.forEach((freq, index) => {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();

            osc.frequency.value = freq;
            osc.type = 'sine';

            const startTime = now + index * 0.12;
            gain.gain.setValueAtTime(0.2, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(startTime);
            osc.stop(startTime + 0.3);
        });
    }

    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.musicGain) {
            this.musicGain.gain.value = this.musicVolume;
        }
    }

    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        if (this.sfxGain) {
            this.sfxGain.gain.value = this.sfxVolume;
        }
    }
}
