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
    '12': 'dummy.m4a'
};

// Define hardcoded volumes for each sound file
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
    '12': 0.1
};

let audioCtx = new (window.AudioContext || window.webkitAudioContext)({
    latencyHint: 'interactive'
});

let currentStep = 0;
let isPlaying = false;
let schedulerTimerId;
const bpmInput = document.getElementById('bpm');
const steps = document.querySelectorAll('.grid-cell');
const stepIndicators = document.querySelectorAll('.step');
const sounds = {};
let loadButton = document.getElementById('loadButton');
let clickCount = 0;

async function loadSound(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return audioCtx.decodeAudioData(arrayBuffer);
}

loadButton.addEventListener('click', () => {
    clickCount++;
    
    if (clickCount === 1 || clickCount === 2 || clickCount === 3) {
        loadSounds();
        playDummySound();
    }
    
    if (clickCount < 3) {
        loadButton.textContent = `Load ${3 - clickCount}`;
    } else if (clickCount === 3) {
        loadButton.textContent = 'Done';
        loadButton.disabled = true;
        loadButton.style.display = 'none';
        document.getElementById('play').style.display = 'inline-block';
        document.getElementById('rec').style.display = 'inline-block';
    }
});

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

function playDummySound() {
    if (sounds['12']) {
        const volume = soundVolumes['12'];
        playSound(sounds['12'], audioCtx.currentTime, volume);
    } else {
        console.error('Dummy sound not found');
    }
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

let nextNoteTime = 0;

function startPlaying() {
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
        document.getElementById('play').style.display = 'none';
        document.getElementById('stop').style.display = 'inline-block';
    }
}

function stopPlaying() {
    if (isPlaying) {
        isPlaying = false;
        cancelAnimationFrame(schedulerTimerId);
        currentStep = 0;
        stepIndicators.forEach(indicator => indicator.classList.remove('active'));
        document.getElementById('play').style.display = 'inline-block';
        document.getElementById('stop').style.display = 'none';
    }
}

// Function to handle pattern import
function handlePatternImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const contents = e.target.result;
        const pattern = JSON.parse(contents);
        loadPattern(pattern);
    };
    reader.readAsText(file);
}

function loadPattern(pattern) {
    steps.forEach(step => step.classList.remove('active'));
    pattern.forEach((row, rowIndex) => {
        row.forEach((cell, cellIndex) => {
            if (cell) {
                const step = document.querySelector(`.drum-row[data-row="${rowIndex}"] .grid-cell[data-step="${cellIndex + 1}"]`);
                step.classList.add('active');
            }
        });
    });
}

// Event listeners for import inputs
document.getElementById('importInput1').addEventListener('change', handlePatternImport);
document.getElementById('importInput2').addEventListener('change', handlePatternImport);
document.getElementById('importInput3').addEventListener('change', handlePatternImport);
document.getElementById('importInput4').addEventListener('change', handlePatternImport);
document.getElementById('importInput5').addEventListener('change', handlePatternImport);
document.getElementById('importInput6').addEventListener('change', handlePatternImport);
document.getElementById('importInput7').addEventListener('change', handlePatternImport);
document.getElementById('importInput8').addEventListener('change', handlePatternImport);

// Event listeners for the buttons
document.getElementById('play').addEventListener('click', startPlaying);
document.getElementById('stop').addEventListener('click', stopPlaying);

steps.forEach(step => {
    step.addEventListener('click', () => {
        step.classList.toggle('active');
    });
});

bpmInput.addEventListener('input', () => {
    if (isPlaying) {
        stopPlaying();
        startPlaying();
    }
});
