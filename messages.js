import { supabase } from "./supabase.js";

console.log("🔥 UNDERNET MESSAGES.JS LOADED");
console.log("🟢 SUPABASE IMPORTED");


/* =========================
   DOM ELEMENTS
========================= */

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


/* =========================
   STATE
========================= */

let currentUser = null;
let receiverId = null;
let messageChannel = null;


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

        window.location.href = "login.html";

        return false;
    }

    currentUser = user;

    console.log(
        "👤 LOGGED IN:",
        user.id
    );


    /* =========================
       LOAD PROFILE
    ========================= */

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


    /* =========================
       NAV USERNAME
    ========================= */

    if (navUsername) {

        navUsername.textContent =
            username;
    }


    /* =========================
       NAV AVATAR
    ========================= */

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
   REALTIME MESSAGES
========================= */

function subscribeToMessages() {

    if (
        !currentUser ||
        !receiverId
    ) {
        return;
    }


    console.log(
        "📡 STARTING REALTIME:",
        receiverId
    );


    /* Remove previous channel */

    if (messageChannel) {

        console.log(
            "📡 REMOVING OLD REALTIME CHANNEL"
        );

        supabase.removeChannel(
            messageChannel
        );

        messageChannel = null;
    }


    messageChannel =
        supabase
            .channel(
                `messages-${currentUser.id}-${receiverId}`
            )
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages"
                },
                async (payload) => {

                    const message =
                        payload.new;


                    console.log(
                        "📨 REALTIME MESSAGE:",
                        message
                    );


                    /*
                       Only display messages
                       belonging to this chat.
                    */

                    const isThisConversation =
                        (
                            message.sender_id ===
                                receiverId &&
                            message.receiver_id ===
                                currentUser.id
                        );


                    if (!isThisConversation) {

                        return;
                    }


                    /*
                       Get the sender profile so
                       the message has the same
                       shape as normal messages.
                    */

                    const {
                        data: sender,
                        error
                    } = await supabase
                        .from("profiles")
                        .select(
                            "username, display_name"
                        )
                        .eq(
                            "id",
                            message.sender_id
                        )
                        .maybeSingle();


                    if (error) {

                        console.error(
                            "❌ REALTIME PROFILE ERROR:",
                            error
                        );
                    }


                    message.sender =
                        sender || null;


                    /*
                       Add the incoming message
                       immediately.
                    */

                    addMessage(
                        message,
                        false
                    );


                    if (chatArea) {

                        chatArea.scrollTop =
                            chatArea.scrollHeight;
                    }
                }
            )
            .subscribe(
                (status) => {

                    console.log(
                        "📡 REALTIME STATUS:",
                        status
                    );

                    if (
                        status ===
                        "SUBSCRIBED"
                    ) {

                        console.log(
                            "✅ REALTIME CONNECTED!"
                        );
                    }

                    if (
                        status ===
                        "CHANNEL_ERROR"
                    ) {

                        console.error(
                            "❌ REALTIME CHANNEL ERROR"
                        );
                    }

                    if (
                        status ===
                        "TIMED_OUT"
                    ) {

                        console.error(
                            "❌ REALTIME TIMED OUT"
                        );
                    }
                }
            );
}


/* =========================
   STOP REALTIME
========================= */

function stopMessageRealtime() {

    if (!messageChannel) {
        return;
    }


    console.log(
        "📡 STOPPING REALTIME"
    );


    supabase.removeChannel(
        messageChannel
    );


    messageChannel =
        null;
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

    const listSection =
        document.querySelector(
            ".messages-list-section"
        );

    if (listSection) {
        listSection.style.display =
            "none";
    }

    const defaultHeader =
        document.getElementById(
            "messages-default-header"
        );

    if (defaultHeader) {
        defaultHeader.style.display =
            "none";
    }

    if (chatView) {
        chatView.style.display =
            "flex";
    }

    await loadMessages();

    subscribeToMessages();
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
                <div class="empty-chat-icon">
                    💬
                </div>

                <h2>
                    No messages yet
                </h2>

                <p>
                    Send a message to start the conversation!
                </p>
            </div>
        `;

        return;
    }

    let lastDate = null;

    data.forEach(
        (message) => {

            const messageDate =
                new Date(
                    message.created_at
                ).toDateString();

            const showDate =
                messageDate !== lastDate;

            addMessage(
                message,
                showDate
            );

            lastDate =
                messageDate;
        }
    );

    chatArea.scrollTop =
        chatArea.scrollHeight;
}


/* =========================
   DISPLAY MESSAGE
========================= */

function addMessage(
    message,
    showDate = false
) {

    if (!chatArea || !currentUser) {
        return;
    }

    const article =
        document.createElement("article");

    const isOwn =
        message.sender_id ===
        currentUser.id;


    /*
       IMPORTANT:
       Use chat-message here instead of
       message so the DM system does not
       collide with the server chat styles.
    */

    article.className =
        isOwn
            ? "chat-message own"
            : "chat-message";


    /* =========================
       DATE SEPARATOR
    ========================= */

    if (
        showDate &&
        message.created_at
    ) {

        const date =
            new Date(
                message.created_at
            );

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
            date.toDateString() ===
            yesterday
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
       MESSAGE BUBBLE
    ========================= */

    const bubble =
        document.createElement("div");

    bubble.className =
        "message-bubble";


    /* =========================
       MESSAGE CONTENT
    ========================= */

    const content =
        document.createElement("span");

    content.className =
        "message-content";

    content.textContent =
        message.content;


    /* =========================
       MESSAGE TIME
    ========================= */

    const time =
        document.createElement("time");

    time.className =
        "message-time";


    if (message.created_at) {

        const date =
            new Date(
                message.created_at
            );

        time.dateTime =
            message.created_at;

        time.textContent =
            date.toLocaleTimeString(
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
   SEND MESSAGE
========================= */

async function sendMessage(event) {

    event.preventDefault();

    if (
        !currentUser ||
        !receiverId ||
        !messageInput
    ) {
        return;
    }

    const content =
        messageInput.value.trim();

    if (!content) {
        return;
    }

    messageInput.disabled =
        true;

    try {

        const {
            data,
            error
        } = await supabase
            .from("messages")
            .insert({
                sender_id: currentUser.id,
                receiver_id: receiverId,
                content: content
            })
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
            .single();

        if (error) {

            console.error(
                "❌ SEND MESSAGE ERROR:",
                error
            );

            return;
        }

        messageInput.value = "";

        addMessage(
            data,
            false
        );

        if (chatArea) {

            chatArea.scrollTop =
                chatArea.scrollHeight;
        }

    } finally {

        messageInput.disabled =
            false;

        messageInput.focus();
    }
}


/* =========================
   BACK BUTTON
========================= */

if (backButton) {

    backButton.addEventListener(
        "click",
        () => {

            stopMessageRealtime();

            receiverId =
                null;

            if (chatView) {
                chatView.style.display =
                    "none";
            }

            const listSection =
                document.querySelector(
                    ".messages-list-section"
                );

            if (listSection) {
                listSection.style.display =
                    "";
            }

            const defaultHeader =
                document.getElementById(
                    "messages-default-header"
                );

            if (defaultHeader) {
                defaultHeader.style.display =
                    "";
            }

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

            stopMessageRealtime();

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
