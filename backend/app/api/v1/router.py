from fastapi import APIRouter

from app.api.v1.routes import auth, exports, families, people, preview, users

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(families.router, prefix="/families", tags=["families"])
api_router.include_router(people.router, prefix="/families", tags=["people"])
api_router.include_router(preview.router, prefix="/families", tags=["preview"])
api_router.include_router(exports.router, tags=["exports"])
