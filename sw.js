// sw.js - Service Worker with Auto Versioning
const CACHE_NAME = 'emmanuel-royal-band-' + Date.now(); // Auto-generate unique cache name
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css', 
  '/script.js',
  '/members.html',
  '/leadership.html',
  '/history.html',
  '/music.html',
  '/events.html',
  '/member-dashboard.html',
  '/supabase-config-enhanced.js',
  '/security-utils.js',
  '/profile-utils.js',
  '/members-auth.js',
  '/member-dashboard.js',
  '/music-manager.js',
  '/admin-dashboard.js'
];

// Install - cache files
self.addEventListener('install', event => {
  console.log('🔄 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
  );
});

// Fetch - serve from cache or network
self.addEventListener('fetch', event => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Otherwise fetch from network and cache it
        return fetch(event.request).then(response => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
            
          return response;
        });
      })
      .catch(() => {
        // If both cache and network fail, you could show offline page
        console.log('❌ Both cache and network failed for:', event.request.url);
      })
  );
});

// Activate - clean up old caches AUTOMATICALLY
self.addEventListener('activate', event => {
  console.log('✅ Service Worker activated');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete all caches except the current one
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all clients
      return self.clients.claim();
    })
  );
});
