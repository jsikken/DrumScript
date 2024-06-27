const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 22050 });

// Maak een array om de geladen buffers op te slaan
const loadedBuffers = {};

const gainNodes = {};

const soundFiles = {
    '1': './kit5/kd.wav',
    '2': './kit5/sd.wav',
    '3': './kit5/hhc.wav',
    '4': './kit5/hho.wav',
    '5': './kit5/t1.wav',
    '6': './kit5/t2.wav',
    '7': './kit5/crash.wav',
    '8': './kit5/clap.wav',
    '9': './kit5/ride.wav'
};

// Laad alle geluidsbestanden vooraf
Object.keys(soundFiles).forEach(async key => {
    const response = await fetch(soundFiles[key]);
    const arrayBuffer = await response.arrayBuffer();
    loadedBuffers[key] = await audioContext.decodeAudioData(arrayBuffer);
});

Object.keys(soundFiles).forEach(key => {
    gainNodes[key] = audioContext.createGain();

    // Stel het volume in voor elke audio file
    switch (key) {
        case '1':
            gainNodes[key].gain.value = 0.7;
            break;
        case '2':
            gainNodes[key].gain.value = 1;
            break;
        case '3':
            gainNodes[key].gain.value = 0.5;
            break;
        case '4':
            gainNodes[key].gain.value = 0.3;
            break;
        case '5':
            gainNodes[key].gain.value = 0.9;
            break;
        case '6':
            gainNodes[key].gain.value = 0.6;
            break;
        case '7':
            gainNodes[key].gain.value = 0.6;
            break;
        case '8':
            gainNodes[key].gain.value = 0.8;
            break;
        case '9':
            gainNodes[key].gain.value = 0.5;
            break;
        default:
            gainNodes[key].gain.value = 0.5; // Default volume
    }

    gainNodes[key].connect(audioContext.destination);
});

// Extra GainNode voor de snare (case '2')
const snareExtraGainNode = audioContext.createGain();
snareExtraGainNode.gain.value = 1.2; // 120% volume

// Verbind de snare met de extra GainNode
gainNodes['2'].connect(snareExtraGainNode);
snareExtraGainNode.connect(audioContext.destination);

// Hihat choking logic
let activeHihatOpenSource = null;

function playSound(key) {
    if (key === '3' && activeHihatOpenSource) {
        activeHihatOpenSource.stop();
        activeHihatOpenSource = null;
    }

    const source = audioContext.createBufferSource();
    source.buffer = loadedBuffers[key];
    source.connect(gainNodes[key]).connect(audioContext.destination);

    if (key === '4') {
        if (activeHihatOpenSource) {
            activeHihatOpenSource.stop();
        }
        activeHihatOpenSource = source;
    }

    source.start();
}

function animateKey(key) {
    key.classList.add('active');
    setTimeout(() => {
        key.classList.remove('active');
    }, 100);
}

document.querySelectorAll('.key').forEach(key => {
    key.addEventListener('click', function() {
        const keyAttribute = this.getAttribute('data-key');
        if (loadedBuffers[keyAttribute]) {
            playSound(keyAttribute);
            animateKey(this);
        }
    });

    key.addEventListener('touchstart', function(e) {
        e.preventDefault();
        const keyAttribute = this.getAttribute('data-key');
        if (loadedBuffers[keyAttribute]) {
            playSound(keyAttribute);
            animateKey(this);
        }
    });
});

window.addEventListener('keydown', function(event) {
    const keyElement = document.querySelector(`.key[data-key="${event.key.toUpperCase()}"]`);
    if (keyElement) {
        const keyAttribute = keyElement.getAttribute('data-key');
        if (loadedBuffers[keyAttribute]) {
            playSound(keyAttribute);
            animateKey(keyElement);
        }
    }
});

// Fix AudioContext on iOS
function fixAudioContext() {
    if (audioContext.state === 'suspended') {
        const buffer = audioContext.createBuffer(1, 1, 22050);
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start(0);
    }
}

document.addEventListener('click', fixAudioContext);
document.addEventListener('touchstart', fixAudioContext);

// Achtergrondanimatie op drumpads
document.querySelectorAll('.key').forEach(key => {
    key.addEventListener('mousedown', () => {
        key.classList.add('animate-background');
    });

    key.addEventListener('mouseup', () => {
        setTimeout(() => {
            key.classList.remove('animate-background');
        }, 500); // Zorg ervoor dat dit overeenkomt met de duur van de animatie
    });

    key.addEventListener('touchstart', (e) => {
        e.preventDefault();
        key.classList.add('animate-background');
    });

    key.addEventListener('touchend', () => {
        setTimeout(() => {
            key.classList.remove('animate-background');
        }, 500); // Zorg ervoor dat dit overeenkomt met de duur van de animatie
    });
});
