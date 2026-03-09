'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useDropzone } from 'react-dropzone';
import { Meeting } from '@/types';
import { getMeetings, uploadMeeting, deleteMeeting } from '@/lib/api';
import MeetingCard from '@/components/MeetingCard';

export default function Dashboard() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchMeetings = async () => {
    try {
      const data = await getMeetings();
      setMeetings(data);
    } catch (err) {
      console.error('Failed to fetch meetings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
      setUploadTitle(acceptedFiles[0].name.replace(/\.[^/.]+$/, ''));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a'],
      'video/*': ['.mp4', '.mov', '.mkv'],
    },
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);
    try {
      const { meeting_id } = await uploadMeeting(selectedFile, uploadTitle || selectedFile.name);
      router.push(`/meeting/${meeting_id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setError(message);
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this meeting?')) return;
    try {
      await deleteMeeting(id);
      setMeetings((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <>
      <Head>
        <title>Minutes AI - Meeting Intelligence</title>
        <meta name="description" content="AI-powered meeting transcription and analysis" />
      </Head>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Meeting Intelligence</h1>
          <p className="mt-1 text-gray-500">Upload or record meetings for AI-powered transcription, emotion analysis, and action item detection.</p>
        </div>

        {/* Upload / Record Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          {/* Upload */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📁 Upload Recording</h2>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
              }`}
            >
              <input {...getInputProps()} />
              <div className="text-4xl mb-2">🎙️</div>
              {selectedFile ? (
                <div>
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              ) : (
                <div>
                  <p className="font-medium text-gray-700">Drop audio/video file here</p>
                  <p className="text-sm text-gray-500 mt-1">MP3, WAV, M4A, MP4, MOV, MKV</p>
                </div>
              )}
            </div>

            {selectedFile && (
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Meeting title..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-medium transition-colors"
                >
                  {uploading ? 'Processing...' : 'Process Meeting'}
                </button>
              </div>
            )}

            {error && (
              <p className="mt-3 text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
            )}
          </div>

          {/* Record */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">🎤 Record Meeting</h2>
            <p className="text-gray-500 text-sm mb-6">Record directly from your browser microphone and get instant AI analysis.</p>
            <Link
              href="/record"
              className="block w-full text-center py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold shadow-md transition-all"
            >
              🔴 Start Recording
            </Link>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">✅ Auto-transcription</div>
              <div className="flex items-center gap-2">✅ Speaker detection</div>
              <div className="flex items-center gap-2">✅ Emotion analysis</div>
              <div className="flex items-center gap-2">✅ Action items</div>
            </div>
          </div>
        </div>

        {/* Recent Meetings */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Recent Meetings</h2>
            <span className="text-sm text-gray-500">{meetings.length} meetings</span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-4" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                </div>
              ))}
            </div>
          ) : meetings.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
              <div className="text-5xl mb-4">🎙️</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No meetings yet</h3>
              <p className="text-gray-500">Upload a recording or start recording to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {meetings.map((meeting) => (
                <MeetingCard key={meeting.id} meeting={meeting} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
