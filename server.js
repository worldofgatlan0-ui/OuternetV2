import { supabase } from "./supabase.js";

console.log("UNDERNET SERVERS.JS LOADED");

const buttons = document.querySelectorAll(".server-join");
const logoutButton = document.getElementById("logout-button");
const navUsername = document.getElementById("nav-username");
const navAvatar = document.getElementById("nav-avatar");


/* SERVER BUTTONS */

buttons.forEach((button) => {

    button.addEventListener("click", () => {

        const server = button.dataset.server;

        console.log("SERVER CLICKED:", server);

        if (!server) {
            console.error("No server name found on button.");
            return;
        }

        window.location.href =
            "server.html?server=" + encodeURIComponent(server);

    });

});


/* LOAD USER */

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
}


/* LOG OUT */

if (logoutButton) {

    logoutButton.addEventListener("click", async () => {

        const { error } =
            await supabase.auth.signOut();

        if (error) {
            console.error("Logout failed:", error);
            return;
        }

        window.location.href = "login.html";

    });

}


loadUser();