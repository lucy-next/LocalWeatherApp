'use strict';

// scripts/datamgr.js
// Manages weatherdata[] in localStorage (NO DOM CODE)

const STORAGE_KEY = 'weatherdata';

/* read array from localStorage */
export function getAll() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

/* save array to localStorage */
function saveAll(arr) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

/* fix display_index to match array order */
function fixIndexes(arr) {
    for (let i = 0; i < arr.length; i++) {
        arr[i].display_index = i;
    }
}

/* add new city to the end */
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

/* remove city by display_index */
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

/* remove all cities */
export function clearAll() {
    localStorage.removeItem(STORAGE_KEY);
}

/* move city from one index to another */
export function moveEntry(fromIndex, toIndex) {
    const arr = getAll();
    if (fromIndex < 0 || fromIndex >= arr.length) return;
    if (toIndex < 0) toIndex = 0;
    if (toIndex >= arr.length) toIndex = arr.length - 1;

    const item = arr[fromIndex];
    arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, item);

    fixIndexes(arr);
    saveAll(arr);
}

/* update an existing entry */
export function updateEntry(display_index, newData) {
    const arr = getAll();

    for (let i = 0; i < arr.length; i++) {
        if (arr[i].display_index === display_index) {
            Object.assign(arr[i], newData);
            break;
        }
    }

    fixIndexes(arr);
    saveAll(arr);
}
