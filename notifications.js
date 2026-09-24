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

    close.textContent =
        "×";


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
