import React, { useEffect, useRef, useState } from 'https://esm.sh/react@18.2.0';
import { createRoot } from 'https://esm.sh/react-dom@18.2.0/client';
import mapboxgl from 'https://esm.sh/mapbox-gl@3.1.0';

mapboxgl.accessToken = 'pk.test-token';

const personaControls = {
  hiker: {
    label: 'Hiker / Camper',
    controls: [
      { key: 'drive_time', label: 'Max drive time' },
      { key: 'avoid_reburn', label: 'Avoid reburn risk' },
      { key: 'avoid_erosion', label: 'Avoid erosion areas' },
      { key: 'scenic_recovery', label: 'Prefer scenic recovery' },
      { key: 'water_access', label: 'Prefer water access' },
    ],
  },
  homebuyer: {
    label: 'Home Buyer / Renter',
    controls: [
      { key: 'reburn_tolerance', label: 'Reburn risk tolerance' },
      { key: 'flood_tolerance', label: 'Flood risk tolerance' },
      { key: 'affordability_vs_safety', label: 'Affordability vs Safety' },
    ],
  },
  farmer: {
    label: 'Farmer / Landowner',
    controls: [
      { key: 'soil_quality', label: 'Soil quality importance' },
      { key: 'water_availability', label: 'Water availability' },
      { key: 'market_access', label: 'Market access' },
      { key: 'reburn_tolerance', label: 'Reburn risk tolerance' },
    ],
  },
  planner: {
    label: 'Local Planner / NGO',
    controls: [
      { key: 'forest_pct', label: 'Target % forest' },
      { key: 'housing_pct', label: 'Target % housing' },
      { key: 'budget', label: 'Budget leverage' },
      { key: 'safety_priority', label: 'Safety priority' },
      { key: 'economy_priority', label: 'Economy priority' },
      { key: 'conservation_priority', label: 'Conservation priority' },
    ],
  },
};

const layerLabels = {
  burn: 'Burn severity',
  reburn: 'Reburn risk',
  erosion: 'Erosion / landslide risk',
  flood: 'Flood risk',
  recovery: 'Recovery stage',
  recommendation: 'Recommended land-use',
};

const e = React.createElement;

function PersonaSidebar({ persona, horizon, onPersonaChange, onHorizonChange, onControlChange }) {
  const controlList = personaControls[persona].controls;

  return e(
    'div',
    { className: 'persona-sidebar' },
    e('h2', null, 'Persona'),
    e(
      'div',
      { className: 'persona-selector' },
      Object.keys(personaControls).map((key) =>
        e(
          'button',
          {
            key,
            className: persona === key ? 'active' : '',
            onClick: () => onPersonaChange(key),
          },
          personaControls[key].label,
        ),
      ),
    ),
    e(
      'div',
      { className: 'time-horizon' },
      e('span', null, 'Time Horizon'),
      [5, 10, 20].map((years) =>
        e(
          'button',
          {
            key: years,
            className: horizon === years ? 'active' : '',
            onClick: () => onHorizonChange(years),
          },
          `${years} yrs`,
        ),
      ),
    ),
    e(
      'div',
      { className: 'controls' },
      controlList.map((control) =>
        e(
          'label',
          { key: control.key },
          e('span', null, control.label),
          e('input', {
            type: 'range',
            min: 0,
            max: 1,
            step: 0.1,
            defaultValue: 0.5,
            onChange: (event) => onControlChange({ [control.key]: Number(event.target.value) }),
          }),
        ),
      ),
    ),
  );
}

function Legend({ activeLayers, onToggle }) {
  return e(
    'div',
    { className: 'legend' },
    e('h4', null, 'Layers'),
    e(
      'ul',
      null,
      Object.entries(layerLabels).map(([layer, label]) =>
        e(
          'li',
          { key: layer },
          e(
            'label',
            null,
            e('input', {
              type: 'checkbox',
              checked: activeLayers.includes(layer),
              onChange: () => onToggle(layer),
            }),
            label,
          ),
        ),
      ),
    ),
  );
}

