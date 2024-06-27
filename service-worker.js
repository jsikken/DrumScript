const CACHE_NAME = 'drum-machine-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/seqv2.html',
  '/script.js',
  '/scriptseqv2.js',
  '/styles.css',
  'kickwav.m4a',
  'snarewav.m4a',
  'hihatclosedwav.m4a',
  'hihatopenwav.m4a',
  'hitomwav.m4a',
  'midtomwav.m4a',
  'crashwav.m4a',
  'clapwav.m4a',
  'gunshotwav.m4a',
  'ride.m4a',
  'china.m4a'
];

// Bestanden in de GBkit map
const gbkitFiles = [
  'GBkit/clap.m4a',
  'GBkit/crash.m4a',
  'GBkit/fx.m4a',
  'GBkit/gbkit.html',
  'GBkit/gbkitscript.js',
  'GBkit/gbkitstyle.css',
  'GBkit/hhc.m4a',
  'GBkit/hho.m4a',
  'GBkit/kd.m4a',
  'GBkit/sd.m4a',
  'GBkit/t1.m4a'
  'GBkit/t2.m4a'
];

// Combineer beide lijsten
const allUrlsToCache = urlsToCache.concat(gbkitFiles);

self.addEventListener('install', function(event) {
    console.log('Service Worker installing.');
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            console.log('Caching all files');
            return cache.addAll(allUrlsToCache);
        })
    );
});

self.addEventListener('activate', function(event) {
    console.log('Service Worker activating.');
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request).then(function(response) {
            return response || fetch(event.request);
        })
    );
});
