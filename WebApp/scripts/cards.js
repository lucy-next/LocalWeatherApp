'use strict';

import * as datamgr from './datamgr.js';

let draggingIndex = 0;
let targetIndex = 0;

export function initCards() {
    const results = document.querySelector('.search-results');
    const input = document.querySelector('#searchbar');
    if (!results) return;

    results.addEventListener('click', (ev) => {
        const item = ev.target.closest('.suggestion-item');
        if (!item || !item.place) return;
        const place = item.place;

        if (input) input.value = '';
        results.innerHTML = '';

        const all = datamgr.getAll();
        const sameLatLon = all.some(e => Math.abs(Number(e.lat) - Number(place.lat)) < 1e-6 && Math.abs(Number(e.lon) - Number(place.lon)) < 1e-6);
        const sameCityCountry = all.some(e => String(e.city || '').trim().toLowerCase() === String(place.city || '').trim().toLowerCase()
            && String(e.country_code || '').trim().toLowerCase() === String(place.country_code || '').trim().toLowerCase());

        if (sameLatLon || sameCityCountry) {
            showBasecoatToast('error', 'Already added that card', 'You already saved this city.');
            console.warn('Duplicate prevented for', place);
            return;
        }

        datamgr.addEntry(place);
        renderCards();
    });
}

function showBasecoatToast(category, title, description) {
    document.dispatchEvent(new CustomEvent('basecoat:toast', {
        detail: {
            config: {
                category: category,
                title: title,
                description: description,
                cancel: { label: 'Dismiss' }
            }
        }
    }));
}

export function renderCards() {
    (async function run() {
        const container = getContainer();
        if (!container) return;

        container.innerHTML = '';

        const cities = datamgr.getAll();
        if (!cities || cities.length === 0) return;

        const cfg = window.APP_CONFIG || {};
        const OWM_KEY = cfg.WEATHER_API_KEY || '';
        const WINDY_KEY = cfg.WINDY_API_KEY || '';

        if (!OWM_KEY) console.warn('OpenWeatherMap API key missing (window.APP_CONFIG.WEATHER_API_KEY)');
        if (!WINDY_KEY) console.warn('Windy API key missing (window.APP_CONFIG.WINDY_API_KEY)');

        // Sort cities by display_index
        cities.sort((a, b) => a.display_index - b.display_index);

        for (let i = 0; i < cities.length; i++) {
            const city = cities[i];
            const loading = createLoadingCard(city.city);
            container.appendChild(loading);

            const weather = await loadWeather(city, OWM_KEY);
            const webcam = await loadWebcam(city, WINDY_KEY);
            const forecast = await loadForecast(city, OWM_KEY);

            const card = createCard(city, weather, webcam, forecast);
            container.replaceChild(card, loading);
        }
    })();
}

function getContainer() {
    let c = document.querySelector('.weather-container');
    if (c) return c;
    const app = document.querySelector('#app') || document.body;
    c = document.createElement('div');
    c.className = 'weather-container';
    c.style.marginTop = '16px';
    app.appendChild(c);
    return c;
}

function createLoadingCard(name) {
    const card = document.createElement('div');
    card.className = 'card w-full';
    card.innerHTML = `<div class="card-body">Loading ${escapeHtml(name)}…</div>`;
    return card;
}

async function loadWeather(city, key) {
    if (!key) {
        console.warn('Skipping OWM fetch: WEATHER_API_KEY not set');
        return null;
    }
    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${city.lat}&lon=${city.lon}&units=metric&appid=${key}`;
        const r = await fetch(url);
        if (!r.ok) {
            let txt = '';
            try { txt = await r.text(); } catch {}
            console.error('OWM fetch failed:', r.status, txt);
            showBasecoatToast('error', 'Weather error', `OpenWeatherMap error ${r.status}`);
            return null;
        }
        const j = await r.json();
        if (!j || !j.main) {
            console.warn('OWM returned no usable data for', city, j);
            return null;
        }
        return j;
    } catch (e) {
        console.error('OWM fetch error', e);
        showBasecoatToast('error', 'Weather error', 'Could not fetch weather');
        return null;
    }
}

async function loadForecast(city, key) {
    if (!key) {
        console.warn('Skipping forecast fetch: WEATHER_API_KEY not set');
        return null;
    }

    try {
        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${city.lat}&lon=${city.lon}&units=metric&appid=${key}`;
        const r = await fetch(url);
        if (!r.ok) {
            let txt = '';
            try { txt = await r.text(); } catch {}
            console.error('Forecast fetch failed:', r.status, txt);
            showBasecoatToast('error', 'Forecast error', `OpenWeatherMap error ${r.status}`);
            return null;
        }
        const j = await r.json();
        if (!j || !j.list || j.list.length === 0) {
            console.warn('Forecast returned no usable data for', city, j);
            return null;
        }
        return j;
    } catch (e) {
        console.error('Forecast fetch error', e);
        showBasecoatToast('error', 'Forecast error', 'Could not fetch forecast');
        return null;
    }
}

