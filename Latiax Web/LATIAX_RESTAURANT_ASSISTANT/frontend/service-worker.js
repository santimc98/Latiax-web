// Service worker simplificado para modo demo
// Este archivo es una versión reducida para evitar errores cuando no hay conexión con un backend

const CACHE_NAME = 'restaurant-assistant-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/main.css',
  '/js/chat.js',
  '/js/voice.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
  'https://img.icons8.com/color/48/000000/restaurant.png'
];

// Instalación del service worker
self.addEventListener('install', (event) => {
  console.log('Service Worker instalado');
  self.skipWaiting();
});

// Activación del service worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker activado');
  return self.clients.claim();
});

// Interceptar peticiones fetch
self.addEventListener('fetch', (event) => {
  // Devolver la petición original sin modificar en modo demo
  event.respondWith(fetch(event.request).catch(() => {
    console.log('Error en fetch, devolviendo offline page si es una página HTML');
    if (event.request.destination === 'document') {
      return caches.match('/offline.html');
    }
    return new Response('Recurso no disponible', { 
      status: 503,
      statusText: 'Servicio no disponible' 
    });
  }));
}); 