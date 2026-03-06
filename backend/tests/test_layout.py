from datetime import UTC, date, datetime

from app.models.person import ParentChildLink, Person, Union
from app.services.layout import build_layout


def _person(pid: int, name: str, birth: str, richiedente: bool = False) -> Person:
    now_utc = datetime.now(UTC)
    return Person(
        id=pid,
        family_id=1,
        full_name=name,
        birth_date=date.fromisoformat(birth),
        is_richiedente=richiedente,
        notes=None,
        created_at=now_utc,
        updated_at=now_utc,
    )


def test_layout_generations_and_continuations():
    persons = [
        _person(1, "Bisavo", "1880-01-01"),
        _person(2, "Avo", "1910-01-01"),
        _person(3, "Pai", "1940-01-01"),
        _person(4, "Filho", "1970-01-01", richiedente=True),
    ]
    unions = [
        Union(id=1, family_id=1, partner_a_person_id=1, partner_b_person_id=2, marriage_date=None),
    ]
    links = [
        ParentChildLink(id=1, family_id=1, parent_person_id=1, child_person_id=2),
        ParentChildLink(id=2, family_id=1, parent_person_id=2, child_person_id=3),
        ParentChildLink(id=3, family_id=1, parent_person_id=3, child_person_id=4),
    ]

    layout = build_layout(persons, unions, links)

    assert layout.pages >= 1
    assert len(layout.persons) == 4
    assert len(layout.edges) == 3

    y_by_id = {p.id: p.y for p in layout.persons}
    assert y_by_id[2] > y_by_id[1]
    assert y_by_id[3] > y_by_id[2]
    assert y_by_id[4] > y_by_id[3]
