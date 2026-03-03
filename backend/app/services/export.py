from pathlib import Path
import uuid

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.core.config import settings
from app.models.case import Case
from app.schemas.preview import LayoutPreview
from app.services.layout import BOX_H, BOX_W, PAGE_HEIGHT


def render_html(layout: LayoutPreview, case: Case) -> str:
    templates_dir = Path(__file__).resolve().parent.parent / "templates"
    env = Environment(
        loader=FileSystemLoader(str(templates_dir)),
        autoescape=select_autoescape(["html", "xml"]),
    )
    template = env.get_template("tree.html")

    persons_by_id = {p.id: p for p in layout.persons}
    unions_by_id = {u.id: u for u in layout.unions}

    pages = []
    for page_number in range(layout.pages):
        page_persons = [p for p in layout.persons if p.page == page_number]
        page_unions = []
        for union in layout.unions:
            pa = persons_by_id.get(union.partner_a_person_id)
            pb = persons_by_id.get(union.partner_b_person_id)
            if pa and pb and pa.page == page_number and pb.page == page_number:
                page_unions.append(union)

        page_edges = [e for e in layout.edges if e.from_page == page_number and e.to_page == page_number]
        page_continuations = [
            e for e in layout.continuation_edges if e.from_page == page_number or e.to_page == page_number
        ]

        pages.append(
            {
                "number": page_number,
                "persons": page_persons,
                "unions": page_unions,
                "edges": page_edges,
                "continuations": page_continuations,
            }
        )

    return template.render(
        case=case,
        pages=pages,
        persons_by_id=persons_by_id,
        unions_by_id=unions_by_id,
        box_w=BOX_W,
        box_h=BOX_H,
        page_height=PAGE_HEIGHT,
    )


def export_pdf(html: str, case_id: int) -> str:
    output_dir = Path(settings.export_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    filename = f"case_{case_id}_{uuid.uuid4().hex}.pdf"
    output_path = output_dir / filename

    try:
        from weasyprint import HTML
    except Exception as exc:
        raise RuntimeError("WeasyPrint is not installed or unavailable") from exc

    HTML(string=html).write_pdf(str(output_path))
    return str(output_path)
