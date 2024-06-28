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
    '13': './dummy.m4a' // Dummy file
};

const soundVolumes = {
    '1': 0.8, '2': 0.7, '3': 0.6, '4': 0.6, '5': 0.7,
    '6': 0.7, '7': 0.8, '8': 0.7, '9': 0.7, '10': 0.8,
    '11': 0.6, '12': 0.8, '13': 0.1 // Dummy file volume set to 0
};

let audioCtx = new (window.AudioContext || window.webkitAudioContext)({
    latencyHint: 'interactive'
});

let currentStep = 0;
let isPlaying = false;
const bpmInput = document.getElementById('bpm');
const swingInput = document.getElementById('swing');
const stepIndicators = document.querySelectorAll('.step');
const sounds = {};
let patternsQueue = [];
let currentPatternIndex = 0;
let clickCount = 0;

async function loadSound(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return audioCtx.decodeAudioData(arrayBuffer);
}

async function loadSounds() {
    try {
        const promises = Object.keys(soundFiles).map(key =>
            loadSound(soundFiles[key]).then(buffer => {
                sounds[key] = buffer;
                console.log(`Sound ${key} loaded successfully`);
            })
        );
        await Promise.all(promises);
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

function scheduleNote(stepIndex, time) {
    stepIndicators.forEach(indicator => indicator.classList.remove('active'));
    stepIndicators[stepIndex].classList.add('active');
    
    const currentPattern = patternsQueue[currentPatternIndex];
    if (currentPattern && currentPattern[stepIndex]) {
        currentPattern[stepIndex].forEach(sound => {
            if (sounds[sound]) {
                playSound(sounds[sound], time, soundVolumes[sound]);
            }
        });
    }
}

function nextNote() {
    const bpm = parseFloat(bpmInput.value);
    const secondsPerBeat = 60.0 / bpm;
    const swingAmount = parseFloat(swingInput.value) / 100;
    
    let nextStepTime = secondsPerBeat / 2;
    if (currentStep % 2 !== 0 && swingAmount > 0) {
        nextStepTime += (Math.random() - 0.5) * swingAmount * secondsPerBeat * 0.5;
    }
    
    return nextStepTime;
}

function scheduler() {
    if (patternsQueue.length === 0) {
        console.log('No patterns in queue to play.');
        stopPlaying();
        return;
    }

    isPlaying = true;
    currentStep = 0;

    function playNextStep() {
        if (!isPlaying) return;

        const currentPattern = patternsQueue[currentPatternIndex];
        if (!currentPattern) {
            currentPatternIndex = (currentPatternIndex + 1) % patternsQueue.length;
            currentStep = 0;
            setTimeout(playNextStep, 0);
            return;
        }

        if (currentStep >= 8) {
            currentPatternIndex = (currentPatternIndex + 1) % patternsQueue.length;
            currentStep = 0;
            setTimeout(playNextStep, 0);
            return;
        }

        const time = audioCtx.currentTime;
        scheduleNote(currentStep, time);
        currentStep++;

        setTimeout(playNextStep, nextNote() * 1000);
    }

    playNextStep();
}

function startPlaying() {
    if (!isPlaying) {
        audioCtx.resume().then(() => {
            scheduler();
            document.getElementById('play').style.display = 'none';
            document.getElementById('pause').style.display = 'inline-block';
            document.getElementById('stop').style.display = 'inline-block';
        });
    }
}

function pausePlaying() {
    if (isPlaying) {
        audioCtx.suspend();
        isPlaying = false;
        document.getElementById('play').style.display = 'inline-block';
        document.getElementById('pause').style.display = 'none';
    }
}

function stopPlaying() {
    isPlaying = false;
    audioCtx.suspend();
    stepIndicators.forEach(indicator => indicator.classList.remove('active'));
    document.getElementById('play').style.display = 'inline-block';
    document.getElementById('pause').style.display = 'none';
    document.getElementById('stop').style.display = 'none';
    currentPatternIndex = 0;
    currentStep = 0;
}

async function importPattern(event, index) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const pattern = await readJSONFile(file);
        patternsQueue[index - 1] = pattern;
        console.log(`Pattern ${index} loaded:`, pattern);
    } catch (error) {
        console.error("Error reading the file:", error);
        alert("Failed to import the pattern.");
    }
}

function readJSONFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(JSON.parse(e.target.result));
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
}

document.getElementById('loadButton').addEventListener('click', async () => {
    clickCount++;
    try {
        await loadSounds();
        playDummySound();
        if (clickCount < 3) {
            document.getElementById('loadButton').textContent = `Load ${3 - clickCount}`;
        } else if (clickCount === 3) {
            document.getElementById('loadButton').textContent = 'Done';
            document.getElementById('loadButton').disabled = true;
            document.getElementById('loadButton').style.display = 'none';
            document.getElementById('play').style.display = 'inline-block';
        }
    } catch (error) {
        console.error('Failed to load sounds:', error);
        alert('Failed to load sounds. Please try again.');
    }
});

document.getElementById('play').addEventListener('click', startPlaying);
document.getElementById('pause').addEventListener('click', pausePlaying);
document.getElementById('stop').addEventListener('click', stopPlaying);

for (let i = 1; i <= 8; i++) {
    document.getElementById(`importInput${i}`).addEventListener('change', function(event) {
        importPattern(event, i);
    });
}

// Initial setup
loadSounds();
