from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router

app = FastAPI(
    title="Post-Wildfire Decision Support API",
    description="Persona-aware parcel analytics and scenario planning services",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health", tags=["system"])
async def health_check() -> dict[str, str]:
    """Basic health endpoint for monitoring"""
    return {"status": "ok"}
