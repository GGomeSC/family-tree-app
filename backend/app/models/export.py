from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Export(Base):
    __tablename__ = "exports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    case_id: Mapped[int] = mapped_column(Integer, ForeignKey("cases.id"), nullable=False, index=True)
    exported_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    format: Mapped[str] = mapped_column(String(20), default="pdf", nullable=False)
    template_version: Mapped[str] = mapped_column(String(50), default="v1", nullable=False)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    case = relationship("Case", back_populates="exports")
