import { supabase } from "./supabase.js";

console.log("🔥 UNDERNET MESSAGES.JS LOADED");
console.log("🟢 SUPABASE IMPORTED");


/* =========================
   CHAT STYLES
========================= */

const chatStyle = document.createElement("style");

chatStyle.textContent = `
/* CHAT AREA */

#chat-area {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 20px;
    overflow-y: auto;
    overflow-x: hidden;
}


/* MESSAGE ROW */

.chat-message {
    display: flex;
    width: 100%;
    justify-content: flex-start;
}


/* YOUR MESSAGE */

.chat-message.own {
    justify-content: flex-end;
}


/* MESSAGE BUBBLE */

.message-bubble {
    display: flex;
    flex-direction: column;
    gap: 4px;

    max-width: min(70%, 520px);

    padding: 10px 14px;

    border-radius: 16px;

    background: #252535;

    border: 1px solid rgba(255,255,255,0.08);

    box-shadow:
        0 3px 8px rgba(0,0,0,0.18);

    word-break: break-word;
}


/* FRIEND BUBBLE */

.chat-message:not(.own) .message-bubble {
    border-bottom-left-radius: 5px;
}


/* YOUR BUBBLE */

.chat-message.own .message-bubble {
    border-bottom-right-radius: 5px;
}


/* MESSAGE TEXT */

.message-content {
    line-height: 1.4;
    white-space: pre-wrap;
}


/* TIME */

.message-time {
    align-self: flex-end;

    font-size: 10px;

    opacity: 0.55;

    white-space: nowrap;
}


/* DATE SEPARATOR */

.message-date {
    align-self: center;

    margin: 16px 0 8px;

    padding: 5px 12px;

    border-radius: 999px;

    background: rgba(255,255,255,0.06);

    border: 1px solid rgba(255,255,255,0.08);

    font-size: 11px;

    opacity: 0.7;
}


/* MOBILE */

@media (max-width: 600px) {

    .message-bubble {
        max-width: 82%;
    }

    #chat-area {
        padding: 12px;
    }
}
`;

