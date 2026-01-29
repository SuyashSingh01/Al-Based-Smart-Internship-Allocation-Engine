from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn
from loguru import logger
import sys

from app.api.routes import matching, health, analytics
from app.core.config import settings
from app.core.model_manager import ModelManager
from app.middleware.auth import verify_api_key

logger.remove()
logger.add(sys.stdout, level=settings.LOG_LEVEL)

model_manager = ModelManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting ML Service...")
    await model_manager.load_models()
    logger.info("Models loaded successfully")
    yield
    logger.info("Shutting down ML Service...")
    await model_manager.cleanup()

app = FastAPI(
    title="PM Internship Matching ML Service",
    description="AI/ML-based internship matching engine for PM Internship Scheme",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/v1", tags=["Health"])
app.include_router(
    matching.router, 
    prefix="/api/v1/matching", 
    tags=["Matching"],
    dependencies=[Depends(verify_api_key)]
)
app.include_router(
    analytics.router, 
    prefix="/api/v1/analytics", 
    tags=["Analytics"],
    dependencies=[Depends(verify_api_key)]
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.ML_SERVICE_HOST,
        port=settings.ML_SERVICE_PORT,
        reload=True
    )
