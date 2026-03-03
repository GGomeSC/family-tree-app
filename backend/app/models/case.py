from datetime import datetime
import enum

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class CaseStatus(str, enum.Enum):
    DRAFT = "Draft"
    REVIEWED = "Reviewed"
    EXPORTED = "Exported"
    ARCHIVED = "Archived"


class Case(Base):
    __tablename__ = "cases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    client_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[CaseStatus] = mapped_column(Enum(CaseStatus), default=CaseStatus.DRAFT, nullable=False)
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    creator = relationship("User", back_populates="cases")
    persons = relationship("Person", back_populates="case", cascade="all, delete-orphan")
    unions = relationship("Union", back_populates="case", cascade="all, delete-orphan")
    parent_child_links = relationship("ParentChildLink", back_populates="case", cascade="all, delete-orphan")
    exports = relationship("Export", back_populates="case", cascade="all, delete-orphan")
