import axios from 'axios';
import { Meeting, ActionItem } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
});

export async function getMeetings(): Promise<Meeting[]> {
  const response = await api.get('/meetings');
  return response.data;
}

export async function getMeeting(id: string): Promise<Meeting> {
  const response = await api.get(`/meetings/${id}`);
  return response.data;
}

export async function uploadMeeting(file: File, title: string): Promise<{ meeting_id: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);
  const response = await api.post('/meetings/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function uploadAudioBlob(blob: Blob, title: string): Promise<{ meeting_id: string }> {
  const formData = new FormData();
  formData.append('file', blob, 'recording.webm');
  formData.append('title', title);
  const response = await api.post('/meetings/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function getMeetingStatus(id: string): Promise<{ status: string; progress: number }> {
  const response = await api.get(`/meetings/${id}/status`);
  return response.data;
}

export async function updateActionItem(meetingId: string, itemId: string, completed: boolean): Promise<void> {
  await api.patch(`/meetings/${meetingId}/action-items/${itemId}`, { completed });
}

export async function deleteMeeting(id: string): Promise<void> {
  await api.delete(`/meetings/${id}`);
}

export async function exportMeeting(id: string, format: 'txt' | 'csv'): Promise<Blob> {
  const response = await api.get(`/meetings/${id}/export?format=${format}`, {
    responseType: 'blob',
  });
  return response.data;
}

export default api;
