import { supabase } from "./supabase.js";

console.log("🔥 UNDERNET MESSAGES.JS LOADED");

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

/* LOAD USER */
async function loadUser() {
    const {
        data: { user },
        error
    } = await supabase.auth.getUser();

    if (error || !user) {
        window.location.href = "login.html";
        return false;
    }

    currentUser = user;

    console.log("👤 LOGGED IN:", user.id);

    const { data: profile } =
        await supabase
            .from("profiles")
            .select(
                "username, display_name, avatar_url"
            )
            .eq("id", user.id)
            .maybeSingle();

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
            navAvatar.style.backgroundPosition =
                "center";
        } else {
            navAvatar.style.backgroundImage = "";
            navAvatar.textContent =
                username
                    .charAt(0)
                    .toUpperCase();
        }
    }

    return true;
}

/* LOAD FRIENDS */
async function loadFriends() {
    if (!conversationList || !currentUser) {
        return;
    }

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
        friendships.map((friendship) => {
            return friendship.user1_id === currentUser.id
                ? friendship.user2_id
                : friendship.user1_id;
        });

    console.log(
        "👥 FRIEND IDS:",
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

    console.log(
        "👥 FRIENDS:",
        friends
    );

    conversationList.innerHTML = "";

    friends.forEach(createConversation);
}

/* CREATE FRIEND ITEM */
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
            name.charAt(0).toUpperCase();
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

/* OPEN CHAT */
async function openChat(friend) {
    receiverId = friend.id;

    console.log(
        "💬 OPENING CHAT:",
        friend.id
    );

    if (messageUsername) {
        messageUsername.textContent =
            friend.display_name ||
            friend.username ||
            "Unknown";
    }

    if (messageAvatar) {
        const name =
            friend.display_name ||
            friend.username ||
            "?";

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
    ).style.display = "none";

    document.getElementById(
        "messages-default-header"
    ).style.display = "none";

    chatView.style.display = "block";

    await loadMessages();
}

/* LOAD MESSAGES */
async function loadMessages() {
    if (!chatArea || !currentUser || !receiverId) {
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
        chatArea.innerHTML =
            "<div class='empty-chat'>" +
            "<div class='empty-chat-icon'>💬</div>" +
            "<h2>No messages yet</h2>" +
            "<p>Send a message to start the conversation!</p>" +
            "</div>";

        return;
    }

    data.forEach(addMessage);

    chatArea.scrollTop =
        chatArea.scrollHeight;
}

/* DISPLAY MESSAGE */
function addMessage(message) {
    const article =
        document.createElement("article");

    article.className =
        message.sender_id === currentUser.id
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

/* SEND MESSAGE */
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
            "❌ MESSAGE SEND ERROR:",
            error
        );

        messageInput.disabled = false;
        return;
    }

    messageInput.value = "";

    addMessage(data);

    chatArea.scrollTop =
        chatArea.scrollHeight;

    messageInput.disabled = false;
    messageInput.focus();
}

/* BACK */
if (backButton) {
    backButton.addEventListener(
        "click",
        () => {
            receiverId = null;

            chatView.style.display =
                "none";

            document.querySelector(
                ".messages-list-section"
            ).style.display = "";

            document.getElementById(
                "messages-default-header"
            ).style.display = "";

            if (messageInput) {
                messageInput.value = "";
            }
        }
    );
}

/* SEND */
if (messageForm) {
    messageForm.addEventListener(
        "submit",
        sendMessage
    );
}

/* LOGOUT */
if (logoutButton) {
    logoutButton.addEventListener(
        "click",
        async () => {
            const { error } =
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

/* START */
const loggedIn =
    await loadUser();

if (loggedIn) {
    await loadFriends();
}
