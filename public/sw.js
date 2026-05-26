const CACHE = "myungwoon-v1";
const OFFLINE_URLS = ["/", "/tools"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(OFFLINE_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});

self.addEventListener('push', function (event) {
    if (event.data) {
      const data = event.data.json();
      const options = {
        body: data.body,
        icon: data.icon || '/logo.png', // 우리가 만든 명운 로고
        badge: '/logo.png',
        vibrate: [100, 50, 100], // 스마트폰 진동 패턴
        data: {
          url: data.url || '/',
        },
      };
      event.waitUntil(self.registration.showNotification(data.title, options));
    }
  });
  
  self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    // 알림을 클릭하면 해당 URL(우리 사이트)로 이동
    event.waitUntil(clients.openWindow(event.notification.data.url));
  });