async function loadWebcam(city, key) {
    if (!key) {
        console.warn('Skipping Windy fetch: WINDY_API_KEY not set');
        return null;
    }

    const lat = Number(city.lat);
    const lon = Number(city.lon);
    if (!isFinite(lat) || !isFinite(lon)) {
        console.warn('Invalid city coordinates for webcam fetch', city);
        return null;
    }

    const radiusKm = 10; // you can adjust
    const limit = 5;
    const include = 'player,images,location';
    const lang = 'en';
    const url = `https://api.windy.com/webcams/api/v3/webcams?nearby=${encodeURIComponent(lat)},${encodeURIComponent(lon)},${encodeURIComponent(radiusKm)}&limit=${encodeURIComponent(limit)}&include=${encodeURIComponent(include)}&lang=${encodeURIComponent(lang)}`;

    console.log('Windy webcams request URL:', url);

    try {
        const resp = await fetch(url, { headers: { 'x-windy-api-key': key }});
        if (!resp.ok) {
            let txt = '';
            try { txt = await resp.text(); } catch (e) { txt = '(could not read body)'; }
            console.error('Windy fetch failed:', resp.status, txt);
            return null;
        }

        const json = await resp.json();
        const cams = json.result?.webcams ?? json.webcams ?? json.data ?? [];
        if (!Array.isArray(cams) || cams.length === 0) {
            console.warn('No webcams found in Windy response for', city);
            return null;
        }

        // Return all webcams instead of just the best one
        return cams;
    } catch (err) {
        console.error('loadWebcam error', err);
        return null;
    }
}

