from fastapi import APIRouter

router = APIRouter()

@router.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "app": "Zynex"
    }
