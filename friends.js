import { supabase } from "./supabase.js";

console.log("UNDERNET FRIENDS.JS LOADED");

const searchForm =
    document.getElementById("friend-search-form");

const searchInput =
    document.getElementById("friend-search-input");

const searchResultsSection =
    document.getElementById("search-results-section");

const searchResults =
    document.getElementById("search-results");

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
}

function clearNotice() {
    if (!notice) return;

    notice.textContent = "";
    notice.style.display = "none";
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

            navAvatar.style.backgroundSize =
                "cover";

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


/* CHECK FRIENDSHIP */
async function areFriends(userId) {
    const { data, error } =
        await supabase
            .from("friendships")
            .select("id")
            .or(
                `and(user1_id.eq.${currentUser.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${currentUser.id})`
            )
            .maybeSingle();

    if (error) {
        console.error(
            "FRIENDSHIP CHECK ERROR:",
            error
        );

        return false;
    }

    return !!data;
}


/* SEARCH USERS */
async function searchUsers(event) {
    event.preventDefault();

    clearNotice();

    const search =
        searchInput?.value.trim();

    if (!search) {
        showNotice(
            "Enter a username to search."
        );
        return;
    }

    searchResults.innerHTML =
        "<div class='empty-box'>Searching...</div>";

    searchResultsSection.style.display =
        "block";

    const { data, error } =
        await supabase
            .from("profiles")
            .select(
                "id, username, display_name, avatar_url"
            )
            .ilike(
                "username",
                `%${search}%`
            )
            .limit(20);

    if (error) {
        console.error(
            "USER SEARCH ERROR:",
            error
        );

        searchResults.innerHTML =
            "<div class='empty-box'>Search failed.</div>";

        return;
    }

    searchResults.innerHTML = "";

    if (!data || data.length === 0) {
        searchResults.innerHTML =
            "<div class='empty-box'>No users found.</div>";

        return;
    }

    for (const profile of data) {
        await addSearchResult(profile);
    }
}


/* DISPLAY SEARCH RESULT */
async function addSearchResult(profile) {
    const card =
        document.createElement("div");

    card.className =
        "friend-card";

    const avatar =
        document.createElement("div");

    avatar.className =
        "friend-avatar";

    if (profile.avatar_url) {
        avatar.style.backgroundImage =
            `url("${profile.avatar_url}")`;

        avatar.style.backgroundSize =
            "cover";

        avatar.style.backgroundPosition =
            "center";
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

    info.className =
        "friend-info";

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

    const addButton =
        document.createElement("button");

    addButton.type = "button";
    addButton.textContent = "ADD";

    info.appendChild(name);
    info.appendChild(username);

    card.appendChild(avatar);
    card.appendChild(info);
    card.appendChild(addButton);

    searchResults.appendChild(card);

    /* DON'T ADD YOURSELF */
    if (profile.id === currentUser.id) {
        addButton.textContent = "YOU";
        addButton.disabled = true;
        return;
    }

    /* CHECK EXISTING FRIENDSHIP */
    const alreadyFriends =
        await areFriends(profile.id);

    if (alreadyFriends) {
        addButton.textContent =
            "FRIENDS";

        addButton.disabled = true;
        return;
    }

    /* ADD FRIEND */
    addButton.addEventListener(
        "click",
        async () => {

            addButton.disabled = true;
            addButton.textContent =
                "ADDING...";

            const { error } =
                await supabase
                    .from("friendships")
                    .insert({
                        user1_id:
                            currentUser.id,

                        user2_id:
                            profile.id
                    });

            if (error) {
                console.error(
                    "ADD FRIEND ERROR:",
                    error
                );

                if (
                    error.code === "23505"
                ) {
                    addButton.textContent =
                        "FRIENDS";
                } else {
                    addButton.disabled =
                        false;

                    addButton.textContent =
                        "ADD";

                    showNotice(
                        "Could not add friend."
                    );

                    return;
                }
            } else {
                addButton.textContent =
                    "FRIENDS";

                showNotice(
                    `Added @${profile.username}!`
                );

                await loadFriends();
            }

            addButton.disabled = true;
        }
    );
}


/* LOAD FRIENDS */
async function loadFriends() {
    if (!friendList) return;

    friendList.innerHTML =
        "<div class='empty-box'>Loading friends...</div>";

    const { data, error } =
        await supabase
            .from("friendships")
            .select(
                "id, user1_id, user2_id"
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

    friendList.innerHTML = "";

    if (!data || data.length === 0) {
        friendList.innerHTML =
            "<div class='empty-box'>No friends yet.</div>";

        return;
    }

    for (const friendship of data) {

        const friendId =
            friendship.user1_id === currentUser.id
                ? friendship.user2_id
                : friendship.user1_id;

        const { data: profile } =
            await supabase
                .from("profiles")
                .select(
                    "id, username, display_name, avatar_url"
                )
                .eq("id", friendId)
                .maybeSingle();

        if (profile) {
            addFriendCard(profile);
        }
    }
}


/* DISPLAY FRIEND */
function addFriendCard(profile) {
    const card =
        document.createElement("div");

    card.className =
        "friend-card";

    const avatar =
        document.createElement("div");

    avatar.className =
        "friend-avatar";

    if (profile.avatar_url) {
        avatar.style.backgroundImage =
            `url("${profile.avatar_url}")`;

        avatar.style.backgroundSize =
            "cover";

        avatar.style.backgroundPosition =
            "center";
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

    info.className =
        "friend-info";

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

    card.appendChild(avatar);
    card.appendChild(info);

    friendList.appendChild(card);
}


/* SEARCH EVENT */
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