function createCard(city, weather, webcams, forecast) {
    const card = document.createElement('div');
    card.className = 'card w-full draggable';
    card.draggable = true;
    card.dataset.index = city.display_index;

    const body = document.createElement('div');
    body.className = 'card-body';

    // Create delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-destructive remove-btn';
    deleteBtn.innerHTML = 'X';
    deleteBtn.addEventListener('click', () => {
        deleteEntry(city.display_index);
    });

    // Add delete button to the card
    body.appendChild(deleteBtn);

    const left = document.createElement('div');
    left.className = 'card-left';

    if (webcams && webcams.length > 0) {
        const carouselContainer = document.createElement('div');
        carouselContainer.className = 'webcam-carousel';

        const webcamDisplay = document.createElement('div');
        webcamDisplay.className = 'webcam-display';

        // Create navigation controls
        const prevBtn = document.createElement('button');
        prevBtn.className = 'carousel-control prev-control';
        prevBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg>';

        const nextBtn = document.createElement('button');
        nextBtn.className = 'carousel-control next-control';
        nextBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg>';

        // Create webcam elements for each webcam
        webcams.forEach((webcam, index) => {
            const webcamElement = document.createElement('div');
            webcamElement.className = `webcam-item ${index === 0 ? 'active' : ''}`;

            if (webcam?.player?.live?.embed) {
                const iframe = document.createElement('iframe');
                iframe.className = 'card-img';
                iframe.src = webcam.player.live.embed;
                iframe.allowFullscreen = false;
                webcamElement.appendChild(iframe);
            } else if (webcam?.images?.current?.preview) {
                const img = document.createElement('img');
                img.className = 'card-img';
                img.src = webcam.images.current.preview;
                img.alt = city.display_name || city.city;
                webcamElement.appendChild(img);
            } else {
                webcamElement.appendChild(text('No webcam available'));
            }

            webcamDisplay.appendChild(webcamElement);
        });

        // Add event listeners for navigation
        let currentIndex = 0;
        prevBtn.addEventListener('click', () => {
            const items = webcamDisplay.querySelectorAll('.webcam-item');
            items[currentIndex].classList.remove('active');
            currentIndex = (currentIndex - 1 + items.length) % items.length;
            items[currentIndex].classList.add('active');
        });

        nextBtn.addEventListener('click', () => {
            const items = webcamDisplay.querySelectorAll('.webcam-item');
            items[currentIndex].classList.remove('active');
            currentIndex = (currentIndex + 1) % items.length;
            items[currentIndex].classList.add('active');
        });

        carouselContainer.appendChild(prevBtn);
        carouselContainer.appendChild(webcamDisplay);
        carouselContainer.appendChild(nextBtn);
        left.appendChild(carouselContainer);
    } else {
        left.appendChild(text('No webcam available'));
    }

    const right = document.createElement('div');
    right.className = 'card-right';

    const title = document.createElement('h3');
    title.textContent = city.city + (city.state ? ', ' + city.state : '') + (city.country ? ', ' + city.country : '');
    right.appendChild(title);

    if (!weather) {
        right.appendChild(text('No weather data'));
    } else {
        const iconWrap = document.createElement('div');
        iconWrap.className = 'iconWrap';

        const icon = document.createElement('i');
        icon.className = 'wi ' + pickWeatherIcon(weather);

        const t = document.createElement('div');
        const temp = Math.round(weather.main.temp);
        const feelsLike = Math.round(weather.main.feels_like);
        const desc = weather.weather?.[0]?.description || '';

        // Create a container for temperature and feels like
        const tempContainer = document.createElement('div');
        tempContainer.className = 'temp-container';

        // Current temperature
        const tempElement = document.createElement('div');
        tempElement.className = 'temperature';
        tempElement.textContent = `${temp}°C`;

        // Feels like temperature
        const feelsLikeElement = document.createElement('div');
        feelsLikeElement.className = 'feels-like';
        feelsLikeElement.textContent = `Feels like ${feelsLike}°C`;

        // Description
        const descElement = document.createElement('div');
        descElement.className = 'description';
        descElement.textContent = desc;

        tempContainer.appendChild(tempElement);
        tempContainer.appendChild(feelsLikeElement);

        t.appendChild(tempContainer);
        t.appendChild(descElement);

        iconWrap.appendChild(icon);
        iconWrap.appendChild(t);
        right.appendChild(iconWrap);

        const rainVal = (weather.rain && (weather.rain['1h'] || weather.rain['3h'])) ? (weather.rain['1h'] || weather.rain['3h']) : 0;
        right.appendChild(text('Precipitation: ' + rainVal + ' mm'));

        const windDiv = document.createElement('div');
        windDiv.className = 'wind-info';
        const speed = weather.wind?.speed ?? 'n/a';
        windDiv.appendChild(text('Wind: ' + speed + ' m/s'));
        if (typeof weather.wind?.deg === 'number') {
            const deg = Math.round(weather.wind.deg);
            const windIcon = document.createElement('i');
            windIcon.className = 'wi wi-wind towards-' + deg + '-deg';
            windDiv.appendChild(windIcon);
        }
        right.appendChild(windDiv);

        if (forecast) {
            const forecastContainer = document.createElement('div');
            forecastContainer.className = 'forecast-container';

            const forecastTitle = document.createElement('h4');
            forecastTitle.textContent = 'Forecast';
            forecastContainer.appendChild(forecastTitle);

            // Group forecast data by day
            const dailyForecasts = groupForecastByDay(forecast.list);

            // Create forecast rows with two days each
            for (let i = 0; i < dailyForecasts.length; i += 2) {
                const forecastRow = document.createElement('div');
                forecastRow.className = 'forecast-row';

                // Add first day of the pair
                const day1 = dailyForecasts[i];
                if (day1) {
                    const forecastItem1 = createForecastItem(day1);
                    forecastRow.appendChild(forecastItem1);
                }

                // Add second day of the pair if it exists
                const day2 = dailyForecasts[i + 1];
                if (day2) {
                    const forecastItem2 = createForecastItem(day2);
                    forecastRow.appendChild(forecastItem2);
                }

                forecastContainer.appendChild(forecastRow);
            }

            right.appendChild(forecastContainer);
        }
        }

    body.appendChild(left);
    body.appendChild(right);
    card.appendChild(body);

    // Add drag event listeners
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragover', handleDragOver);
    card.addEventListener('dragleave', handleDragLeave);
    card.addEventListener('drop', handleDrop);
    card.addEventListener('dragend', handleDragEnd);

    return card;
}

