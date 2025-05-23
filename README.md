# 🧠 AI Interviewer (Voice-Based)

This is a full-stack voice-based AI Interviewer system that supports:

- 🎤 Voice input (recorded via browser)
- 🗣️ Real-time transcription using Sarvam AI Speech-to-Text
- 🤖 GPT-generated follow-up questions
- 🔊 Voice output via Sarvam AI Text-to-Speech
- 💾 MongoDB-based transcript storage

---

## 📁 Project Structure

```
ai-interviewer/
├── ai-interviewer-frontend/    # React + Vite frontend
├── ai-interviewer-backend/     # FastAPI backend
├── README.md
```

---

## ⚙️ Prerequisites

Install these before running:
install the requirements.txt file

### 🧰 System Requirements

- Python 3.10+
- Node.js 18+
- ffmpeg (for audio conversion)
- MongoDB

### ✅ Install ffmpeg

```bash
sudo apt install ffmpeg
```

### ✅ Install MongoDB

```bash
# Add GPG key
curl -fsSL https://pgp.mongodb.com/server-6.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-6.0.gpg --dearmor

# Add repo
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/6.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Install
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

---

## 🚀 Running the Backend (FastAPI)

### 📦 Setup

```bash
cd ai-interviewer-backend
python -m venv venv
source venv/bin/activate

pip install -r requirements.txt
```

### 🔐 Create `.env`

```bash
touch .env
```

Inside `.env`:

```env
SARVAM_API_KEY=your_sarvam_api_key_here
OPENAI_API_KEY=your_open_api_key
MONGO_URI=mongodb://localhost:27017
```

### ▶️ Start the server

```bash
uvicorn app.main:app --reload --port 8010
```

---

## 💻 Running the Frontend (React + Vite)

### 📦 Setup

```bash
cd ai-interviewer-frontend
npm install
```

### ▶️ Start frontend dev server

```bash
npm run dev
```

Visit: [http://localhost:5173](http://localhost:5173)

---

## 🛠️ Core Features

- Voice input recorded as `.webm` → converted to `.wav (16kHz mono)` using `ffmpeg`
- Sarvam AI APIs used for STT and TTS
- MongoDB used to save entire Q&A transcript for future use

---

## 📄 License

MIT – feel free to fork and modify.
