from __future__ import annotations

from typing import Any

from ..models import schemas
from .persona import PersonaManager


class RecommendationService:
    def __init__(self, persona_manager: PersonaManager) -> None:
        self.persona_manager = persona_manager
        self.tile_lookup = {
            "burn": {"url": "https://tiles.example.com/burn/{z}/{x}/{y}.pbf", "legend": "Burn severity"},
            "reburn": {"url": "https://tiles.example.com/reburn/{z}/{x}/{y}.pbf", "legend": "Reburn risk"},
            "erosion": {"url": "https://tiles.example.com/erosion/{z}/{x}/{y}.pbf", "legend": "Erosion risk"},
            "flood": {"url": "https://tiles.example.com/flood/{z}/{x}/{y}.pbf", "legend": "Flood risk"},
            "recovery": {"url": "https://tiles.example.com/recovery/{z}/{x}/{y}.pbf", "legend": "Recovery stage"},
            "recommendation": {"url": "https://tiles.example.com/recommendation/{z}/{x}/{y}.pbf", "legend": "Land-use"},
        }

    def get_tile_metadata(self, query: schemas.MapTileQuery) -> dict[str, Any] | None:
        layer = self.tile_lookup.get(query.layer)
        if not layer:
            return None
        return {
            "layer": query.layer,
            "url": layer["url"].format(z=query.z, x=query.x, y=query.y),
            "legend": layer["legend"],
        }

    # Placeholder data fetch; replace with DB access
    def fetch_parcel(self, parcel_id: str) -> schemas.ParcelDetailStub | None:
        dummy = schemas.ParcelDetailStub(
            parcel_id=parcel_id,
            area_ha=12.3,
            centroid=(-120.5, 40.1),
            burn_class="high",
            burn_index=0.78,
            risks={"reburn": 0.64, "erosion": 0.42, "flood": 0.21},
            recovery_stage="mid",
            scores={"env": 0.9, "econ": 0.4, "social": 0.6, "risk_penalty": -0.12},
            explanation="High slope + high burn severity → high erosion risk.",
        )
        return dummy

    def build_parcel_response(self, stub: schemas.ParcelDetailStub, persona: str, horizon: int) -> schemas.ParcelDetailResponse:
        weights = self.persona_manager.weights_for(persona, {})
        actions = self._rank_actions(stub, weights)
        return schemas.ParcelDetailResponse(
            parcel_id=stub.parcel_id,
            centroid={"lat": stub.centroid[1], "lng": stub.centroid[0]},
            area_ha=stub.area_ha,
            burn_severity={"class": stub.burn_class, "index": stub.burn_index},
            risks=stub.risks,
            recovery_stage=stub.recovery_stage,
            scores=stub.scores,
            recommended_actions=actions,
            persona=persona,
        )

    def predict_risks(self, payload: schemas.PredictRiskRequest) -> schemas.PredictRiskResponse:
        predictions = []
        for feature in payload.features:
            predictions.append(
                {
                    "id": feature.id,
                    "reburn": 0.55,
                    "erosion": 0.32,
                    "flood": 0.18,
                    "recovery_stage": "mid" if payload.include_recovery else None,
                }
            )
        return schemas.PredictRiskResponse(predictions=predictions)

    def recommend_actions(self, payload: schemas.PersonaRecommendationRequest) -> schemas.PersonaRecommendationResponse:
        weights = self.persona_manager.weights_for(payload.persona, payload.controls.values)
        recommendations = []
        for parcel_id in payload.parcels:
            stub = self.fetch_parcel(parcel_id)
            if not stub:
                continue
            ranked_actions = self._rank_actions(stub, weights)
            recommendations.append(
                schemas.ParcelRecommendation(
                    parcel_id=parcel_id,
                    ranked_actions=ranked_actions,
                    utility_breakdown=self._utility_breakdown(stub, weights),
                )
            )
        return schemas.PersonaRecommendationResponse(
            persona=payload.persona,
            horizon=payload.horizon,
            recommendations=recommendations,
        )

    def _rank_actions(self, stub: schemas.ParcelDetailStub, weights: dict[str, float]) -> list[schemas.RecommendedAction]:
        base_utility = (
            stub.scores["env"] * weights.get("env", 0)
            + stub.scores["econ"] * weights.get("econ", 0)
            + stub.scores["social"] * weights.get("social", 0)
            + stub.scores["risk_penalty"] * weights.get("risk_penalty", 0)
        )
        ranked = [
            schemas.RecommendedAction(
                action="reforest",
                utility=round(base_utility, 2),
                confidence="medium",
                explanation=stub.explanation,
                drivers=["burn_severity", "slope"],
            ),
            schemas.RecommendedAction(
                action="buffer",
                utility=round(base_utility - 0.05, 2),
                confidence="medium",
                explanation="Buffers reduce erosion along steep slopes.",
                drivers=["slope", "erosion"],
            ),
        ]
        return ranked

    def _utility_breakdown(self, stub: schemas.ParcelDetailStub, weights: dict[str, float]) -> dict[str, float]:
        return {
            "env": stub.scores["env"] * weights.get("env", 0),
            "econ": stub.scores["econ"] * weights.get("econ", 0),
            "social": stub.scores["social"] * weights.get("social", 0),
            "risk_penalty": stub.scores["risk_penalty"] * weights.get("risk_penalty", 0),
        }
