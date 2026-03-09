"""
Minutes AI - Meeting Intelligence Backend
FastAPI application for meeting transcription, speaker diarization,
emotion analysis, and action item detection.
"""

import os
import uuid
import json
import re
import asyncio
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict

import aiofiles
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Minutes AI API",
    description="AI-powered meeting intelligence backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
DATA_DIR = Path("data")
UPLOAD_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(exist_ok=True)

meetings_db: Dict[str, Dict] = {}


# ─── Pydantic Models ─────────────────────────────────────────────────────────

class ActionItemUpdate(BaseModel):
    completed: bool


class TranscriptSegment(BaseModel):
    id: str
    timestamp: str
    timestamp_seconds: float
    speaker: str
    speaker_id: int
    text: str
    emotion: str
    emotion_confidence: float
    is_action_item: bool


class ActionItem(BaseModel):
    id: str
    task: str
    assigned_to: str
    deadline: Optional[str]
    context: str
    timestamp: str
    timestamp_seconds: float
    completed: bool = False


class EmotionDataPoint(BaseModel):
    timestamp_seconds: float
    timestamp: str
    speaker: str
    emotion: str
    confidence: float


class Meeting(BaseModel):
    id: str
    title: str
    date: str
    duration: str
    duration_seconds: float
    participants: List[str]
    summary: str
    key_decisions: List[str]
    action_items: List[ActionItem]
    transcript: List[TranscriptSegment]
    emotion_timeline: List[EmotionDataPoint]
    status: str
    audio_url: Optional[str] = None


# ─── AI Processing ────────────────────────────────────────────────────────────

def format_timestamp(seconds: float) -> str:
    """Convert seconds to HH:MM:SS or MM:SS format."""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    if h > 0:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"


def detect_emotion(text: str) -> tuple[str, float]:
    """
    Detect emotion from text using keyword-based heuristics.
    In production, replace with a proper sentiment/emotion model.

    Returns:
        tuple[str, float]: (emotion_name, confidence_score) where emotion_name is one of
        'angry', 'frustrated', 'concerned', 'happy', 'positive', 'confident', 'uncertain',
        or 'neutral', and confidence_score is in the range [0.55, 0.95].
    """
    text_lower = text.lower()

    emotion_keywords: Dict[str, List[str]] = {
        "angry": ["angry", "furious", "outraged", "unacceptable", "terrible", "horrible"],
        "frustrated": ["frustrated", "annoying", "ridiculous", "can't believe", "keep failing"],
        "concerned": ["worried", "concern", "issue", "problem", "risk", "not sure", "uncertain", "latency", "performance"],
        "happy": ["great", "excellent", "wonderful", "love it", "amazing", "fantastic", "thrilled"],
        "positive": ["good", "nice", "looks good", "sounds good", "agree", "works", "perfect"],
        "confident": ["will", "definitely", "absolutely", "ensure", "guarantee", "commit"],
        "uncertain": ["maybe", "perhaps", "might", "could be", "not sure", "think so"],
        "neutral": [],
    }

    scores: Dict[str, int] = {emotion: 0 for emotion in emotion_keywords}
    for emotion, keywords in emotion_keywords.items():
        for kw in keywords:
            if kw in text_lower:
                scores[emotion] += 1

    best_emotion = max(scores, key=lambda k: scores[k])
    if scores[best_emotion] == 0:
        best_emotion = "neutral"

    confidence = min(0.55 + (scores[best_emotion] * 0.1), 0.95)
    return best_emotion, round(confidence, 2)


