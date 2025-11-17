import { PersonaKey, ParcelSummary } from '../App';

interface ParcelPanelProps {
  persona: PersonaKey;
  parcel: ParcelSummary | null;
}

const riskLabel = (value: number) => {
  if (value > 0.66) return 'High';
  if (value > 0.33) return 'Medium';
  return 'Low';
};

function ParcelPanel({ persona, parcel }: ParcelPanelProps) {
  if (!parcel) {
    return (
      <div className="parcel-panel">
        <h3>No parcel selected</h3>
        <p>Select a parcel on the map to view recommendations.</p>
      </div>
    );
  }

  return (
    <div className="parcel-panel">
      <h3>Parcel {parcel.id}</h3>
      <p>Burn severity: {parcel.burnSeverity.class} ({parcel.burnSeverity.index.toFixed(2)})</p>
      <ul>
        <li>Reburn risk: {riskLabel(parcel.risks.reburn)}</li>
        <li>Erosion risk: {riskLabel(parcel.risks.erosion)}</li>
        <li>Flood risk: {riskLabel(parcel.risks.flood)}</li>
        <li>Recovery stage: {parcel.recoveryStage}</li>
      </ul>
      <div className="recommendations">
        <h4>Recommended action ({persona})</h4>
        <p>Reforest to stabilize slopes and buffer flood pathways.</p>
        <p className="confidence">Confidence: Medium</p>
        <small>Drivers: high burn severity + steep slope + proximity to waterways.</small>
      </div>
    </div>
  );
}

export default ParcelPanel;
