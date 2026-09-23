import { supabase } from "./supabase.js";

console.log("🔥 UNDERNET MESSAGES.JS LOADED");
console.log("🟢 SUPABASE IMPORTED");

const conversationList =
    document.getElementById("conversation-list");

const chatView =
    document.getElementById("chat-view");

const chatArea =
    document.getElementById("chat-area");

const messageForm =
    document.getElementById("message-form");

const messageInput =
    document.getElementById("message-input");

const messageUsername =
    document.getElementById("message-username");

const messageAvatar =
    document.getElementById("message-avatar");

const backButton =
    document.getElementById("back-to-messages");

const navUsername =
    document.getElementById("nav-username");

const navAvatar =
    document.getElementById("nav-avatar");

const logoutButton =
    document.getElementById("logout-button");

let currentUser = null;
let receiverId = null;


/* =========================
   LOAD USER
========================= */

async function loadUser() {

    console.log("🔍 STARTING LOAD USER...");

    const {
        data: { user },
        error
    } = await supabase.auth.getUser();

    console.log("🔐 AUTH CHECK FINISHED");

    if (error || !user) {

        console.error(
            "❌ AUTH ERROR:",
            error
        );

        window.location.href =
            "login.html";

        return false;
    }

    currentUser = user;

    console.log(
        "👤 LOGGED IN:",
        user.id
    );


    /* LOAD PROFILE */

    const {
        data: profile,
        error: profileError
    } = await supabase
        .from("profiles")
        .select(
            "username, display_name, avatar_url"
        )
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {

        console.error(
            "❌ PROFILE ERROR:",
            profileError
        );
    }


    const username =
        profile?.display_name ||
        profile?.username ||
        user.email?.split("@")[0] ||
        "Unknown";


    /* NAV USERNAME */

    if (navUsername) {

        navUsername.textContent =
            username;
    }


    /* NAV AVATAR */

    if (navAvatar) {

        if (profile?.avatar_url) {

            navAvatar.textContent = "";

            navAvatar.style.backgroundImage =
                `url("${profile.avatar_url}")`;

            navAvatar.style.backgroundSize =
                "cover";

            navAvatar.style.backgroundPosition =
                "center";

        } else {

            navAvatar.style.backgroundImage =
                "";

            navAvatar.textContent =
                username
                    .charAt(0)
                    .toUpperCase();
        }
    }

    return true;
}


/* =========================
   LOAD FRIENDS
========================= */

async function loadFriends() {

    if (!conversationList || !currentUser) {
        return;
    }

    console.log(
        "👥 LOADING FRIENDS..."
    );

    conversationList.innerHTML =
        "<div class='empty-box'>Loading friends...</div>";


    const {
        data: friendships,
        error
    } = await supabase
        .from("friendships")
        .select(
            "user1_id, user2_id"
        )
        .or(
            `user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`
        );


    console.log(
        "👥 FRIENDSHIPS:",
        friendships,
        error
    );


    if (error) {

        console.error(
            "❌ FRIENDSHIP ERROR:",
            error
        );

        conversationList.innerHTML =
            "<div class='empty-box'>Could not load friends.</div>";

        return;
    }


    if (
        !friendships ||
        friendships.length === 0
    ) {

        conversationList.innerHTML =
            "<div class='empty-box'>You don't have any friends yet.</div>";

        return;
    }


    const friendIds =
        friendships.map(
            (friendship) => {

                return friendship.user1_id ===
                    currentUser.id

                    ? friendship.user2_id

                    : friendship.user1_id;
            }
        );


    console.log(
        "🆔 FRIEND IDS:",
        friendIds
    );


    const {
        data: friends,
        error: friendError
    } = await supabase
        .from("profiles")
        .select(
            "id, username, display_name, avatar_url"
        )
        .in(
            "id",
            friendIds
        );


    console.log(
        "👤 FRIEND PROFILES:",
        friends,
        friendError
    );


    if (friendError) {

        console.error(
            "❌ FRIEND PROFILE ERROR:",
            friendError
        );

        conversationList.innerHTML =
            "<div class='empty-box'>Could not load friend profiles.</div>";

        return;
    }


    conversationList.innerHTML = "";


    friends.forEach(
        createConversation
    );
}


/* =========================
   CREATE FRIEND ITEM
========================= */

function createConversation(friend) {

    const item =
        document.createElement("button");

    item.type = "button";

    item.className =
        "conversation-item";


    const avatar =
        document.createElement("div");

    avatar.className =
        "message-avatar";


    const name =
        friend.display_name ||
        friend.username ||
        "Unknown";


    if (friend.avatar_url) {

        avatar.style.backgroundImage =
            `url("${friend.avatar_url}")`;

        avatar.style.backgroundSize =
            "cover";

        avatar.style.backgroundPosition =
            "center";

    } else {

        avatar.textContent =
            name
                .charAt(0)
                .toUpperCase();
    }


    const info =
        document.createElement("div");


    const username =
        document.createElement("strong");

    username.textContent =
        name;


    const status =
        document.createElement("span");

    status.textContent =
        "🟢 Online";


    info.appendChild(username);
    info.appendChild(status);

    item.appendChild(avatar);
    item.appendChild(info);


    item.addEventListener(
        "click",
        () => openChat(friend)
    );


    conversationList.appendChild(item);
}


/* =========================
   OPEN CHAT
========================= */