def detect_action_items(text: str, speaker: str) -> Optional[Dict]:
    """
    Detect action items in text using pattern matching.
    In production, use an LLM for better accuracy.
    """
    patterns = [
        r"(?P<person>[A-Z][a-z]+)\s+will\s+(?P<task>[^.!?]+)",
        r"(?:I|I'll|I will)\s+(?P<task>[^.!?]+)",
        r"(?:can you|please|could you)\s+(?P<task>[^.!?]+)",
        r"(?P<person>[A-Z][a-z]+),?\s+(?:can you|please|should|needs? to)\s+(?P<task>[^.!?]+)",
        r"(?:need to|needs to)\s+(?P<task>[^.!?]+)",
        r"(?P<task>[^.!?]*)\s+by\s+(?P<deadline>tomorrow|friday|monday|tuesday|wednesday|thursday|saturday|sunday|next week|end of day|eod|end of week|[A-Z][a-z]+ \d+)",
    ]

    deadline_patterns = [
        r"\b(tomorrow|friday|monday|tuesday|wednesday|thursday|saturday|sunday|next week|end of day|eod|end of week)\b",
        r"\bby\s+([A-Z][a-z]+ \d+)\b",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            groups = match.groupdict()
            task = groups.get("task", text).strip(".!?, ")
            person = groups.get("person", speaker)

            deadline = None
            for dp in deadline_patterns:
                dm = re.search(dp, text, re.IGNORECASE)
                if dm:
                    deadline = dm.group(1)
                    break

            if len(task) > 5:
                return {
                    "task": task[:200],
                    "assigned_to": person,
                    "deadline": deadline,
                }
    return None


def generate_summary_and_decisions(segments: List[Dict]) -> tuple[str, List[str]]:
    """
    Generate meeting summary and key decisions from transcript.
    In production, use an LLM for better quality.
    """
    all_text = " ".join([s["text"] for s in segments])
    sentences = re.split(r'(?<=[.!?])\s+', all_text)

    meaningful = [s for s in sentences if len(s) > 30][:4]
    summary = " ".join(meaningful) if meaningful else all_text[:300]

    decision_keywords = ["decided", "agreed", "will", "going to", "plan to", "approved", "confirmed", "finalized"]
    decisions = []
    for s in sentences:
        if any(kw in s.lower() for kw in decision_keywords) and len(s) > 20:
            decisions.append(s.strip())
            if len(decisions) >= 5:
                break

    return summary, decisions


def mock_process_audio(file_path: str, title: str) -> Dict:
    """
    Mock audio processing pipeline returning realistic sample meeting data.
    In production, integrate Whisper + Pyannote + HuggingFace models.
    """
    participants = ["John", "Sarah", "Mike"]

    segments_data = [
        (0, "John", "Good morning everyone. Let's get started with today's product meeting. We need to discuss the beta release timeline."),
        (15, "Sarah", "Thanks John. I think we should release the beta next week. The core features are ready and we've done initial testing."),
        (32, "Mike", "I'm not sure the server can handle that traffic load. We've been seeing some performance issues in staging."),
        (48, "John", "Mike, can you send me a detailed performance report by tomorrow? I need to review the metrics before we make a decision."),
        (65, "Sarah", "I agree we need to address the performance concerns. I'll prepare the documentation and make sure the UI testing is done by Friday."),
        (82, "Mike", "Yes, I will have the performance report ready. The main bottleneck seems to be the database queries."),
        (98, "John", "Great. Let's also make sure we have the security audit completed. Sarah, can you coordinate with the security team?"),
        (115, "Sarah", "Absolutely, I'll reach out to the security team today and schedule a review for this week."),
        (130, "Mike", "I'm worried about the deployment process too. We need to ensure zero-downtime deployment. This is critical."),
        (148, "John", "Mike will handle the deployment pipeline. Make sure it's ready by next Monday."),
        (162, "Sarah", "That sounds like a solid plan. I'm confident we can hit the beta deadline if we address these issues."),
        (178, "John", "Excellent. Let's finalize the marketing plan as well. Sarah will take care of the campaign design."),
        (195, "Mike", "I think the feature set is good for beta. Users will appreciate the new dashboard."),
        (210, "John", "Agreed. Let's schedule a final review meeting for next Thursday to go over everything before launch."),
        (225, "Sarah", "Perfect. I'll send out the calendar invite. Looking forward to the beta launch!"),
    ]

    transcript = []
    action_items = []
    emotion_timeline = []

    for ts, speaker, text in segments_data:
        seg_id = str(uuid.uuid4())
        emotion, conf = detect_emotion(text)
        action_info = detect_action_items(text, speaker)
        is_action = action_info is not None

        segment = {
            "id": seg_id,
            "timestamp": format_timestamp(ts),
            "timestamp_seconds": float(ts),
            "speaker": speaker,
            "speaker_id": participants.index(speaker) + 1,
            "text": text,
            "emotion": emotion,
            "emotion_confidence": conf,
            "is_action_item": is_action,
        }
        transcript.append(segment)

        emotion_timeline.append({
            "timestamp_seconds": float(ts),
            "timestamp": format_timestamp(ts),
            "speaker": speaker,
            "emotion": emotion,
            "confidence": conf,
        })

        if is_action and action_info is not None:
            action_items.append({
                "id": str(uuid.uuid4()),
                "task": action_info["task"],
                "assigned_to": action_info["assigned_to"],
                "deadline": action_info["deadline"],
                "context": text[:200],
                "timestamp": format_timestamp(ts),
                "timestamp_seconds": float(ts),
                "completed": False,
            })

    summary, decisions = generate_summary_and_decisions(transcript)
    duration_secs = segments_data[-1][0] + 15

    return {
        "title": title,
        "date": datetime.now(timezone.utc).isoformat(),
        "duration": format_timestamp(duration_secs),
        "duration_seconds": float(duration_secs),
        "participants": participants,
        "summary": summary,
        "key_decisions": decisions,
        "action_items": action_items,
        "transcript": transcript,
        "emotion_timeline": emotion_timeline,
        "status": "completed",
    }


async def process_meeting_async(meeting_id: str, file_path: str, title: str) -> None:
    """Background task to process a meeting."""
    try:
        logger.info(f"Processing meeting {meeting_id}: {title}")

        await asyncio.sleep(2)

        result = mock_process_audio(file_path, title)

        meetings_db[meeting_id].update(result)
        meetings_db[meeting_id]["status"] = "completed"

        data_file = DATA_DIR / f"{meeting_id}.json"
        async with aiofiles.open(data_file, 'w') as f:
            await f.write(json.dumps(meetings_db[meeting_id], indent=2))

        logger.info(f"Meeting {meeting_id} processed successfully")
    except Exception as e:
        logger.error(f"Failed to process meeting {meeting_id}: {e}")
        meetings_db[meeting_id]["status"] = "error"


# ─── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
async def root() -> Dict:
    return {"message": "Minutes AI API", "version": "1.0.0"}


@app.get("/health")
async def health() -> Dict:
    return {"status": "healthy"}


@app.get("/meetings", response_model=List[Meeting])
async def list_meetings() -> List[Dict]:
    """List all meetings."""
    for json_file in DATA_DIR.glob("*.json"):
        meeting_id = json_file.stem
        if meeting_id not in meetings_db:
            try:
                async with aiofiles.open(json_file, 'r') as f:
                    data = json.loads(await f.read())
                meetings_db[meeting_id] = data
            except Exception as e:
                logger.error(f"Failed to load meeting {meeting_id}: {e}")

    meetings = list(meetings_db.values())
    meetings.sort(key=lambda m: m.get("date", ""), reverse=True)
    return meetings


@app.post("/meetings/upload")
async def upload_meeting(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(default="Untitled Meeting"),
) -> Dict:
    """Upload and process a meeting audio/video file."""
    allowed_extensions = {'.mp3', '.wav', '.m4a', '.mp4', '.mov', '.mkv', '.webm', '.ogg'}
    file_ext = Path(file.filename or "upload.webm").suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file_ext}. Allowed: {', '.join(sorted(allowed_extensions))}"
        )

    meeting_id = str(uuid.uuid4())
    file_path = UPLOAD_DIR / f"{meeting_id}{file_ext}"

    try:
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    meetings_db[meeting_id] = {
        "id": meeting_id,
        "title": title,
        "date": datetime.now(timezone.utc).isoformat(),
        "duration": "0:00",
        "duration_seconds": 0,
        "participants": [],
        "summary": "",
        "key_decisions": [],
        "action_items": [],
        "transcript": [],
        "emotion_timeline": [],
        "status": "processing",
        "audio_url": f"/uploads/{meeting_id}{file_ext}",
    }

    background_tasks.add_task(process_meeting_async, meeting_id, str(file_path), title)

    return {"meeting_id": meeting_id, "status": "processing"}


