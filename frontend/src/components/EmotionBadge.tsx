import React from 'react';

const emotionColors: Record<string, string> = {
  neutral: 'bg-gray-100 text-gray-700',
  positive: 'bg-green-100 text-green-700',
  happy: 'bg-yellow-100 text-yellow-700',
  concerned: 'bg-orange-100 text-orange-700',
  frustrated: 'bg-red-100 text-red-700',
  angry: 'bg-red-200 text-red-800',
  confident: 'bg-blue-100 text-blue-700',
  uncertain: 'bg-purple-100 text-purple-700',
};

interface EmotionBadgeProps {
  emotion: string;
  confidence?: number;
  size?: 'sm' | 'md';
}

export default function EmotionBadge({ emotion, confidence, size = 'sm' }: EmotionBadgeProps) {
  const colorClass = emotionColors[emotion.toLowerCase()] || 'bg-gray-100 text-gray-700';
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${colorClass} ${sizeClass}`}>
      {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
      {confidence !== undefined && (
        <span className="ml-1 opacity-60">
          {Math.round(confidence * 100)}%
        </span>
      )}
    </span>
  );
}
