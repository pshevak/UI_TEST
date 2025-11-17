from typing import Any

from fastapi import APIRouter, HTTPException

from ..models.schemas import (
    MapTileQuery,
    ParcelDetailResponse,
    ParcelDetailStub,
    PersonaRecommendationRequest,
    PersonaRecommendationResponse,
    PredictRiskRequest,
    PredictRiskResponse,
    ScenarioCompareRequest,
    ScenarioCompareResponse,
)
from ..services.persona import PersonaManager
from ..services.recommendation import RecommendationService
from ..services.scenario import ScenarioService

router = APIRouter()
persona_manager = PersonaManager()
recommendation_service = RecommendationService(persona_manager=persona_manager)
scenario_service = ScenarioService(persona_manager=persona_manager)


@router.get("/map_tiles", tags=["map"])
async def get_map_tile(query: MapTileQuery) -> dict[str, Any]:
    """Return tile metadata or redirect URL (tile streaming handled by CDN)."""
    tile = recommendation_service.get_tile_metadata(query)
    if not tile:
        raise HTTPException(status_code=404, detail="Layer not found")
    return tile


@router.get("/parcel_details", response_model=ParcelDetailResponse, tags=["parcels"])
async def parcel_details(parcel_id: str, persona: str = "hiker", horizon: int = 10) -> ParcelDetailResponse:
    stub: ParcelDetailStub | None = recommendation_service.fetch_parcel(parcel_id)
    if not stub:
        raise HTTPException(status_code=404, detail="Parcel not found")
    return recommendation_service.build_parcel_response(stub, persona=persona, horizon=horizon)


@router.post("/predict_risks", response_model=PredictRiskResponse, tags=["risks"])
async def predict_risks(payload: PredictRiskRequest) -> PredictRiskResponse:
    return recommendation_service.predict_risks(payload)


@router.post("/recommend_actions", response_model=PersonaRecommendationResponse, tags=["recommendations"])
async def recommend_actions(payload: PersonaRecommendationRequest) -> PersonaRecommendationResponse:
    return recommendation_service.recommend_actions(payload)


@router.post("/scenario_compare", response_model=ScenarioCompareResponse, tags=["scenarios"])
async def scenario_compare(payload: ScenarioCompareRequest) -> ScenarioCompareResponse:
    return scenario_service.compare(payload)
