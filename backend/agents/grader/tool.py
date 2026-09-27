# backend/agents/grader/tools.py
import base64
import requests
from config import get_gemini_vision_url, grader_llm
from state import get_grader_prompt

async def extract_text_from_image(image_bytes: bytes, content_type: str = "image/jpeg") -> str:
    """
    Extracts text, equations, and content from images using Google Gemini 1.5 Flash Vision API.
    """
    url = get_gemini_vision_url()
    base64_str = base64.b64encode(image_bytes).decode("utf-8")

    payload = {
        "contents": [{
            "parts": [
                {
                    "text": "Extract all readable text, mathematical equations (formatted in LaTeX if applicable), "
                            "and tables from this image accurately. Maintain the original layout where possible."
                },
                {
                    "inline_data": {
                        "mime_type": content_type,
                        "data": base64_str
                    }
                }
            ]
        }]
    }

    res = requests.post(url, json=payload, timeout=30)
    if res.status_code != 200:
        raise Exception(f"Gemini API Error ({res.status_code}): {res.text}")

    data = res.json()
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        return "No text could be extracted from the image."

from langchain_core.messages import HumanMessage

async def answer_grades(username: str, context: str) -> str:
    """
    Parses extracted grade transcript text, calculates GPA/SGPA for graded courses, and generates a structured Markdown report.
    """
    prompt = get_grader_prompt(username, context)

    message = HumanMessage(content=prompt)
    response = await grader_llm.ainvoke([message])
    return response.content




    




