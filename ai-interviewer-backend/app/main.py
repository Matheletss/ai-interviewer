from fastapi import FastAPI
from app.api import interview, tts, stt
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AI Interviewer")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins during development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(interview.router, prefix="/interview", tags=["Interview"])
app.include_router(tts.router, prefix="/audio")
app.include_router(stt.router, prefix="/audio")




# Mount API route


@app.get("/")
def read_root():
    return {"message": "AI Interviewer API is running"}
