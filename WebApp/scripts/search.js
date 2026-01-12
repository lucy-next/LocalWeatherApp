'use strict';

export function LoadSearch() {
    const input = document.querySelector('#searchbar');
    const results = document.querySelector('.search-results');
    if (!input || !results) return;

    let timer = null;
    const MIN_CHARS = 3;
    const DEBOUNCE_MS = 200;
    const MAX_RESULTS = 5;

    input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
    });

    // click outside closes results
    document.addEventListener('click', (ev) => {
        if (!input.contains(ev.target) && !results.contains(ev.target)) {
            results.innerHTML = '';
        }
    });

    input.addEventListener('input', () => {
        const v = input.value.trim();
        clearTimeout(timer);
        if (v.length < MIN_CHARS) {
            results.innerHTML = '';
            return;
        }
        timer = setTimeout(() => doSearch(v), DEBOUNCE_MS);
    });

    function round6(num) {
        return Math.round((num || 0) * 1e6) / 1e6;
    }

    async function doSearch(q) {
        results.innerHTML = '';
        const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=' + MAX_RESULTS + '&addressdetails=1&q=' + encodeURIComponent(q);
        try {
            const r = await fetch(url, { headers: { 'Accept-Language': 'en' } });
            if (!r.ok) return;
            const places = await r.json();
            if (!Array.isArray(places) || places.length === 0) return;

            const seen = [];
            let shown = 0;

            for (let i = 0; i < places.length; i++) {
                if (shown >= MAX_RESULTS) break;
                const p = places[i];
                const addr = p.address || {};

                const primary = addr.city || addr.town || addr.village || addr.hamlet || '';
                const countryCode = (addr.country_code || '').toLowerCase();
                const countryName = addr.country || '';

                if (!primary || !countryCode) continue;

                const lat = parseFloat(p.lat);
                const lon = parseFloat(p.lon);
                if (!isFinite(lat) || !isFinite(lon)) continue;

                const key = (primary.trim().toLowerCase() + '|' + countryCode + '|' + round6(lat) + '|' + round6(lon));
                if (seen.includes(key)) continue;

                seen.push(key);
                shown++;

                const item = document.createElement('div');
                item.className = 'suggestion-item';

                const title = document.createElement('div');
                title.innerText = primary;
                title.style.fontWeight = '600';

                const sub = document.createElement('div');
                sub.innerText = countryName;
                sub.style.fontSize = '12px';
                sub.style.color = '#666';

                item.appendChild(title);
                item.appendChild(sub);

                // store parsed place for consumer code to use later
                item.place = {
                    city: primary,
                    state: addr.state || '',
                    country: countryName,
                    country_code: (addr.country_code || '').toUpperCase(),
                    lat: lat,
                    lon: lon,
                    display_name: p.display_name,
                    raw: p
                };

                // do NOT attach click handlers here — consumer will handle clicks
                results.appendChild(item);
            }
        } catch (err) {
            console.error('search error', err);
        }
    }
}
