from fastapi import APIRouter, HTTPException
from pathlib import Path
import json
import os

router = APIRouter()

# Absolute path to the resume.json file
RESUME_PATH = Path("/home/mathelet/D/ai-checker/ai-check-backend/app/core/data/resume.json")

@router.get("/resume")
async def get_resume():
    try:
        if not RESUME_PATH.exists():
            raise HTTPException(status_code=404, detail="Resume file not found")
        
        with open(RESUME_PATH, 'r', encoding='utf-8') as f:
            resume_data = json.load(f)
            
        return {
            "name": resume_data.get("name", ""),
            "email": resume_data.get("email", ""),
            "mobile": resume_data.get("mobile", "")
        }
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Error parsing resume data")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
