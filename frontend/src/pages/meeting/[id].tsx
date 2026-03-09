'use client';
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Meeting } from '@/types';
import { getMeeting, getMeetingStatus, exportMeeting } from '@/lib/api';
import EmotionBadge from '@/components/EmotionBadge';
import EmotionTimelineChart from '@/components/EmotionTimelineChart';
import ActionItemsList from '@/components/ActionItemsList';
import TranscriptSegmentItem from '@/components/TranscriptSegmentItem';

type TabType = 'transcript' | 'emotions' | 'actions' | 'summary';

export default function MeetingPage() {
  const router = useRouter();
  const { id } = router.query;
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('transcript');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSpeaker, setFilterSpeaker] = useState('all');
  const [filterEmotion, setFilterEmotion] = useState('all');
  const [filterActionItems, setFilterActionItems] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchMeeting = async () => {
      try {
        const data = await getMeeting(id as string);
        setMeeting(data);
        if (data.status === 'processing') {
          const poll = setInterval(async () => {
            try {
              const status = await getMeetingStatus(id as string);
              if (status.status !== 'processing') {
                clearInterval(poll);
                const updated = await getMeeting(id as string);
                setMeeting(updated);
              }
            } catch { clearInterval(poll); }
          }, 3000);
        }
      } catch (err) {
        console.error('Failed to fetch meeting:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMeeting();
  }, [id]);

  const handleExport = async (format: 'txt' | 'csv') => {
    if (!id) return;
    try {
      const blob = await exportMeeting(id as string, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${meeting?.title || 'meeting'}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const filteredTranscript = meeting?.transcript.filter((seg) => {
    const matchesSearch = !searchQuery || seg.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seg.speaker.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpeaker = filterSpeaker === 'all' || seg.speaker === filterSpeaker;
    const matchesEmotion = filterEmotion === 'all' || seg.emotion.toLowerCase() === filterEmotion;
    const matchesAction = !filterActionItems || seg.is_action_item;
    return matchesSearch && matchesSpeaker && matchesEmotion && matchesAction;
  }) || [];

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </main>
    );
  }

  if (!meeting) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-12 text-center">
        <div className="text-5xl mb-4">😕</div>
        <h2 className="text-xl font-semibold text-gray-700">Meeting not found</h2>
        <button onClick={() => router.push('/')} className="mt-4 text-indigo-600 hover:underline">
          Back to Dashboard
        </button>
      </main>
    );
  }

  if (meeting.status === 'processing') {
    return (
      <main className="max-w-7xl mx-auto px-4 py-12 text-center">
        <div className="text-5xl mb-4 animate-spin">⚙️</div>
        <h2 className="text-xl font-semibold text-gray-700">Processing your meeting...</h2>
        <p className="text-gray-500 mt-2">Transcribing audio, detecting speakers, and analyzing emotions.</p>
        <div className="mt-6 w-64 mx-auto">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full animate-pulse w-3/4" />
          </div>
        </div>
      </main>
    );
  }

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'transcript', label: '📝 Transcript', count: meeting.transcript.length },
    { id: 'emotions', label: '😊 Emotions' },
    { id: 'actions', label: '⚡ Action Items', count: meeting.action_items.length },
    { id: 'summary', label: '📋 Summary' },
  ];

  const uniqueSpeakers = [...new Set(meeting.transcript.map((s) => s.speaker))];
  const uniqueEmotions = [...new Set(meeting.transcript.map((s) => s.emotion.toLowerCase()))];

  return (
    <>
      <Head>
        <title>{meeting.title} - Minutes AI</title>
      </Head>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <button onClick={() => router.push('/')} className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1">
              ← Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{meeting.title}</h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              <span>📅 {new Date(meeting.date).toLocaleString()}</span>
              <span>⏱ {meeting.duration}</span>
              <span>👥 {meeting.participants.join(', ')}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('txt')}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
            >
              Export TXT
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Speakers', value: meeting.participants.length, icon: '👥' },
            { label: 'Segments', value: meeting.transcript.length, icon: '💬' },
            { label: 'Action Items', value: meeting.action_items.length, icon: '⚡' },
            { label: 'Duration', value: meeting.duration, icon: '⏱' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-b-2 border-indigo-600 text-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* Transcript Tab */}
            {activeTab === 'transcript' && (
              <div>
                <div className="flex flex-wrap gap-3 mb-5">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search transcript..."
                    className="flex-1 min-w-48 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <select
                    value={filterSpeaker}
                    onChange={(e) => setFilterSpeaker(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Speakers</option>
                    {uniqueSpeakers.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <select
                    value={filterEmotion}
                    onChange={(e) => setFilterEmotion(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Emotions</option>
                    {uniqueEmotions.map((e) => (
                      <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterActionItems}
                      onChange={(e) => setFilterActionItems(e.target.checked)}
                      className="rounded"
                    />
                    Action items only
                  </label>
                </div>

                <p className="text-sm text-gray-500 mb-3">
                  Showing {filteredTranscript.length} of {meeting.transcript.length} segments
                </p>

                <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-thin pr-2">
                  {filteredTranscript.length > 0 ? (
                    filteredTranscript.map((segment) => (
                      <TranscriptSegmentItem key={segment.id} segment={segment} />
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      No segments match your search
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Emotions Tab */}
            {activeTab === 'emotions' && (
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-4">Emotion Timeline</h3>
                <EmotionTimelineChart emotionData={meeting.emotion_timeline} />

                <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {uniqueEmotions.map((emotion) => {
                    const count = meeting.transcript.filter(
                      (s) => s.emotion.toLowerCase() === emotion
                    ).length;
                    return (
                      <div key={emotion} className="bg-gray-50 rounded-lg p-3 text-center">
                        <EmotionBadge emotion={emotion} size="md" />
                        <p className="text-sm text-gray-500 mt-1">{count} segments</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions Tab */}
            {activeTab === 'actions' && (
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-4">Action Items</h3>
                <ActionItemsList
                  items={meeting.action_items}
                  meetingId={meeting.id}
                />
              </div>
            )}

            {/* Summary Tab */}
            {activeTab === 'summary' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">Summary</h3>
                  <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg">
                    {meeting.summary || 'No summary available.'}
                  </p>
                </div>

                {meeting.key_decisions.length > 0 && (
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-2">Key Decisions</h3>
                    <ul className="space-y-2">
                      {meeting.key_decisions.map((decision, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-700">
                          <span className="text-indigo-500 mt-0.5">✓</span>
                          {decision}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">Participants</h3>
                  <div className="flex flex-wrap gap-2">
                    {meeting.participants.map((p) => (
                      <span key={p} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                {meeting.action_items.length > 0 && (
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-2">Action Items Summary</h3>
                    <ActionItemsList items={meeting.action_items} meetingId={meeting.id} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
