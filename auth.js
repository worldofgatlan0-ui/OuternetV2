import { supabase } from "./supabase.js";

console.log("UNDERNET AUTH.JS LOADED");

const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");
const errorBox = document.getElementById("error");

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


/* REGISTER */

if (registerForm) {
    console.log("REGISTER FORM FOUND");

    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        console.log("REGISTER SUBMITTED");

        clearMessage();

        const username = document
            .getElementById("username")
            ?.value
            .trim();

        const email = document
            .getElementById("email")
            ?.value
            .trim();

        const password =
            document.getElementById("password")?.value;

        if (!username || !email || !password) {
            showMessage("Please fill in everything.");
            return;
        }

        if (username.length < 3) {
            showMessage("Username must be at least 3 characters.");
            return;
        }

        const button = registerForm.querySelector("button");

        if (button) {
            button.disabled = true;
            button.textContent = "CREATING ACCOUNT...";
        }

        try {
            console.log("Creating Supabase account...");

            const { data, error } =
                await supabase.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            username: username,
                            display_name: username
                        }
                    }
                });

            console.log("SIGN UP RESULT:", data, error);

            if (error) {
                showMessage(error.message);
                return;
            }

            if (!data.user) {
                showMessage("Supabase did not return a user.");
                return;
            }

            if (!data.session) {
                showMessage(
                    "Account created! Check your email to confirm your account, then log in."
                );
                return;
            }

            window.location.href = "home.html";

        } catch (error) {
            console.error("REGISTER ERROR:", error);

            showMessage(
                error.message ||
                "Something went wrong while creating your account."
            );

        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = "CREATE ACCOUNT";
            }
        }
    });
}


/* LOGIN */

if (loginForm) {
    console.log("LOGIN FORM FOUND");

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        console.log("LOGIN SUBMITTED");

        clearMessage();

        const email =
            document.getElementById("email")?.value.trim();

        const password =
            document.getElementById("password")?.value;

        if (!email || !password) {
            showMessage("Please enter your email and password.");
            return;
        }

        const button = loginForm.querySelector("button");

        if (button) {
            button.disabled = true;
            button.textContent = "CONNECTING...";
        }

        try {
            const { data, error } =
                await supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });

            console.log("LOGIN RESULT:", data, error);

            if (error) {
                showMessage(error.message);
                return;
            }

            window.location.href = "home.html";

        } catch (error) {
            console.error("LOGIN ERROR:", error);

            showMessage(
                error.message ||
                "Something went wrong while logging in."
            );

        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = "LOG IN";
            }
        }
    });
}