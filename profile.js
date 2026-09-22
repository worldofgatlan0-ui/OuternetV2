import { supabase } from "./supabase.js";

const navUsername = document.getElementById("nav-username");
const navAvatar = document.getElementById("nav-avatar");
const welcomeUsername = document.getElementById("welcome-username");
const logoutButton = document.getElementById("logout-button");

function showError(message) {
    console.error("Undernet:", message);

    if (navUsername) {
        navUsername.textContent = "Error";
    }

    if (welcomeUsername) {
        welcomeUsername.textContent = "Error";
    }
}

function setAvatar(profile) {
    if (!navAvatar) return;

    if (profile?.avatar_url) {
        navAvatar.textContent = "";
        navAvatar.style.backgroundImage = `url("${profile.avatar_url}")`;
        navAvatar.style.backgroundSize = "cover";
        navAvatar.style.backgroundPosition = "center";
        navAvatar.style.backgroundRepeat = "no-repeat";
        return;
    }

    navAvatar.style.backgroundImage = "";
    navAvatar.textContent =
        (profile?.display_name || profile?.username || "?")
            .charAt(0)
            .toUpperCase();
}

async function loadProfile() {
    const {
        data: { user },
        error: sessionError
    } = await supabase.auth.getUser();

    if (sessionError) {
        showError(sessionError.message);
        return;
    }

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
        showError(profileError.message);
        return;
    }

    if (!profile) {
        const username =
            user.user_metadata?.username ||
            user.email?.split("@")[0] ||
            "Unknown";

        if (navUsername) {
            navUsername.textContent = username;
        }

        if (welcomeUsername) {
            welcomeUsername.textContent = username;
        }

        if (navAvatar) {
            navAvatar.textContent = username.charAt(0).toUpperCase();
        }

        return;
    }

    const displayName =
        profile.display_name ||
        profile.username ||
        "Unknown";

    if (navUsername) {
        navUsername.textContent = displayName;
    }

    if (welcomeUsername) {
        welcomeUsername.textContent = displayName;
    }

    setAvatar(profile);
}

async function logout() {
    if (!logoutButton) return;

    logoutButton.disabled = true;

    const { error } = await supabase.auth.signOut();

    if (error) {
        console.error("Logout failed:", error);
        logoutButton.disabled = false;
        return;
    }

    window.location.href = "login.html";
}

if (logoutButton) {
    logoutButton.addEventListener("click", logout);
}

loadProfile();