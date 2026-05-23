import os

import uvicorn

from backend.config import settings

if __name__ == "__main__":
    reload = os.getenv("RELOAD", "true").lower() in ("1", "true", "yes")
    uvicorn.run(
        "backend.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=reload,
    )
