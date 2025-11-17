import { PersonaKey } from '../App';

interface PersonaSidebarProps {
  persona: PersonaKey;
  horizon: number;
  onPersonaChange: (persona: PersonaKey) => void;
  onHorizonChange: (horizon: number) => void;
  onControlChange: (controls: Record<string, number>) => void;
}

const personaControls: Record<PersonaKey, { label: string; controls: { key: string; label: string }[] }> = {
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

function PersonaSidebar({ persona, horizon, onPersonaChange, onHorizonChange, onControlChange }: PersonaSidebarProps) {
  const handleSlider = (key: string, value: number) => {
    onControlChange({ [key]: value });
  };

  return (
    <div className="persona-sidebar">
      <h2>Persona</h2>
      <div className="persona-selector">
        {Object.keys(personaControls).map((key) => (
          <button
            key={key}
            className={persona === key ? 'active' : ''}
            onClick={() => onPersonaChange(key as PersonaKey)}
          >
            {personaControls[key as PersonaKey].label}
          </button>
        ))}
      </div>

      <div className="time-horizon">
        <span>Time Horizon</span>
        {[5, 10, 20].map((years) => (
          <button key={years} className={horizon === years ? 'active' : ''} onClick={() => onHorizonChange(years)}>
            {years} yrs
          </button>
        ))}
      </div>

      <div className="controls">
        {personaControls[persona].controls.map((control) => (
          <label key={control.key}>
            <span>{control.label}</span>
            <input type="range" min={0} max={1} step={0.1} defaultValue={0.5} onChange={(e) => handleSlider(control.key, Number(e.target.value))} />
          </label>
        ))}
      </div>
    </div>
  );
}

export default PersonaSidebar;
