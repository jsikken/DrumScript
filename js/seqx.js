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
  '13': 'dummy.m4a'
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
const steps = document.querySelectorAll('.grid-cell');
const stepIndicators = document.querySelectorAll('.step');
const swingInput = document.getElementById('swing');
let swingAmount = swingInput ? swingInput.value / 100 : 0;

const sounds = {};
let soundFiles = soundFilesKit1; // Default to Kit 1
const loadButton = document.getElementById('loadButton');
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
    Pattern ${patternIndex + 1} repetitions:
    <input type="number" id="pattern-${patternIndex}-repetitions" value="1" min="1">
  `;
  container.appendChild(inputDiv);
}

swingInput.addEventListener('input', () => {
  swingAmount = swingInput.value / 100;
});

const soundKitSelect = document.getElementById('soundKit');
soundKitSelect.addEventListener('change', () => {
  const selectedKit = soundKitSelect.value;
  soundFiles = selectedKit === 'kit2' ? soundFilesKit2 : soundFilesKit1;
  loadButton.disabled = false;
  loadButton.style.display = 'inline-block';
  clickCount = 0;
  loadButton.textContent = 'Load 3';
  Object.keys(sounds).forEach(key => delete sounds[key]);
  loadSounds(); // Voeg deze regel toe om de geluiden opnieuw te laden
});

steps.forEach(step => {
  step.addEventListener('click', () => {
    step.classList.toggle('active');
    updatePattern();
  });
});

bpmInput.addEventListener('input', () => {
  if (isPlaying) {
    stopPlayback();
    startPlayback();
  }
});

let songPatterns = [];

function updatePattern() {
  songPatterns = [[]];
  steps.forEach(step => {
    if (step.classList.contains('active')) {
      songPatterns[0].push({
        step: parseInt(step.dataset.step),
        sound: step.closest('.drum-row').dataset.sound
      });
    }
  });
}

function exportPattern() {
  const pattern = [];
  steps.forEach(step => {
    if (step.classList.contains('active')) {
      pattern.push({
        step: parseInt(step.dataset.step),
        sound: step.closest('.drum-row').dataset.sound
      });
    }
  });
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(pattern));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", "pattern.json");
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

document.getElementById('exportButton').addEventListener('click', exportPattern);

function readJSONFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(JSON.parse(event.target.result));
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
}

async function importPattern(event) {
  const file = event.target.files[0];
  if (!file) {
    alert("Please select a file to import.");
    return;
  }

  try {
    const pattern = await readJSONFile(file);
    steps.forEach(step => step.classList.remove('active'));
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

document.getElementById('importInput').addEventListener('change', importPattern);

loadButton.addEventListener('click', () => {
  clickCount++;
  if (clickCount <= 3) {
    loadSounds();
    playDummySound();
    if (clickCount < 3) {
      loadButton.textContent = `Load ${3 - clickCount}`;
    } else {
      loadButton.textContent = 'Done';
      loadButton.disabled = true;
      loadButton.style.display = 'none';
      document.getElementById('play').style.display = 'inline-block';
      document.getElementById('stop').style.display = 'inline-block';
    }
  }
});
