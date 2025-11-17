from __future__ import annotations

from collections import Counter

from ..models import schemas
from .persona import PersonaManager


class ScenarioService:
    def __init__(self, persona_manager: PersonaManager) -> None:
        self.persona_manager = persona_manager

    def compare(self, payload: schemas.ScenarioCompareRequest) -> schemas.ScenarioCompareResponse:
        land_use_pct = {
            "scenario_a": self._land_use_percentage(payload.scenario_a),
            "scenario_b": self._land_use_percentage(payload.scenario_b),
        }
        metrics = [
            self._build_metric("Total risk reduction", 0.62, 0.71),
            self._build_metric("Economic score", 0.55, 0.5),
            self._build_metric("Environmental score", 0.74, 0.8),
            self._build_metric("Social score", 0.58, 0.61),
        ]
        parcel_deltas = [
            {
                "parcel_id": assignment.id,
                "scenario_a": assignment.action,
                "scenario_b": self._find_action(payload.scenario_b.parcels, assignment.id),
                "delta_utility": 0.05,
            }
            for assignment in payload.scenario_a.parcels
        ]
        return schemas.ScenarioCompareResponse(
            persona=payload.persona,
            constraints=payload.constraints,
            metrics=metrics,
            land_use_percentages=land_use_pct,
            parcel_deltas=parcel_deltas,
        )

    def _land_use_percentage(self, payload: schemas.ScenarioPayload) -> dict[str, float]:
        counter = Counter(p.action for p in payload.parcels)
        total = sum(counter.values()) or 1
        return {action: round(count / total, 2) for action, count in counter.items()}

    def _build_metric(self, label: str, a: float, b: float) -> schemas.ScenarioMetric:
        return schemas.ScenarioMetric(label=label, scenario_a=a, scenario_b=b, delta=round(b - a, 2))

    def _find_action(self, parcels: list[schemas.ScenarioParcelAssignment], parcel_id: str) -> str:
        for parcel in parcels:
            if parcel.id == parcel_id:
                return parcel.action
        return "unknown"
