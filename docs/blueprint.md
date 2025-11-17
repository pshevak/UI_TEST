# Post-Wildfire Decision Support System — Technical Blueprint

## 1. System Architecture

### 1.1 Component Overview
- **Frontend SPA (React + Mapbox GL JS)**
  - Renders the interactive map, persona sidebar, parcel detail panel, and scenario comparison workspace.
  - Talks to backend over HTTPS REST APIs; consumes vector/raster tiles via Mapbox style specs.
- **API Gateway / Backend (FastAPI)**
  - Stateless web tier serving persona-aware recommendations, parcel analytics, and scenario comparison.
  - Performs light aggregation, caching, and orchestration of ML services.
- **ML Microservices**
  - **Segmentation Service:** exposes precomputed U-Net burn severity outputs as COGs/MBTiles.
  - **Risk Service:** wraps XGBoost/Random Forest predictors for reburn, erosion, flood, vegetation recovery.
  - **Recommendation Service:** computes Env/Econ/Social/Risk scores + persona-weighted utility.
  - **Optimization Service:** ILP/MILP solver (e.g., PuLP + CBC) for planner regional allocation.
- **Geospatial Data Store**
  - **Postgres + PostGIS** for parcels, parcel statistics, persona defaults, risk outputs, and scenario cache.
  - **Tile Cache (e.g., AWS S3 + CloudFront or tegola/tileserver-gl)** hosting burn severity/risk/recommendation layers as vector/raster tiles.
- **Offline Pipeline (Airflow + Spark/GeoPandas)**
  - Ingests remote sensing + terrain data, trains ML models, generates parcel statistics, writes to PostGIS + tile cache.

```
[Users] -> [React SPA] -> [FastAPI Backend]
                         |--> [/map_tiles via Tile Server]
                         |--> [PostGIS]
                         |--> [ML Microservices / Cache]
                         |--> [Optimization Service]
```

### 1.2 Interaction Highlights
- Persona defaults fetched once per session and cached on the client.
- Parcel clicks trigger `/parcel_details` (cached by parcel_id + persona hash) to ensure <200 ms response.
- Scenario comparison triggers backend aggregation to avoid heavy client computation.
- Map tiles requested directly from CDN/tile server for performance.

## 2. UI / UX Wireframes (Textual)

### 2.1 Landing / Default Map Layout
```
+-------------------------------------------------------------------------------------+
| Left Sidebar (Persona + Controls) |      Interactive Map (Center Panel)      |Right |
|-----------------------------------|-----------------------------------------|Sidebar|
| Persona Selector (icons)          | Base Map (satellite toggle)             |Parcel |
| Time Horizon buttons (5/10/20)    | Layer Toggles (burn, reburn, erosion...)|Detail |
| Persona-specific sliders          | Legend (auto-updated)                   |Panel  |
|                                   | Selected Parcel Outline                 |       |
+-------------------------------------------------------------------------------------+
```

### 2.2 Persona Control Examples
- **Hiker:** sliders for drive time, avoid reburn, avoid erosion, scenic recovery, water access toggle.
- **Home Buyer:** sliders for reburn tolerance, flood tolerance, affordability vs safety.
- **Farmer:** soil quality, water availability, market access, reburn tolerance.
- **Planner:** target % forest vs housing (dual knob), budget input, safety/economy/conservation sliders.

### 2.3 Parcel Detail Panel
```
----------------------------------
Parcel #12345
Burn Severity: High (0.78)
Reburn Risk: 0.64 (High)
Erosion: 0.42 (Medium)
Flood: 0.21 (Low)
Vegetation Recovery: Mid-stage (6 yrs)
Recommended Actions:
1. Reforest (Utility 0.82)
   - Env 0.9 | Econ 0.4 | Social 0.6 | Risk Penalty -0.12
   - Explanation: High burn + steep slope ⇒ prioritize reforestation buffers.
Confidence: Medium
----------------------------------
```
For planners, an additional tab reveals Scenario Comparison (if parcels multi-selected).

### 2.4 Scenario Comparison View
```
Scenario A (Model) vs Scenario B (User)
[Stacked bar: land-use %]
[Cards]
- Total Risk Reduction
- Econ Score
- Env Score
- Social Score
[Table]
Parcel | Action A | Action B | Delta Utility
["Optimize Plan" button]
```

## 3. API Designs

### 3.1 `GET /map_tiles`
- **Query Params:** `layer` (burn|reburn|erosion|flood|recovery|recommendation), `z`, `x`, `y`.
- **Response:** binary tile (vector PBF or raster PNG). CDN-backed; FastAPI proxies or redirects.
- **Example:** `/map_tiles?layer=burn&z=12&x=654&y=1580` → returns MBTiles chunk.