function MapView({ persona, onParcelSelect, onMultiSelect }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [activeLayers, setActiveLayers] = useState(['burn', 'recommendation']);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) {
      return;
    }

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [-120.5, 40.1],
      zoom: 9,
    });

    map.on('load', () => {
      Object.keys(layerLabels).forEach((layer) => {
        map.addSource(layer, {
          type: 'vector',
          url: `https://tiles.example.com/${layer}.json`,
        });
        map.addLayer({
          id: layer,
          type: 'fill',
          source: layer,
          'source-layer': layer,
          paint: {
            'fill-opacity': 0.3,
            'fill-color': '#f97316',
          },
        });
      });
    });

    map.on('click', () => {
      const mockParcel = {
        id: '12345',
        burnSeverity: { class: 'high', index: 0.78 },
        risks: { reburn: 0.64, erosion: 0.42, flood: 0.21 },
        recoveryStage: 'mid',
      };
      onParcelSelect(mockParcel);
    });

    mapRef.current = map;
    return () => map.remove();
  }, [onParcelSelect]);

  useEffect(() => {
    setActiveLayers(persona === 'planner' ? Object.keys(layerLabels) : ['burn', 'recommendation']);
  }, [persona]);

  const toggleLayer = (layerId) => {
    if (!mapRef.current) return;
    const visibility = activeLayers.includes(layerId);
    const layer = mapRef.current.getLayer(layerId);
    if (!layer) return;
    mapRef.current.setLayoutProperty(layerId, 'visibility', visibility ? 'none' : 'visible');
    setActiveLayers((prev) => (visibility ? prev.filter((id) => id !== layerId) : [...prev, layerId]));
  };

  return e(
    'div',
    { className: 'map-wrapper' },
    e('div', { className: 'mapbox', ref: mapContainer }),
    e(Legend, { activeLayers, onToggle: toggleLayer }),
  );
}

function ParcelPanel({ persona, parcel }) {
  const riskLabel = (value) => {
    if (value > 0.66) return 'High';
    if (value > 0.33) return 'Medium';
    return 'Low';
  };

  if (!parcel) {
    return e(
      'div',
      { className: 'parcel-panel' },
      e('h3', null, 'No parcel selected'),
      e('p', null, 'Select a parcel on the map to view recommendations.'),
    );
  }

  return e(
    'div',
    { className: 'parcel-panel' },
    e('h3', null, `Parcel ${parcel.id}`),
    e('p', null, `Burn severity: ${parcel.burnSeverity.class} (${parcel.burnSeverity.index.toFixed(2)})`),
    e(
      'ul',
      null,
      e('li', null, `Reburn risk: ${riskLabel(parcel.risks.reburn)}`),
      e('li', null, `Erosion risk: ${riskLabel(parcel.risks.erosion)}`),
      e('li', null, `Flood risk: ${riskLabel(parcel.risks.flood)}`),
      e('li', null, `Recovery stage: ${parcel.recoveryStage}`),
    ),
    e(
      'div',
      { className: 'recommendations' },
      e('h4', null, `Recommended action (${persona})`),
      e('p', null, 'Reforest to stabilize slopes and buffer flood pathways.'),
      e('p', { className: 'confidence' }, 'Confidence: Medium'),
      e('small', null, 'Drivers: high burn severity + steep slope + proximity to waterways.'),
    ),
  );
}

function ScenarioComparisonPanel({ selectedParcels }) {
  if (!selectedParcels.length) {
    return e(
      'div',
      { className: 'scenario-panel' },
      e('h3', null, 'Scenario Comparison'),
      e('p', null, 'Select parcels (Ctrl+click on the map) to compare Scenario A vs B.'),
    );
  }

  return e(
    'div',
    { className: 'scenario-panel' },
    e('h3', null, 'Scenario Comparison'),
    e('p', null, `${selectedParcels.length} parcels selected`),
    e(
      'div',
      { className: 'scenario-metrics' },
      e(
        'div',
        null,
        e('strong', null, 'Scenario A'),
        e('p', null, 'Risk reduction: 62%'),
        e('p', null, 'Forest: 38% | Housing: 18%'),
      ),
      e(
        'div',
        null,
        e('strong', null, 'Scenario B'),
        e('p', null, 'Risk reduction: 71%'),
        e('p', null, 'Forest: 44% | Housing: 15%'),
      ),
    ),
    e('button', { className: 'optimize' }, 'Optimize plan'),
  );
}

function App() {
  const [persona, setPersona] = useState('hiker');
  const [horizon, setHorizon] = useState(5);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [scenarioSelection, setScenarioSelection] = useState([]);

  return e(
    'div',
    { className: 'app-shell' },
    e(
      'aside',
      { className: 'sidebar left' },
      e(PersonaSidebar, {
        persona,
        horizon,
        onPersonaChange: setPersona,
        onHorizonChange: setHorizon,
        onControlChange: (controls) => console.debug('persona controls changed', controls),
      }),
    ),
    e(
      'main',
      { className: 'map-container' },
      e(MapView, {
        persona,
        onParcelSelect: setSelectedParcel,
        onMultiSelect: setScenarioSelection,
      }),
    ),
    e(
      'aside',
      { className: 'sidebar right' },
      e(ParcelPanel, { persona, parcel: selectedParcel }),
      persona === 'planner' ? e(ScenarioComparisonPanel, { selectedParcels: scenarioSelection }) : null,
    ),
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(e(React.StrictMode, null, e(App)));
}
