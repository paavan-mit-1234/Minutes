import React from 'react';
import { TranscriptSegment } from '@/types';
import EmotionBadge from './EmotionBadge';

const ActionIcon = () => (
  <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
  </svg>
);

const speakerColors = [
  'bg-indigo-100 text-indigo-800',
  'bg-emerald-100 text-emerald-800',
  'bg-violet-100 text-violet-800',
  'bg-rose-100 text-rose-800',
  'bg-amber-100 text-amber-800',
  'bg-cyan-100 text-cyan-800',
];

interface Props {
  segment: TranscriptSegment;
  isHighlighted?: boolean;
}

export default function TranscriptSegmentItem({ segment, isHighlighted }: Props) {
  const speakerColor = speakerColors[(segment.speaker_id - 1) % speakerColors.length];

  return (
    <div
      className={`p-4 rounded-lg mb-3 border transition-colors ${
        segment.is_action_item
          ? 'border-yellow-300 bg-yellow-50'
          : isHighlighted
          ? 'border-indigo-300 bg-indigo-50'
          : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-500 font-mono">{segment.timestamp}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${speakerColor}`}>
          {segment.speaker}
        </span>
        <EmotionBadge emotion={segment.emotion} confidence={segment.emotion_confidence} />
        {segment.is_action_item && (
          <span className="inline-flex items-center gap-1 text-xs text-yellow-600 font-medium">
            <ActionIcon />
            Action Item
          </span>
        )}
      </div>
      <p className="text-gray-800 text-sm leading-relaxed">{segment.text}</p>
    </div>
  );
}
