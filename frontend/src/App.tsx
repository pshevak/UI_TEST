import { useState } from 'react';
import PersonaSidebar from './components/PersonaSidebar';
import MapView from './components/MapView';
import ParcelPanel from './components/ParcelPanel';
import ScenarioComparisonPanel from './components/ScenarioComparisonPanel';
import './styles/app.css';

export type PersonaKey = 'hiker' | 'homebuyer' | 'farmer' | 'planner';

export interface ParcelSummary {
  id: string;
  burnSeverity: { class: string; index: number };
  risks: { reburn: number; erosion: number; flood: number };
  recoveryStage: string;
}

function App() {
  const [persona, setPersona] = useState<PersonaKey>('hiker');
  const [horizon, setHorizon] = useState<number>(5);
  const [selectedParcel, setSelectedParcel] = useState<ParcelSummary | null>(null);
  const [scenarioSelection, setScenarioSelection] = useState<string[]>([]);

  return (
    <div className="app-shell">
      <aside className="sidebar left">
        <PersonaSidebar
          persona={persona}
          horizon={horizon}
          onPersonaChange={setPersona}
          onHorizonChange={setHorizon}
          onControlChange={(controls) => {
            console.debug('persona controls changed', controls);
          }}
        />
      </aside>
      <main className="map-container">
        <MapView
          persona={persona}
          onParcelSelect={(parcel) => {
            setSelectedParcel(parcel);
          }}
          onMultiSelect={(ids) => setScenarioSelection(ids)}
        />
      </main>
      <aside className="sidebar right">
        <ParcelPanel persona={persona} parcel={selectedParcel} />
        {persona === 'planner' && (
          <ScenarioComparisonPanel selectedParcels={scenarioSelection} />
        )}
      </aside>
    </div>
  );
}

export default App;
