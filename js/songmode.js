// Define sound file paths and volumes
const soundFiles = {
    '1': './kit1/kickwav.m4a',
    '2': './kit1/snarewav.m4a',
    '3': './kit1/hihatclosedwav.m4a',
    '4': './kit1/hihatopenwav.m4a',
    '5': './kit1/midtomwav.m4a',
    '6': './kit1/hitomwav.m4a',
    '7': './kit1/crashwav.m4a',
    '8': './kit1/ride.m4a',
    '9': './kit1/clapwav.m4a',
    '10': './kit1/china.m4a',
    '11': './kit1/gunshotwav.m4a',
    '12': './kit1/stick.m4a',
    '13': './dummy.m4a'  // Adjusted dummy file path
};

const soundVolumes = {
    '1': 0.8,
    '2': 0.7,
    '3': 0.6,
    '4': 0.6,
    '5': 0.7,
    '6': 0.7,
    '7': 0.8,
    '8': 0.7,
    '9': 0.7,
    '10': 0.8,
    '11': 0.6,
    '12': 0.8,
    '13': 0.1  // Dummy file volume set to 0
};

// Initialize AudioContext
let audioCtx = new (window.AudioContext || window.webkitAudioContext)({
    latencyHint: 'interactive'
});

// Variables for sequencing and playback
let currentStep = 0;
let isPlaying = false;
const bpmInput = document.getElementById('bpm');
const swingInput = document.getElementById('swing');
const steps = document.querySelectorAll('.grid-cell');
const stepIndicators = document.querySelectorAll('.step');
const sounds = {};
let patterns = [];

// Function to load sound from URL
async function loadSound(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return audioCtx.decodeAudioData(arrayBuffer);
}

// Load sounds from soundFiles object
async function loadSounds() {
    try {
        const promises = [];
        for (let key in soundFiles) {
            promises.push(loadSound(soundFiles[key]).then(buffer => {
                sounds[key] = buffer;
                console.log(`Sound ${key} loaded successfully`);
            }));
        }
        await Promise.all(promises);
        console.log('All sounds loaded');
    } catch (error) {
        console.error('Error loading sounds:', error);
    }
}

// Function to play a sound buffer at specified time and volume
function playSound(buffer, time, volume) {
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = volume;
    source.connect(gainNode).connect(audioCtx.destination);
    source.start(time);
    console.log(`Playing sound at time ${time}, volume ${volume}`);
}

// Function to play the dummy sound (if needed)
function playDummySound() {
    if (sounds['13']) {
        const volume = soundVolumes['13'];
        playSound(sounds['13'], audioCtx.currentTime, volume);
    } else {
        console.error('Dummy sound not found');
    }
}

// Hihat choking logic (if applicable)
let activeHihatOpenSource = null;

// Function to play sound by key at specified time
function playSoundByKey(key, time) {
    if (key === '3' && activeHihatOpenSource) {
        activeHihatOpenSource.stop();
        activeHihatOpenSource = null;
    }

    const source = audioCtx.createBufferSource();
    source.buffer = sounds[key];
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = soundVolumes[key] || 1;
    source.connect(gainNode).connect(audioCtx.destination);

    if (key === '4') {
        if (activeHihatOpenSource) {
            activeHihatOpenSource.stop();
        }
        activeHihatOpenSource = source;
    }

    source.start(time);
    console.log(`Playing sound ${key} at time ${time}, volume ${gainNode.gain.value}`);
}

// Function to schedule a note at given step index and time
function scheduleNote(stepIndex, time) {
    stepIndicators.forEach(indicator => indicator.classList.remove('active'));
    stepIndicators[stepIndex].classList.add('active');

    steps.forEach(step => {
        if (parseInt(step.dataset.step) === stepIndex + 1 && step.classList.contains('active')) {
            const soundKey = step.closest('.drum-row').dataset.sound;
            if (sounds[soundKey]) {
                playSoundByKey(soundKey, time);
            } else {
                console.error(`Sound not found for key: ${soundKey}`);
            }
        }
    });
}

// Function to calculate next note time, considering BPM and swing
function nextNote() {
    const secondsPerBeat = 60.0 / bpmInput.value;
    let swingOffset = 0;

    // Calculate swing offset for every second step with randomization
    if (currentStep % 2 !== 0 && swingInput.value > 0) {
        swingOffset = (Math.random() - 0.5) * swingInput.value * 0.01 * secondsPerBeat;
    }

    return audioCtx.currentTime + (0.5 * secondsPerBeat + swingOffset);
}

// Function to schedule notes in a sequence
function scheduler() {
    while (isPlaying && currentStep < 8) {
        const currentTime = audioCtx.currentTime;
        scheduleNote(currentStep, currentTime);
        currentStep++;
        setTimeout(scheduler, (nextNote() - currentTime) * 1000);
    }
}

// Function to start playback
function startPlaying() {
    if (!isPlaying) {
        isPlaying = true;
        currentStep = 0;
        scheduler();
        console.log('Playback started');
    }
}

// Function to stop playback
function stopPlaying() {
    if (isPlaying) {
        isPlaying = false;
        stepIndicators.forEach(indicator => indicator.classList.remove('active'));
        console.log('Playback stopped');
    }
}

// Event listener for play button
document.getElementById('play').addEventListener('click', startPlaying);

// Event listener for stop button
document.getElementById('stop').addEventListener('click', stopPlaying);

// Event listener for BPM input change
bpmInput.addEventListener('input', () => {
    if (isPlaying) {
        stopPlaying();
        startPlaying();
    }
});

// Event listener for swing input change
swingInput.addEventListener('input', () => {
    if (isPlaying) {
        stopPlaying();
        startPlaying();
    }
});

// Function to handle pattern import from file
function handlePatternImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const contents = e.target.result;
            const pattern = JSON.parse(contents);
            patterns.push(pattern);
            console.log(`Pattern loaded:`, pattern);
            await loadSounds();
        } catch (error) {
            console.error("Error reading the file:", error);
            alert("Failed to import the pattern.");
        }
    };
    reader.readAsText(file);
}

// Event listeners for pattern import inputs
for (let i = 1; i <= 8; i++) {
    const input = document.getElementById(`importInput${i}`);
    input.addEventListener('change', handlePatternImport);
}

// Function to export pattern to JSON file
function exportPattern() {
    const pattern = [];

    steps.forEach(step => {
        if (step.classList.contains('active')) {
            pattern.push({
                step: step.dataset.step,
                sound: step.closest('.drum-row').dataset.sound
            });
        }
    });

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(pattern));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "pattern.json");
    document.body.appendChild(downloadAnchorNode); // required for Firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

// Event listener for export button
document.getElementById('exportButton').addEventListener('click', exportPattern);

// Function to toggle step activation
steps.forEach(step => {
    step.addEventListener('click', () => {
        step.classList.toggle('active');
    });
});
