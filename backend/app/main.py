from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.core.security import get_password_hash
from app.models import User, UserRole


app = FastAPI(title=settings.app_name)

origins = [origin.strip() for origin in settings.allowed_origins.split(",") if origin.strip()]
origin_regex = settings.allowed_origin_regex.strip() or None

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)
    Path(settings.export_dir).mkdir(parents=True, exist_ok=True)

    admin_email = "admin@example.com"
    admin_password = "admin123"

    db: Session = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == admin_email).first()
        if not existing:
            db.add(
                User(
                    name="Admin",
                    email=admin_email,
                    password_hash=get_password_hash(admin_password),
                    role=UserRole.ADMIN,
                )
            )
            db.commit()
    finally:
        db.close()
