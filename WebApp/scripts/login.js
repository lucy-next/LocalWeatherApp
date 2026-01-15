'use strict';

// Get all fields and add Events

let namecontainer = document.getElementById("form-email");
let passwcontainer = document.getElementById("form-password");

let username = namecontainer.value;
let password = passwcontainer.value;

let loginbtn = document.getElementById("login-btn");
let registerbtn = document.getElementById("signup-btn");

namecontainer.addEventListener('input', () => {
    username = namecontainer.value;
});

passwcontainer.addEventListener('input', () => {
    password = passwcontainer.value;
});

loginbtn.addEventListener('click', (e) => {
    e.preventDefault();
    Login();
});

registerbtn.addEventListener('click', (e) => {
    e.preventDefault();
    Register();
});

// Parse Name & Password to find user & log them in.
function Login () {
    if (!username || !password) {
        alert("Please enter both username and password");
        return;
    }

    let userok = CheckUserOK(username);
    let passok = CheckPasswordHash(username, password);

    if (userok && passok) {
        localStorage.setItem('STORAGE_KEY', username);
        window.location.href = "/LocalWeather-WorkExample/WebApp/weather.html";
    } else {
        alert("Invalid username or password");
    }
}

function CheckUserOK (user) {
    return localStorage.getItem(user) !== null;
}

// Check if Password is correct
function CheckPasswordHash (user, passw) {
    const userData = JSON.parse(localStorage.getItem(user));
    if (userData && userData.password) {
        const hashedPassword = PasswordHash(passw);
        if (userData.password === hashedPassword) {
            return true;
        }
    }
    return false;
}

// Check if Username doesnt exist and if Pass is long enough.
function Register () {
    if (CheckUserOK(username)) {
        alert("Username already exists");
        return;
    }
    if (!CheckPasswordOK(password)) {
        alert("Password must be at least 8 characters long");
        return;
    }

    SaveUser(username, PasswordHash(password));
    localStorage.setItem('STORAGE_KEY', username);
    window.location.href = "/LocalWeather-WorkExample/WebApp/weather.html";
}

function CheckPasswordOK (passw) {
    return passw.length >= 8;
}

// Hash Password // Very Oversimpliefied and shouldnt be Clientside normally.
function PasswordHash (passw) {
    let hash = 0;
    for (let i = 0; i < passw.length; i++) {
        const char = passw.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
}

// Save the User
function SaveUser (user, passw) {
    const userData = {
        password: passw
    };
    localStorage.setItem(user, JSON.stringify(userData));
}
