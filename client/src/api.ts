import type { Model, Task, CreateTaskParams } from './types';

const BASE = '/api/tasks';

export async function fetchModels(): Promise<Model[]> {
  const res = await fetch(`${BASE}/models`);
  if (!res.ok) throw new Error('Failed to fetch models');
  return res.json();
}

export async function createTask(params: CreateTaskParams): Promise<Task> {
  const form = new FormData();
  form.append('prompt', params.prompt);
  form.append('model', params.model);
  form.append('ratio', params.ratio);
  form.append('duration', String(params.duration));
  form.append('resolution', params.resolution);
  form.append('seed', params.seed);
  form.append('cameraFixed', String(params.cameraFixed));
  form.append('returnLastFrame', String(params.returnLastFrame));
  form.append('serviceTier', params.serviceTier);
  form.append('generateAudio', String(params.generateAudio));
  if (params.image) {
    form.append('image', params.image);
  }

  const res = await fetch(BASE, { method: 'POST', body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create task');
  return data;
}

export async function fetchTask(taskId: string): Promise<Task> {
  const res = await fetch(`${BASE}/${encodeURIComponent(taskId)}`);
  if (!res.ok) throw new Error('Failed to fetch task');
  return res.json();
}

export async function fetchTasks(): Promise<Task[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error('Failed to fetch tasks');
  const data = await res.json();
  return data.items || data.data || data || [];
}
