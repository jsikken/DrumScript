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
    '13': 'dummy.m4a'  // Dummy file
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

let audioCtx = new (window.AudioContext || window.webkitAudioContext)({
    latencyHint: 'interactive'
});

let currentStep = 0;
let isPlaying = false;
let schedulerTimerId;
const bpmInput = document.getElementById('bpm');
const steps = document.querySelectorAll('.grid-cell');
const stepIndicators = document.querySelectorAll('.step');
const swingInput = document.getElementById('swing');
let swingAmount = swingInput.value / 100; // Initialize swing amount
const sounds = {};

let loadButton = document.getElementById('loadButton');
let clickCount = 0;

const lookahead = 25.0;
const scheduleAheadTime = 0.1;
let nextNoteTime = 0.0;

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
    if (sounds['13']) {
        const volume = soundVolumes['13'];
        playSound(sounds['13'], audioCtx.currentTime, volume);
    } else {
        console.error('Dummy sound not found');
    }
}

let activeHihatOpenSource = null;

function playSoundByKey(key, time) {
    if (key === '3' && activeHihatOpenSource) {
        activeHihatOpenSource.stop(time);
        activeHihatOpenSource = null;
    }

    const source = audioCtx.createBufferSource();
    source.buffer = sounds[key];
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = soundVolumes[key] || 1;
    source.connect(gainNode).connect(audioCtx.destination);

    if (key === '4') {
        if (activeHihatOpenSource) {
            activeHihatOpenSource.stop(time);
        }
        activeHihatOpenSource = source;
    }

    source.start(time);
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
    let swingOffset = 0;

    // Calculate swing offset for every second step with randomization
    if (currentStep % 2 !== 0 && swingAmount > 0) {
        // Generate a random number between -0.5 and 0.5, then scale by swingAmount and secondsPerBeat
        swingOffset = (Math.random() - 0.5) * swingAmount * 0.5 * secondsPerBeat;
    }

    nextNoteTime += 0.5 * secondsPerBeat + swingOffset; // Apply swing offset
    currentStep++;
    if (currentStep === 8) {
        currentStep = 0;
    }
}

function scheduler() {
    while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
        scheduleNote(currentStep, nextNoteTime);
        nextNote();
    }
    schedulerTimerId = setTimeout(scheduler, lookahead);
}

function startSequencer() {
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

function stopSequencer() {
    if (isPlaying) {
        isPlaying = false;
        clearTimeout(schedulerTimerId);
        stepIndicators.forEach(indicator => indicator.classList.remove('active'));
        document.getElementById('play').style.display = 'inline-block';
        document.getElementById('stop').style.display = 'none';
    }
}

document.getElementById('play').addEventListener('click', startSequencer);
document.getElementById('stop').addEventListener('click', stopSequencer);

steps.forEach(step => {
    step.addEventListener('click', () => {
        step.classList.toggle('active');
    });
});

bpmInput.addEventListener('input', () => {
    if (isPlaying) {
        clearTimeout(schedulerTimerId);
        startSequencer();
    }
});

// Listen for changes to the swing input
swingInput.addEventListener('input', () => {
    swingAmount = swingInput.value / 100;
});

// Functie om het patroon te exporteren naar een JSON-bestand
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
    const downloadAnchorNode = document.getElementById('downloadLink');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "pattern.json");
    downloadAnchorNode.click();
}

document.getElementById('exportButton').addEventListener('click', exportPattern);

// Functie om een JSON-bestand in te lezen
function readJSONFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(JSON.parse(event.target.result));
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
}

// Functie om het patroon te importeren vanuit een JSON-bestand
async function importPattern(event) {
    const file = document.getElementById('importInput').files[0];
    if (!file) {
        alert("Please select a file to import.");
        return;
    }

    try {
        const pattern = await readJSONFile(file);

        // Reset alle actieve stappen
        steps.forEach(step => step.classList.remove('active'));

        // Stel de nieuwe stappen in
        pattern.forEach(item => {
            const step = document.querySelector(`.drum-row[data-sound="${item.sound}"] .grid-cell[data-step="${item.step}"]`);
            if (step) {
                step.classList.add('active');
            }
        });
    } catch (error) {
        console.error("Error reading the file:", error);
        alert("Failed to import the pattern.");
    }
}

document.getElementById('importButton').addEventListener('click', importPattern);
