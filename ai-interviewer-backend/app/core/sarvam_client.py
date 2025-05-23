# app/core/sarvam_client.py

import requests
import os

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
BASE_URL = "https://api.sarvam.ai"

import base64
import requests
import os

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
BASE_URL = "https://api.sarvam.ai"

def text_to_speech(text: str) -> bytes:
    response = requests.post(
        f"{BASE_URL}/text-to-speech",
        headers={   
            "api-subscription-key": SARVAM_API_KEY,
            "Content-Type": "application/json"
        },
        json={
            "text": text,
            "target_language_code": "en-IN",
            "model": "bulbul:v1",       # Optional, safe default
            "speaker": "meera"          # Optional, customize if needed
        }
    )

    if response.status_code != 200:
        raise Exception(f"Sarvam TTS failed: {response.status_code} - {response.text}")
    print("API Key Loaded:", SARVAM_API_KEY)  # should print actual key
    print("Response JSON:", response.json())


    base64_audio = response.json()["audios"][0]
    return base64.b64decode(base64_audio)

  

def speech_to_text(audio: bytes) -> str:
    response = requests.post(
        f"{BASE_URL}/speech-to-text",
        headers={"api-subscription-key": SARVAM_API_KEY},  # ✅ Correct header
        files={"file": ("audio.wav", audio, "audio/wav")}   # ✅ Correct field name
    )
    print("SARVAM STT STATUS:", response.status_code, response.text)  # 🔍 Optional debug
    response.raise_for_status()
    return response.json()["text"]

