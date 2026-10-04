/* =========================
   UNDERNET NOTIFICATIONS
========================= */

import { supabase } from "./supabase.js";


/* =========================
   IN-PAGE TOASTS
========================= */

let notificationContainer = null;

function getNotificationContainer() {

    if (notificationContainer) {
        return notificationContainer;
    }

    notificationContainer =
        document.createElement("div");

    notificationContainer.id =
        "undernet-notifications";

    notificationContainer.className =
        "undernet-notifications";

    document.body.appendChild(
        notificationContainer
    );

    return notificationContainer;
}


export function showNotification({
    title = "NEW MESSAGE",
    message = "",
    onClick = null
} = {}) {

    const container =
        getNotificationContainer();

    const toast =
        document.createElement("button");

    toast.type = "button";
    toast.className = "undernet-notification";


    const icon =
        document.createElement("div");

    icon.className =
        "undernet-notification-icon";

    icon.textContent = "✦";


    const content =
        document.createElement("div");

    content.className =
        "undernet-notification-content";


    const titleElement =
        document.createElement("strong");

    titleElement.textContent =
        title;


    const messageElement =
        document.createElement("span");

    messageElement.textContent =
        message;


    content.appendChild(titleElement);
    content.appendChild(messageElement);


    const close =
        document.createElement("span");

    close.className =
        "undernet-notification-close";

    close.textContent = "×";


    toast.appendChild(icon);
    toast.appendChild(content);
    toast.appendChild(close);

    container.appendChild(toast);


    toast.addEventListener(
        "click",
        () => {

            if (onClick) {
                onClick();
            }

            removeNotification(toast);
        }
    );


    const timeout =
        setTimeout(() => {

            removeNotification(toast);

        }, 5000);


    function removeNotification(element) {

        clearTimeout(timeout);

        element.classList.add(
            "notification-hide"
        );

        setTimeout(() => {

            element.remove();

        }, 250);
    }
}


/* =========================
   BROWSER NOTIFICATIONS
========================= */

export async function requestNotificationPermission() {

    if (!("Notification" in window)) {

        console.warn(
            "⚠️ Browser notifications are not supported."
        );

        return false;
    }


    if (Notification.permission === "granted") {

        return true;
    }


    if (Notification.permission === "denied") {

        console.warn(
            "🔕 Browser notifications are blocked."
        );

        return false;
    }


    const permission =
        await Notification.requestPermission();


    console.log(
        "🔔 NOTIFICATION PERMISSION:",
        permission
    );


    return permission === "granted";
}


/* =========================
   SHOW BROWSER NOTIFICATION
========================= */

export function showBrowserNotification({
    title = "UNDERNET",
    message = "",
    url = null
} = {}) {

    if (!("Notification" in window)) {
        return;
    }


    if (
        Notification.permission !==
        "granted"
    ) {
        return;
    }


    const notification =
        new Notification(
            title,
            {
                body: message,
                icon: "/favicon.ico",
                tag: "undernet-message"
            }
        );


    notification.onclick =
        () => {

            window.focus();

            if (url) {
                window.location.href =
                    url;
            }

            notification.close();
        };
}


/* =========================
   PUSH NOTIFICATIONS
========================= */

function urlBase64ToUint8Array(base64String) {

    const padding =
        "=".repeat(
            (4 - (base64String.length % 4)) % 4
        );

    const base64 =
        (
            base64String + padding
        )
            .replace(/-/g, "+")
            .replace(/_/g, "/");

    const rawData =
        atob(base64);

    return Uint8Array.from(
        [...rawData].map(
            char => char.charCodeAt(0)
        )
    );
}


async function setupPushNotifications() {

    if (!("serviceWorker" in navigator)) {

        console.log(
            "❌ Service workers are not supported."
        );

        return;
    }


    if (!("Notification" in window)) {

        console.log(
            "❌ Browser notifications are not supported."
        );

        return;
    }


    try {

        /* Register service worker */

        const registration =
            await navigator.serviceWorker.register(
                "/OuternetV2/sw.js"
            );


        console.log(
            "🔔 Service worker registered!"
        );


        /* Ask for notification permission */

        const permission =
            await requestNotificationPermission();


        if (!permission) {

            console.log(
                "❌ Notification permission was not granted."
            );

            return;
        }


        console.log(
            "✅ Notification permission granted!"
        );


        /* VAPID PUBLIC KEY */

        const VAPID_PUBLIC_KEY =
            "BLYDjCkhu00nKYXF59nIFb6nPG5gBjyyCikDJNv0ArdL96YcnK7GJxb9-JcHPAuCT5zWRXfI0WuNXMoY8DGZ-B0";


        /* Create push subscription */

        const subscription =
            await registration.pushManager.subscribe({
                userVisibleOnly: true,

                applicationServerKey:
                    urlBase64ToUint8Array(
                        VAPID_PUBLIC_KEY
                    )
            });


        console.log(
            "📡 PUSH SUBSCRIPTION CREATED:",
            subscription
        );

    } catch (error) {

        console.error(
            "❌ Push notification setup failed:",
            error
        );

    }
}


/* =========================
   ENABLE NOTIFICATIONS BUTTON
========================= */

const notificationButton =
    document.getElementById(
        "enable-notifications"
    );


if (notificationButton) {

    notificationButton.addEventListener(
        "click",
        async () => {

            await setupPushNotifications();

        }
    );

}
