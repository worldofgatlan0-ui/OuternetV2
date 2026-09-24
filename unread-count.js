let unreadMessages = 0;


/* =========================
   GET BADGE
========================= */

function getBadge() {

    return document.getElementById(
        "messages-unread-badge"
    );
}


/* =========================
   UPDATE BADGE
========================= */

function updateUnreadBadge() {

    const badge =
        getBadge();

    if (!badge) {
        return;
    }


    if (unreadMessages <= 0) {

        badge.textContent = "";

        badge.classList.remove(
            "visible"
        );

        return;
    }


    badge.textContent =
        unreadMessages >= 10
            ? "9+"
            : unreadMessages;


    badge.classList.add(
        "visible"
    );
}


/* =========================
   INCREASE COUNT
========================= */

export function increaseUnreadMessages() {

    unreadMessages++;

    updateUnreadBadge();
}


/* =========================
   CLEAR COUNT
========================= */

export function clearUnreadMessages() {

    unreadMessages = 0;

    updateUnreadBadge();
}


/* =========================
   GET COUNT
========================= */

export function getUnreadMessageCount() {

    return unreadMessages;
}
