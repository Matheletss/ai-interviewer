from fastapi import APIRouter, Response
from pydantic import BaseModel
from app.core.sarvam_client import text_to_speech
from fastapi.responses import StreamingResponse
import io


router = APIRouter()

class TTSRequest(BaseModel):
    text: str

@router.post("/tts")
def generate_tts(data: TTSRequest):
    try:
        audio = text_to_speech(data.text)
        return Response(content=audio, media_type="audio/wav")
    except Exception as e:
        print(f"TTS ERROR: {e}")
        return Response(content="Internal Server Error", status_code=500)

