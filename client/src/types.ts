export interface Model {
  id: string;
  name: string;
  desc: string;
  provider: 'ark' | 'laozhang';
}

export interface TaskContent {
  video_url?: string;
  last_frame_url?: string;
}

export interface Task {
  id: string;
  model: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'expired' | 'cancelled';
  content?: TaskContent;
  error?: { code: string; message: string };
  created_at: string;
  updated_at: string;
  // local fields
  _prompt?: string;
}

export interface CreateTaskParams {
  prompt: string;
  model: string;
  ratio: string;
  duration: number;
  resolution: string;
  seed: string;
  cameraFixed: boolean;
  returnLastFrame: boolean;
  image?: File | null;
}
