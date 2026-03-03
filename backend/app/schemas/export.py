from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ExportOut(BaseModel):
    id: int
    case_id: int
    exported_by: int
    format: str
    template_version: str
    file_path: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
