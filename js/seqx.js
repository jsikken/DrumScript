const soundFilesKit1 = {
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

const soundFilesKit2 = {
    '1': './kit5/kd.wav',
    '2': './kit5/sd.wav',
    '3': './kit5/hhc.wav',
    '4': './kit5/hho.wav',
    '5': './kit5/t1.wav',
    '6': './kit5/t2.wav',
    '7': './kit5/crash.wav',
    '8': './kit5/ride.wav',
    '9': './kit5/clap.wav',
    '10': './kit1/china.m4a',
    '11': './kit1/gunshotwav.m4a',
    '12': './kit1/stick.m4a',
    '13': 'dummy.m4a'  // Dummy file
};

const soundVolumes = {
    '1': 0.8, '2': 0.7, '3': 0.6, '4': 0.6, '5': 0.7,
    '6': 0.7, '7': 0.8, '8': 0.7, '9': 0.7, '10': 0.8,
    '11': 0.6, '12': 0.8, '13': 0.1
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
let soundFiles = soundFilesKit1; // Default to Kit 1

let loadButton = document.getElementById('loadButton');
let clickCount = 0;

const lookahead = 25.0;
const scheduleAheadTime = 0.1;
let nextNoteTime = 0.0;

let currentPatternIndex = 0;
let currentRepetition = 0;

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
        document.getElementById('stop').style.display = 'inline-block';
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
        if (item.step == stepIndex + 1) {
            playSoundByKey(item.sound, time);
        }
    });
}

function nextNote() {
    const secondsPerBeat = 60.0 / parseFloat(bpmInput.value);
    let swingOffset = 0;
    if (currentStep % 2 !== 0 && swingAmount > 0) {
        swingOffset = (Math.random() - 0.5) * swingAmount * 0.5 * secondsPerBeat;
    }
    nextNoteTime += 0.5 * secondsPerBeat + swingOffset; // Correct BPM calculation

    currentStep++;
    if (currentStep === 8) {
        currentStep = 0;
        currentRepetition++;
        
        const repetitions = parseInt(document.getElementById(`pattern-${currentPatternIndex}-repetitions`).value);
        if (currentRepetition >= repetitions) {
            currentRepetition = 0;
            currentPatternIndex = (currentPatternIndex + 1) % songPatterns.length;
        }
    }
}

function scheduler() {
    while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
        if (songPatterns.length > 0) {
            const currentPattern = songPatterns[currentPatternIndex];
            scheduleNoteForPattern(currentPattern, currentStep % 8, nextNoteTime);
            
            stepIndicators.forEach(indicator => indicator.classList.remove('active'));
            stepIndicators[currentStep % 8].classList.add('active');
        }
        
        nextNote();
    }
    
    schedulerTimerId = setTimeout(scheduler, lookahead);
}

function startPlayback() {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    nextNoteTime = audioCtx.currentTime;
    currentStep = 0;
    currentPatternIndex = 0;
    currentRepetition = 0;
    isPlaying = true;
    scheduler();
    document.getElementById('play').style.display = 'none';
    document.getElementById('stop').style.display = 'inline-block';
}

function stopPlayback() {
    isPlaying = false;
    clearTimeout(schedulerTimerId);
    currentStep = 0;
    stepIndicators.forEach(indicator => indicator.classList.remove('active'));
    document.getElementById('play').style.display = 'inline-block';
    document.getElementById('stop').style.display = 'none';
}

document.getElementById('play').addEventListener('click', () => {
    if (!isPlaying) {
        startPlayback();
    }
});

document.getElementById('stop').addEventListener('click', () => {
    if (isPlaying) {
        stopPlayback();
    }
});

function createRepetitionInput(patternIndex) {
    const container = document.getElementById('pattern-controls');
    const inputDiv = document.createElement('div');
    inputDiv.innerHTML = `
        <label for="pattern-${patternIndex}-repetitions">Pattern ${patternIndex + 1} repetitions:</label>
        <input type="number" id="pattern-${patternIndex}-repetitions" min="1" value="1">
    `;
    container.appendChild(inputDiv);

    const input = inputDiv.querySelector('input');
    input.addEventListener('change', () => {
        patternRepetitions[patternIndex] = parseInt(input.value);
    });
}

async function importPattern(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsText(file);

    reader.onload = () => {
        try {
            const pattern = JSON.parse(reader.result);
            songPatterns.push(pattern);
            
            const patternIndex = songPatterns.length - 1;
            createRepetitionInput(patternIndex);
            patternRepetitions[patternIndex] = 1;
            
            alert('Pattern imported successfully');
        } catch (error) {
            console.error('Error reading the file:', error);
            alert('Failed to import the pattern');
        }
    };

    reader.onerror = () => {
        console.error('Error reading the file:', reader.error);
        alert('Failed to import the pattern');
    };

    reader.readAsText(file);
}

for (let i = 1; i <= 8; i++) {
    document.getElementById(`importInput${i}`).addEventListener('change', importPattern);
}

swingInput.addEventListener('input', (event) => {
    swingAmount = event.target.value / 100;
});

bpmInput.addEventListener('input', () => {
    if (isPlaying) {
        clearTimeout(schedulerTimerId);
        scheduler();
    }
});

function selectSoundKit(kit) {
    if (kit === 'kit1') {
        soundFiles = soundFilesKit1;
    } else if (kit === 'kit2') {
        soundFiles = soundFilesKit2;
    }
    loadButton.disabled = false;
    loadButton.textContent = 'Load 3';
    clickCount = 0;
    console.log(`Selected ${kit}`);
}