document.head.appendChild(chatStyle);


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

        console.error("❌ AUTH ERROR:", error);

        window.location.href = "login.html";

        return false;
    }

    currentUser = user;

    console.log("👤 LOGGED IN:", user.id);


    const {
        data: profile,
        error: profileError
    } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();


    if (profileError) {
        console.error("❌ PROFILE ERROR:", profileError);
    }


    const username =
        profile?.display_name ||
        profile?.username ||
        user.email?.split("@")[0] ||
        "Unknown";


    if (navUsername) {
        navUsername.textContent = username;
    }


    if (navAvatar) {

        if (profile?.avatar_url) {

            navAvatar.textContent = "";

            navAvatar.style.backgroundImage =
                `url("${profile.avatar_url}")`;

            navAvatar.style.backgroundSize = "cover";
            navAvatar.style.backgroundPosition = "center";

        } else {

            navAvatar.style.backgroundImage = "";

            navAvatar.textContent =
                username.charAt(0).toUpperCase();
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

    console.log("👥 LOADING FRIENDS...");

    conversationList.innerHTML =
        "<div class='empty-box'>Loading friends...</div>";


    const {
        data: friendships,
        error
    } = await supabase
        .from("friendships")
        .select("user1_id, user2_id")
        .or(
            `user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`
        );


    console.log(
        "👥 FRIENDSHIPS:",
        friendships,
        error
    );


    if (error) {

        console.error("❌ FRIENDSHIP ERROR:", error);

        conversationList.innerHTML =
            "<div class='empty-box'>Could not load friends.</div>";

        return;
    }


    if (!friendships || friendships.length === 0) {

        conversationList.innerHTML =
            "<div class='empty-box'>You don't have any friends yet.</div>";

        return;
    }


    const friendIds =
        friendships.map(friendship => {

            return friendship.user1_id === currentUser.id
                ? friendship.user2_id
                : friendship.user1_id;
        });


    const {
        data: friends,
        error: friendError
    } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", friendIds);


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

    friends.forEach(createConversation);
}


/* =========================
   CREATE FRIEND ITEM
========================= */

function createConversation(friend) {

    const item =
        document.createElement("button");

    item.type = "button";
    item.className = "conversation-item";
    item.dataset.userId = friend.id;


    const avatar =
        document.createElement("div");

    avatar.className = "message-avatar";


    const name =
        friend.display_name ||
        friend.username ||
        "Unknown";


    if (friend.avatar_url) {

        avatar.style.backgroundImage =
            `url("${friend.avatar_url}")`;

        avatar.style.backgroundSize = "cover";
        avatar.style.backgroundPosition = "center";

    } else {

        avatar.textContent =
            name.charAt(0).toUpperCase();
    }


    const info =
        document.createElement("div");


    const username =
        document.createElement("strong");

    username.textContent = name;


    const status =
        document.createElement("span");

    status.textContent = "🟢 Online";


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
   REALTIME
========================= */

function subscribeToMessages() {

    if (!currentUser || !receiverId) {
        return;
    }


    if (messageChannel) {

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
                async payload => {

                    const message =
                        payload.new;


                    const isThisConversation =
                        (
                            message.sender_id === receiverId &&
                            message.receiver_id === currentUser.id
                        );


                    const isOwnMessage =
                        (
                            message.sender_id === currentUser.id &&
                            message.receiver_id === receiverId
                        );


                    if (
                        !isThisConversation &&
                        !isOwnMessage
                    ) {
                        return;
                    }


                    if (
                        message.id &&
                        chatArea?.querySelector(
                            `[data-message-id="${message.id}"]`
                        )
                    ) {
                        return;
                    }


                    const {
                        data: sender
                    } = await supabase
                        .from("profiles")
                        .select("username, display_name")
                        .eq("id", message.sender_id)
                        .maybeSingle();


                    message.sender =
                        sender || null;


                    addMessage(
                        message,
                        shouldShowDate(message.created_at)
                    );


                    if (chatArea) {
                        chatArea.scrollTop =
                            chatArea.scrollHeight;
                    }
                }
            )
            .subscribe(status => {

                console.log(
                    "📡 REALTIME STATUS:",
                    status
                );
            });
}


/* =========================
   STOP REALTIME
========================= */

function stopMessageRealtime() {

    if (!messageChannel) {
        return;
    }

    supabase.removeChannel(
        messageChannel
    );

    messageChannel = null;
}


/* =========================
   DATE HELPERS
========================= */

function getDateKey(dateString) {

    return new Date(
        dateString
    ).toDateString();
}


function getDateLabel(dateString) {

    const date =
        new Date(dateString);

    const now =
        new Date();


    if (
        date.toDateString() ===
        now.toDateString()
    ) {
        return "Today";
    }


    const yesterday =
        new Date();

    yesterday.setDate(
        yesterday.getDate() - 1
    );


    if (
        date.toDateString() ===
        yesterday.toDateString()
    ) {
        return "Yesterday";
    }


    return date.toLocaleDateString(
        undefined,
        {
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );
}


function shouldShowDate(dateString) {

    if (!chatArea || !dateString) {
        return false;
    }


    const messages =
        chatArea.querySelectorAll(
            ".chat-message"
        );


    if (messages.length === 0) {
        return true;
    }


    const lastMessage =
        messages[messages.length - 1];


    const lastDate =
        lastMessage.dataset.date;


    return lastDate !==
        getDateKey(dateString);
}


/* =========================
   OPEN CHAT
========================= */

async function openChat(friend) {

    receiverId = friend.id;


    console.log(
        "💬 OPENING CHAT:",
        friend.id
    );


    const name =
        friend.display_name ||
        friend.username ||
        "Unknown";


    if (messageUsername) {
        messageUsername.textContent = name;
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

            messageAvatar.style.backgroundImage = "";

            messageAvatar.textContent =
                name.charAt(0).toUpperCase();
        }
    }


    const listSection =
        document.querySelector(
            ".messages-list-section"
        );


    if (listSection) {
        listSection.style.display = "none";
    }


    const defaultHeader =
        document.getElementById(
            "messages-default-header"
        );


    if (defaultHeader) {
        defaultHeader.style.display = "none";
    }


    if (chatView) {
        chatView.style.display = "flex";
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


    if (!data || data.length === 0) {

        chatArea.innerHTML = `
            <div class="empty-chat">
                <div class="empty-chat-icon">💬</div>
                <h2>No messages yet</h2>
                <p>Send a message to start the conversation!</p>
            </div>
        `;

        return;
    }


    let lastDate = null;


    data.forEach(message => {

        const dateKey =
            getDateKey(
                message.created_at
            );


        const showDate =
            dateKey !== lastDate;


        addMessage(
            message,
            showDate
        );


        lastDate =
            dateKey;
    });


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

    if (
        !chatArea ||
        !currentUser
    ) {
        return;
    }


    if (
        message.id &&
        chatArea.querySelector(
            `[data-message-id="${message.id}"]`
        )
    ) {
        return;
    }


    /* DATE */

    if (
        showDate &&
        message.created_at
    ) {

        const dateLabel =
            document.createElement("div");


        dateLabel.className =
            "message-date";


        dateLabel.textContent =
            getDateLabel(
                message.created_at
            );


        chatArea.appendChild(
            dateLabel
        );
    }


    /* MESSAGE */

    const article =
        document.createElement("article");


    if (message.id) {

        article.dataset.messageId =
            message.id;
    }


    if (message.created_at) {

        article.dataset.date =
            getDateKey(
                message.created_at
            );
    }


    const isOwn =
        message.sender_id ===
        currentUser.id;


    article.className =
        isOwn
            ? "chat-message own"
            : "chat-message";


    /* BUBBLE */

    const bubble =
        document.createElement("div");


    bubble.className =
        "message-bubble";


    /* TEXT */

    const content =
        document.createElement("span");


    content.className =
        "message-content";


    content.textContent =
        message.content;


    /* TIME */

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


    bubble.appendChild(content);
    bubble.appendChild(time);

    article.appendChild(bubble);

    chatArea.appendChild(article);
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


    messageInput.disabled = true;


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


        /*
           Display immediately.
        */

        addMessage(
            data,
            shouldShowDate(
                data.created_at
            )
        );


        if (chatArea) {

            chatArea.scrollTop =
                chatArea.scrollHeight;
        }

    } finally {

        messageInput.disabled = false;

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

            receiverId = null;


            if (chatView) {
                chatView.style.display = "none";
            }


            const listSection =
                document.querySelector(
                    ".messages-list-section"
                );


            if (listSection) {
                listSection.style.display = "";
            }


            const defaultHeader =
                document.getElementById(
                    "messages-default-header"
                );


            if (defaultHeader) {
                defaultHeader.style.display = "";
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
