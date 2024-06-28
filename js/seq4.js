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
let swingAmount = swingInput.value / 100;
const sounds = {};
const lookahead = 25.0;
const scheduleAheadTime = 0.1;
let nextNoteTime = 0.0;

// Nieuwe variabelen voor Song Mode
let songPatterns = [];
let isSongPlaying = false;
let songIndex = 0;
let songStepIndex = 0;

// Nieuwe DOM elementen voor Song Mode
const patternLoader = document.getElementById('patternLoader');
const playSongButton = document.getElementById('playSong');

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

function scheduleNote(stepIndex, time) {
  stepIndicators.forEach(indicator => indicator.classList.remove('active'));
  stepIndicators[stepIndex].classList.add('active');
  steps.forEach(step => {
    if (step.dataset.step == stepIndex + 1 && step.classList.contains('active')) {
      const soundKey = step.closest('.drum-row').dataset.sound;
      if (sounds[soundKey]) {
        playSound(sounds[soundKey], time, soundVolumes[soundKey] || 1);
      }
    }
  });
}

function nextNote() {
  const secondsPerBeat = 60.0 / bpmInput.value;
  let swingOffset = 0;
  if (currentStep % 2 !== 0 && swingAmount > 0) {
    swingOffset = (Math.random() - 0.5) * swingAmount * 0.5 * secondsPerBeat;
  }
  nextNoteTime += 0.5 * secondsPerBeat + swingOffset;
  currentStep++;
  if (currentStep === 8) {
    currentStep = 0;
  }
}

function scheduler() {
  while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
    if (isSongPlaying) {
      scheduleSongNote();
    } else {
      scheduleNote(currentStep, nextNoteTime);
      nextNote();
    }
  }
  schedulerTimerId = setTimeout(scheduler, lookahead);
}

function startSequencer() {
  if (!isPlaying) {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
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
    isSongPlaying = false;
    clearTimeout(schedulerTimerId);
    stepIndicators.forEach(indicator => indicator.classList.remove('active'));
    document.getElementById('play').style.display = 'inline-block';
    document.getElementById('stop').style.display = 'none';
    playSongButton.textContent = "Play Song";
  }
}

// Nieuwe functies voor Song Mode
async function loadPatterns(event) {
  const files = event.target.files;
  songPatterns = [];

  for (let file of files) {
    const pattern = await readJSONFile(file);
    songPatterns.push(pattern);
  }

  alert(`${songPatterns.length} patterns loaded successfully.`);
}

function readJSONFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(JSON.parse(event.target.result));
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
}

function toggleSongPlayback() {
  if (isSongPlaying) {
    stopSong();
  } else {
    playSong();
  }
}

function playSong() {
  if (songPatterns.length === 0) {
    alert("No patterns loaded.");
    return;
  }

  isSongPlaying = true;
  isPlaying = true;
  playSongButton.textContent = "Stop Song";
  songIndex = 0;
  songStepIndex = 0;
  nextNoteTime = audioCtx.currentTime;
  startSequencer();
}

function stopSong() {
  isSongPlaying = false;
  stopSequencer();
}

function scheduleSongNote() {
  if (songIndex >= songPatterns.length) {
    songIndex = 0;
  }

  const pattern = songPatterns[songIndex];
  importPattern(pattern);

  scheduleNote(songStepIndex, nextNoteTime);

  const secondsPerBeat = 60.0 / bpmInput.value;
  nextNoteTime += 0.5 * secondsPerBeat;

  songStepIndex++;
  if (songStepIndex >= 8) {
    songStepIndex = 0;
    songIndex++;
  }
}

function importPattern(pattern) {
  steps.forEach(step => step.classList.remove('active'));
  pattern.forEach(item => {
    const step = document.querySelector(`.drum-row[data-sound="${item.sound}"] .grid-cell[data-step="${item.step}"]`);
    if (step) {
      step.classList.add('active');
    }
  });
}

// Event listeners
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
swingInput.addEventListener('input', () => {
  swingAmount = swingInput.value / 100;
});
patternLoader.addEventListener('change', loadPatterns);
playSongButton.addEventListener('click', toggleSongPlayback);

// Initialisatie
loadSounds();