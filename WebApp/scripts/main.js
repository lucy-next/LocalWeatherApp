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