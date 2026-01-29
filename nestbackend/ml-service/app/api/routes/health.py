from fastapi import APIRouter
from datetime import datetime

router = APIRouter()

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "PM Internship Matching ML Service",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }

@router.get("/ready")
async def readiness_check():
    return {
        "status": "ready",
        "models_loaded": True,
        "timestamp": datetime.utcnow().isoformat()
    }
