'use client';
import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { EmotionDataPoint } from '@/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const emotionToValue: Record<string, number> = {
  angry: 1,
  frustrated: 2,
  concerned: 3,
  uncertain: 4,
  neutral: 5,
  positive: 6,
  confident: 7,
  happy: 8,
};

const speakerColorPalette = [
  { border: 'rgb(99, 102, 241)', bg: 'rgba(99, 102, 241, 0.1)' },
  { border: 'rgb(16, 185, 129)', bg: 'rgba(16, 185, 129, 0.1)' },
  { border: 'rgb(245, 158, 11)', bg: 'rgba(245, 158, 11, 0.1)' },
  { border: 'rgb(239, 68, 68)', bg: 'rgba(239, 68, 68, 0.1)' },
  { border: 'rgb(139, 92, 246)', bg: 'rgba(139, 92, 246, 0.1)' },
];

interface Props {
  emotionData: EmotionDataPoint[];
}

export default function EmotionTimelineChart({ emotionData }: Props) {
  const chartData = useMemo(() => {
    const speakers = [...new Set(emotionData.map((d) => d.speaker))];

    const datasets = speakers.map((speaker, index) => {
      const speakerData = emotionData.filter((d) => d.speaker === speaker);
      const palette = speakerColorPalette[index % speakerColorPalette.length];

      return {
        label: speaker,
        data: speakerData.map((d) => ({
          x: d.timestamp_seconds,
          y: emotionToValue[d.emotion.toLowerCase()] || 5,
        })),
        borderColor: palette.border,
        backgroundColor: palette.bg,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: false,
      };
    });

    return { datasets };
  }, [emotionData]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: import('chart.js').TooltipItem<'line'>) => {
            const emotionNames = Object.entries(emotionToValue).find(
              ([, v]) => v === context.parsed.y
            );
            return `${context.dataset.label}: ${emotionNames ? emotionNames[0] : 'unknown'}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: 'linear' as const,
        title: {
          display: true,
          text: 'Time (seconds)',
        },
      },
      y: {
        min: 0,
        max: 9,
        ticks: {
          stepSize: 1,
          callback: (value: number | string) => {
            const entry = Object.entries(emotionToValue).find(([, v]) => v === Number(value));
            return entry ? entry[0].charAt(0).toUpperCase() + entry[0].slice(1) : '';
          },
        },
        title: {
          display: true,
          text: 'Emotion',
        },
      },
    },
  };

  if (emotionData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400">
        No emotion data available
      </div>
    );
  }

  return (
    <div style={{ height: '300px' }}>
      <Line data={chartData} options={options} />
    </div>
  );
}
