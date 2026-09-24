import { supabase } from "./supabase.js";
import { showNotification } from "./notifications.js";

console.log("🔥 UNDERNET SERVER.JS LOADED");
console.log("🟢 SUPABASE IMPORTED");


/* =========================
   ELEMENTS
========================= */

const navUsername =
    document.getElementById("nav-username");

const navAvatar =
    document.getElementById("nav-avatar");

const logoutButton =
    document.getElementById("logout-button");

const serverName =
    document.getElementById("server-name");

const serverDescription =
    document.getElementById("server-description");

const messageList =
    document.getElementById("message-list");

const messageForm =
    document.getElementById("server-message-form");

const messageInput =
    document.getElementById("server-message-input");


/* =========================
   SERVER INFO
========================= */

const serverData = {

    snowdin: {
        name: "SNOWDIN",
        description:
            "A chilly community server for everyone."
    },

    waterfall: {
        name: "WATERFALL",
        description:
            "A quiet underground community beneath the falls."
    },

    hotland: {
        name: "HOTLAND",
        description:
            "A busy community surrounded by heat and machinery."
    }

};


/* =========================
   GET SERVER FROM URL
========================= */

const params =
    new URLSearchParams(
        window.location.search
    );

const currentServer =
    params.get("server");


if (
    !currentServer ||
    !serverData[currentServer]
) {

    window.location.href =
        "servers.html";
}


/* =========================
   DISPLAY SERVER
========================= */

const selectedServer =
    serverData[currentServer];


if (serverName) {

    serverName.textContent =
        selectedServer.name;
}


if (serverDescription) {

    serverDescription.textContent =
        selectedServer.description;
}


/* =========================
   STATE
========================= */

let currentUser = null;

let messageChannel = null;

let globalServerChannel = null;


/* =========================
   LOAD USER
========================= */

async function loadUser() {

    console.log(
        "🔍 STARTING LOAD USER..."
    );


    const {
        data: { user },
        error
    } = await supabase.auth.getUser();


    if (
        error ||
        !user
    ) {

        console.error(
            "❌ FAILED TO GET USER:",
            error
        );

        window.location.href =
            "login.html";

        return null;
    }


    currentUser =
        user;


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
        .eq(
            "id",
            user.id
        )
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

            navAvatar.textContent =
                "";

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


    return user;
}


/* =========================
   LOAD MESSAGES
========================= */

async function loadMessages() {

    if (!messageList) {
        return;
    }


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
        .eq(
            "server",
            currentServer
        )
        .order(
            "created_at",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            "❌ FAILED TO LOAD SERVER MESSAGES"
        );

        console.error(
            "Message:",
            error.message
        );

        console.error(
            "Details:",
            error.details
        );

        console.error(
            "Hint:",
            error.hint
        );

        console.error(
            "Code:",
            error.code
        );

        console.error(
            "Full error:",
            error
        );


        messageList.innerHTML =
            "<p>Failed to load messages.</p>";

        return;
    }


    messageList.innerHTML =
        "";


    if (
        !messages ||
        messages.length === 0
    ) {

        messageList.innerHTML =
            "<p>No messages yet. Be the first to say something!</p>";

        return;
    }


    for (
        const message of messages
    ) {

        await addMessage(
            message,
            false
        );
    }


    messageList.scrollTop =
        messageList.scrollHeight;
}


/* =========================
   ADD MESSAGE
========================= */