function pickWeatherIcon(owm) {
    if (!owm || !owm.weather || !owm.weather[0]) return 'wi-na';
    const w = (owm.weather[0].main || '').toLowerCase();
    const icon = owm.weather[0].icon || '';
    const night = icon.endsWith('n');
    if (w === 'clear') return night ? 'wi-night-clear' : 'wi-day-sunny';
    if (w === 'clouds') return 'wi-cloud';
    if (w === 'rain' || w === 'drizzle') return 'wi-rain';
    if (w === 'thunderstorm') return 'wi-thunderstorm';
    if (w === 'snow') return 'wi-snow';
    if (w === 'mist' || w === 'fog' || w === 'haze') return 'wi-fog';
    return 'wi-na';
}

function groupForecastByDay(forecastList) {
    const dailyForecasts = {};
    const now = new Date();

    forecastList.forEach(item => {
        const date = new Date(item.dt * 1000);
        // Skip data points from the current day
        if (date.toDateString() === now.toDateString()) {
            return;
        }

        const dayKey = date.toISOString().split('T')[0];

        if (!dailyForecasts[dayKey]) {
            dailyForecasts[dayKey] = {
                dt: item.dt,
                temp_min: item.main.temp_min,
                temp_max: item.main.temp_max,
                rain: item.rain ? (item.rain['3h'] || 0) : 0,
                weather: item.weather[0]
            };
        } else {
            // Update min and max temperatures
            if (item.main.temp_min < dailyForecasts[dayKey].temp_min) {
                dailyForecasts[dayKey].temp_min = item.main.temp_min;
            }
            if (item.main.temp_max > dailyForecasts[dayKey].temp_max) {
                dailyForecasts[dayKey].temp_max = item.main.temp_max;
            }

            // Accumulate rain
            if (item.rain) {
                dailyForecasts[dayKey].rain += item.rain['3h'] || 0;
            }
        }
    });

    // Convert object to array and sort by date
    const forecasts = Object.values(dailyForecasts).sort((a, b) => a.dt - b.dt);

    // Return only the next 5 days
    return forecasts.slice(0, 5);
}

function createForecastItem(day) {
    const forecastItem = document.createElement('div');
    forecastItem.className = 'forecast-item';

    const date = new Date(day.dt * 1000);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

    const dayElement = document.createElement('div');
    dayElement.className = 'forecast-day';
    dayElement.textContent = dayName;
    forecastItem.appendChild(dayElement);

    const icon = document.createElement('i');
    icon.className = 'wi ' + pickWeatherIcon({ weather: [day.weather] });
    forecastItem.appendChild(icon);

    const temp = document.createElement('div');
    temp.className = 'forecast-temp';
    temp.textContent = `${Math.round(day.temp_min)}°C - ${Math.round(day.temp_max)}°C`;
    forecastItem.appendChild(temp);

    const rain = document.createElement('div');
    rain.className = 'forecast-rain';
    rain.textContent = `${Math.round(day.rain)}mm`;
    forecastItem.appendChild(rain);

    return forecastItem;
}


function handleDragStart(e) {
    const index = e.target.dataset.index;
    console.log('Drag Start Index:', index); // Add this line for debugging
    e.dataTransfer.setData('text/plain', index);
    e.target.classList.add('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    const draggingCard = document.querySelector('.dragging');
    const targetCard = e.target.closest('.card');
    if (targetCard && draggingCard !== targetCard) {
        const container = getContainer();
        const cards = Array.from(container.querySelectorAll('.card'));
        draggingIndex = cards.indexOf(draggingCard);
        targetIndex = cards.indexOf(targetCard);

        console.log('Dragging Index:', draggingIndex);
        console.log('Target Index:', targetIndex);

        if (draggingIndex < targetIndex) {
            container.insertBefore(draggingCard, targetCard.nextSibling);
        } else {
            container.insertBefore(draggingCard, targetCard);
        }
    }
}

function handleDragLeave(e) {
    e.preventDefault();
}

function handleDrop(e) {
    e.preventDefault();
    if (draggingIndex !== targetIndex) {
        datamgr.moveEntry(draggingIndex, targetIndex);
        renderCards();
    }
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

export function deleteEntry(display_index) {
    datamgr.removeEntry(display_index);
    renderCards();
}

function text(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d;
}

function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}