'use client';
import React, { useState } from 'react';
import { ActionItem } from '@/types';
import { updateActionItem } from '@/lib/api';

interface Props {
  items: ActionItem[];
  meetingId: string;
  onUpdate?: () => void;
}

export default function ActionItemsList({ items, meetingId, onUpdate }: Props) {
  const [localItems, setLocalItems] = useState(items);

  const handleToggle = async (itemId: string, completed: boolean) => {
    try {
      await updateActionItem(meetingId, itemId, completed);
      setLocalItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, completed } : item))
      );
      onUpdate?.();
    } catch (error) {
      console.error('Failed to update action item:', error);
    }
  };

  if (localItems.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        No action items detected
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {localItems.map((item) => (
        <div
          key={item.id}
          className={`flex items-start gap-3 p-4 rounded-lg border ${
            item.completed ? 'bg-gray-50 border-gray-200' : 'bg-white border-indigo-200'
          }`}
        >
          <input
            type="checkbox"
            checked={item.completed}
            onChange={(e) => handleToggle(item.id, e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 cursor-pointer"
          />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${item.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
              {item.task}
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              {item.assigned_to && (
                <span className="inline-flex items-center text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  👤 {item.assigned_to}
                </span>
              )}
              {item.deadline && (
                <span className="inline-flex items-center text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                  📅 {item.deadline}
                </span>
              )}
              <span className="inline-flex items-center text-xs text-gray-500">
                🕐 {item.timestamp}
              </span>
            </div>
            {item.context && (
              <p className="mt-1 text-xs text-gray-500 italic">&ldquo;{item.context}&rdquo;</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
