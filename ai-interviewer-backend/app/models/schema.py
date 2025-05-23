from pydantic import BaseModel
from typing import List, Dict, Optional

class InterviewState(BaseModel):
    question_count: int = 0
    conversation_history: List[Dict[str, str]] = []
    is_interview_complete: bool = False

class AskRequest(BaseModel):
    user_response: str
    state: InterviewState

class UserResponseRequest(BaseModel):
    user_response: str
    state: Optional[InterviewState] = None