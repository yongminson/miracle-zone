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