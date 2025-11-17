interface ScenarioComparisonPanelProps {
  selectedParcels: string[];
}

function ScenarioComparisonPanel({ selectedParcels }: ScenarioComparisonPanelProps) {
  return (
    <div className="scenario-panel">
      <h3>Scenario Comparison</h3>
      {selectedParcels.length === 0 ? (
        <p>Select parcels (Ctrl+click on the map) to compare Scenario A vs B.</p>
      ) : (
        <>
          <p>{selectedParcels.length} parcels selected</p>
          <div className="scenario-metrics">
            <div>
              <strong>Scenario A</strong>
              <p>Risk reduction: 62%</p>
              <p>Forest: 38% | Housing: 18%</p>
            </div>
            <div>
              <strong>Scenario B</strong>
              <p>Risk reduction: 71%</p>
              <p>Forest: 44% | Housing: 15%</p>
            </div>
          </div>
          <button className="optimize">Optimize plan</button>
        </>
      )}
    </div>
  );
}

export default ScenarioComparisonPanel;
