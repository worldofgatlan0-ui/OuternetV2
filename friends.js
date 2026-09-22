import { supabase } from "./supabase.js";

console.log("UNDERNET FRIENDS.JS LOADED");

const friendsList = document.getElementById("friends-list");
const addFriendForm = document.getElementById("add-friend-form");
const friendUsernameInput =
    document.getElementById("friend-username");
const errorBox = document.getElementById("error");

const navUsername =
    document.getElementById("nav-username");

const navAvatar =
    document.getElementById("nav-avatar");

const logoutButton =
    document.getElementById("logout-button");

let currentUser = null;


/* MESSAGE */
function showMessage(message) {
    console.log("UNDERNET:", message);

    if (errorBox) {
        errorBox.hidden = false;
        errorBox.textContent = message;
    } else {
        alert(message);
    }
}

function clearMessage() {
    if (!errorBox) return;

    errorBox.hidden = true;
    errorBox.textContent = "";
}


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


/* LOAD FRIENDS */
async function loadFriends() {
    if (!friendsList) return;

    const { data, error } = await supabase
        .from("friendships")
        .select(`
            id,
            friend_id,
            profiles!friendships_friend_id_fkey (
                username,
                display_name,
                avatar_url
            )
        `)
        .eq("user_id", currentUser.id)
        .eq("status", "accepted");

    if (error) {
        console.error(
            "FRIENDS LOAD ERROR:",
            error
        );

        friendsList.innerHTML =
            "<p>Could not load friends.</p>";

        return;
    }

    friendsList.innerHTML = "";

    if (!data || data.length === 0) {
        friendsList.innerHTML =
            "<p>You don't have any friends yet.</p>";

        return;
    }

    data.forEach(addFriend);
}


/* DISPLAY FRIEND */
function addFriend(friend) {
    const profile = friend.profiles;

    const article =
        document.createElement("article");

    article.className = "friend-card";

    const avatar =
        document.createElement("div");

    avatar.className = "friend-avatar";

    if (profile?.avatar_url) {
        avatar.style.backgroundImage =
            `url("${profile.avatar_url}")`;

        avatar.style.backgroundSize = "cover";
        avatar.style.backgroundPosition = "center";
    } else {
        avatar.textContent =
            (
                profile?.display_name ||
                profile?.username ||
                "?"
            )
            .charAt(0)
            .toUpperCase();
    }

    const info =
        document.createElement("div");

    info.className = "friend-info";

    const name =
        document.createElement("strong");

    name.textContent =
        profile?.display_name ||
        profile?.username ||
        "Unknown";

    const username =
        document.createElement("span");

    username.textContent =
        "@" + (profile?.username || "unknown");

    info.appendChild(name);
    info.appendChild(username);

    article.appendChild(avatar);
    article.appendChild(info);

    friendsList.appendChild(article);
}


/* ADD FRIEND */
async function addFriendByUsername(event) {
    event.preventDefault();

    clearMessage();

    if (!friendUsernameInput) return;

    const username =
        friendUsernameInput.value.trim();

    if (!username) {
        showMessage("Enter a username.");
        return;
    }

    const button =
        addFriendForm?.querySelector("button");

    if (button) {
        button.disabled = true;
        button.textContent = "ADDING...";
    }

    try {
        const { data: profile, error } =
            await supabase
                .from("profiles")
                .select("id, username")
                .eq("username", username)
                .maybeSingle();

        if (error) {
            showMessage(error.message);
            return;
        }

        if (!profile) {
            showMessage("User not found.");
            return;
        }

        if (profile.id === currentUser.id) {
            showMessage(
                "You can't add yourself."
            );
            return;
        }

        const { error: insertError } =
            await supabase
                .from("friendships")
                .insert({
                    user_id: currentUser.id,
                    friend_id: profile.id,
                    status: "accepted"
                });

        if (insertError) {
            if (
                insertError.code === "23505"
            ) {
                showMessage(
                    "You're already friends with this user."
                );
            } else {
                showMessage(
                    insertError.message
                );
            }

            return;
        }

        friendUsernameInput.value = "";

        showMessage(
            "Friend added successfully!"
        );

        await loadFriends();

    } catch (error) {
        console.error(
            "ADD FRIEND ERROR:",
            error
        );

        showMessage(
            "Something went wrong."
        );

    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = "ADD FRIEND";
        }
    }
}


/* LOG OUT */
async function logout() {
    const { error } =
        await supabase.auth.signOut();

    if (error) {
        console.error(
            "LOGOUT ERROR:",
            error
        );

        return;
    }

    window.location.href = "login.html";
}


/* EVENTS */
if (addFriendForm) {
    addFriendForm.addEventListener(
        "submit",
        addFriendByUsername
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
    await loadFriends();
}
