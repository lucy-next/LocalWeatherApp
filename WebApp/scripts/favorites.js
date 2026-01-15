'use strict';

import { renderCards, initCards } from './cards.js';
import * as datamgr from './datamgr.js';

let FAVORITES_KEY = localStorage.getItem('STORAGE_KEY') || '';
FAVORITES_KEY += "_favorites";

let favorites = [];

// Add or remove Favorites
export function favoriteManager(data) {
    favorites = getFavorites();
    const isFavorite = checkFavorite(data);

    if (!isFavorite) {
        // Add to favorites
        const entry = {
            city: data.city || '',
            state: data.state || '',
            country: data.country || '',
            country_code: (data.country_code || '').toUpperCase(),
            lat: Number(data.lat),
            lon: Number(data.lon),
            display_name: data.display_name || '',
            display_index: favorites.length
        };

        favorites.push(entry);
        fixIndexes(favorites);
        saveFavorites(favorites);
    } else {
        // Remove from favorites
        favorites = favorites.filter(fav =>
            !(fav.city === data.city &&
                fav.state === data.state &&
                fav.country === data.country)
        );
        fixIndexes(favorites);
        saveFavorites(favorites);
    }

    // Update the UI immediately
    reloadPage();
}

export function updateSidebar() {
    // Get or create the favorite bar
    let favoriteBar = document.querySelector('.favorite-bar');

    if (!favoriteBar) {
        // Create new sidebar if it doesn't exist
        favoriteBar = document.createElement('div');
        favoriteBar.className = 'favorite-bar';
        document.body.appendChild(favoriteBar);
    } else {
        // Clear existing sidebar content if it exists
        favoriteBar.innerHTML = '';
    }

    // Get favorites
    favorites = getFavorites();

    if (!favorites || favorites.length === 0) {
        // Add a message when there are no favorites
        const noFavoritesMessage = document.createElement('div');
        noFavoritesMessage.className = 'no-favorites-message';
        noFavoritesMessage.textContent = 'No favorites added yet';
        favoriteBar.appendChild(noFavoritesMessage);
        return;
    }

    // Create favorite list
    const favoriteUL = document.createElement('ul');
    favoriteUL.className = 'favorite-list';

    // Add each favorite to the sidebar
    favorites.forEach(favorite => {
        const favoriteItem = document.createElement('li');
        favoriteItem.className = 'favorite-item';

        favoriteItem.addEventListener('click', () => {
            AddFavoriteAsCard(favorite);
        })

        const favoriteName = document.createElement('div');
        favoriteName.className = 'favorite-name';
        favoriteName.innerHTML = favorite.display_name;

        const favoriteBtn = document.createElement('button');
        favoriteBtn.className = 'favorite-btn disabled';
        favoriteBtn.innerHTML = '★';
        favoriteBtn.addEventListener('click', () => {
            favoriteManager(favorite);
        });

        favoriteItem.appendChild(favoriteName);
        favoriteItem.appendChild(favoriteBtn);
        favoriteUL.appendChild(favoriteItem);
    });

    // Add the list to the sidebar
    favoriteBar.appendChild(favoriteUL);
}

// Helper Methods
export function getFavorites() {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    try {
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

export function checkFavorite(data) {
    favorites = getFavorites();
    return favorites.some(fav =>
        fav.display_name === data.display_name &&
        fav.city === data.city
    );
}

function saveFavorites(arr) {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(arr));
    favorites = arr;
}

function fixIndexes(arr) {
    for (let i = 0; i < arr.length; i++) {
        arr[i].display_index = i;
    }
}

function reloadPage () {
    renderCards();
    updateSidebar();
}

function AddFavoriteAsCard(favorite) {
    // See if we have the Data from the results already in our Data
    const all = datamgr.getAll();
    const sameLatLon = all.some(e => Math.abs(Number(e.lat) - Number(favorite.lat)) < 1e-6 && Math.abs(Number(e.lon) - Number(favorite.lon)) < 1e-6);
    const sameCityCountry = all.some(e => String(e.city || '').trim().toLowerCase() === String(favorite.city || '').trim().toLowerCase()
        && String(e.country_code || '').trim().toLowerCase() === String(favorite.country_code || '').trim().toLowerCase());

    if (sameLatLon || sameCityCountry) {
        // Find the card with the matching city
        const cards = document.querySelectorAll('.card');
        for (const card of cards) {
            const cardIndex = parseInt(card.dataset.index);
            const cardCity = all[cardIndex];

            if (cardCity && (Math.abs(Number(cardCity.lat) - Number(favorite.lat)) < 1e-6 && Math.abs(Number(cardCity.lon) - Number(favorite.lon)) < 1e-6 ||
                String(cardCity.city || '').trim().toLowerCase() === String(favorite.city || '').trim().toLowerCase() &&
                String(cardCity.country_code || '').trim().toLowerCase() === String(favorite.country_code || '').trim().toLowerCase())) {

                // Scroll to the card smoothly
                card.scrollIntoView({ behavior: 'smooth' });
                break;
            }
        }
        return;
    }

    // If not add the Place to the saved entry.
    datamgr.addEntry(favorite);
    reloadPage();
}