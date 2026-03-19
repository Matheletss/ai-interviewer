import os
import uuid
import subprocess
import requests
from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")

@router.post("/stt")
async def transcribe_audio(file: UploadFile = File(...)):
    try:
        # Step 1: Save the uploaded webm file
        webm_path = f"/tmp/{uuid.uuid4()}.webm"
        wav_path = webm_path.replace(".webm", ".wav")
        with open(webm_path, "wb") as f:
            f.write(await file.read())

        # Step 2: Convert to 16kHz mono wav using ffmpeg
        subprocess.run([
            "ffmpeg", "-y", "-i", webm_path,
            "-ar", "16000", "-ac", "1", wav_path
        ], check=True)

        # Step 3: Send to Sarvam
        with open(wav_path, "rb") as wav_file:
            response = requests.post(
                "https://api.sarvam.ai/speech-to-text",
                headers={"api-subscription-key": SARVAM_API_KEY},
                files={"file": ("audio.wav", wav_file, "audio/wav")}
            )

        # Step 4: Cleanup
        os.remove(webm_path)
        os.remove(wav_path)

        # Step 5: Return response
        if response.status_code == 200:
            return {"transcript": response.json().get("transcript")}
        else:
            return JSONResponse(content={"error": response.text}, status_code=500)

    except subprocess.CalledProcessError:
        return JSONResponse(content={"error": "FFmpeg conversion failed"}, status_code=500)
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)
