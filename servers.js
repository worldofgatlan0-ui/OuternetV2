import { supabase } from "./supabase.js";

console.log("UNDERNET SERVER CHAT.JS LOADED");

const navUsername = document.getElementById("nav-username");
const navAvatar = document.getElementById("nav-avatar");
const logoutButton = document.getElementById("logout-button");

const serverName = document.getElementById("server-name");
const serverDescription = document.getElementById("server-description");

const messageList = document.getElementById("message-list");
const messageForm = document.getElementById("server-message-form");
const messageInput = document.getElementById("server-message-input");

let currentUser = null;
let currentServer = null;
let realtimeChannel = null;


/* =========================
   SERVER INFO
   ========================= */

const servers = {
    snowdin: {
        name: "SNOWDIN",
        description: "A cozy server from the snowy underground."
    },

    waterfall: {
        name: "WATERFALL",
        description: "A quiet place beneath the glowing falls."
    },

    hotland: {
        name: "HOTLAND",
        description: "Welcome to the hottest server in the Underground."
    }
};


/* =========================
   LOAD USER
   ========================= */

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

    const { data: profile } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
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
            navAvatar.style.backgroundPosition = "center";

        } else {

            navAvatar.textContent =
                username.charAt(0).toUpperCase();

        }
    }

    return true;
}


/* =========================
   GET SERVER
   ========================= */

function loadServerFromURL() {

    const params = new URLSearchParams(
        window.location.search
    );

    const server = params.get("server");

    if (!server || !servers[server]) {

        window.location.href = "servers.html";

        return false;
    }

    currentServer = server;

    serverName.textContent =
        servers[server].name;

    serverDescription.textContent =
        servers[server].description;

    document.title =
        `Undernet — ${servers[server].name}`;

    return true;
}


/* =========================
   LOAD MESSAGES
   ========================= */

async function loadMessages() {

    if (!messageList || !currentServer) return;

    messageList.innerHTML = `
        <div class="empty-chat">
            <div class="empty-chat-icon">💬</div>
            <h2>Loading messages...</h2>
        </div>
    `;

    const { data, error } = await supabase
        .from("server_messages")
        .select(`
            id,
            server,
            sender_id,
            content,
            created_at
        `)
        .eq("server", currentServer)
        .order("created_at", {
            ascending: true
        });

    if (error) {

        console.error(
            "Failed to load server messages:",
            error
        );

        messageList.innerHTML = `
            <div class="empty-chat">
                <div class="empty-chat-icon">⚠️</div>
                <h2>Couldn't load messages</h2>
                <p>Check the console for the error.</p>
            </div>
        `;

        return;
    }

    messageList.innerHTML = "";

    if (!data || data.length === 0) {

        messageList.innerHTML = `
            <div class="empty-chat">
                <div class="empty-chat-icon">💬</div>
                <h2>No messages yet</h2>
                <p>Be the first to say something!</p>
            </div>
        `;

        return;
    }

    data.forEach((message) => {
        addMessage(message);
    });

    scrollToBottom();
}


/* =========================
   ADD MESSAGE
   ========================= */

function addMessage(message) {

    if (!messageList) return;

    const emptyChat =
        messageList.querySelector(".empty-chat");

    if (emptyChat) {
        emptyChat.remove();
    }

    const article =
        document.createElement("article");

    const isOwn =
        message.sender_id === currentUser.id;

    article.className =
        isOwn
            ? "message message-own"
            : "message";


    const bubble =
        document.createElement("div");

    bubble.className =
        "message-bubble";


    const content =
        document.createElement("span");

    content.className =
        "message-content";

    content.textContent =
        message.content;


    const time =
        document.createElement("time");

    time.className =
        "message-time";

    const date =
        new Date(message.created_at);

    time.textContent =
        date.toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit"
        });


    bubble.appendChild(content);
    bubble.appendChild(time);

    article.appendChild(bubble);

    messageList.appendChild(article);

    scrollToBottom();
}


/* =========================
   SCROLL
   ========================= */

function scrollToBottom() {

    if (!messageList) return;

    requestAnimationFrame(() => {

        messageList.scrollTop =
            messageList.scrollHeight;

    });
}


/* =========================
   SEND MESSAGE
   ========================= */

async function sendMessage(event) {

    event.preventDefault();

    if (!currentUser || !currentServer) return;

    const text =
        messageInput.value.trim();

    if (!text) return;

    messageInput.disabled = true;

    const { data, error } =
        await supabase
            .from("server_messages")
            .insert({
                server: currentServer,
                sender_id: currentUser.id,
                content: text
            })
            .select(`
                id,
                server,
                sender_id,
                content,
                created_at
            `)
            .single();

    if (error) {

        console.error(
            "Failed to send message:",
            error
        );

        messageInput.disabled = false;

        return;
    }

    /*
     * Realtime will also receive this message.
     * We add it here immediately so the sender
     * sees it without waiting for realtime.
     */

    addMessage(data);

    messageInput.value = "";
    messageInput.disabled = false;

    messageInput.focus();
}


/* =========================
   REALTIME
   ========================= */

function subscribeToMessages() {

    if (!currentServer) return;

    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
    }

    realtimeChannel =
        supabase
            .channel(
                `server-messages-${currentServer}`
            )
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "server_messages",
                    filter:
                        `server=eq.${currentServer}`
                },
                (payload) => {

                    console.log(
                        "NEW SERVER MESSAGE:",
                        payload.new
                    );

                    /*
                     * Don't add our own message twice.
                     */
                    if (
                        payload.new.sender_id ===
                        currentUser.id
                    ) {
                        return;
                    }

                    addMessage(payload.new);
                }
            )
            .subscribe((status) => {

                console.log(
                    "SERVER CHAT REALTIME:",
                    status
                );

            });
}


/* =========================
   LOGOUT
   ========================= */

async function logout() {

    if (!logoutButton) return;

    logoutButton.disabled = true;

    const { error } =
        await supabase.auth.signOut();

    if (error) {

        console.error(
            "Logout failed:",
            error
        );

        logoutButton.disabled = false;

        return;
    }

    window.location.href = "login.html";
}


/* =========================
   START
   ========================= */

async function init() {

    const userLoaded =
        await loadUser();

    if (!userLoaded) return;

    const serverLoaded =
        loadServerFromURL();

    if (!serverLoaded) return;

    await loadMessages();

    subscribeToMessages();

    if (messageForm) {
        messageForm.addEventListener(
            "submit",
            sendMessage
        );
    }

    if (messageInput) {
        messageInput.focus();
    }

    if (logoutButton) {
        logoutButton.addEventListener(
            "click",
            logout
        );
    }
}


init();