### 3.2 `GET /parcel_details`
- **Params:** `id` (UUID), optional `persona`, `horizon`.
- **Response JSON:**
```json
{
  "parcel_id": "12345",
  "centroid": {"lat": 40.12, "lng": -120.55},
  "area_ha": 15.2,
  "burn_severity": {"class": "high", "index": 0.78},
  "risks": {"reburn": 0.64, "erosion": 0.42, "flood": 0.21},
  "recovery_stage": "mid",
  "scores": {"env": 0.9, "econ": 0.4, "social": 0.6, "risk_penalty": -0.12},
  "recommended_actions": [
    {
      "action": "reforest",
      "utility": 0.82,
      "confidence": "medium",
      "explanation": "High burn + steep slope ⇒ prioritize reforestation buffers.",
      "drivers": ["burn_severity", "slope", "budget"]
    }
  ],
  "persona": "planner"
}
```

### 3.3 `POST /predict_risks`
- **Body:** GeoJSON FeatureCollection with parcel polygons + optional contextual features.
- **Response:** per feature risk predictions + recovery stage.

### 3.4 `POST /recommend_actions`
- **Body:**
```json
{
  "persona": "farmer",
  "controls": {"soil_importance": 0.8, "water_importance": 0.6, "market_access": 0.7, "reburn_tolerance": 0.3},
  "parcels": ["12345", "67890"],
  "horizon": 10
}
```
- **Response:** map of parcel → ranked actions with utility breakdown and explanations.

### 3.5 `POST /scenario_compare`
- **Body:**
```json
{
  "persona": "planner",
  "scenario_a": {"parcels": [{"id": "123", "action": "reforest"}, {"id": "456", "action": "housing"}]},
  "scenario_b": {"parcels": [{"id": "123", "action": "recreation"}, {"id": "456", "action": "buffer"}]},
  "constraints": {"min_forest_pct": 0.35, "max_housing_pct": 0.25, "budget": 1200000}
}
```
- **Response:** aggregated metrics (risk reduction, percentages, scores) + per parcel deltas.

## 4. Data Models

### 4.1 Parcel Entity
- `parcel_id (UUID)`
- `geom (Polygon, PostGIS)`
- `area_ha`
- `centroid` (Point)
- `burn_class` + `burn_index`
- `recovery_stage`
- `risk_reburn`, `risk_erosion`, `risk_flood`
- `veg_recovery_years`
- `env_score`, `econ_score`, `social_score`, `risk_penalty`
- `default_recommendation`

### 4.2 Persona Definition
- `persona_id` (`hiker`, `homebuyer`, `farmer`, `planner`)
- `display_name`, `icon`
- `default_controls` JSONB (sliders/toggles + ranges)
- `weight_formula` JSON (base weights for Env/Econ/Social/Risk)

### 4.3 Scenario
- `scenario_id`
- `persona_id`
- `type` (model|user)
- `horizon`
- `assignments` (array of parcel_id + action + utility)
- `metrics` (land-use %, scores, risk reductions)

### 4.4 Tiles Metadata
- `layer_id`, `path`, `minzoom`, `maxzoom`, `style_json`, `legend`

## 5. Database Schema (Postgres + PostGIS)

```
Table parcels (
  parcel_id UUID PRIMARY KEY,
  geom GEOMETRY(POLYGON, 4326),
  area_ha NUMERIC,
  centroid GEOMETRY(POINT, 4326),
  burn_class TEXT,
  burn_index NUMERIC,
  recovery_stage TEXT,
  risk_reburn NUMERIC,
  risk_erosion NUMERIC,
  risk_flood NUMERIC,
  veg_recovery_years NUMERIC,
  env_score NUMERIC,
  econ_score NUMERIC,
  social_score NUMERIC,
  risk_penalty NUMERIC,
  default_action TEXT,
  explanation TEXT
);
CREATE INDEX parcels_geom_idx ON parcels USING GIST(geom);
CREATE INDEX parcels_centroid_idx ON parcels USING GIST(centroid);

Table persona_defaults (
  persona_id TEXT PRIMARY KEY,
  display_name TEXT,
  icon TEXT,
  default_controls JSONB,
  base_weights JSONB
);

Table scenarios (
  scenario_id UUID PRIMARY KEY,
  persona_id TEXT REFERENCES persona_defaults,
  type TEXT,
  horizon INT,
  constraints JSONB,
  metrics JSONB,
  created_at TIMESTAMP DEFAULT now()
);

Table scenario_parcels (
  scenario_id UUID REFERENCES scenarios,
  parcel_id UUID REFERENCES parcels,
  action TEXT,
  utility NUMERIC,
  env_score NUMERIC,
  econ_score NUMERIC,
  social_score NUMERIC,
  risk_penalty NUMERIC,
  PRIMARY KEY (scenario_id, parcel_id)
);

Table tile_layers (
  layer_id TEXT PRIMARY KEY,
  url TEXT,
  minzoom INT,
  maxzoom INT,
  legend JSONB
);
```

