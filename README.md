# Minutes

An AI-powered Meeting Intelligence Application that automatically transcribes meetings, identifies speakers, detects emotions, highlights action items, and generates smart reports.

## Features

- 🎙️ **Record or Upload** – Record directly from browser or upload audio/video files (MP3, WAV, M4A, MP4, MOV, MKV)
- 📝 **Smart Transcription** – Auto-transcribe meetings with speaker labels and timestamps
- 👥 **Speaker Diarization** – Identify and label different speakers automatically
- 😊 **Emotion Analysis** – Detect sentiment/emotion per speech segment (Neutral, Happy, Confident, Concerned, Frustrated, etc.)
- ⚡ **Action Item Detection** – Automatically extract tasks, assignees, and deadlines
- 📊 **Emotion Timeline** – Visual chart of emotion changes over time per speaker
- 🔍 **Smart Search** – Filter transcript by keyword, speaker, emotion, or action items
- 📤 **Export** – Export transcript as TXT or action items as CSV
- 📋 **Meeting Summary** – Auto-generated summary, key decisions, and participant list

## Tech Stack

### Frontend
- **Next.js 15** – React framework
- **TailwindCSS** – Styling
- **Chart.js** – Emotion timeline visualization
- **React Dropzone** – File upload

### Backend
- **FastAPI** – Python web framework
- **Whisper** – Speech-to-text (production integration)
- **Pyannote** – Speaker diarization (production integration)
- **HuggingFace Transformers** – Emotion detection
- **Uvicorn** – ASGI server

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- FFmpeg (for audio processing)

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:3000

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install fastapi uvicorn python-multipart aiofiles pydantic
python main.py
```

Backend runs at http://localhost:8000

### Environment Variables

Copy `.env.example` to `.env` in the backend directory:

```bash
cp backend/.env.example backend/.env
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Next.js Frontend                   │
│  Dashboard │ Recording Page │ Meeting Details        │
└──────────────────────┬──────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────┐
│                  FastAPI Backend                      │
│                                                      │
│  Audio Input → Whisper → Speaker Diarization        │
│       → Emotion Analysis → Action Item Detection    │
│       → Summary Generation → Meeting Report         │
└─────────────────────────────────────────────────────┘
```

## Processing Pipeline

```
Media Input → Audio Extraction → Speech Recognition (Whisper)
    → Speaker Diarization (Pyannote) → Transcript + Speaker Labels
    → Emotion Detection (HuggingFace) → Action Item Detection
    → Structured Meeting Report
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/meetings` | List all meetings |
| POST | `/meetings/upload` | Upload & process meeting |
| GET | `/meetings/{id}` | Get meeting details |
| GET | `/meetings/{id}/status` | Get processing status |
| PATCH | `/meetings/{id}/action-items/{itemId}` | Update action item |
| DELETE | `/meetings/{id}` | Delete meeting |
| GET | `/meetings/{id}/export?format=txt\|csv` | Export meeting |

## Production AI Integration

Replace mock processing in `backend/main.py` with real models:

1. **Whisper** for transcription
2. **Pyannote** for speaker diarization
3. **HuggingFace** for emotion detection (e.g. `j-hartmann/emotion-english-distilroberta-base`)

## License

MIT
