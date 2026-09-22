import { supabase } from "./supabase.js";

console.log("UNDERNET MESSAGES.JS LOADED");

const messageList = document.getElementById("message-list");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");

const navUsername = document.getElementById("nav-username");
const navAvatar = document.getElementById("nav-avatar");
const logoutButton = document.getElementById("logout-button");

let currentUser = null;

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
            navAvatar.style.backgroundImage = "";
            navAvatar.textContent =
                username.charAt(0).toUpperCase();
        }
    }

    return true;
}

/* LOAD MESSAGES */
async function loadMessages() {
    if (!messageList) return;

    const { data, error } = await supabase
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
            `sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`
        )
        .order("created_at", {
            ascending: true
        });

    if (error) {
        console.error("MESSAGE LOAD ERROR:", error);
        messageList.innerHTML =
            "<p>Could not load messages.</p>";
        return;
    }

    messageList.innerHTML = "";

    if (!data || data.length === 0) {
        messageList.innerHTML =
            "<p>No messages yet.</p>";
        return;
    }

    data.forEach(addMessage);
}

/* DISPLAY MESSAGE */
function addMessage(message) {
    const article = document.createElement("article");
    article.className = "message";

    const username =
        message.sender?.display_name ||
        message.sender?.username ||
        "Unknown";

    const name = document.createElement("strong");
    name.textContent = username;

    const content = document.createElement("span");
    content.textContent = message.content;

    article.appendChild(name);
    article.appendChild(content);

    messageList.appendChild(article);

    messageList.scrollTop =
        messageList.scrollHeight;
}

/* SEND MESSAGE */
async function sendMessage(event) {
    event.preventDefault();

    if (!currentUser || !messageInput) return;

    const content = messageInput.value.trim();

    if (!content) return;

    messageInput.disabled = true;

    /*
        Change these two IDs later when
        friend/recipient selection exists.
    */
    const receiverId = messageInput.dataset.receiverId;

    if (!receiverId) {
        console.error("No recipient selected.");
        messageInput.disabled = false;
        return;
    }

    const { data, error } = await supabase
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
        console.error("MESSAGE SEND ERROR:", error);
        messageInput.disabled = false;
        return;
    }

    messageInput.value = "";

    addMessage(data);

    messageInput.disabled = false;
    messageInput.focus();
}

/* LOG OUT */
async function logout() {
    const { error } =
        await supabase.auth.signOut();

    if (error) {
        console.error("LOGOUT ERROR:", error);
        return;
    }

    window.location.href = "login.html";
}

/* EVENTS */
if (messageForm) {
    messageForm.addEventListener(
        "submit",
        sendMessage
    );
}

if (logoutButton) {
    logoutButton.addEventListener(
        "click",
        logout
    );
}

/* START */
const loggedIn = await loadUser();

if (loggedIn) {
    await loadMessages();
}