async function addMessage(
    message,
    scroll = true
) {

    if (!messageList) {
        return;
    }


    const {
        data: profile,
        error: profileError
    } = await supabase
        .from("profiles")
        .select(
            "username, display_name, avatar_url"
        )
        .eq(
            "id",
            message.sender_id
        )
        .maybeSingle();


    if (profileError) {

        console.error(
            "❌ FAILED TO LOAD SENDER PROFILE:",
            profileError
        );
    }


    const username =
        profile?.display_name ||
        profile?.username ||
        "Unknown";


    /* =========================
       MESSAGE ELEMENT
    ========================= */

    const messageElement =
        document.createElement(
            "div"
        );


    messageElement.className =
        "message";


    if (
        currentUser &&
        message.sender_id ===
            currentUser.id
    ) {

        messageElement.classList.add(
            "message-own"
        );
    }


    /* =========================
       AVATAR
    ========================= */

    const avatar =
        document.createElement(
            "div"
        );


    avatar.className =
        "message-avatar";


    if (profile?.avatar_url) {

        avatar.style.backgroundImage =
            `url("${profile.avatar_url}")`;

        avatar.style.backgroundSize =
            "cover";

        avatar.style.backgroundPosition =
            "center";

    } else {

        avatar.textContent =
            username
                .charAt(0)
                .toUpperCase();
    }


    /* =========================
       MESSAGE CONTENT
    ========================= */

    const content =
        document.createElement(
            "div"
        );


    content.className =
        "message-content";


    const author =
        document.createElement(
            "strong"
        );


    author.textContent =
        username;


    const text =
        document.createElement(
            "p"
        );


    text.textContent =
        message.content;


    const time =
        document.createElement(
            "small"
        );


    time.textContent =
        new Date(
            message.created_at
        ).toLocaleTimeString(
            [],
            {
                hour: "numeric",
                minute: "2-digit"
            }
        );


    content.appendChild(
        author
    );

    content.appendChild(
        text
    );

    content.appendChild(
        time
    );


    messageElement.appendChild(
        avatar
    );

    messageElement.appendChild(
        content
    );


    messageList.appendChild(
        messageElement
    );


    if (scroll) {

        messageList.scrollTop =
            messageList.scrollHeight;
    }
}


/* =========================
   SEND MESSAGE
========================= */

async function sendMessage() {

    if (!currentUser) {

        console.error(
            "❌ CANNOT SEND: NO USER"
        );

        return;
    }


    const text =
        messageInput.value.trim();


    if (!text) {
        return;
    }


    messageInput.disabled =
        true;


    const {
        data,
        error
    } = await supabase
        .from("server_messages")
        .insert({

            server:
                currentServer,

            sender_id:
                currentUser.id,

            content:
                text

        })
        .select()
        .single();


    if (error) {

        console.error(
            "❌ FAILED TO SEND SERVER MESSAGE"
        );

        console.error(
            "Message:",
            error.message
        );

        console.error(
            "Details:",
            error.details
        );

        console.error(
            "Hint:",
            error.hint
        );

        console.error(
            "Code:",
            error.code
        );

        console.error(
            "Full error:",
            error
        );


        messageInput.disabled =
            false;

        return;
    }


    console.log(
        "✅ MESSAGE SENT:",
        data
    );


    messageInput.value =
        "";


    messageInput.disabled =
        false;


    messageInput.focus();
}


/* =========================
   MESSAGE FORM
========================= */

if (messageForm) {

    messageForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            await sendMessage();
        }
    );
}


/* =========================
   CURRENT SERVER REALTIME
========================= */

function subscribeToMessages() {

    if (!currentUser) {
        return;
    }


    console.log(
        "📡 STARTING SERVER REALTIME:",
        currentServer
    );


    if (messageChannel) {

        supabase.removeChannel(
            messageChannel
        );

        messageChannel =
            null;
    }


    messageChannel =
        supabase
            .channel(
                `server-messages-${currentServer}-${currentUser.id}`
            )
            .on(
                "postgres_changes",
                {
                    event:
                        "INSERT",

                    schema:
                        "public",

                    table:
                        "server_messages",

                    filter:
                        `server=eq.${currentServer}`
                },
                async (payload) => {

                    console.log(
                        "📨 NEW MESSAGE IN CURRENT SERVER:",
                        payload.new
                    );


                    /*
                       Add it to the chat.
                    */

                    await addMessage(
                        payload.new,
                        true
                    );


                    /*
                       Don't show a notification
                       for our own messages.
                    */

                    if (
                        currentUser &&
                        payload.new.sender_id ===
                            currentUser.id
                    ) {

                        return;
                    }


                    /*
                       No notification here because
                       we're already looking at this
                       server.
                    */
                }
            )
            .subscribe(
                (status) => {

                    console.log(
                        "📡 SERVER REALTIME STATUS:",
                        status
                    );


                    if (
                        status ===
                        "SUBSCRIBED"
                    ) {

                        console.log(
                            "✅ SERVER REALTIME CONNECTED!"
                        );
                    }


                    if (
                        status ===
                        "CHANNEL_ERROR"
                    ) {

                        console.error(
                            "❌ SERVER REALTIME CHANNEL ERROR"
                        );
                    }


                    if (
                        status ===
                        "TIMED_OUT"
                    ) {

                        console.error(
                            "❌ SERVER REALTIME TIMED OUT"
                        );
                    }
                }
            );
}


