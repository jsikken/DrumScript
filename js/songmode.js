let audioCtx = new (window.AudioContext || window.webkitAudioContext)({
    latencyHint: 'interactive'
});

let currentStep = 0;
let isPlaying = false;
let schedulerTimerId;
let nextNoteTime = 0;

const bpmInput = document.getElementById('bpm');
const stepIndicators = document.querySelectorAll('.step');
const sounds = {};

const soundFiles = {
    '1': 'kickwav.m4a',
    '2': 'snarewav.m4a',
    '3': 'hihatclosedwav.m4a',
    '4': 'hihatopenwav.m4a',
    '5': 'midtomwav.m4a',
    '6': 'hitomwav.m4a',
    '7': 'crashwav.m4a',
    '8': 'ride.m4a',
    '9': 'clapwav.m4a',
    '10': 'china.m4a',
    '11': 'gunshotwav.m4a',
    '12': 'dummy.m4a'  // Dummy file
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
    '12': 0.1  // Dummy file volume set to 0
};

async function loadSound(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return audioCtx.decodeAudioData(arrayBuffer);
}

async function loadSounds() {
    try {
        for (let key in soundFiles) {
            const buffer = await loadSound(soundFiles[key]);
            sounds[key] = buffer;
            console.log(`Sound ${key} loaded successfully`);
        }
        console.log('All sounds loaded');
    } catch (error) {
        console.error('Error loading sounds:', error);
    }
}

function playSound(buffer, time, volume) {
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = volume;
    source.connect(gainNode).connect(audioCtx.destination);
    source.start(time);
}

// Hihat choking logic
let activeHihatOpenSource = null;

function playSoundByKey(key) {
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

    source.start();
}

function scheduleNote(stepIndex, time) {
    stepIndicators.forEach(indicator => indicator.classList.remove('active'));
    stepIndicators[stepIndex].classList.add('active');

    const steps = document.querySelectorAll('.grid-cell');
    steps.forEach(step => {
        if (step.dataset.step == stepIndex + 1 && step.classList.contains('active')) {
            const soundKey = step.closest('.drum-row').dataset.sound;
            if (sounds[soundKey]) {
                playSoundByKey(soundKey, time);
            } else {
                console.error(`Sound not found for key: ${soundKey}`);
            }
        }
    });
}

function nextNote() {
    const secondsPerBeat = 60.0 / bpmInput.value;
    currentStep++;
    if (currentStep === 8) {
        currentStep = 0;
    }
    return audioCtx.currentTime + secondsPerBeat / 2;
}

function scheduler() {
    while (nextNoteTime < audioCtx.currentTime + 0.1) {
        scheduleNote(currentStep, nextNoteTime);
        nextNoteTime = nextNote();
    }
    schedulerTimerId = requestAnimationFrame(scheduler);
}

function startPlayback() {
    if (!isPlaying) {
        if (audioCtx.state === 'suspended') {
            audioCtx.resume().then(() => {
                console.log('AudioContext resumed successfully');
            });
        }
        isPlaying = true;
        currentStep = 0;
        nextNoteTime = audioCtx.currentTime;
        scheduler();
        document.getElementById('play').textContent = 'Stop';
    }
}

function stopPlayback() {
    if (isPlaying) {
        isPlaying = false;
        cancelAnimationFrame(schedulerTimerId);
        currentStep = 0;
        stepIndicators.forEach(indicator => indicator.classList.remove('active'));
        document.getElementById('play').textContent = 'Play';
    }
}

document.getElementById('play').addEventListener('click', () => {
    if (!isPlaying) {
        startPlayback();
    } else {
        stopPlayback();
    }
});

document.getElementById('bpm').addEventListener('input', () => {
    if (isPlaying) {
        stopPlayback();
        startPlayback();
    }
});

async function loadPattern(fileInput, patternId) {
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = function(event) {
        const pattern = JSON.parse(event.target.result);
        document.getElementById(`pattern${patternId}`).innerText = JSON.stringify(pattern);
        // Load pattern into sequencer
        // This is a placeholder. The actual implementation depends on the structure of your sequencer.
        console.log(`Pattern ${patternId} loaded:`, pattern);
    };
    reader.readAsText(file);
}

document.getElementById('importInput1').addEventListener('change', (e) => loadPattern(e.target, 1));
document.getElementById('importInput2').addEventListener('change', (e) => loadPattern(e.target, 2));
document.getElementById('importInput3').addEventListener('change', (e) => loadPattern(e.target, 3));
document.getElementById('importInput4').addEventListener('change', (e) => loadPattern(e.target, 4));
document.getElementById('importInput5').addEventListener('change', (e) => loadPattern(e.target, 5));
document.getElementById('importInput6').addEventListener('change', (e) => loadPattern(e.target, 6));
document.getElementById('importInput7').addEventListener('change', (e) => loadPattern(e.target, 7));
document.getElementById('importInput8').addEventListener('change', (e) => loadPattern(e.target, 8));
