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
        this.tempo = 144; // BPM - lively and fun from the start
        this.beatDuration = 60 / this.tempo; // seconds per beat

        // Settings
        this.musicVolume = 0.15; // Lower volume for less distraction
        this.sfxVolume = 0.5;
        this.musicEnabled = true;

        // Sugar Rush state (set by game via setSugarRushLevel)
        this.sugarRushLevel = 0;

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

        // Chord progression: Circle of Fifths - vi → ii → V → I (Am → Dm → G → C)
        // Classic circle of fifths progression - each chord root is a perfect fifth apart
        // This creates natural harmonic movement and satisfying resolution
        this.chordProgression = [
            { root: 'A3', notes: ['A3', 'C4', 'E4'], name: 'Am', roman: 'vi' },   // Relative minor - start
            { root: 'D3', notes: ['D3', 'F3', 'A3'], name: 'Dm', roman: 'ii' },   // Supertonic - fifth below Am
            { root: 'G3', notes: ['G3', 'B3', 'D4'], name: 'G', roman: 'V' },     // Dominant - fifth below Dm
            { root: 'C4', notes: ['C4', 'E4', 'G4'], name: 'C', roman: 'I' }      // Tonic - resolution (fifth below G)
        ];

        // Note duration patterns for musical variety (in beats)
        // Different sections use different rhythmic patterns
        this.rhythmDurations = {
            // Quarter notes (1 beat), half notes (2 beats), eighth notes (0.5 beats), whole notes (4 beats)
            standard: [1, 1, 1, 1],                    // Even quarter notes
            syncopated: [1.5, 0.5, 1, 1],              // Syncopated feel
            longShort: [1, 0.5, 0.5, 1],               // Bouncy pattern
            shortLong: [0.5, 0.5, 1, 2],               // Build to longer note
            waltz: [1.5, 0.5, 1],                      // Waltz-like emphasis
            driving: [0.5, 0.5, 0.5, 0.5, 1, 1]        // Energetic eighth notes
        };

        // Map sections to rhythm patterns
        this.sectionRhythms = {
            intro: 'standard',       // Get going right away
            verseA: 'standard',      // Steady, establishes groove
            verseB: 'syncopated',    // More interesting rhythm
            chorus: 'driving',       // Energetic, memorable
            bridge: 'longShort',     // Bouncy contrast
            outro: 'shortLong'       // Build to resolution
        };

        // Melody rest patterns per section (1 = play, 0 = rest)
        // Creates breathing room and musical phrasing
        this.melodyRestPatterns = {
            intro:  [1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1],  // Upbeat, gets player moving
            verseA: [1, 1, 1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1],  // Lively call-response
            verseB: [1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0, 1, 1],  // Flowing phrases
            chorus: [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1],  // Dense and catchy
            bridge: [1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0],  // Rhythmic contrast
            outro:  [1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0]   // Winding down
        };

        // Arpeggio rest patterns - fills gaps and adds harmonic sparkle
        this.arpeggioRestPatterns = {
            intro:  [0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0],  // Light sparkle from the start
            verseA: [0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0],  // Fills gaps where melody rests
            verseB: [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0],  // Alternates with melody
            chorus: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],  // Response to melody phrases
            bridge: [1, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1],  // Arpeggios carry the bridge
            outro:  [0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0]   // Sparse echoes
        };

        // Riff repetition: sections where the first 4-beat phrase repeats
        // This creates memorable, catchy motifs instead of endless new notes
        this.riffRepeatSections = new Set(['verseA', 'chorus']);

        // C Major Pentatonic scale (no semitones - perfect for melodies)
        // Removes F and B from C major scale to avoid dissonance
        this.pentatonicScale = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6'];

        // Song structure (in beats, 4/4 time)
        this.songStructure = {
            intro: 4,      // 1 bar - quick pickup
            verseA: 16,    // 4 bars - establish melody
            verseB: 16,    // 4 bars - develop melody
            chorus: 16,    // 4 bars - catchy hook
            bridge: 8,     // 2 bars - variation
            outro: 4       // 1 bar - resolve to tonic
        };

        // PERFORMANCE: Pre-compute total beats and beat→section lookup
        this.totalBeats = Object.values(this.songStructure).reduce((a, b) => a + b, 0);
        this._sectionLookup = [];
        for (const [name, duration] of Object.entries(this.songStructure)) {
            const start = this._sectionLookup.length > 0
                ? this._sectionLookup[this._sectionLookup.length - 1].end : 0;
            this._sectionLookup.push({ name, start, end: start + duration });
        }

        // Procedural melody generation (replaces hard-coded patterns)
        this.melodyCache = {}; // Cache generated melodies
        this.melodyCacheKeys = []; // Track insertion order for LRU eviction
        this.maxMelodyCacheSize = 50; // Limit cache size to prevent memory growth
        this.lastNote = 0; // Track last note for smooth transitions
        this.sectionSeed = {}; // Seed for consistent regeneration per section

        // Rhythm patterns (1 = play, 0 = rest)
        this.rhythmPatterns = {
            kick:  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],  // Four-on-the-floor
            snare: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],  // Backbeat
            hihat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]   // Sixteenth notes
        };

        // Sugar Rush percussion patterns - more energetic
        this.sugarRushPatterns = {
            // Level 1: add shaker/tambourine on every 8th note
            shaker: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
            // Level 2: add open hihat accents
            openHat: [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
            // Level 3: double-time kick
            doubleKick: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0]
        };

        // Pre-generated noise buffers (set in init)
        this._snareBuffer = null;
        this._hihatBuffer = null;

        // Stereo panners (set in init)
        this._melodyPanner = null;
        this._arpPanner = null;
        this._bassPanner = null;
        this._percPanner = null;
        this._unisonPanner = null;

        // Reverb send (set in init)
        this._reverbSend = null;
        this._reverbGain = null;

        // Dynamic filter on music bus (set in init)
        this._musicFilter = null;
        this._filterBaseFreq = 6000; // Bright from the start

        // Music ducking state
        this._duckTimeout = null;
    }

    init() {
        if (!this.isInitialized) {
            this.context = new (window.AudioContext || window.webkitAudioContext)();

            // Create gain nodes
            this.masterGain = this.context.createGain();
            this.masterGain.connect(this.context.destination);

            // Dynamic lowpass filter on music bus - opens up with game speed
            this._musicFilter = this.context.createBiquadFilter();
            this._musicFilter.type = 'lowpass';
            this._musicFilter.frequency.value = this._filterBaseFreq;
            this._musicFilter.Q.value = 0.7; // Gentle rolloff
            this._musicFilter.connect(this.masterGain);

            this.musicGain = this.context.createGain();
            this.musicGain.gain.value = this.musicVolume;
            this.musicGain.connect(this._musicFilter);

            this.sfxGain = this.context.createGain();
            this.sfxGain.gain.value = this.sfxVolume;
            this.sfxGain.connect(this.masterGain);

            // Stereo panners - spread voices across the stereo field
            this._melodyPanner = this.context.createStereoPanner();
            this._melodyPanner.pan.value = 0.15; // Slightly right
            this._melodyPanner.connect(this.musicGain);

            this._arpPanner = this.context.createStereoPanner();
            this._arpPanner.pan.value = -0.15; // Slightly left
            this._arpPanner.connect(this.musicGain);

            this._bassPanner = this.context.createStereoPanner();
            this._bassPanner.pan.value = 0.0; // Center (bass should stay centered)
            this._bassPanner.connect(this.musicGain);

            this._percPanner = this.context.createStereoPanner();
            this._percPanner.pan.value = 0.0; // Center
            this._percPanner.connect(this.musicGain);

            // Shared unison panner (opposite side from melody for stereo width)
            this._unisonPanner = this.context.createStereoPanner();
            this._unisonPanner.pan.value = -0.2;
            this._unisonPanner.connect(this.musicGain);

            // Reverb send bus - convolver with procedurally generated impulse response
            this._reverbGain = this.context.createGain();
            this._reverbGain.gain.value = 0.18; // Wet amount (~18%)
            this._reverbGain.connect(this.masterGain);

            const convolver = this.context.createConvolver();
            convolver.buffer = this._createReverbIR(0.8, 3.0); // 0.8s, fast decay
            convolver.connect(this._reverbGain);
            this._reverbSend = convolver;

            // Pre-generate noise buffers (reuse instead of creating per-hit)
            this._snareBuffer = this._createNoiseBuffer(0.1);
            this._hihatBuffer = this._createNoiseBuffer(0.05);

            this.isInitialized = true;
        }
    }

    // Generate a procedural reverb impulse response (exponentially decaying noise)
    _createReverbIR(duration, decay) {
        const rate = this.context.sampleRate;
        const length = Math.floor(rate * duration);
        const buffer = this.context.createBuffer(2, length, rate);
        const left = buffer.getChannelData(0);
        const right = buffer.getChannelData(1);

        for (let i = 0; i < length; i++) {
            const t = i / rate;
            const envelope = Math.exp(-t * decay);
            left[i] = (Math.random() * 2 - 1) * envelope;
            right[i] = (Math.random() * 2 - 1) * envelope;
        }

        return buffer;
    }

    // Pre-generate white noise buffer for percussion (avoids per-hit allocation)
    _createNoiseBuffer(durationSec) {
        const bufferSize = Math.floor(this.context.sampleRate * durationSec);
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        return buffer;
    }

    // Briefly duck music volume so SFX punch through clearly
    _duckMusic() {
        if (!this.musicGain || !this.isMusicPlaying) return;
        const now = this.context.currentTime;
        this.musicGain.gain.cancelScheduledValues(now);
        this.musicGain.gain.setValueAtTime(this.musicVolume * 0.55, now);
        this.musicGain.gain.linearRampToValueAtTime(this.musicVolume, now + 0.25);
    }

    playBackgroundMusic() {
        if (!this.isInitialized || this.isMusicPlaying || !this.musicEnabled) return;

        // MEMORY: Clear any lingering scheduler from previous session (race with fade-out timeout)
        if (this.schedulerInterval) {
            clearInterval(this.schedulerInterval);
            this.schedulerInterval = null;
        }

        this.isMusicPlaying = true;
        this.currentBeat = 0;
        this.nextBeatTime = this.context.currentTime;

        // Quick fade in - get the music going fast
        this.musicGain.gain.setValueAtTime(0, this.context.currentTime);
        this.musicGain.gain.linearRampToValueAtTime(this.musicVolume, this.context.currentTime + 0.3);

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
            if (this.currentBeat >= this.totalBeats) {
                this.currentBeat = 0;
                // Clear melody cache so next cycle generates fresh melodies
                this.melodyCache = {};
                this.melodyCacheKeys = [];
            }
        }
    }

    scheduleBeat(beatTime) {
        // PERFORMANCE: Use pre-computed lookup instead of Object.entries() per beat
        let section = 'intro';
        let sectionBeat = this.currentBeat;

        for (let i = 0; i < this._sectionLookup.length; i++) {
            const s = this._sectionLookup[i];
            if (this.currentBeat < s.end) {
                section = s.name;
                sectionBeat = this.currentBeat - s.start;
                break;
            }
        }

        // Get current chord (changes every 4 beats)
        const chordIndex = Math.floor((this.currentBeat % 16) / 4);
        const currentChord = this.chordProgression[chordIndex];

        // Play melody with rest pattern (creates breathing room and phrasing)
        const restPattern = this.melodyRestPatterns[section] || this.melodyRestPatterns.verseA;
        const patternBeat = sectionBeat % restPattern.length;
        if (restPattern[patternBeat] === 1) {
            this.playMelodyNote(section, sectionBeat, beatTime);
        }

        // Play chord arpeggio with rest pattern (not every beat)
        const arpPattern = this.arpeggioRestPatterns[section] || this.arpeggioRestPatterns.verseA;
        if (arpPattern[sectionBeat % arpPattern.length] === 1) {
            this.playChordArpeggio(currentChord, sectionBeat, beatTime);
        }

        // Play bass note (on beats 1 and 3 of each bar)
        if (this.currentBeat % 2 === 0) {
            this.playBassNote(currentChord.root, beatTime);
        }

        // Play percussion (skip outro for contrast at the end)
        if (section !== 'outro') {
            this.playPercussion(sectionBeat % 16, beatTime);
        }

        // Sugar Rush extra layers - add energy based on level
        if (this.sugarRushLevel > 0 && section !== 'intro') {
            this._playSugarRushLayers(sectionBeat % 16, beatTime, chordIndex);
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

        // Riff length for motif repetition (4 beats = 1 bar)
        const riffLength = 4;
        const useRiffRepeat = this.riffRepeatSections.has(section) && length >= riffLength * 2;

        for (let i = 0; i < length; i++) {
            // Riff repetition: repeat the first bar's motif in subsequent bars
            // with slight variation (transpose by chord movement)
            if (useRiffRepeat && i >= riffLength && melody.length >= riffLength) {
                const riffIndex = i % riffLength;
                const baseNote = melody[riffIndex];

                // Every other repeat, transpose the riff up/down for variation
                const repeatNum = Math.floor(i / riffLength);
                let offset = 0;
                if (repeatNum === 2) offset = 1;       // 3rd repeat: up a step
                else if (repeatNum === 3) offset = -1;  // 4th repeat: down a step (resolution)

                const transposed = Math.max(0, Math.min(this.pentatonicScale.length - 1, baseNote + offset));
                melody.push(transposed);
                currentNote = transposed;
                continue;
            }

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

    // Determine note's harmonic importance relative to current chord
    // Returns multiplier for duration (1.0 = normal, higher = hold longer)
    getNoteImportance(noteName, chordIndex, beat) {
        const chord = this.chordProgression[chordIndex];
        const pitchClass = noteName[0]; // Extract pitch class (C, D, E, etc.)
        const rootPitch = chord.root[0];

        // Check if note is a chord tone
        const isChordTone = chord.notes.some(n => n[0] === pitchClass);
        const isRoot = pitchClass === rootPitch;

        // Check beat strength (downbeat = beat 0, strong = beats 0,2)
        const isDownbeat = beat % 4 === 0;
        const isStrongBeat = beat % 2 === 0;

        // Resolution: landing on tonic (C) when chord is I (C major)
        const isResolution = chord.roman === 'I' && pitchClass === 'C';

        // Circle of fifths important notes:
        // - Root of each chord (A, D, G, C) should be emphasized
        // - Fifth of chord creates stability
        // - Resolution to C (tonic) is most important
        let importance = 1.0;

        if (isResolution && isDownbeat) {
            // Ultimate resolution - tonic on downbeat of I chord
            importance = 2.0;
        } else if (isRoot && isDownbeat) {
            // Root note on downbeat - very stable, hold longer
            importance = 1.8;
        } else if (isRoot && isStrongBeat) {
            // Root on strong beat
            importance = 1.5;
        } else if (isChordTone && isDownbeat) {
            // Other chord tone (3rd, 5th) on downbeat
            importance = 1.4;
        } else if (isChordTone && isStrongBeat) {
            // Chord tone on strong beat
            importance = 1.2;
        } else if (isChordTone) {
            // Chord tone on weak beat - slightly longer than passing tone
            importance = 1.1;
        } else {
            // Passing tone (non-chord tone) - keep shorter, leads to resolution
            importance = 0.7;
        }

        return importance;
    }

    // Get note duration based on section, beat position, AND harmonic importance
    getNoteDuration(section, beat, noteName = null, chordIndex = 0) {
        const rhythmName = this.sectionRhythms[section] || 'standard';
        const pattern = this.rhythmDurations[rhythmName];
        const patternIndex = beat % pattern.length;
        let baseDuration = pattern[patternIndex] * this.beatDuration;

        // Apply harmonic importance multiplier if note info provided
        if (noteName) {
            const importance = this.getNoteImportance(noteName, chordIndex, beat);
            baseDuration *= importance;
        }

        return baseDuration;
    }

    playMelodyNote(section, beat, time) {
        // Determine current chord for harmonic context
        const chordIndex = Math.floor((this.currentBeat % 16) / 4);

        // Generate unique cache key (section + chord)
        const cacheKey = `${section}_${chordIndex}`;

        // Generate new melody if not cached
        if (!this.melodyCache[cacheKey]) {
            const sectionLength = this.songStructure[section];
            this.melodyCache[cacheKey] = this.generateMelody(section, sectionLength, chordIndex);
            this.melodyCacheKeys.push(cacheKey);

            // Evict oldest entries if cache exceeds max size
            while (this.melodyCacheKeys.length > this.maxMelodyCacheSize) {
                const oldestKey = this.melodyCacheKeys.shift();
                delete this.melodyCache[oldestKey];
            }
        }

        // Get the procedurally generated melody
        const pattern = this.melodyCache[cacheKey];
        const noteIndex = beat % pattern.length;
        const scaleIndex = pattern[noteIndex];
        const note = this.pentatonicScale[scaleIndex];
        const freq = this.noteFrequencies[note];

        if (!freq) return;

        // Get varied note duration based on section, rhythm, AND harmonic importance
        // Chord tones and resolution notes are held longer per music theory
        const noteDuration = this.getNoteDuration(section, beat, note, chordIndex);

        // ADSR envelope with duration-aware timing
        const attackTime = Math.min(0.02, noteDuration * 0.1);
        const decayTime = Math.min(0.08, noteDuration * 0.2);
        const importance = this.getNoteImportance(note, chordIndex, beat);
        const sustainLevel = importance > 1.3 ? 0.08 : (noteDuration > this.beatDuration ? 0.07 : 0.05);
        const sustainEnd = noteDuration * 0.75;

        // Main melody oscillator - triangle wave for soft, pleasant tone
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'triangle';
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.08, time + attackTime);
        gain.gain.linearRampToValueAtTime(sustainLevel, time + attackTime + decayTime);
        gain.gain.setValueAtTime(sustainLevel, time + sustainEnd);
        gain.gain.linearRampToValueAtTime(0, time + noteDuration);

        osc.connect(gain);
        gain.connect(this._melodyPanner);   // Stereo positioned
        gain.connect(this._reverbSend);     // Send to reverb

        osc.start(time);
        osc.stop(time + noteDuration);

        // Detuned unison oscillator - adds warmth and width (chorus effect)
        const osc2 = this.context.createOscillator();
        const gain2 = this.context.createGain();

        osc2.type = 'triangle';
        osc2.frequency.value = freq * 1.003; // +5 cents detune for shimmer

        // Slightly lower volume than main voice
        gain2.gain.setValueAtTime(0, time);
        gain2.gain.linearRampToValueAtTime(0.035, time + attackTime);
        gain2.gain.linearRampToValueAtTime(sustainLevel * 0.45, time + attackTime + decayTime);
        gain2.gain.setValueAtTime(sustainLevel * 0.45, time + sustainEnd);
        gain2.gain.linearRampToValueAtTime(0, time + noteDuration);

        osc2.connect(gain2);
        // PERFORMANCE: Use shared panner, skip reverb for unison (main voice has it)
        gain2.connect(this._unisonPanner);

        osc2.start(time);
        osc2.stop(time + noteDuration);

        // Sugar Rush level 2+: octave doubling for extra brightness
        if (this.sugarRushLevel >= 2) {
            const octOsc = this.context.createOscillator();
            const octGain = this.context.createGain();

            octOsc.type = 'sine';
            octOsc.frequency.value = freq * 2; // One octave up

            const octLevel = this.sugarRushLevel === 3 ? 0.03 : 0.02;
            octGain.gain.setValueAtTime(0, time);
            octGain.gain.linearRampToValueAtTime(octLevel, time + attackTime);
            octGain.gain.linearRampToValueAtTime(octLevel * 0.6, time + sustainEnd);
            octGain.gain.linearRampToValueAtTime(0, time + noteDuration);

            octOsc.connect(octGain);
            // PERFORMANCE: Skip reverb for octave (main voice has it)
            octGain.connect(this._melodyPanner);

            octOsc.start(time);
            octOsc.stop(time + noteDuration);
        }
    }

    playChordArpeggio(chord, beat, time) {
        // Play chord notes in sequence (arpeggio) following circle of fifths voicing
        const noteIndex = beat % chord.notes.length;
        const note = chord.notes[noteIndex];
        const freq = this.noteFrequencies[note];

        if (!freq) return;

        // Vary arpeggio note duration based on beat position for musicality
        // Strong beats (1, 3) get longer notes, weak beats get shorter
        const isStrongBeat = beat % 2 === 0;
        const arpeggioDuration = isStrongBeat
            ? this.beatDuration * 0.7
            : this.beatDuration * 0.4;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'sine'; // Pure tone for harmony
        osc.frequency.value = freq;

        // ADSR envelope scaled to arpeggio duration
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.03, time + 0.01);
        gain.gain.linearRampToValueAtTime(0.025, time + arpeggioDuration * 0.3);
        gain.gain.linearRampToValueAtTime(0, time + arpeggioDuration);

        osc.connect(gain);
        gain.connect(this._arpPanner);    // Stereo positioned
        gain.connect(this._reverbSend);   // Send to reverb

        osc.start(time);
        osc.stop(time + arpeggioDuration);
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

        // Low-pass filter for tighter bass (200Hz cutoff for cleaner sub)
        const filter = this.context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        filter.Q.value = 2; // Slight resonance for presence

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this._bassPanner); // Stereo positioned (center)

        osc.start(time);
        osc.stop(time + this.beatDuration * 2);

        // Sub-bass sine layer for weight (pure fundamental)
        const sub = this.context.createOscillator();
        const subGain = this.context.createGain();

        sub.type = 'sine';
        sub.frequency.value = freq;

        subGain.gain.setValueAtTime(0, time);
        subGain.gain.linearRampToValueAtTime(0.06, time + 0.01);
        subGain.gain.linearRampToValueAtTime(0.04, time + 0.1);
        subGain.gain.exponentialRampToValueAtTime(0.01, time + this.beatDuration * 1.8);

        sub.connect(subGain);
        subGain.connect(this._bassPanner);

        sub.start(time);
        sub.stop(time + this.beatDuration * 2);
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

        // Hi-hat (every beat for driving energy)
        this.playHiHat(time);
    }

    playKick(time) {
        // Transient click (pitch sweep)
        const click = this.context.createOscillator();
        const clickGain = this.context.createGain();

        click.frequency.setValueAtTime(150, time);
        click.frequency.exponentialRampToValueAtTime(0.01, time + 0.1);

        clickGain.gain.setValueAtTime(0.18, time);
        clickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

        click.connect(clickGain);
        clickGain.connect(this._percPanner);

        click.start(time);
        click.stop(time + 0.1);

        // Body layer - sine at ~65Hz for sub-bass punch
        const body = this.context.createOscillator();
        const bodyGain = this.context.createGain();

        body.type = 'sine';
        body.frequency.setValueAtTime(65, time);
        body.frequency.exponentialRampToValueAtTime(45, time + 0.12);

        bodyGain.gain.setValueAtTime(0.2, time);
        bodyGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

        body.connect(bodyGain);
        bodyGain.connect(this._percPanner);

        body.start(time);
        body.stop(time + 0.15);
    }

    playSnare(time) {
        // Noise layer (reuse pre-generated buffer)
        const noise = this.context.createBufferSource();
        noise.buffer = this._snareBuffer;

        const filter = this.context.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1000;

        const noiseGain = this.context.createGain();
        noiseGain.gain.setValueAtTime(0.15, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this._percPanner);

        noise.start(time);
        noise.stop(time + 0.1);

        // Tonal body layer - short sine burst for punch
        const tone = this.context.createOscillator();
        const toneGain = this.context.createGain();

        tone.type = 'sine';
        tone.frequency.setValueAtTime(200, time);
        tone.frequency.exponentialRampToValueAtTime(120, time + 0.03);

        toneGain.gain.setValueAtTime(0.12, time);
        toneGain.gain.exponentialRampToValueAtTime(0.01, time + 0.04);

        tone.connect(toneGain);
        toneGain.connect(this._percPanner);

        tone.start(time);
        tone.stop(time + 0.04);
    }

    playHiHat(time) {
        // Reuse pre-generated noise buffer
        const noise = this.context.createBufferSource();
        noise.buffer = this._hihatBuffer;

        const filter = this.context.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 7000;

        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0.04, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this._percPanner);

        noise.start(time);
        noise.stop(time + 0.05);
    }

    // Open hi-hat variant (longer decay, lower filter for more body)
    _playOpenHiHat(time) {
        const noise = this.context.createBufferSource();
        noise.buffer = this._snareBuffer; // Longer buffer for open hat

        const filter = this.context.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 5000;

        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0.05, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this._percPanner);

        noise.start(time);
        noise.stop(time + 0.1);
    }

    // Shaker/tambourine for Sugar Rush energy
    _playShaker(time) {
        const noise = this.context.createBufferSource();
        noise.buffer = this._hihatBuffer;

        const filter = this.context.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 9000;
        filter.Q.value = 2;

        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0.025, time);
        gain.gain.exponentialRampToValueAtTime(0.005, time + 0.04);

        // Pan shaker slightly to the side for width
        const pan = this.context.createStereoPanner();
        pan.pan.value = 0.3;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(pan);
        pan.connect(this.musicGain);

        noise.start(time);
        noise.stop(time + 0.04);
    }

    // Sugar Rush extra percussion and energy layers
    _playSugarRushLayers(beatIndex, time, chordIndex) {
        // Level 1+: Shaker/tambourine on 8th notes
        if (this.sugarRushLevel >= 1 && this.sugarRushPatterns.shaker[beatIndex]) {
            this._playShaker(time);
        }

        // Level 2+: Open hi-hat accents on upbeats
        if (this.sugarRushLevel >= 2 && this.sugarRushPatterns.openHat[beatIndex]) {
            this._playOpenHiHat(time);
        }

        // Level 3: Double-time kick for maximum energy
        if (this.sugarRushLevel >= 3 && this.sugarRushPatterns.doubleKick[beatIndex]) {
            if (!this.rhythmPatterns.kick[beatIndex]) {
                // Only add kick if not already playing one from base pattern
                this.playKick(time);
            }
        }

        // Level 3: Synth pad chord for fullness (every 4 beats)
        if (this.sugarRushLevel >= 3 && beatIndex % 4 === 0) {
            this._playSugarPad(time, chordIndex);
        }
    }

    // Synth pad for Sugar Rush level 3 - adds harmonic fullness
    _playSugarPad(time, chordIndex) {
        const chord = this.chordProgression[chordIndex];

        chord.notes.forEach(noteName => {
            const freq = this.noteFrequencies[noteName];
            if (!freq) return;

            // Play note one octave up for brightness
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq * 2;

            const padDuration = this.beatDuration * 3.5;
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.015, time + 0.1);
            gain.gain.setValueAtTime(0.015, time + padDuration * 0.7);
            gain.gain.linearRampToValueAtTime(0, time + padDuration);

            osc.connect(gain);
            // PERFORMANCE: Skip reverb for pad (reduces convolver load)
            gain.connect(this._arpPanner);

            osc.start(time);
            osc.stop(time + padDuration);
        });
    }

    stopBackgroundMusic() {
        if (!this.isMusicPlaying) {
            // Still clear interval if it exists
            if (this.schedulerInterval) {
                clearInterval(this.schedulerInterval);
                this.schedulerInterval = null;
            }
            return;
        }

        // Fade out music over 500ms for smooth exit
        if (this.musicGain) {
            const now = this.context.currentTime;
            this.musicGain.gain.cancelScheduledValues(now);
            this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
            this.musicGain.gain.linearRampToValueAtTime(0, now + 0.5);
        }

        // Stop scheduler after fade completes
        setTimeout(() => {
            this.isMusicPlaying = false;
            if (this.schedulerInterval) {
                clearInterval(this.schedulerInterval);
                this.schedulerInterval = null;
            }
            this.currentBeat = 0;
        }, 550);
    }

    // Set Sugar Rush level for dynamic music layers (called by game)
    setSugarRushLevel(level) {
        const prevLevel = this.sugarRushLevel;
        this.sugarRushLevel = level;

        // Open the dynamic filter more during Sugar Rush for brighter sound
        if (this._musicFilter && this.isInitialized) {
            const now = this.context.currentTime;
            let targetFreq = this._filterBaseFreq;
            if (level === 1) targetFreq = 6000;
            else if (level === 2) targetFreq = 10000;
            else if (level === 3) targetFreq = 18000;
            this._musicFilter.frequency.cancelScheduledValues(now);
            this._musicFilter.frequency.setValueAtTime(this._musicFilter.frequency.value, now);
            this._musicFilter.frequency.linearRampToValueAtTime(targetFreq, now + 0.3);
        }
    }

    // === SFX Methods ===

    playCoinSound() {
        if (!this.isInitialized) return;
        this._duckMusic();

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
        this._duckMusic();

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
        this._duckMusic();

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
        this._duckMusic();

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
        // No duck for lane change - too frequent and subtle

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
        this._duckMusic();

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
        this._duckMusic();

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
        this._duckMusic();

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
        this._duckMusic();

        // Reuse pre-generated noise concept but need unique buffer for shaped decay
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
        this._duckMusic();

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
        this._duckMusic();

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
        this._duckMusic();

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

    // Sugar Rush level UP - cute kawaii chime
    playSugarRushLevelUpSound(level) {
        if (!this.isInitialized) return;

        // Prevent sound spam - 0.5 second cooldown
        const now = this.context.currentTime;
        if (this.lastLevelUpSound && now - this.lastLevelUpSound < 0.5) return;
        this.lastLevelUpSound = now;
        this._duckMusic();

        // Simple ascending chime - kawaii and not overwhelming
        const notes = level === 3
            ? [{ freq: 880, time: 0 }, { freq: 1047, time: 0.08 }, { freq: 1319, time: 0.16 }] // A5-C6-E6
            : [{ freq: 784, time: 0 }, { freq: 988, time: 0.08 }]; // G5-B5

        notes.forEach(note => {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();
            osc.frequency.value = note.freq;
            osc.type = 'sine';
            const startTime = now + note.time;
            gain.gain.setValueAtTime(0.15, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(startTime);
            osc.stop(startTime + 0.15);
        });
    }

    // Sugar Rush level DOWN - soft descending tone
    playSugarRushLevelDownSound() {
        if (!this.isInitialized) return;

        // Prevent sound spam
        const now = this.context.currentTime;
        if (this.lastLevelDownSound && now - this.lastLevelDownSound < 0.5) return;
        this.lastLevelDownSound = now;

        // Simple descending tone
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.2);
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.2);
    }

    // Purchase sound - satisfying "ka-ching" for buying items
    playPurchaseSound() {
        if (!this.isInitialized) return;
        this._duckMusic();

        const now = this.context.currentTime;

        // Coin drop sound (descending)
        const osc1 = this.context.createOscillator();
        const gain1 = this.context.createGain();
        osc1.frequency.setValueAtTime(1200, now);
        osc1.frequency.exponentialRampToValueAtTime(800, now + 0.08);
        osc1.type = 'sine';
        gain1.gain.setValueAtTime(0.3, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc1.connect(gain1);
        gain1.connect(this.sfxGain);
        osc1.start(now);
        osc1.stop(now + 0.1);

        // Cash register "ching" (ascending sparkle)
        const notes = [1318.51, 1567.98, 2093.00]; // E6, G6, C7
        notes.forEach((freq, index) => {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();
            const startTime = now + 0.08 + index * 0.04;

            osc.frequency.value = freq;
            osc.type = 'triangle';
            gain.gain.setValueAtTime(0.25, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(startTime);
            osc.stop(startTime + 0.15);
        });
    }

    // Equip sound - quick "swoosh/click" for switching gear
    playEquipSound() {
        if (!this.isInitialized) return;
        this._duckMusic();

        const now = this.context.currentTime;

        // Quick swoosh
        const osc1 = this.context.createOscillator();
        const gain1 = this.context.createGain();
        osc1.frequency.setValueAtTime(300, now);
        osc1.frequency.exponentialRampToValueAtTime(600, now + 0.05);
        osc1.type = 'sine';
        gain1.gain.setValueAtTime(0.15, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc1.connect(gain1);
        gain1.connect(this.sfxGain);
        osc1.start(now);
        osc1.stop(now + 0.08);

        // Soft click/snap
        const osc2 = this.context.createOscillator();
        const gain2 = this.context.createGain();
        osc2.frequency.value = 1000;
        osc2.type = 'square';
        gain2.gain.setValueAtTime(0.1, now + 0.05);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc2.connect(gain2);
        gain2.connect(this.sfxGain);
        osc2.start(now + 0.05);
        osc2.stop(now + 0.08);
    }

    // Finish line celebration fanfare!
    playFinishLineFanfare() {
        if (!this.isInitialized) return;
        this._duckMusic();

        const now = this.context.currentTime;

        // Triumphant fanfare melody
        const fanfareNotes = [
            { freq: 523.25, start: 0, dur: 0.15 },      // C5
            { freq: 659.25, start: 0.15, dur: 0.15 },   // E5
            { freq: 783.99, start: 0.3, dur: 0.15 },    // G5
            { freq: 1046.50, start: 0.45, dur: 0.4 },   // C6 (held)
        ];

        fanfareNotes.forEach(note => {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();

            osc.frequency.value = note.freq;
            osc.type = 'triangle';

            gain.gain.setValueAtTime(0.25, now + note.start);
            gain.gain.setValueAtTime(0.25, now + note.start + note.dur * 0.7);
            gain.gain.exponentialRampToValueAtTime(0.01, now + note.start + note.dur);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now + note.start);
            osc.stop(now + note.start + note.dur);
        });

        // Harmonizing lower notes
        const harmonyNotes = [
            { freq: 261.63, start: 0, dur: 0.15 },      // C4
            { freq: 329.63, start: 0.15, dur: 0.15 },   // E4
            { freq: 392.00, start: 0.3, dur: 0.15 },    // G4
            { freq: 523.25, start: 0.45, dur: 0.4 },    // C5
        ];

        harmonyNotes.forEach(note => {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();

            osc.frequency.value = note.freq;
            osc.type = 'sine';

            gain.gain.setValueAtTime(0.15, now + note.start);
            gain.gain.exponentialRampToValueAtTime(0.01, now + note.start + note.dur);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now + note.start);
            osc.stop(now + note.start + note.dur);
        });

        // Sparkle/chime overlay
        for (let i = 0; i < 5; i++) {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();

            osc.frequency.value = 2000 + Math.random() * 1500;
            osc.type = 'sine';

            const delay = 0.5 + i * 0.1;
            gain.gain.setValueAtTime(0.1, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.15);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now + delay);
            osc.stop(now + delay + 0.15);
        }
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

    // Dynamically adjust music tempo based on game speed
    setTempo(newTempo) {
        // Clamp tempo between 100 and 180 BPM for playability
        this.tempo = Math.max(100, Math.min(180, newTempo));
        this.beatDuration = 60 / this.tempo;

        // Open dynamic filter with tempo (higher tempo = brighter sound)
        if (this._musicFilter && this.sugarRushLevel === 0) {
            const progress = (this.tempo - 100) / 80; // 0 at 100bpm, 1 at 180bpm
            const freq = 6000 + progress * 8000; // 6000Hz → 14000Hz
            this._musicFilter.frequency.setTargetAtTime(freq, this.context.currentTime, 0.3);
            this._filterBaseFreq = freq;
        }
    }

    // Get current tempo for external reference
    getTempo() {
        return this.tempo;
    }

    // Clear melody cache to free memory
    clearMelodyCache() {
        this.melodyCache = {};
        this.melodyCacheKeys = [];
        this.sectionSeed = {};
    }
}
