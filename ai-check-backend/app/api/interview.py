import os
import json
import logging
import tempfile
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi import status
from app.core.gpt_client import generate_greeting, generate_followup, generate_thank_you
from app.models.schema import UserResponseRequest, AskRequest, InterviewState
from app.core.config import MAX_INTERVIEW_QUESTIONS, MAX_VIDEO_SIZE_MB
from app.core.mongo import transcripts_collection
from app.core.google_drive import upload_to_drive
from uuid import uuid4
from datetime import datetime


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

def load_resume():
    try:
        resume_path = os.path.join(os.path.dirname(__file__), '..', 'core', 'data', 'resume.json')
        logger.info(f"Attempting to load resume from: {resume_path}")
        with open(resume_path, "r") as f:
            resume = json.load(f)
        logger.info("Resume loaded successfully")
        return resume
    except Exception as e:
        logger.error(f"Error loading resume: {e}")
        raise HTTPException(status_code=500, detail=f"Could not load resume: {e}")

@router.get("/start")
def start_interview():
    try:
        resume = load_resume()
        name = resume.get("name", "Candidate")
        greeting = generate_greeting(name)
        
        logger.info(f"Interview started for candidate: {name}")
        
        return {
            "greeting": greeting,
            "state": {
                "question_count": 0,
                "conversation_history": [],
                "is_interview_complete": False
            }
        }
    except Exception as e:
        logger.error(f"Error starting interview: {e}")
        raise HTTPException(status_code=500, detail=f"Could not start interview: {e}")


@router.post("/ask")
async def ask_question(request: AskRequest):
    try:
        # Load context
        with open("app/core/data/resume.json", "r") as f:
            resume = json.load(f)

        # Check end of interview
        if request.state.question_count >= MAX_INTERVIEW_QUESTIONS:
            thank_you_message = generate_thank_you(resume.get("name", "Candidate"))
            return {
                "question": thank_you_message,
                "state": {
                    "question_count": request.state.question_count,
                    "conversation_history": request.state.conversation_history,
                    "is_interview_complete": True
                }
            }

        # Generate next question
        followup = generate_followup(
            resume=json.dumps(resume, indent=2),
            user_response=request.user_response,
            conversation_history=request.state.conversation_history
        )

        # Update conversation state
        new_conversation_history = request.state.conversation_history + [
            {"role": "user", "content": request.user_response},
            {"role": "assistant", "content": followup}
        ]

        # ✅ Save to MongoDB
        await transcripts_collection.insert_one({
            "interview_id": str(uuid4()),
            "timestamp": datetime.utcnow().isoformat(),
            "question_count": request.state.question_count + 1,
            "conversation": new_conversation_history
        })

        return {
            "question": followup,
            "state": {
                "question_count": request.state.question_count + 1,
                "conversation_history": new_conversation_history,
                "is_interview_complete": False
            }
        }

    except Exception as e:
        logger.error(f"Error in ask_question: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error generating follow-up question: {str(e)}")


@router.post("/upload-video")
async def upload_video(file: UploadFile = File(...)):
    """
    Receive the recorded interview video and upload it to Google Drive.
    Accepts video/webm or video/mp4 files.
    """
    # Validate content type
    allowed_types = ["video/webm", "video/mp4", "video/x-matroska", "application/octet-stream"]
    if file.content_type and file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {file.content_type}. Allowed types: video/webm, video/mp4"
        )

    # Read file into a temp location
    tmp_dir = None
    try:
        tmp_dir = tempfile.mkdtemp()

        # Determine file extension
        ext = ".webm"
        if file.content_type == "video/mp4":
            ext = ".mp4"

        # Generate a unique filename with timestamp
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"interview_{timestamp}_{uuid4().hex[:8]}{ext}"
        tmp_path = os.path.join(tmp_dir, filename)

        # Stream the upload to disk to handle large files
        file_size = 0
        max_size = MAX_VIDEO_SIZE_MB * 1024 * 1024  # Convert MB to bytes

        with open(tmp_path, "wb") as f:
            while True:
                chunk = await file.read(1024 * 1024)  # Read 1MB at a time
                if not chunk:
                    break
                file_size += len(chunk)
                if file_size > max_size:
                    os.remove(tmp_path)
                    raise HTTPException(
                        status_code=413,
                        detail=f"File too large. Maximum size is {MAX_VIDEO_SIZE_MB}MB"
                    )
                f.write(chunk)

        logger.info(f"Video saved to temp path: {tmp_path} ({file_size / (1024*1024):.1f} MB)")

        # Upload to Google Drive
        drive_link = upload_to_drive(tmp_path, filename)

        return {
            "status": "success",
            "filename": filename,
            "size_mb": round(file_size / (1024 * 1024), 2),
            "drive_link": drive_link
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading video: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading video to Google Drive: {str(e)}"
        )
    finally:
        # Clean up temp file
        if tmp_dir and os.path.exists(tmp_dir):
            import shutil
            shutil.rmtree(tmp_dir, ignore_errors=True)
