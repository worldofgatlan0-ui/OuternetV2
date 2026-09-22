import { supabase } from "./supabase.js";

console.log("UNDERNET SERVERS.JS LOADED");

const navUsername =
    document.getElementById("nav-username");

const navAvatar =
    document.getElementById("nav-avatar");

const logoutButton =
    document.getElementById("logout-button");

const serverButtons =
    document.querySelectorAll(".server-join");


async function loadUser() {

    const {
        data: { user },
        error
    } = await supabase.auth.getUser();

    if (error || !user) {
        window.location.href = "login.html";
        return;
    }

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
            navAvatar.style.backgroundPosition = "center";

        } else {

            navAvatar.textContent =
                username
                    .charAt(0)
                    .toUpperCase();

        }
    }
}


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


function openServer(server) {

    window.location.href =
        `server.html?server=${server}`;
}


serverButtons.forEach((button) => {

    button.addEventListener(
        "click",
        () => {

            const server =
                button.dataset.server;

            openServer(server);

        }
    );

});


if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        logout
    );

}


loadUser();