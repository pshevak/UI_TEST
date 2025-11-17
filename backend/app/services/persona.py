from __future__ import annotations

from dataclasses import dataclass
from typing import Any

PersonaKey = str


@dataclass
class PersonaConfig:
    key: PersonaKey
    display_name: str
    default_horizon: int
    weights: dict[str, float]
    slider_defaults: dict[str, float]
    visible_controls: list[str]


class PersonaManager:
    """Holds persona metadata and utility-weight helpers."""

    def __init__(self) -> None:
        self._configs: dict[PersonaKey, PersonaConfig] = {
            "hiker": PersonaConfig(
                key="hiker",
                display_name="Hiker / Camper",
                default_horizon=5,
                weights={"env": 0.35, "econ": 0.1, "social": 0.35, "risk_penalty": -0.2},
                slider_defaults={
                    "drive_time": 0.4,
                    "avoid_reburn": 0.8,
                    "avoid_erosion": 0.7,
                    "scenic_recovery": 0.6,
                    "water_access": 0.5,
                },
                visible_controls=[
                    "drive_time",
                    "avoid_reburn",
                    "avoid_erosion",
                    "scenic_recovery",
                    "water_access",
                ],
            ),
            "homebuyer": PersonaConfig(
                key="homebuyer",
                display_name="Home Buyer / Renter",
                default_horizon=10,
                weights={"env": 0.2, "econ": 0.35, "social": 0.25, "risk_penalty": -0.2},
                slider_defaults={
                    "reburn_tolerance": 0.3,
                    "flood_tolerance": 0.4,
                    "affordability_vs_safety": 0.5,
                },
                visible_controls=[
                    "reburn_tolerance",
                    "flood_tolerance",
                    "affordability_vs_safety",
                ],
            ),
            "farmer": PersonaConfig(
                key="farmer",
                display_name="Farmer / Landowner",
                default_horizon=10,
                weights={"env": 0.25, "econ": 0.3, "social": 0.15, "risk_penalty": -0.3},
                slider_defaults={
                    "soil_quality": 0.7,
                    "water_availability": 0.6,
                    "market_access": 0.5,
                    "reburn_tolerance": 0.4,
                },
                visible_controls=[
                    "soil_quality",
                    "water_availability",
                    "market_access",
                    "reburn_tolerance",
                ],
            ),
            "planner": PersonaConfig(
                key="planner",
                display_name="Local Planner / NGO",
                default_horizon=20,
                weights={"env": 0.3, "econ": 0.3, "social": 0.25, "risk_penalty": -0.15},
                slider_defaults={
                    "forest_pct": 0.4,
                    "housing_pct": 0.2,
                    "budget": 0.5,
                    "safety_priority": 0.7,
                    "economy_priority": 0.5,
                    "conservation_priority": 0.6,
                },
                visible_controls=[
                    "forest_pct",
                    "housing_pct",
                    "budget",
                    "safety_priority",
                    "economy_priority",
                    "conservation_priority",
                ],
            ),
        }

    def get(self, persona: PersonaKey) -> PersonaConfig:
        return self._configs[persona]

    def weights_for(self, persona: PersonaKey, control_values: dict[str, float]) -> dict[str, float]:
        cfg = self.get(persona)
        weights = cfg.weights.copy()
        if persona == "homebuyer":
            weights["risk_penalty"] = -0.1 - 0.4 * (1 - control_values.get("reburn_tolerance", 0.3))
            weights["econ"] = 0.2 + 0.5 * control_values.get("affordability_vs_safety", 0.5)
        elif persona == "hiker":
            weights["env"] = 0.3 + 0.4 * control_values.get("scenic_recovery", 0.6)
            weights["risk_penalty"] = -0.2 - 0.2 * control_values.get("avoid_reburn", 0.8)
        elif persona == "farmer":
            weights["econ"] = 0.25 + 0.3 * control_values.get("market_access", 0.5)
            weights["env"] = 0.2 + 0.3 * control_values.get("soil_quality", 0.7)
        elif persona == "planner":
            total_priority = sum(
                control_values.get(k, 0.0)
                for k in ("safety_priority", "economy_priority", "conservation_priority")
            )
            if total_priority:
                weights["risk_penalty"] = -0.1 - 0.4 * (control_values.get("safety_priority", 0.7) / total_priority)
                weights["econ"] = 0.2 + 0.4 * (control_values.get("economy_priority", 0.5) / total_priority)
                weights["env"] = 0.2 + 0.4 * (control_values.get("conservation_priority", 0.6) / total_priority)
        return weights

    def visible_controls(self, persona: PersonaKey) -> list[str]:
        return self.get(persona).visible_controls

    def default_controls(self, persona: PersonaKey) -> dict[str, float]:
        return self.get(persona).slider_defaults
