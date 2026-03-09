import React from 'react';
import Link from 'next/link';
import { Meeting } from '@/types';
import { format, parseISO } from 'date-fns';

interface Props {
  meeting: Meeting;
  onDelete?: (id: string) => void;
}

const statusColors = {
  completed: 'bg-green-100 text-green-700',
  processing: 'bg-blue-100 text-blue-700',
  error: 'bg-red-100 text-red-700',
};

export default function MeetingCard({ meeting, onDelete }: Props) {
  const statusColor = statusColors[meeting.status] || statusColors.completed;

  let dateDisplay = meeting.date;
  try {
    dateDisplay = format(parseISO(meeting.date), 'MMM d, yyyy • h:mm a');
  } catch {
    // keep original date string if parsing fails
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <Link href={`/meeting/${meeting.id}`}>
            <h3 className="text-base font-semibold text-gray-900 hover:text-indigo-600 truncate cursor-pointer">
              {meeting.title}
            </h3>
          </Link>
          <p className="text-sm text-gray-500 mt-0.5">{dateDisplay}</p>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ml-3 ${statusColor}`}>
          {meeting.status}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
        <span>⏱ {meeting.duration}</span>
        <span>👥 {meeting.participants.length} speakers</span>
        <span>⚡ {meeting.action_items.length} tasks</span>
      </div>

      {meeting.summary && (
        <p className="mt-3 text-sm text-gray-600 line-clamp-2">{meeting.summary}</p>
      )}

      <div className="mt-4 flex items-center gap-2">
        <Link
          href={`/meeting/${meeting.id}`}
          className="flex-1 text-center text-sm font-medium text-indigo-600 hover:text-indigo-800 py-1.5 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          View Report
        </Link>
        {onDelete && (
          <button
            onClick={() => onDelete(meeting.id)}
            className="text-sm font-medium text-red-500 hover:text-red-700 py-1.5 px-3 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