## 6. End-to-End Flow Diagrams

### 6.1 Offline Pipeline
```
[Data Sources]
  |--> [Ingest & Align (Airflow DAG)]
        |--> [Raster preprocessing (GDAL/COGs)]
        |--> [Vector parcelization (PostGIS)]
        |--> [Train U-Net / Risk Models]
        |--> [Score parcels + compute Env/Econ/Social/Risk]
        |--> [Write parcel stats -> PostGIS]
        |--> [Generate tiles (tippecanoe/tegola) -> S3/Tile Server]
        |--> [Cache persona defaults & scenario baselines]
```

### 6.2 Online Workflow
```
[User]
  |--> [React SPA]
        |--> [Tile Requests -> Tile Server/CDN]
        |--> [REST calls -> FastAPI]
                |--> [Read parcel stats from PostGIS]
                |--> [Persona weight calculation]
                |--> [Recommendation / Optimization services]
                |--> [Return parcel details or scenario metrics]
```

## 7. Technical Stack Comparison & Selection

| Layer      | Option A                                 | Option B                                    | Decision |
|------------|-------------------------------------------|----------------------------------------------|----------|
| Frontend   | React + Vite + Mapbox GL JS               | Vue 3 + Leaflet                              | **React + Mapbox** for mature ecosystem, TS support, Mapbox vector tiles.
| Backend    | FastAPI (Python)                          | Node.js (NestJS)                             | **FastAPI** aligns with Python ML stack + async performance.
| Database   | Postgres + PostGIS                        | MongoDB + Turf.js                            | **PostGIS** for spatial indexes & SQL analytics.
| Optimization | PuLP + CBC/SciPy within Python service | OR-Tools via Node microservice               | **PuLP** integrates with FastAPI + Python stack.
| Deployment | Docker + Kubernetes + CloudFront for tiles| Serverless functions                          | **Docker/K8s** to control ML dependencies + caching.

Chosen stack informs scaffolded code below.

## 8. Code Scaffolding Overview

### 8.1 Backend Directory Structure
```
backend/
  app/
    main.py
    api/routes.py
    models/schemas.py
    services/
      persona.py
      recommendation.py
      scenario.py
    config.py (future)
  requirements.txt
```

### 8.2 Frontend Directory Structure
```
frontend/
  package.json
  tsconfig.json
  vite.config.ts
  src/
    main.tsx
    App.tsx
    components/
      PersonaSidebar.tsx
      MapView.tsx
      ParcelPanel.tsx
      ScenarioComparisonPanel.tsx
      Legend.tsx
    hooks/usePersonaControls.ts
    styles/app.css
```

### 8.3 Backend Starter Snippets
- FastAPI app with stubbed endpoints.
- Pydantic schemas for parcels, recommendations, scenarios.
- Service helpers for persona weight blending & scenario aggregation.

### 8.4 Frontend Starter Snippets
- React context for persona state.
- Mapbox map component with layer toggles + click handler placeholder.
- Sidebars structured with persona-specific controls and scenario comparison placeholders.

## 9. Optimized Workflows

### 9.1 Persona Journeys
- **Hiker / Camper:** selects persona → default layers (burn severity + recreation suggestions) toggle on, adjust drive-time slider, click parcels near trails, read simple recommendations emphasizing safety & scenic recovery.
- **Home Buyer / Renter:** persona toggles highlight housing-suitable parcels; adjusts affordability vs safety slider, map shows recommended land-use layer filtered for residential; parcel detail displays risk tolerances and confidence.
- **Farmer / Landowner:** persona shows soil/water sliders; clicking parcels reveals agronomic suitability + irrigation proximity; backend caches soil/water weighted utilities for fast response.
- **Local Planner / NGO:** persona unlocks scenario comparison tab; selects multiple parcels, views default plan vs custom adjustments, runs "Optimize plan" (backend ILP) to satisfy forest%/housing%/budget constraints and compares metrics.

### 9.2 Performance & Caching
- Precomputed parcel stats stored in PostGIS and cached in Redis/CDN for low-latency `/parcel_details` responses.
- Vector/raster tiles served from CDN to minimize backend load.
- Persona defaults, slider configs, and baseline weights served from `/persona_config` (future) and cached client-side.
- Scenario calculations reuse aggregated parcel metrics to avoid recomputation; results cached per persona + constraint hash for planners.

### 9.3 Explainability Hooks
- Risk predictions store SHAP driver strings per parcel; detail panel surfaces them.
- Scenario summary surfaces aggregated explanations (e.g., "High slope parcels drive erosion risk").
