'use client';
import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AudioRecorder from '@/components/AudioRecorder';
import { uploadAudioBlob } from '@/lib/api';

export default function RecordPage() {
  const router = useRouter();
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [title, setTitle] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRecordingComplete = (blob: Blob, duration: number) => {
    setRecordingBlob(blob);
    setRecordingDuration(duration);
    const now = new Date();
    setTitle(`Meeting - ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`);
  };

  const handleProcess = async () => {
    if (!recordingBlob) return;
    setProcessing(true);
    setError(null);
    try {
      const { meeting_id } = await uploadAudioBlob(recordingBlob, title || 'Recorded Meeting');
      router.push(`/meeting/${meeting_id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Processing failed. Please try again.';
      setError(message);
      setProcessing(false);
    }
  };

  const handleDiscard = () => {
    setRecordingBlob(null);
    setRecordingDuration(0);
    setTitle('');
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <>
      <Head>
        <title>Record Meeting - Minutes AI</title>
      </Head>
      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Record Meeting</h1>
          <p className="text-gray-500 mt-1">Record your meeting directly from the browser.</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          {!recordingBlob ? (
            <AudioRecorder onRecordingComplete={handleRecordingComplete} />
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-5xl mb-3">✅</div>
                <h3 className="text-lg font-semibold text-gray-900">Recording Complete</h3>
                <p className="text-gray-500">Duration: {formatTime(recordingDuration)}</p>
              </div>

              <audio
                controls
                src={URL.createObjectURL(recordingBlob)}
                className="w-full"
              />

              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Meeting title..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              {error && (
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleDiscard}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={handleProcess}
                  disabled={processing}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-medium transition-colors"
                >
                  {processing ? 'Processing...' : 'Analyze Meeting'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
