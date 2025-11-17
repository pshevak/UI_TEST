interface LegendProps {
  activeLayers: string[];
  onToggle: (layerId: string) => void;
}

const layerLabels: Record<string, string> = {
  burn: 'Burn severity',
  reburn: 'Reburn risk',
  erosion: 'Erosion / landslide risk',
  flood: 'Flood risk',
  recovery: 'Recovery stage',
  recommendation: 'Recommended land-use',
};

function Legend({ activeLayers, onToggle }: LegendProps) {
  return (
    <div className="legend">
      <h4>Layers</h4>
      <ul>
        {Object.entries(layerLabels).map(([layer, label]) => (
          <li key={layer}>
            <label>
              <input type="checkbox" checked={activeLayers.includes(layer)} onChange={() => onToggle(layer)} />
              {label}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Legend;
