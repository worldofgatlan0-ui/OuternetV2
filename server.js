import { supabase } from "./supabase.js";

console.log("UNDERNET SERVER.JS LOADED");

/* ELEMENTS */

const navUsername = document.getElementById("nav-username");
const navAvatar = document.getElementById("nav-avatar");
const logoutButton = document.getElementById("logout-button");

const serverName = document.getElementById("server-name");
const serverDescription = document.getElementById("server-description");

const messageList = document.getElementById("message-list");
const messageForm = document.getElementById("server-message-form");
const messageInput = document.getElementById("server-message-input");


/* SERVER INFO */

const serverData = {
    snowdin: {
        name: "SNOWDIN",
        description: "A chilly community server for everyone."
    },

    waterfall: {
        name: "WATERFALL",
        description: "A quiet underground community beneath the falls."
    },

    hotland: {
        name: "HOTLAND",
        description: "A busy community surrounded by heat and machinery."
    }
};


/* GET SERVER FROM URL */

const params = new URLSearchParams(window.location.search);
const currentServer = params.get("server");

if (!currentServer || !serverData[currentServer]) {
    window.location.href = "servers.html";
}


/* DISPLAY SERVER */

const selectedServer = serverData[currentServer];

if (serverName) {
    serverName.textContent = selectedServer.name;
}

if (serverDescription) {
    serverDescription.textContent = selectedServer.description;
}


/* CURRENT USER */

let currentUser = null;
let messageChannel = null;


/* LOAD USER */

async function loadUser() {
    const {
        data: { user },
        error
    } = await supabase.auth.getUser();

    if (error || !user) {
        console.error("Failed to get logged-in user:", error);
        window.location.href = "login.html";
        return null;
    }

    currentUser = user;

    const {
        data: profile,
        error: profileError
    } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
        console.error("Failed to load profile:", profileError);
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

    return user;
}


/* LOAD MESSAGES */

async function loadMessages() {
    if (!messageList) return;

    const {
        data: messages,
        error
    } = await supabase
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
        console.error("FAILED TO LOAD SERVER MESSAGES");
        console.error("Message:", error.message);
        console.error("Details:", error.details);
        console.error("Hint:", error.hint);
        console.error("Code:", error.code);
        console.error("Full error:", error);

        messageList.innerHTML =
            "<p>Failed to load messages.</p>";

        return;
    }

    messageList.innerHTML = "";

    if (!messages || messages.length === 0) {
        messageList.innerHTML =
            "<p>No messages yet. Be the first to say something!</p>";

        return;
    }

    for (const message of messages) {
        await addMessage(message, false);
    }

    messageList.scrollTop =
        messageList.scrollHeight;
}


/* ADD MESSAGE */

async function addMessage(message, scroll = true) {
    if (!messageList) return;

    const {
        data: profile,
        error: profileError
    } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("id", message.sender_id)
        .maybeSingle();

    if (profileError) {
        console.error(
            "Failed to load sender profile:",
            profileError
        );
    }

    const username =
        profile?.display_name ||
        profile?.username ||
        "Unknown";


    const messageElement =
        document.createElement("div");

    messageElement.className = "message";


    if (
        currentUser &&
        message.sender_id === currentUser.id
    ) {
        messageElement.classList.add("message-own");
    }


    /* AVATAR */

    const avatar =
        document.createElement("div");

    avatar.className = "message-avatar";

    if (profile?.avatar_url) {
        avatar.style.backgroundImage =
            `url("${profile.avatar_url}")`;

        avatar.style.backgroundSize = "cover";
        avatar.style.backgroundPosition = "center";
    } else {
        avatar.textContent =
            username.charAt(0).toUpperCase();
    }


    /* MESSAGE CONTENT */

    const content =
        document.createElement("div");

    content.className = "message-content";


    const author =
        document.createElement("strong");

    author.textContent = username;


    const text =
        document.createElement("p");

    text.textContent = message.content;


    const time =
        document.createElement("small");

    time.textContent =
        new Date(
            message.created_at
        ).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit"
        });


    content.appendChild(author);
    content.appendChild(text);
    content.appendChild(time);

    messageElement.appendChild(avatar);
    messageElement.appendChild(content);

    messageList.appendChild(messageElement);


    if (scroll) {
        messageList.scrollTop =
            messageList.scrollHeight;
    }
}


/* SEND MESSAGE */

async function sendMessage() {
    if (!currentUser) {
        console.error(
            "Cannot send message: no logged-in user."
        );

        return;
    }

    const text =
        messageInput.value.trim();

    if (!text) return;

    messageInput.disabled = true;


    const {
        data,
        error
    } = await supabase
        .from("server_messages")
        .insert({
            server: currentServer,
            sender_id: currentUser.id,
            content: text
        })
        .select()
        .single();


    if (error) {
        console.error(
            "FAILED TO SEND SERVER MESSAGE"
        );

        console.error("Message:", error.message);
        console.error("Details:", error.details);
        console.error("Hint:", error.hint);
        console.error("Code:", error.code);
        console.error("Full error:", error);

        messageInput.disabled = false;

        return;
    }


    console.log("MESSAGE SENT:", data);

    messageInput.value = "";

    messageInput.disabled = false;

    messageInput.focus();
}


/* MESSAGE FORM */

if (messageForm) {
    messageForm.addEventListener(
        "submit",
        async (event) => {
            event.preventDefault();
            await sendMessage();
        }
    );
}


/* REALTIME */

function subscribeToMessages() {
    if (messageChannel) {
        supabase.removeChannel(messageChannel);
    }

    messageChannel =
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
                async (payload) => {
                    console.log(
                        "NEW SERVER MESSAGE:",
                        payload.new
                    );

                    await addMessage(
                        payload.new,
                        true
                    );
                }
            )
            .subscribe((status) => {
                console.log(
                    "SERVER REALTIME:",
                    status
                );
            });
}


/* LOG OUT */

if (logoutButton) {
    logoutButton.addEventListener(
        "click",
        async () => {
            logoutButton.disabled = true;

            const {
                error
            } = await supabase.auth.signOut();

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
    );
}


/* START */

async function start() {
    const user = await loadUser();

    if (!user) return;

    await loadMessages();

    subscribeToMessages();
}

start();
