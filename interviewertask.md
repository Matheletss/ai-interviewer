# AI Interviewer Task

## 🎯 Objective

Build a local AI interviewer that:

- Greets the candidate using their **name** from a parsed `resume.json` file.
- Starts with the question: **"Tell me about yourself"** after greeting.
- Asks dynamic questions based on:
  - **Job title**
  - **Job description**
  - **Resume data** (in structured JSON format)
- Uses **Sarvam AI API** for:
  - **Speech-to-Text (STT)** for converting candidate audio input into text
  - **Text-to-Speech (TTS)** for converting AI questions into spoken audio
- Uses **ChatGPT** (GPT-4 or GPT-3.5) for real-time conversation flow and follow-up questions.

---

## 📁 Folder Structure

```
ai-interviewer-backend/
├── app/
│   ├── main.py                  # FastAPI app entry point
│   ├── api/                     # Route handlers
│   │   ├── interview.py         # Interview logic (start, ask-question)
│   │   ├── stt.py               # Sarvam STT handler
│   │   ├── tts.py               # Sarvam TTS handler
│   ├── core/
│   │   ├── config.py            # API key / env loader
│   │   ├── sarvam_client.py     # SarvamAI SDK wrapper
│   │   └── gpt_client.py        # OpenAI interaction logic
│   ├── models/
│   │   └── schema.py            # Pydantic schemas (request/response)
│   ├── services/
│   │   └── logger.py            # Logging conversation & transcripts
│   ├── data/
│   │   ├── resume.json          # Sample parsed resume
│   │   ├── job_description.txt  # JD
│   │   └── log.json             # Output transcript (optional)
├── requirements.txt
├── .env
└── README.md

```

---

## ✅ Implementation Steps

### 1. Environment Setup

- [ ] Set up frontend using **Vite + React + TypeScript**
- [ ] Set up backend using **FastAPI** or **Node.js (Express)**
- [ ] Add `.env` file with:
  - `SARVAM_API_KEY`
  - `OPENAI_API_KEY`

---

### 2. Resume + Job Description Input

- [ ] Use `resume.json` (already parsed by your resume parser)
- [ ] Use `job_description.txt` for job role context
- [ ] Store `job_title` as a string input or config

---

### 3. GPT Prompt Configuration

**System Prompt Example**:

```
You are a professional AI interviewer.

Begin the interview by greeting the candidate by their name (from the resume). Then, ask: "Tell me about yourself".

After the intro, ask one question at a time using context from:
- The candidate's resume (structured JSON)
- The job title
- The job description
- Previous answers from the candidate

Ask technical and behavioral questions relevant to the role. Always ask meaningful follow-ups.
```

---

### 4. Sarvam API Integration

- [ ] STT: Capture microphone input → send to Sarvam API → receive transcript
- [ ] TTS: Send ChatGPT output to Sarvam → receive audio → play to candidate
- [ ] Add format conversion logic if required by Sarvam endpoints

---

### 5. Interview Flow Logic

1. Load `resume.json`, `job_description.txt`, and `job_title`
2. Extract `candidate_name` from resume
3. Start with greeting:
   ```
   Hi [Candidate Name], welcome! Let's begin. Could you tell me a bit about yourself?
   ```
4. Loop:
   - 🎤 Record user audio
   - 📝 Transcribe with Sarvam STT
   - 🧠 Send transcript + context to GPT
   - 💬 Generate follow-up question
   - 🔊 Convert to audio with Sarvam TTS
   - ▶️ Play response in UI

---

### 6. Frontend UI (React)

- [ ] Tap-to-speak button for voice input
- [ ] Display:
  - Current question (text)
  - User’s response (transcript)
- [ ] Optional: waveform/audio animation during playback

---

### 7. Logging & Testing

- [ ] Save:
  - Full conversation log as `conversation_log.json`
  - GPT messages (question history)
  - Optional: audio blobs
- [ ] Add robust logging at each stage:
  - STT → GPT → TTS

---

## ✅ Testing Checklist

- [ ] Candidate greeted by correct name from `resume.json`
- [ ] First question is always: “Tell me about yourself”
- [ ] Questions follow logically based on resume + JD
- [ ] TTS and STT are working with Sarvam API
- [ ] Real-time conversation flow is functional

---

## 🔮 Future Enhancements

- Add AI-based scoring after each answer
- Visual avatar with lip-sync support
- Export interview as transcript/audio
- Deploy backend on Render / Railway
- Integrate database (e.g., Supabase) to save session history

---
