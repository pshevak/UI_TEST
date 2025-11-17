import { useEffect, useRef, useState } from 'react';
import mapboxgl, { Map } from 'mapbox-gl';
import { PersonaKey, ParcelSummary } from '../App';
import Legend from './Legend';

mapboxgl.accessToken = 'pk.test-token';

interface MapViewProps {
  persona: PersonaKey;
  onParcelSelect: (parcel: ParcelSummary) => void;
  onMultiSelect: (ids: string[]) => void;
}

const defaultLayers = ['burn', 'reburn', 'erosion', 'flood', 'recommendation'];

function MapView({ persona, onParcelSelect, onMultiSelect }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const [activeLayers, setActiveLayers] = useState<string[]>(['burn', 'recommendation']);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [-120.5, 40.1],
      zoom: 9,
    });

    map.on('load', () => {
      defaultLayers.forEach((layer) => {
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
      const mockParcel: ParcelSummary = {
        id: '12345',
        burnSeverity: { class: 'high', index: 0.78 },
        risks: { reburn: 0.64, erosion: 0.42, flood: 0.21 },
        recoveryStage: 'mid',
      };
      onParcelSelect(mockParcel);
    });

    mapRef.current = map;
    return () => {
      map.remove();
    };
  }, [onParcelSelect]);

  useEffect(() => {
    setActiveLayers(persona === 'planner' ? defaultLayers : ['burn', 'recommendation']);
  }, [persona]);

  const toggleLayer = (layerId: string) => {
    if (!mapRef.current) return;
    const visibility = activeLayers.includes(layerId);
    const layer = mapRef.current.getLayer(layerId);
    if (!layer) return;
    mapRef.current.setLayoutProperty(layerId, 'visibility', visibility ? 'none' : 'visible');
    setActiveLayers((prev) =>
      visibility ? prev.filter((id) => id !== layerId) : [...prev, layerId]
    );
  };

  return (
    <div className="map-wrapper">
      <div className="mapbox" ref={mapContainer} />
      <Legend activeLayers={activeLayers} onToggle={toggleLayer} />
    </div>
  );
}

export default MapView;
