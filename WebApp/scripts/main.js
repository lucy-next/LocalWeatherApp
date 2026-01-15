'use strict';

// Load External JS Functions

import { LoadSearch } from './search.js';
import { renderCards, initCards } from './cards.js';
import { clearAll } from './datamgr.js';
import { updateSidebar } from "./favorites.js";

// Fire Startup Weather Functions

LoadSearch();
initCards();
renderCards();
updateSidebar();

// Delete All Button
const deleteAllButton = document.getElementById('delete-all');
if (deleteAllButton) {
    deleteAllButton.addEventListener('click', () => {
        clearAll();
        renderCards();
    });
}

// Handle Log Out

let logoutcontainer = document.getElementById("logout-btn");
logoutcontainer.addEventListener('click', () => {
    sessionStorage.removeItem('STORAGE_KEY');
    window.location.href = "/LocalWeather-WorkExample/WebApp/index.html";
})