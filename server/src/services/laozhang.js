import FormData from 'form-data';

const LAOZHANG_BASE = 'https://api.laozhang.ai/v1/videos';

function getApiKey() {
  const key = process.env.LAOZHANG_API_KEY;
  if (!key) throw new Error('LAOZHANG_API_KEY is not configured');
  return key;
}

function getHeaders() {
  return {
    Authorization: `Bearer ${getApiKey()}`,
  };
}

// Sora 2 ratio × resolution → size mapping
const SORA_SIZE_MAP = {
  '720p': {
    '16:9': '1280x720',
    '9:16': '720x1280',
    '1:1': '720x720',
    '4:3': '960x720',
    '3:4': '720x960',
    '21:9': '1680x720',
  },
  '1080p': {
    '16:9': '1920x1080',
    '9:16': '1080x1920',
    '1:1': '1080x1080',
    '4:3': '1440x1080',
    '3:4': '1080x1440',
    '21:9': '2520x1080',
  },
};

// Check if model is a Veo 3.1 variant
function isVeoModel(model) {
  return model.startsWith('veo-');
}

// Veo 3.1 ratio → model name mapping (横屏 appends -landscape)
function applyVeoRatio(model, ratio) {
  if (!isVeoModel(model)) return model;
  const isLandscape = ratio === '16:9' || ratio === '21:9' || ratio === '4:3';
  if (isLandscape && !model.includes('-landscape')) {
    // Insert -landscape before -fast if present
    return model.replace('veo-3.1', 'veo-3.1-landscape');
  }
  return model;
}

// Normalize laozhang status → Ark-compatible status
function normalizeStatus(status, model) {
  if (isVeoModel(model)) {
    // Veo 3.1: queued / processing / completed / failed
    if (status === 'processing') return 'running';
    if (status === 'completed') return 'succeeded';
    return status; // queued / failed pass through
  }
  // Sora 2: submitted / in_progress / completed / failed
  if (status === 'submitted') return 'queued';
  if (status === 'in_progress') return 'running';
  if (status === 'completed') return 'succeeded';
  return status; // failed passes through
}

/** 创建视频生成任务 */
// Sora 2: resolution → actual model name mapping
function applySoraResolution(model, resolution) {
  if (model !== 'sora-2') return model;
  if (resolution === '1080p') return 'sora-2-pro';
  return 'sora-2'; // 720p / 480p → sora-2
}

export async function createTask({ model, prompt, ratio, duration, resolution, imageBuffer, imageMime }) {
  const hasImage = imageBuffer && imageBuffer.length > 0;

  let actualModel = model;
  if (isVeoModel(model)) {
    // Veo 3.1: map ratio to model name, auto-append -fl when image present
    actualModel = applyVeoRatio(actualModel, ratio);
    if (hasImage && !actualModel.endsWith('-fl')) {
      actualModel = `${actualModel}-fl`;
    }
  } else {
    // Sora 2: map resolution to model variant
    actualModel = applySoraResolution(actualModel, resolution);
  }

  // Resolve Sora 2 size from ratio + resolution
  const sizeMap = SORA_SIZE_MAP[resolution] || SORA_SIZE_MAP['720p'];
  const size = sizeMap[ratio] || sizeMap['16:9'];

  let res;
  if (hasImage) {
    const form = new FormData();
    form.append('model', actualModel);
    form.append('prompt', prompt || '');
    if (!isVeoModel(model)) {
      form.append('size', size);
      if (duration) form.append('seconds', String(duration));
    }
    form.append('input_reference', imageBuffer, {
      filename: 'image.jpg',
      contentType: imageMime || 'image/jpeg',
    });

    res = await fetch(LAOZHANG_BASE, {
      method: 'POST',
      headers: {
        ...getHeaders(),
        ...form.getHeaders(),
      },
      body: form.getBuffer(),
    });
  } else {
    const body = { model: actualModel, prompt: prompt || '' };
    if (!isVeoModel(model)) {
      body.size = size;
      if (duration) body.seconds = String(duration);
    }

    res = await fetch(LAOZHANG_BASE, {
      method: 'POST',
      headers: {
        ...getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || err?.message || `laozhang API error: ${res.status}`);
  }

  const data = await res.json();

  // Normalize response to Ark-like format
  return {
    id: data.id,
    model: model, // return the user-facing model, not the -fl variant
    status: normalizeStatus(data.status, model),
    created_at: data.created ? new Date(data.created * 1000).toISOString() : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/** 查询任务状态 */
export async function getTask(taskId, model) {
  const res = await fetch(`${LAOZHANG_BASE}/${encodeURIComponent(taskId)}`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || err?.message || `laozhang API error: ${res.status}`);
  }

  const data = await res.json();
  const status = normalizeStatus(data.status, model);

  const result = {
    id: data.id,
    model: model,
    status,
    created_at: data.created ? new Date(data.created * 1000).toISOString() : undefined,
    updated_at: new Date().toISOString(),
  };

  // For Sora 2: video URL is directly in the response
  if (!isVeoModel(model) && status === 'succeeded' && data.url) {
    result.content = { video_url: data.url };
  }

  // For Veo 3.1: need to fetch content separately
  if (isVeoModel(model) && status === 'succeeded') {
    try {
      const contentData = await getVideoContent(taskId);
      if (contentData.url) {
        result.content = { video_url: contentData.url };
      }
    } catch {
      // Content not ready yet, will retry on next poll
    }
  }

  return result;
}

/** 获取 Veo 3.1 视频内容 URL */
export async function getVideoContent(taskId) {
  const res = await fetch(`${LAOZHANG_BASE}/${encodeURIComponent(taskId)}/content`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || err?.message || `laozhang API error: ${res.status}`);
  }

  return res.json();
}
