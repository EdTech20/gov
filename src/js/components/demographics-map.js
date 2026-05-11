import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';

const demographicsMap = () => {
  const mapContainer = document.getElementById('map');
  if (!mapContainer) return;

  // Use the token from the .env file via process.env
  mapboxgl.accessToken = process.env.MAPBOX_TOKEN;

  if (!mapboxgl.accessToken) {
    const warning = document.getElementById('tokenWarning');
    if (warning) warning.style.display = 'flex';
    return;
  } else {
    const warning = document.getElementById('tokenWarning');
    if (warning) warning.style.display = 'none';
  }

  // Initialize Mapbox
  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v11', // Futuristic dark style
    center: [8.6753, 9.0820], // Nigeria center
    zoom: 5.5,
    pitch: 45, // Angled for a 3D futuristic look
    bearing: 0,
    antialias: true
  });

  const resetBtn = document.getElementById('resetMapBtn');
  const hud = document.getElementById('hud');
  let hoveredStateId = null;

  map.on('load', () => {
    // Find label layer to insert buildings beneath
    const layers = map.getStyle().layers;
    let labelLayerId;
    for (let i = 0; i < layers.length; i++) {
      if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
        labelLayerId = layers[i].id;
        break;
      }
    }

    // Add 3D buildings layer for futuristic effect
    map.addLayer({
      'id': '3d-buildings',
      'source': 'composite',
      'source-layer': 'building',
      'filter': ['==', 'extrude', 'true'],
      'type': 'fill-extrusion',
      'minzoom': 14,
      'paint': {
        'fill-extrusion-color': '#0a1d35', // Deep cyber blue
        'fill-extrusion-height': [
          'interpolate', ['linear'], ['zoom'],
          14, 0,
          15.05, ['get', 'height']
        ],
        'fill-extrusion-base': [
          'interpolate', ['linear'], ['zoom'],
          14, 0,
          15.05, ['get', 'min_height']
        ],
        'fill-extrusion-opacity': 0.85
      }
    }, labelLayerId);

    // Fetch Nigeria States GeoJSON
    fetch('https://raw.githubusercontent.com/apache/superset/master/superset-frontend/plugins/legacy-plugin-chart-country-map/src/countries/nigeria.geojson')
      .then(res => res.json())
      .then(data => {
        // Add IDs to features for state hover effects
        data.features = data.features.map((f, idx) => ({...f, id: idx}));

        map.addSource('nigeria-states', {
          type: 'geojson',
          data: data
        });

        // The glowing outline
        map.addLayer({
          'id': 'state-borders',
          'type': 'line',
          'source': 'nigeria-states',
          'paint': {
            'line-color': '#00f3ff',
            'line-width': 1.5,
            'line-opacity': 0.5
          }
        });

        // The interactive fill layer (transparent normally, highlights on hover)
        map.addLayer({
          'id': 'state-fills',
          'type': 'fill',
          'source': 'nigeria-states',
          'paint': {
            'fill-color': '#00f3ff',
            'fill-opacity': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              0.2,
              0.0
            ]
          }
        });

        // Hover effects
        map.on('mousemove', 'state-fills', (e) => {
          if (e.features.length > 0) {
            if (hoveredStateId !== null) {
              map.setFeatureState(
                { source: 'nigeria-states', id: hoveredStateId },
                { hover: false }
              );
            }
            hoveredStateId = e.features[0].id;
            map.setFeatureState(
              { source: 'nigeria-states', id: hoveredStateId },
              { hover: true }
            );
            map.getCanvas().style.cursor = 'pointer';
          }
        });

        map.on('mouseleave', 'state-fills', () => {
          if (hoveredStateId !== null) {
            map.setFeatureState(
              { source: 'nigeria-states', id: hoveredStateId },
              { hover: false }
            );
          }
          hoveredStateId = null;
          map.getCanvas().style.cursor = '';
        });

        // Empty source for the citizen nodes
        map.addSource('citizen-nodes', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });

        // Styling for the futuristic dots
        map.addLayer({
          'id': 'nodes-glow',
          'type': 'circle',
          'source': 'citizen-nodes',
          'paint': {
            'circle-radius': 8,
            'circle-color': '#00f3ff',
            'circle-opacity': 0.2,
            'circle-blur': 1
          }
        });
        
        map.addLayer({
          'id': 'nodes-core',
          'type': 'circle',
          'source': 'citizen-nodes',
          'paint': {
            'circle-radius': 3,
            'circle-color': '#fff',
            'circle-opacity': 1,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#00f3ff'
          }
        });

        // Click to fly to state and generate nodes
        map.on('click', 'state-fills', (e) => {
          const feature = e.features[0];
          const stateName = feature.properties.NAME_1;
          
          // Use turf.js to get bounding box for the polygon
          const bbox = turf.bbox(feature);
          
          // Fly to the state
          map.fitBounds([
            [bbox[0], bbox[1]],
            [bbox[2], bbox[3]]
          ], { padding: 40, pitch: 60, duration: 2000 });

          resetBtn.classList.remove('hidden');
          hud.classList.remove('hidden');
          
          // Generate simulated citizen points inside the bounding box
          generateNodes(bbox, stateName);
        });
      });
  });

  function generateNodes(bbox, stateName) {
    const count = Math.floor(Math.random() * 300) + 100;
    const features = [];

    for (let i = 0; i < count; i++) {
      // Random point in bbox
      const lng = bbox[0] + (bbox[2] - bbox[0]) * Math.random();
      const lat = bbox[1] + (bbox[3] - bbox[1]) * Math.random();

      features.push({
        type: 'Feature',
        properties: {
          id: `NODE-${Math.floor(Math.random()*9999)}`,
          state: stateName
        },
        geometry: { type: 'Point', coordinates: [lng, lat] }
      });
    }

    map.getSource('citizen-nodes').setData({
      type: 'FeatureCollection',
      features: features
    });

    // Update HUD
    const hudState = document.getElementById('hud-state');
    const hudCount = document.getElementById('hud-count');
    if (hudState) hudState.innerText = stateName;
    if (hudCount) hudCount.innerText = count;
  }

  // Popup for clicking nodes
  map.on('click', 'nodes-core', (e) => {
    const coords = e.features[0].geometry.coordinates.slice();
    const props = e.features[0].properties;

    new mapboxgl.Popup()
      .setLngLat(coords)
      .setHTML(`<strong>${props.id}</strong><br/>Loc: ${props.state}<br/><span style="color:#0f0;">ACTIVE UPLINK</span>`)
      .addTo(map);
  });

  // Change cursor over nodes
  map.on('mouseenter', 'nodes-core', () => { map.getCanvas().style.cursor = 'crosshair'; });
  map.on('mouseleave', 'nodes-core', () => { map.getCanvas().style.cursor = ''; });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      map.flyTo({
        center: [8.6753, 9.0820],
        zoom: 5.5,
        pitch: 45,
        bearing: 0,
        duration: 2000
      });
      resetBtn.classList.add('hidden');
      if (hud) hud.classList.add('hidden');
      
      // Clear nodes
      map.getSource('citizen-nodes').setData({ type: 'FeatureCollection', features: [] });
    });
  }
};

export default demographicsMap;
