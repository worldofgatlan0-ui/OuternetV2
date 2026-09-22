import { supabase } from "./supabase.js";

console.log("UNDERNET FRIENDS.JS LOADED");

const searchForm =
    document.getElementById("friend-search-form");

const searchInput =
    document.getElementById("friend-search-input");

const searchResults =
    document.getElementById("search-results");

const searchResultsSection =
    document.getElementById("search-results-section");

const friendList =
    document.getElementById("friend-list");

const notice =
    document.getElementById("friend-notice");

const navUsername =
    document.getElementById("nav-username");

const navAvatar =
    document.getElementById("nav-avatar");

let currentUser = null;

/* NOTICE */
function showNotice(message) {
    if (!notice) return;

    notice.textContent = message;
    notice.style.display = "block";

    setTimeout(() => {
        notice.style.display = "none";
    }, 3000);
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

    const { data: profile } =
        await supabase
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

/* CREATE USER CARD */
function createUserCard(profile, isFriend = false) {
    const card =
        document.createElement("div");

    card.className = "friend-card";

    const avatar =
        document.createElement("div");

    avatar.className = "friend-avatar";

    if (profile.avatar_url) {
        avatar.style.backgroundImage =
            `url("${profile.avatar_url}")`;
        avatar.style.backgroundSize = "cover";
        avatar.style.backgroundPosition = "center";
    } else {
        avatar.textContent =
            (
                profile.display_name ||
                profile.username ||
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
        profile.display_name ||
        profile.username ||
        "Unknown";

    const username =
        document.createElement("span");

    username.textContent =
        "@" + profile.username;

    info.appendChild(name);
    info.appendChild(username);

    const actions =
        document.createElement("div");

    actions.className = "friend-actions";

    if (isFriend) {
        const messageButton =
            document.createElement("button");

        messageButton.type = "button";
        messageButton.textContent = "MESSAGE";

        messageButton.addEventListener(
            "click",
            () => {
                window.location.href =
                    "messages.html?user=" +
                    encodeURIComponent(profile.id);
            }
        );

        actions.appendChild(messageButton);

    } else {
        const addButton =
            document.createElement("button");

        addButton.type = "button";
        addButton.textContent = "ADD FRIEND";

        addButton.addEventListener(
            "click",
            () => addFriend(profile.id, addButton)
        );

        actions.appendChild(addButton);
    }

    card.appendChild(avatar);
    card.appendChild(info);
    card.appendChild(actions);

    return card;
}

/* SEARCH USERS */
async function searchUsers(event) {
    event.preventDefault();

    const query =
        searchInput.value.trim();

    if (!query) return;

    searchResultsSection.style.display =
        "block";

    searchResults.innerHTML =
        "<div class='empty-box'>Searching...</div>";

    const {
        data,
        error
    } = await supabase
        .from("profiles")
        .select(
            "id, username, display_name, avatar_url"
        )
        .ilike(
            "username",
            `%${query}%`
        )
        .neq(
            "id",
            currentUser.id
        )
        .limit(20);

    if (error) {
        console.error(
            "SEARCH ERROR:",
            error
        );

        searchResults.innerHTML =
            "<div class='empty-box'>Could not search users.</div>";

        return;
    }

    searchResults.innerHTML = "";

    if (!data || data.length === 0) {
        searchResults.innerHTML =
            "<div class='empty-box'>No users found.</div>";

        return;
    }

    data.forEach((profile) => {
        searchResults.appendChild(
            createUserCard(profile)
        );
    });
}

/* ADD FRIEND */
async function addFriend(friendId, button) {
    if (!currentUser) return;

    button.disabled = true;
    button.textContent = "ADDING...";

    const { error } =
        await supabase
            .from("friendships")
            .insert({
                user1_id: currentUser.id,
                user2_id: friendId
            });

    if (error) {
        console.error(
            "ADD FRIEND ERROR:",
            error
        );

        button.disabled = false;
        button.textContent = "ADD FRIEND";

        showNotice(
            "Could not add friend."
        );

        return;
    }

    button.textContent =
        "ADDED ✓";

    showNotice(
        "Friend added!"
    );

    await loadFriends();
}

/* LOAD FRIENDS */
async function loadFriends() {
    if (!friendList || !currentUser) return;

    friendList.innerHTML =
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
            "FRIENDS LOAD ERROR:",
            error
        );

        friendList.innerHTML =
            "<div class='empty-box'>Could not load friends.</div>";

        return;
    }

    if (!friendships || friendships.length === 0) {
        friendList.innerHTML =
            "<div class='empty-box'>No friends yet.</div>";

        return;
    }

    const friendIds =
        friendships.map((friendship) =>
            friendship.user1_id === currentUser.id
                ? friendship.user2_id
                : friendship.user1_id
        );

    const {
        data: profiles,
        error: profileError
    } = await supabase
        .from("profiles")
        .select(
            "id, username, display_name, avatar_url"
        )
        .in("id", friendIds);

    if (profileError) {
        console.error(
            "FRIEND PROFILE ERROR:",
            profileError
        );

        friendList.innerHTML =
            "<div class='empty-box'>Could not load friend profiles.</div>";

        return;
    }

    friendList.innerHTML = "";

    profiles.forEach((profile) => {
        friendList.appendChild(
            createUserCard(profile, true)
        );
    });
}

/* EVENTS */
if (searchForm) {
    searchForm.addEventListener(
        "submit",
        searchUsers
    );
}

/* START */
const loggedIn =
    await loadUser();

if (loggedIn) {
    await loadFriends();
}
