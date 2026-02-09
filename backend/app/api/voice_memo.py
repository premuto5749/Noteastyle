import os
import tempfile

from fastapi import APIRouter, UploadFile, File
from app.schemas.schemas import VoiceMemoResponse
from app.services.openai_service import transcribe_and_extract

router = APIRouter(prefix="/voice", tags=["voice"])


@router.post("/transcribe", response_model=VoiceMemoResponse)
async def transcribe_voice_memo(file: UploadFile = File(...)):
    """
    Receive a voice memo audio file, transcribe it with Whisper,
    and extract structured treatment info with GPT-4o Structured Output.
    """
    # Save uploaded file temporarily
    suffix = os.path.splitext(file.filename or "audio.webm")[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        extraction = await transcribe_and_extract(tmp_path)
        return VoiceMemoResponse(
            customer_name=extraction.customer_name,
            service_type=extraction.service_type,
            products_used=[
                {"brand": p.brand, "code": p.code, "area": p.area}
                for p in (extraction.products_used or [])
            ],
            area=extraction.area,
            duration_minutes=extraction.duration_minutes,
            satisfaction=extraction.satisfaction,
            next_visit_recommendation=extraction.next_visit_recommendation,
            summary=extraction.summary,
        )
    finally:
        os.unlink(tmp_path)
