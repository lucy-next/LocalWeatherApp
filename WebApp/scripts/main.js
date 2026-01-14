'use strict';

import { LoadSearch } from './search.js';
import { renderCards, initCards } from './cards.js';
import { clearAll } from './datamgr.js';

LoadSearch();
initCards();
renderCards();



// Handle Delete All Button
const deleteButton = document.getElementById('delete');
if (deleteButton) {
    deleteButton.addEventListener('click', () => {
        clearAll();
        renderCards();
    });
}

// Handle Log Out

let logoutcontainer = document.getElementById("logout-btn");

logoutcontainer.addEventListener('click', () => {
    LogOut();
})

function LogOut () {
    window.STORAGE_KEY = "";
    window.location.href = "/LocalWeather-WorkExample/WebApp/index.html";
}