@app.get("/meetings/{meeting_id}", response_model=Meeting)
async def get_meeting(meeting_id: str) -> Dict:
    """Get a specific meeting by ID."""
    if meeting_id in meetings_db:
        return meetings_db[meeting_id]

    data_file = DATA_DIR / f"{meeting_id}.json"
    if data_file.exists():
        async with aiofiles.open(data_file, 'r') as f:
            data = json.loads(await f.read())
        meetings_db[meeting_id] = data
        return data

    raise HTTPException(status_code=404, detail="Meeting not found")


@app.get("/meetings/{meeting_id}/status")
async def get_meeting_status(meeting_id: str) -> Dict:
    """Get the processing status of a meeting."""
    if meeting_id not in meetings_db:
        raise HTTPException(status_code=404, detail="Meeting not found")

    meeting = meetings_db[meeting_id]
    progress = 100 if meeting["status"] == "completed" else 50
    return {"status": meeting["status"], "progress": progress}


@app.patch("/meetings/{meeting_id}/action-items/{item_id}")
async def update_action_item(meeting_id: str, item_id: str, update: ActionItemUpdate) -> Dict:
    """Update an action item's completion status."""
    if meeting_id not in meetings_db:
        raise HTTPException(status_code=404, detail="Meeting not found")

    meeting = meetings_db[meeting_id]
    for item in meeting.get("action_items", []):
        if item["id"] == item_id:
            item["completed"] = update.completed
            data_file = DATA_DIR / f"{meeting_id}.json"
            async with aiofiles.open(data_file, 'w') as f:
                await f.write(json.dumps(meeting, indent=2))
            return {"success": True}

    raise HTTPException(status_code=404, detail="Action item not found")


