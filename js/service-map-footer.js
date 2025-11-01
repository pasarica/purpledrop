
    document.getElementById('y').textContent = new Date().getFullYear();

    // === CONFIGURATION ===
    // const CENTER_LAT = 43.6532;   // Toronto: M5H 2N2
    // const CENTER_LNG = -79.3832;
    // const CENTER_POSTAL = "M5H 2N2";

    const CENTER_LAT = 44.0062;      // L4G 6J6 — Aurora, ON
    const CENTER_LNG = -79.4500;
    const CENTER_POSTAL = "L4G 6J6";

    const RADIUS_KM = 25;
    const RADIUS_METERS = RADIUS_KM * 1000;

    // Red marker icon
    const RedIcon = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
      iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    // Haversine distance
    function haversine(lat1, lon1, lat2, lon2) {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // Normalize postal code
    function normalizePostalCode(pc) {
      return (pc || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/(.{3})/, '$1 ').trim();
    }

    // Geocode using Google
    async function geocodePostalCode(pc) {
      return new Promise((resolve) => {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: pc + ', Canada' }, (results, status) => {
          if (status === 'OK' && results[0]) {
            const loc = results[0].geometry.location;
            resolve({ lat: loc.lat(), lng: loc.lng() });
          } else {
            resolve(null);
          }
        });
      });
    }

    // === MAP INITIALIZER ===
    function initMap(mapId) {
      const mapContainer = document.getElementById(mapId);
      if (!mapContainer) return null;

      const map = L.map(mapId).setView([CENTER_LAT, CENTER_LNG], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      const circle = L.circle([CENTER_LAT, CENTER_LNG], {
        radius: RADIUS_METERS,
        color: '#7A2BE6',
        weight: 2,
        fillColor: '#E9D7FF',
        fillOpacity: 0.25
      }).addTo(map);

      const centerMarker = L.marker([CENTER_LAT, CENTER_LNG])
        .addTo(map)
        .bindPopup(`${CENTER_POSTAL} — Toronto GTA`)
        .openPopup();

      map.fitBounds(circle.getBounds(), { padding: [20, 20] });

      return { map, circle, centerMarker, userMarker: null };
    }

    // === MARKER DROP ON ALL MAPS ===
    function dropMarkerOnAllMaps(lat, lng, label) {
      Object.values(window.__PD_maps).forEach(ctx => {
        if (!ctx || !ctx.map) return;
        if (ctx.userMarker) ctx.map.removeLayer(ctx.userMarker);
        ctx.userMarker = L.marker([lat, lng], { icon: RedIcon })
          .addTo(ctx.map)
          .bindPopup(label)
          .openPopup();
        ctx.map.setView([lat, lng], 12);
      });
    }

    // === CHECK LOCATION LOGIC ===
    async function checkLocation(inputEl, resultEl, mapKey) {
      const raw = inputEl.value.trim();
      if (!raw) {
        resultEl.innerHTML = '<span class="pc-no">Please enter a postal code.</span>';
        return;
      }
      const pc = normalizePostalCode(raw);
      inputEl.value = pc;
      resultEl.textContent = 'Checking…';

      const pos = await geocodePostalCode(pc);
      if (!pos) {
        resultEl.innerHTML = '<span class="pc-no">Not found.</span> Please check the postal code.';
        return;
      }

      const distance = haversine(CENTER_LAT, CENTER_LNG, pos.lat, pos.lng);
      const within = distance <= RADIUS_KM;

      resultEl.innerHTML = within
        ? `<span class="pc-ok">You are INSIDE our service area.</span> <span class="pc-distance">(~${distance.toFixed(1)} km from center)</span>`
        : `<span class="pc-no">You are OUTSIDE our standard area.</span> <span class="pc-distance">(~${distance.toFixed(1)} km from center)</span>`;

      dropMarkerOnAllMaps(pos.lat, pos.lng, `Postal Code: ${pc}`);
    }

    function checkCurrentLocation(resultEl) {
      if (!navigator.geolocation) {
        resultEl.innerHTML = '<span class="pc-no">Geolocation not supported.</span>';
        return;
      }
      resultEl.textContent = 'Getting your location…';
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const distance = haversine(CENTER_LAT, CENTER_LNG, lat, lng);
          const within = distance <= RADIUS_KM;

          resultEl.innerHTML = within
            ? `<span class="pc-ok">You are INSIDE our service area.</span> <span class="pc-distance">(~${distance.toFixed(1)} km)</span>`
            : `<span class="pc-no">You are OUTSIDE our standard area.</span> <span class="pc-distance">(~${distance.toFixed(1)} km)</span>`;

          dropMarkerOnAllMaps(lat, lng, 'Your Current Location');
        },
        () => {
          resultEl.innerHTML = '<span class="pc-no">Location access denied.</span> Try entering a postal code.';
        }
      );
    }

    // === DOM READY ===
    document.addEventListener('DOMContentLoaded', () => {
      // Initialize both maps
      window.__PD_maps = {};
      window.__PD_maps.map1 = initMap('radiusMap1');
      window.__PD_maps.map2 = initMap('radiusMap2');

      // Wire up first checker
      const input1 = document.getElementById('pc-input-1');
      const btn1 = document.getElementById('pc-btn-1');
      const geo1 = document.getElementById('pc-geo-btn-1');
      const result1 = document.getElementById('pc-result-1');

      btn1.addEventListener('click', () => checkLocation(input1, result1, 'map1'));
      geo1.addEventListener('click', () => checkCurrentLocation(result1));
      input1.addEventListener('keydown', e => e.key === 'Enter' && checkLocation(input1, result1, 'map1'));

      // Wire up second checker
      const input2 = document.getElementById('pc-input-2');
      const btn2 = document.getElementById('pc-btn-2');
      const geo2 = document.getElementById('pc-geo-btn-2');
      const result2 = document.getElementById('pc-result-2');

      btn2.addEventListener('click', () => checkLocation(input2, result2, 'map2'));
      geo2.addEventListener('click', () => checkCurrentLocation(result2));
      input2.addEventListener('keydown', e => e.key === 'Enter' && checkLocation(input2, result2, 'map2'));
    });

