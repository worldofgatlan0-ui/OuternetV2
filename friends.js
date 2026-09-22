import { supabase } from "./supabase.js";

console.log("🔥 FRIENDS.JS LOADED");

const searchForm = document.getElementById("friend-search-form");
const searchInput = document.getElementById("friend-search-input");
const searchResults = document.getElementById("search-results");
const searchResultsSection = document.getElementById("search-results-section");
const friendList = document.getElementById("friend-list");

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

    console.log("👤 LOGGED IN:", user.id);

    return true;
}


/* SEARCH */
async function searchUsers(event) {
    event.preventDefault();

    console.log("🔎 SEARCH SUBMITTED");

    const username = searchInput.value.trim();

    if (!username) {
        alert("Enter a username.");
        return;
    }

    searchResultsSection.style.display = "block";

    searchResults.innerHTML =
        "<div class='empty-box'>Searching...</div>";

    const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .ilike("username", `%${username}%`)
        .limit(20);

    console.log("SEARCH RESULT:", data, error);

    if (error) {
        searchResults.innerHTML =
            "<div class='empty-box'>Search error.</div>";

        console.error(error);
        return;
    }

    searchResults.innerHTML = "";

    if (!data || data.length === 0) {
        searchResults.innerHTML =
            "<div class='empty-box'>No users found.</div>";

        return;
    }

    data.forEach(showUser);
}


/* SHOW USER */
function showUser(profile) {

    const card = document.createElement("div");
    card.className = "friend-card";

    const name = document.createElement("strong");

    name.textContent =
        profile.display_name ||
        profile.username;

    const username = document.createElement("span");

    username.textContent =
        "@" + profile.username;

    const button = document.createElement("button");

    button.type = "button";
    button.textContent = "ADD";

    card.appendChild(name);
    card.appendChild(username);
    card.appendChild(button);

    searchResults.appendChild(card);


    /* YOURSELF */
    if (profile.id === currentUser.id) {

        button.textContent = "YOU";
        button.disabled = true;

        return;
    }


    /* ADD */
    button.addEventListener("click", async () => {

        console.log(
            "➕ ADDING:",
            profile.username
        );

        button.disabled = true;
        button.textContent = "ADDING...";

        const { error } = await supabase
            .from("friendships")
            .insert({
                user1_id: currentUser.id,
                user2_id: profile.id
            });

        console.log(
            "FRIENDSHIP INSERT:",
            error
        );

        if (error) {

            console.error(error);

            button.disabled = false;
            button.textContent = "ADD";

            alert(
                "Could not add friend: " +
                error.message
            );

            return;
        }

        button.textContent = "FRIENDS";

        alert(
            "Added @" +
            profile.username +
            "!"
        );

        loadFriends();
    });
}


/* LOAD FRIENDS */
async function loadFriends() {

    const { data, error } = await supabase
        .from("friendships")
        .select("id, user1_id, user2_id")
        .or(
            `user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`
        );

    console.log(
        "FRIENDS:",
        data,
        error
    );

    if (error) {
        console.error(error);
        return;
    }

    friendList.innerHTML = "";

    for (const friendship of data) {

        const friendId =
            friendship.user1_id === currentUser.id
                ? friendship.user2_id
                : friendship.user1_id;

        const { data: profile } =
            await supabase
                .from("profiles")
                .select(
                    "username, display_name"
                )
                .eq("id", friendId)
                .maybeSingle();

        if (!profile) continue;

        const card =
            document.createElement("div");

        card.className =
            "friend-card";

        card.textContent =
            profile.display_name ||
            profile.username;

        friendList.appendChild(card);
    }

    if (data.length === 0) {

        friendList.innerHTML =
            "<div class='empty-box'>No friends yet.</div>";
    }
}


/* IMPORTANT */
if (!searchForm) {

    console.error(
        "❌ friend-search-form NOT FOUND"
    );

} else {

    console.log(
        "✅ SEARCH FORM FOUND"
    );

    searchForm.addEventListener(
        "submit",
        searchUsers
    );
}


/* START */
const loggedIn = await loadUser();

if (loggedIn) {
    await loadFriends();
}