async function openChat(friend) {

    receiverId =
        friend.id;


    console.log(
        "💬 OPENING CHAT:",
        friend.id
    );


    const name =
        friend.display_name ||
        friend.username ||
        "Unknown";


    if (messageUsername) {

        messageUsername.textContent =
            name;
    }


    if (messageAvatar) {

        if (friend.avatar_url) {

            messageAvatar.textContent = "";

            messageAvatar.style.backgroundImage =
                `url("${friend.avatar_url}")`;

            messageAvatar.style.backgroundSize =
                "cover";

            messageAvatar.style.backgroundPosition =
                "center";

        } else {

            messageAvatar.style.backgroundImage =
                "";

            messageAvatar.textContent =
                name
                    .charAt(0)
                    .toUpperCase();
        }
    }


    document.querySelector(
        ".messages-list-section"
    ).style.display =
        "none";


    document.getElementById(
        "messages-default-header"
    ).style.display =
        "none";


    chatView.style.display =
        "block";


    await loadMessages();
}


/* =========================
   LOAD MESSAGES
========================= */

async function loadMessages() {

    if (
        !chatArea ||
        !currentUser ||
        !receiverId
    ) {
        return;
    }


    chatArea.innerHTML =
        "<div class='empty-box'>Loading messages...</div>";


    const {
        data,
        error
    } = await supabase
        .from("messages")
        .select(`
            id,
            content,
            created_at,
            sender_id,
            receiver_id,
            sender:profiles!messages_sender_id_fkey (
                username,
                display_name
            )
        `)
        .or(
            `and(sender_id.eq.${currentUser.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUser.id})`
        )
        .order(
            "created_at",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            "❌ MESSAGE LOAD ERROR:",
            error
        );

        chatArea.innerHTML =
            "<div class='empty-box'>Could not load messages.</div>";

        return;
    }


    chatArea.innerHTML = "";


    if (
        !data ||
        data.length === 0
    ) {

        chatArea.innerHTML = `
            <div class="empty-chat">
                <div class="empty-chat-icon">💬</div>
                <h2>No messages yet</h2>
                <p>Send a message to start the conversation!</p>
            </div>
        `;

        return;
    }


    data.forEach(
        addMessage
    );


    chatArea.scrollTop =
        chatArea.scrollHeight;
}


/* =========================
   DISPLAY MESSAGE
========================= */

function addMessage(message) {

    const article =
        document.createElement("article");


    article.className =
        message.sender_id ===
            currentUser.id

            ? "message message-own"

            : "message";


    const username =
        message.sender?.display_name ||
        message.sender?.username ||
        "Unknown";


    const name =
        document.createElement("strong");

    name.textContent =
        username;


    const content =
        document.createElement("span");

    content.textContent =
        message.content;


    article.appendChild(name);
    article.appendChild(content);


    chatArea.appendChild(article);
}


/* =========================
   DISPLAY MESSAGE
========================= */

function addMessage(message, showDate = true) {

    const article =
        document.createElement("article");

    const isOwn =
        message.sender_id === currentUser.id;

    article.className =
        isOwn
            ? "message message-own"
            : "message";


    /* =========================
       DATE
    ========================= */

    if (showDate && message.created_at) {

        const date =
            new Date(message.created_at);

        const dateLabel =
            document.createElement("div");

        dateLabel.className =
            "message-date";

        const now =
            new Date();

        const today =
            date.toDateString() ===
            now.toDateString();

        const yesterday =
            new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate() - 1
            ).toDateString();

        if (today) {

            dateLabel.textContent =
                "Today";

        } else if (
            date.toDateString() === yesterday
        ) {

            dateLabel.textContent =
                "Yesterday";

        } else {

            dateLabel.textContent =
                date.toLocaleDateString(
                    undefined,
                    {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                    }
                );
        }

        chatArea.appendChild(
            dateLabel
        );
    }


    /* =========================
       BUBBLE
    ========================= */

    const bubble =
        document.createElement("div");

    bubble.className =
        "message-bubble";


    /* =========================
       CONTENT
    ========================= */

    const content =
        document.createElement("span");

    content.className =
        "message-content";

    content.textContent =
        message.content;


    /* =========================
       TIME
    ========================= */

    const time =
        document.createElement("time");

    time.className =
        "message-time";

    if (message.created_at) {

        time.textContent =
            new Date(
                message.created_at
            ).toLocaleTimeString(
                undefined,
                {
                    hour: "numeric",
                    minute: "2-digit"
                }
            );
    }


    bubble.appendChild(
        content
    );

    bubble.appendChild(
        time
    );


    article.appendChild(
        bubble
    );


    chatArea.appendChild(
        article
    );
}

/* =========================
   BACK BUTTON
========================= */

if (backButton) {

    backButton.addEventListener(
        "click",
        () => {

            receiverId = null;

            chatView.style.display =
                "none";


            document.querySelector(
                ".messages-list-section"
            ).style.display =
                "";


            document.getElementById(
                "messages-default-header"
            ).style.display =
                "";


            if (messageInput) {
                messageInput.value = "";
            }
        }
    );
}


/* =========================
   SEND FORM
========================= */

if (messageForm) {

    messageForm.addEventListener(
        "submit",
        sendMessage
    );
}


/* =========================
   LOGOUT
========================= */

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async () => {

            const {
                error
            } =
                await supabase.auth.signOut();


            if (error) {

                console.error(
                    "LOGOUT ERROR:",
                    error
                );

                return;
            }


            window.location.href =
                "login.html";
        }
    );
}


/* =========================
   START
========================= */

console.log(
    "🚀 STARTING MESSAGES PAGE..."
);


const loggedIn =
    await loadUser();


console.log(
    "✅ LOAD USER FINISHED:",
    loggedIn
);


if (loggedIn) {

    console.log(
        "👥 STARTING FRIEND LOAD..."
    );

    await loadFriends();
}
