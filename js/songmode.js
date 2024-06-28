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
    '13': 'dummy.m4a'
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
    '13': 0.1
};

let audioCtx = new (window.AudioContext || window.webkitAudioContext)({
    latencyHint: 'interactive'
});

let currentStep = 0;
let isPlaying = false;
let schedulerTimerId;
const bpmInput = document.getElementById('bpm');
const stepIndicators = document.querySelectorAll('.step');
const swingInput = document.getElementById('swing');
let swingAmount = swingInput.value / 100;
const sounds = {};
const songPatterns = [];

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

function scheduleNoteForPattern(pattern, stepIndex, time) {
    pattern.forEach(item => {
        if (item.step == stepIndex) {
            playSoundByKey(item.sound, time);
        }
    });
}

function scheduler() {
    while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
        songPatterns.forEach((pattern, index) => {
            const adjustedStep = (currentStep + index) % 8;
            scheduleNoteForPattern(pattern, adjustedStep, nextNoteTime);
        });
        
        const secondsPerBeat = 60.0 / bpmInput.value;
        nextNoteTime += 0.25 * secondsPerBeat * (currentStep % 2 === 1 ? (1.0 + swingAmount) : (1.0 - swingAmount));
        currentStep++;
        
        if (currentStep >= 8) {
            currentStep = 0;
        }
    }
    
    schedulerTimerId = setTimeout(scheduler, lookahead);
}

function startPlayback() {
    nextNoteTime = audioCtx.currentTime;
    currentStep = 0;
    isPlaying = true;
    scheduler();
    document.getElementById('play').style.display = 'none';
    document.getElementById('stop').style.display = 'inline-block';
}

function stopPlayback() {
    isPlaying = false;
    clearTimeout(schedulerTimerId);
    currentStep = 0;
    document.getElementById('play').style.display = 'inline-block';
    document.getElementById('stop').style.display = 'none';
}

document.getElementById('play').addEventListener('click', () => {
    if (!isPlaying) {
        startPlayback();
    }
});

document.getElementById('pause').addEventListener('click', () => {
    if (isPlaying) {
        stopPlayback();
    }
});

document.getElementById('stop').addEventListener('click', () => {
    if (isPlaying) {
        stopPlayback();
    }
});

async function importPattern(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsText(file);

    reader.onload = () => {
        try {
            const pattern = JSON.parse(reader.result);
            songPatterns.push(pattern);
            alert('Pattern imported successfully');
        } catch (error) {
            console.error('Error reading the file:', error);
            alert('Failed to import the pattern');
        }
    };
}

for (let i = 1; i <= 8; i++) {
    document.getElementById(`importInput${i}`).addEventListener('change', importPattern);
}

swingInput.addEventListener('input', (event) => {
    swingAmount = event.target.value / 100;
});
