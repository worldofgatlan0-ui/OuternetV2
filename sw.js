self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    data = {};
  }

  const title = data.title || "OuternetV2";
  const options = {
    body: data.body || "You have a new notification!",
    icon: data.icon || "/OuternetV2/icon.png",
    badge: data.badge || "/OuternetV2/icon.png",
    data: {
      url: data.url || "/OuternetV2/"
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});


self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url =
    event.notification.data?.url ||
    "/OuternetV2/";

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then((clientList) => {

      for (const client of clientList) {
        if ("focus" in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