@app.delete("/meetings/{meeting_id}")
async def delete_meeting(meeting_id: str) -> Dict:
    """Delete a meeting and its associated files."""
    if meeting_id not in meetings_db:
        raise HTTPException(status_code=404, detail="Meeting not found")

    for f in UPLOAD_DIR.glob(f"{meeting_id}.*"):
        f.unlink(missing_ok=True)
    data_file = DATA_DIR / f"{meeting_id}.json"
    data_file.unlink(missing_ok=True)

    del meetings_db[meeting_id]
    return {"success": True}


@app.get("/meetings/{meeting_id}/export")
async def export_meeting(meeting_id: str, format: str = "txt") -> StreamingResponse:
    """Export meeting transcript (txt) or action items (csv)."""
    if meeting_id not in meetings_db:
        data_file = DATA_DIR / f"{meeting_id}.json"
        if data_file.exists():
            async with aiofiles.open(data_file, 'r') as f:
                meetings_db[meeting_id] = json.loads(await f.read())
        else:
            raise HTTPException(status_code=404, detail="Meeting not found")

    meeting = meetings_db[meeting_id]

    if format == "txt":
        lines = [
            f"Meeting: {meeting['title']}",
            f"Date: {meeting['date']}",
            f"Duration: {meeting['duration']}",
            f"Participants: {', '.join(meeting['participants'])}",
            "",
            "=" * 60,
            "SUMMARY",
            "=" * 60,
            meeting.get('summary', ''),
            "",
            "=" * 60,
            "KEY DECISIONS",
            "=" * 60,
        ]
        for d in meeting.get('key_decisions', []):
            lines.append(f"• {d}")

        lines += [
            "",
            "=" * 60,
            "ACTION ITEMS",
            "=" * 60,
        ]
        for item in meeting.get('action_items', []):
            status = "✓" if item.get('completed') else "☐"
            deadline = f" – {item['deadline']}" if item.get('deadline') else ""
            lines.append(f"{status} {item['assigned_to']}: {item['task']}{deadline} [{item['timestamp']}]")

        lines += [
            "",
            "=" * 60,
            "TRANSCRIPT",
            "=" * 60,
        ]
        for seg in meeting.get('transcript', []):
            lines.append(f"\n[{seg['timestamp']}] {seg['speaker']} ({seg['emotion'].title()})")
            lines.append(seg['text'])
            if seg.get('is_action_item'):
                lines.append("⚡ Action Item Detected")

        content = "\n".join(lines)
        return StreamingResponse(
            iter([content]),
            media_type="text/plain",
            headers={"Content-Disposition": f"attachment; filename=\"{meeting['title']}.txt\""},
        )

    elif format == "csv":
        import csv
        import io
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Task", "Assigned To", "Deadline", "Context", "Timestamp", "Completed"])
        for item in meeting.get('action_items', []):
            writer.writerow([
                item.get('task', ''),
                item.get('assigned_to', ''),
                item.get('deadline', ''),
                item.get('context', ''),
                item.get('timestamp', ''),
                "Yes" if item.get('completed') else "No",
            ])
        content = output.getvalue()
        return StreamingResponse(
            iter([content]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=\"{meeting['title']}_actions.csv\""},
        )

    raise HTTPException(status_code=400, detail="Invalid format. Use 'txt' or 'csv'")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
