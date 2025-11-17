from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class MapTileQuery(BaseModel):
    layer: Literal["burn", "reburn", "erosion", "flood", "recovery", "recommendation"] = "burn"
    z: int
    x: int
    y: int


class ParcelDetailStub(BaseModel):
    parcel_id: str
    area_ha: float
    centroid: tuple[float, float]
    burn_class: str
    burn_index: float
    risks: dict[str, float]
    recovery_stage: str
    scores: dict[str, float]
    explanation: str


class RecommendedAction(BaseModel):
    action: Literal["reforest", "buffer", "recreation", "housing", "agriculture"]
    utility: float
    confidence: Literal["low", "medium", "high"]
    explanation: str
    drivers: list[str]


class ParcelDetailResponse(BaseModel):
    parcel_id: str
    centroid: dict[str, float]
    area_ha: float
    burn_severity: dict[str, Any]
    risks: dict[str, float]
    recovery_stage: str
    scores: dict[str, float]
    recommended_actions: list[RecommendedAction]
    persona: str


class ParcelFeature(BaseModel):
    id: str
    geometry: dict[str, Any]
    properties: dict[str, Any] | None = None


class PredictRiskRequest(BaseModel):
    features: list[ParcelFeature]
    include_recovery: bool = True


class PredictRiskResponse(BaseModel):
    predictions: list[dict[str, Any]]


class PersonaControls(BaseModel):
    values: dict[str, float] = Field(default_factory=dict)


class PersonaRecommendationRequest(BaseModel):
    persona: Literal["hiker", "homebuyer", "farmer", "planner"]
    controls: PersonaControls
    parcels: list[str]
    horizon: int = 10


class ParcelRecommendation(BaseModel):
    parcel_id: str
    ranked_actions: list[RecommendedAction]
    utility_breakdown: dict[str, float]


class PersonaRecommendationResponse(BaseModel):
    persona: str
    horizon: int
    recommendations: list[ParcelRecommendation]


class ScenarioParcelAssignment(BaseModel):
    id: str
    action: Literal["reforest", "buffer", "recreation", "housing", "agriculture"]


class ScenarioPayload(BaseModel):
    parcels: list[ScenarioParcelAssignment]


class ScenarioConstraints(BaseModel):
    min_forest_pct: float
    max_housing_pct: float
    budget: float


class ScenarioCompareRequest(BaseModel):
    persona: Literal["planner"]
    scenario_a: ScenarioPayload
    scenario_b: ScenarioPayload
    constraints: ScenarioConstraints


class ScenarioMetric(BaseModel):
    label: str
    scenario_a: float
    scenario_b: float
    delta: float


class ScenarioCompareResponse(BaseModel):
    persona: str
    constraints: ScenarioConstraints
    metrics: list[ScenarioMetric]
    land_use_percentages: dict[str, dict[str, float]]
    parcel_deltas: list[dict[str, Any]]
