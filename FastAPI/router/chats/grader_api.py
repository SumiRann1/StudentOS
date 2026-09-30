import base64
from fastapi import APIRouter, HTTPException
from backend.agents.grader.tool import extract_text_from_image, answer_grades
from FastAPI.router.chats.schemas import GraderOutput, Base64OCRRequest

grader_router = APIRouter(prefix="/grader", tags=["Grader Agent"])

import re
from typing import List, Dict, Any

def parse_ocr_sections(markdown_text: str) -> List[Dict[str, Any]]:
    if not markdown_text:
        return []
    parts = [s.strip() for s in re.split(r"---SECTION_\d+---", markdown_text) if s.strip()]
    if len(parts) >= 3:
        return [
            {"id": 1, "title": "Summary & GPA", "icon": "🏆", "content": parts[0]},
            {"id": 2, "title": "Course Table", "icon": "📋", "content": parts[1]},
            {"id": 3, "title": "Calculation", "icon": "🧮", "content": parts[2]},
        ]
    return [
        {"id": 1, "title": "Summary & GPA", "icon": "🏆", "content": markdown_text},
        {"id": 2, "title": "Course Table", "icon": "📋", "content": markdown_text},
        {"id": 3, "title": "Calculation", "icon": "🧮", "content": markdown_text},
    ]

@grader_router.post("/ocr", response_model=GraderOutput)
async def grader_ocr(payload: Base64OCRRequest):
    """
    Perform Grade & Document OCR and GPA calculation from an image base64 JSON payload.
    Provides 100% compatibility across Web, Mobile (Expo Go), and REST API clients.
    """
    raw_b64 = payload.image_base64
    content_type = payload.content_type or "image/jpeg"

    if "," in raw_b64:
        header, raw_b64 = raw_b64.split(",", 1)
        if "data:" in header and ";base64" in header:
            content_type = header.split(";")[0].replace("data:", "")

    try:
        image_bytes = base64.b64decode(raw_b64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64 encoding: {str(e)}")

    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Decoded image data is empty.")

    extracted_text = await extract_text_from_image(
        image_bytes=image_bytes,
        content_type=content_type,
    )

    final_answer = await answer_grades(payload.user_name, extracted_text)
    sections = parse_ocr_sections(final_answer)

    return GraderOutput(
        filename=payload.filename or "uploaded_image.jpg",
        content_type=content_type,
        answered_text=final_answer,
        sections=sections
    )



        

