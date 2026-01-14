'use strict';

let USER_KEY = '';

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

function Login () {
    if (!username || !password) {
        alert("Please enter both username and password");
        return;
    }

    let userok = CheckUserOK(username);
    let passok = CheckPasswordHash(username, password);

    if (userok && passok) {
        sessionStorage.setItem('STORAGE_KEY', username);
        window.location.href = "/LocalWeather-WorkExample/WebApp/weather.html";
    } else {
        alert("Invalid username or password");
    }
}

function CheckUserOK (user) {
    return localStorage.getItem(user) !== null;
}

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

function Register () {
    if (CheckUserOK(username)) {
        alert("Username already exists");
        return;
    }
    if (!CheckPasswordOK(password)) {
        alert("Password must be at least 8 characters long");
        return;
    }

    SaveUser(username, password);
    sessionStorage.setItem('STORAGE_KEY', username);
    window.location.href = "/LocalWeather-WorkExample/WebApp/weather.html";
}

function CheckPasswordOK (passw) {
    const hashedPassword = PasswordHash(passw, true);
    return passw.length >= 8;
}

function PasswordHash (passw, gen = false) {
    let hash = 0;
    for (let i = 0; i < passw.length; i++) {
        const char = passw.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
}

function SaveUser (user, passw) {
    const hashedPassword = PasswordHash(passw, true);
    const userData = {
        password: hashedPassword
    };
    localStorage.setItem(user, JSON.stringify(userData));
}
