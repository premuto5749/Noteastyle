"""OpenAI Whisper transcription + GPT-4o Structured Output service."""

from openai import AsyncOpenAI
from pydantic import BaseModel

from app.core.config import settings

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


class ProductInfo(BaseModel):
    brand: str | None = None
    code: str | None = None
    area: str | None = None


class TreatmentExtraction(BaseModel):
    """Structured output schema for extracting treatment info from voice memos."""

    customer_name: str | None = None
    service_type: str | None = None
    products_used: list[ProductInfo] | None = None
    area: str | None = None
    duration_minutes: int | None = None
    satisfaction: str | None = None
    next_visit_recommendation: str | None = None
    summary: str | None = None


async def transcribe_audio(audio_file_path: str) -> str:
    """Transcribe audio file using OpenAI Whisper API."""
    with open(audio_file_path, "rb") as audio_file:
        transcription = await client.audio.transcriptions.create(
            model="gpt-4o-mini-transcribe",
            file=audio_file,
            language="ko",
        )
    return transcription.text


async def extract_treatment_info(transcript: str) -> TreatmentExtraction:
    """
    Extract structured treatment information from a transcript
    using GPT-4o Structured Output.
    """
    completion = await client.beta.chat.completions.parse(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": (
                    "당신은 한국 미용실 시술 기록 전문 AI 어시스턴트입니다. "
                    "음성 메모 텍스트에서 시술 정보를 정확하게 추출하세요. "
                    "브랜드명과 제품 코드를 정확히 구분하세요. "
                    "예: '로레알 7.1' → brand='로레알', code='7.1'"
                ),
            },
            {
                "role": "user",
                "content": f"다음 음성 메모에서 시술 정보를 추출해주세요:\n\n{transcript}",
            },
        ],
        response_format=TreatmentExtraction,
    )
    return completion.choices[0].message.parsed


async def transcribe_and_extract(audio_file_path: str) -> TreatmentExtraction:
    """Transcribe audio and extract structured treatment info in one step."""
    transcript = await transcribe_audio(audio_file_path)
    extraction = await extract_treatment_info(transcript)
    return extraction
