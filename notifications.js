/* =========================
   UNDERNET NOTIFICATIONS
========================= */

let notificationContainer = null;


/* =========================
   CREATE CONTAINER
========================= */

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


/* =========================
   SHOW NOTIFICATION
========================= */

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

    toast.className =
        "undernet-notification";


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


    content.appendChild(
        titleElement
    );

    content.appendChild(
        messageElement
    );


    const close = 
        document.createElement("span");

    close.className =
        "undernet-notification-close";

    close.textContent = "×";


    toast.appendChild(icon);
    toast.appendChild(content);
    toast.appendChild(close);

    container.appendChild(toast);


    /* CLICK */

    toast.addEventListener(
        "click",
        () => {

            if (onClick) {
                onClick();
            }

            removeNotification(
                toast
            );
        }
    );


    /* AUTO REMOVE */

    const timeout =
        setTimeout(() => {

            removeNotification(
                toast
            );

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
