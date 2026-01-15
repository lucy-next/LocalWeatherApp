'use strict';

let STORAGE_KEY = localStorage.getItem('STORAGE_KEY') || '';
STORAGE_KEY += "_data"; // Username + _data = "name_data"

// Load all Weather Entrys for the User.
export function getAll() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

// Add new city to the end of Array
export function addEntry(data) {
    const arr = getAll();

    const entry = {
        city: data.city || '',
        state: data.state || '',
        country: data.country || '',
        country_code: (data.country_code || '').toUpperCase(),
        lat: Number(data.lat),
        lon: Number(data.lon),
        display_name: data.display_name || '',
        display_index: arr.length
    };

    arr.push(entry);
    fixIndexes(arr);
    saveAll(arr);

    return entry;
}

// Remove city by display_index
export function removeEntry(display_index) {
    const arr = getAll();

    for (let i = 0; i < arr.length; i++) {
        if (arr[i].display_index === display_index) {
            arr.splice(i, 1);
            break;
        }
    }

    fixIndexes(arr);
    saveAll(arr);
}

// Remove all Entrys
export function clearAll() {
    localStorage.removeItem(STORAGE_KEY);
}

// Move Entry from one index to another
export function moveEntry(fromIndex, toIndex) {
    const entries = getAll();
    if (fromIndex < 0 || fromIndex >= entries.length || toIndex < 0 || toIndex >= entries.length) {
        console.error('Invalid indices for moveEntry:', fromIndex, toIndex);
        return;
    }
    entries.forEach((entry, index) => {
        entry.display_index = index;
    });

    // Move the entry from fromIndex to toIndex
    const [movedEntry] = entries.splice(fromIndex, 1);
    entries.splice(toIndex, 0, movedEntry);

    entries.forEach((entry, index) => {
        entry.display_index = index;
    });

    saveAll(entries);
}

// Helper Methods
function saveAll(arr) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

function fixIndexes(arr) {
    for (let i = 0; i < arr.length; i++) {
        arr[i].display_index = i;
    }
}