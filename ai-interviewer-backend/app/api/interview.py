import os
import json
import logging
from fastapi import APIRouter, HTTPException
from fastapi import status
from app.core.gpt_client import generate_greeting, generate_followup, generate_thank_you
from app.models.schema import UserResponseRequest, AskRequest, InterviewState
from app.core.config import MAX_INTERVIEW_QUESTIONS

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

def load_job_description():
    try:
        jd_path = os.path.join(os.path.dirname(__file__), '..', 'core', 'data', 'job_description.txt')
        logger.info(f"Attempting to load job description from: {jd_path}")
        with open(jd_path, "r") as f:
            jd = f.read()
        logger.info("Job description loaded successfully")
        return jd
    except Exception as e:
        logger.error(f"Error loading job description: {e}")
        raise HTTPException(status_code=500, detail=f"Could not load job description: {e}")

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
def ask_question(request: AskRequest):
    try:
        # Load context
        with open("app/core/data/resume.json", "r") as f:
            resume = json.load(f)

        with open("app/core/data/job_description.txt", "r") as f:
            jd = f.read()

        # Validate interview state
        if request.state.question_count >= MAX_INTERVIEW_QUESTIONS:
            # End of interview
            thank_you_message = generate_thank_you(resume.get("name", "Candidate"))
            return {
                "question": thank_you_message,
                "state": {
                    "question_count": request.state.question_count,
                    "conversation_history": request.state.conversation_history,
                    "is_interview_complete": True
                }
            }

        # Generate follow-up question
        followup = generate_followup(
            resume=json.dumps(resume, indent=2),
            job_description=jd,
            user_response=request.user_response,
            conversation_history=request.state.conversation_history
        )

        # Update conversation state
        new_conversation_history = request.state.conversation_history + [
            {"role": "user", "content": request.user_response},
            {"role": "assistant", "content": followup}
        ]

        return {
            "question": followup,
            "state": {
                "question_count": request.state.question_count + 1,
                "conversation_history": new_conversation_history,
                "is_interview_complete": False
            }
        }

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))