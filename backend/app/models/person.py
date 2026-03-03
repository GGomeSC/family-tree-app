from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Person(Base):
    __tablename__ = "persons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    case_id: Mapped[int] = mapped_column(Integer, ForeignKey("cases.id"), nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    birth_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_richiedente: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    case = relationship("Case", back_populates="persons")


class Union(Base):
    __tablename__ = "unions"
    __table_args__ = (
        UniqueConstraint("case_id", "partner_a_person_id", "partner_b_person_id", name="uq_union_pair"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    case_id: Mapped[int] = mapped_column(Integer, ForeignKey("cases.id"), nullable=False, index=True)
    partner_a_person_id: Mapped[int] = mapped_column(Integer, ForeignKey("persons.id"), nullable=False)
    partner_b_person_id: Mapped[int] = mapped_column(Integer, ForeignKey("persons.id"), nullable=False)
    marriage_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    case = relationship("Case", back_populates="unions")
    partner_a = relationship("Person", foreign_keys=[partner_a_person_id])
    partner_b = relationship("Person", foreign_keys=[partner_b_person_id])


class ParentChildLink(Base):
    __tablename__ = "parent_child_links"
    __table_args__ = (
        UniqueConstraint("case_id", "parent_person_id", "child_person_id", name="uq_parent_child"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    case_id: Mapped[int] = mapped_column(Integer, ForeignKey("cases.id"), nullable=False, index=True)
    parent_person_id: Mapped[int] = mapped_column(Integer, ForeignKey("persons.id"), nullable=False)
    child_person_id: Mapped[int] = mapped_column(Integer, ForeignKey("persons.id"), nullable=False)

    case = relationship("Case", back_populates="parent_child_links")
    parent = relationship("Person", foreign_keys=[parent_person_id])
    child = relationship("Person", foreign_keys=[child_person_id])