/* =========================
   GLOBAL SERVER REALTIME
========================= */

function subscribeToGlobalServerMessages() {

    if (!currentUser) {
        return;
    }


    console.log(
        "🌐 STARTING GLOBAL SERVER NOTIFICATIONS..."
    );


    if (globalServerChannel) {

        supabase.removeChannel(
            globalServerChannel
        );

        globalServerChannel =
            null;
    }


    globalServerChannel =
        supabase
            .channel(
                `global-server-messages-${currentUser.id}`
            )
            .on(
                "postgres_changes",
                {
                    event:
                        "INSERT",

                    schema:
                        "public",

                    table:
                        "server_messages"
                },
                async (payload) => {

                    const message =
                        payload.new;


                    console.log(
                        "🔔 GLOBAL SERVER MESSAGE:",
                        message
                    );


                    /*
                       Ignore our own messages.
                    */

                    if (
                        message.sender_id ===
                        currentUser.id
                    ) {

                        return;
                    }


                    /*
                       We're already viewing
                       this server, so the normal
                       server realtime listener
                       handles it.
                    */

                    if (
                        message.server ===
                        currentServer
                    ) {

                        return;
                    }


                    /*
                       Make sure this is a
                       known server.
                    */

                    if (
                        !serverData[
                            message.server
                        ]
                    ) {

                        return;
                    }


                    /*
                       Get sender profile.
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
                            "❌ SERVER NOTIFICATION PROFILE ERROR:",
                            error
                        );
                    }


                    const senderName =
                        sender?.display_name ||
                        sender?.username ||
                        "Someone";


                    const targetServer =
                        serverData[
                            message.server
                        ];


                    /*
                       Show notification.
                    */

                    showNotification({

                        title:
                            `${senderName.toUpperCase()} IN ${targetServer.name}`,

                        message:
                            message.content,

                        onClick: () => {

                            window.location.href =
                                `server.html?server=${encodeURIComponent(message.server)}`;
                        }

                    });
                }
            )
            .subscribe(
                (status) => {

                    console.log(
                        "🌐 GLOBAL SERVER STATUS:",
                        status
                    );


                    if (
                        status ===
                        "SUBSCRIBED"
                    ) {

                        console.log(
                            "✅ GLOBAL SERVER NOTIFICATIONS CONNECTED!"
                        );
                    }


                    if (
                        status ===
                        "CHANNEL_ERROR"
                    ) {

                        console.error(
                            "❌ GLOBAL SERVER CHANNEL ERROR"
                        );
                    }


                    if (
                        status ===
                        "TIMED_OUT"
                    ) {

                        console.error(
                            "❌ GLOBAL SERVER TIMED OUT"
                        );
                    }
                }
            );
}


/* =========================
   STOP SERVER REALTIME
========================= */

function stopServerRealtime() {

    if (messageChannel) {

        console.log(
            "📡 STOPPING CURRENT SERVER REALTIME"
        );


        supabase.removeChannel(
            messageChannel
        );


        messageChannel =
            null;
    }


    if (globalServerChannel) {

        console.log(
            "🌐 STOPPING GLOBAL SERVER REALTIME"
        );


        supabase.removeChannel(
            globalServerChannel
        );


        globalServerChannel =
            null;
    }
}


/* =========================
   LOG OUT
========================= */

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async () => {

            logoutButton.disabled =
                true;


            stopServerRealtime();


            const {
                error
            } =
                await supabase.auth.signOut();


            if (error) {

                console.error(
                    "❌ LOGOUT FAILED:",
                    error
                );


                logoutButton.disabled =
                    false;

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

async function start() {

    console.log(
        "🚀 STARTING SERVER PAGE..."
    );


    const user =
        await loadUser();


    if (!user) {
        return;
    }


    await loadMessages();


    /*
       Current server messages.
    */

    subscribeToMessages();


    /*
       Messages from other servers.
    */

    subscribeToGlobalServerMessages();
}


start();
