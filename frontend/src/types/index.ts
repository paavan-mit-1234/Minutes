export interface TranscriptSegment {
  id: string;
  timestamp: string;
  timestamp_seconds: number;
  speaker: string;
  speaker_id: number;
  text: string;
  emotion: string;
  emotion_confidence: number;
  is_action_item: boolean;
}

export interface ActionItem {
  id: string;
  task: string;
  assigned_to: string;
  deadline: string | null;
  context: string;
  timestamp: string;
  timestamp_seconds: number;
  completed: boolean;
}

export interface EmotionDataPoint {
  timestamp_seconds: number;
  timestamp: string;
  speaker: string;
  emotion: string;
  confidence: number;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  duration: string;
  duration_seconds: number;
  participants: string[];
  summary: string;
  key_decisions: string[];
  action_items: ActionItem[];
  transcript: TranscriptSegment[];
  emotion_timeline: EmotionDataPoint[];
  status: 'processing' | 'completed' | 'error';
  audio_url?: string;
}
