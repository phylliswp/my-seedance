import { Router } from 'express';
import multer from 'multer';
import * as ark from '../services/ark.js';
import * as laozhang from '../services/laozhang.js';

export const taskRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });

// 可用模型列表（含 provider 标识）
const MODELS = [
  // Seedance — 火山引擎 Ark
  { id: 'doubao-seedance-2-0-260128', name: 'Seedance 2.0', desc: '最新旗舰，2K 60FPS，多模态', provider: 'ark' },
  { id: 'doubao-seedance-1-5-pro-251215', name: 'Seedance 1.5 Pro', desc: '均衡之选，支持草稿模式', provider: 'ark' },
  { id: 'doubao-seedance-1-0-pro-250528', name: 'Seedance 1.0 Pro', desc: '稳定可靠，首尾帧控制', provider: 'ark' },
  { id: 'doubao-seedance-1-0-pro-fast-251015', name: 'Seedance 1.0 Pro Fast', desc: '快速生成', provider: 'ark' },
  { id: 'doubao-seedance-1-0-lite-i2v-250428', name: 'Seedance 1.0 Lite I2V', desc: '轻量级图生视频', provider: 'ark' },
  // Sora 2 — laozhang.ai
  { id: 'sora-2', name: 'Sora 2', desc: '视频生成（720P/1080P 按分辨率自动切换）', provider: 'laozhang' },
  // Veo 3.1 — laozhang.ai
  { id: 'veo-3.1', name: 'Veo 3.1', desc: '标准视频生成', provider: 'laozhang' },
  { id: 'veo-3.1-fast', name: 'Veo 3.1 Fast', desc: '快速视频生成', provider: 'laozhang' },
];

// 内存任务存储：taskId → { provider, model, prompt, createdAt }
const taskStore = new Map();

function getModelProvider(modelId) {
  const m = MODELS.find((m) => m.id === modelId);
  return m?.provider || 'ark';
}

/** GET /api/tasks/models */
taskRouter.get('/models', (_req, res) => {
  res.json(MODELS);
});

/** POST /api/tasks — 创建视频任务 */
taskRouter.post('/', upload.single('image'), async (req, res) => {
  try {
    const { prompt, model, ratio, duration, resolution, seed, cameraFixed, returnLastFrame } = req.body;
    const selectedModel = model || 'doubao-seedance-2-0-260128';
    const provider = getModelProvider(selectedModel);

    if (!prompt?.trim() && !req.file) {
      return res.status(400).json({ error: '请提供文字描述或上传图片' });
    }

    let result;

    if (provider === 'laozhang') {
      // laozhang.ai — Sora 2 / Veo 3.1
      result = await laozhang.createTask({
        model: selectedModel,
        prompt: prompt || '',
        ratio,
        duration: duration ? Number(duration) : undefined,
        resolution,
        imageBuffer: req.file?.buffer,
        imageMime: req.file?.mimetype,
      });
    } else {
      // Ark — Seedance
      const content = [];
      if (prompt) {
        content.push({ type: 'text', text: prompt });
      }
      if (req.file) {
        const base64 = req.file.buffer.toString('base64');
        const mime = req.file.mimetype;
        content.push({
          type: 'image_url',
          image_url: { url: `data:${mime};base64,${base64}` },
          role: 'first_frame',
        });
      }

      const body = { model: selectedModel, content };
      if (ratio) body.ratio = ratio;
      if (duration) body.duration = Number(duration);
      if (resolution) body.resolution = resolution;
      if (seed && seed !== '-1') body.seed = Number(seed);
      if (cameraFixed === 'true') body.camera_fixed = true;
      if (returnLastFrame === 'true') body.return_last_frame = true;

      result = await ark.createTask(body);
    }

    // 存储任务映射
    const taskId = result.id;
    taskStore.set(taskId, {
      provider,
      model: selectedModel,
      prompt: prompt || '',
      createdAt: result.created_at || new Date().toISOString(),
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/tasks/:id — 查询任务状态 */
taskRouter.get('/:id', async (req, res) => {
  try {
    const taskId = req.params.id;
    const stored = taskStore.get(taskId);
    const provider = stored?.provider || 'ark';

    let result;
    if (provider === 'laozhang') {
      result = await laozhang.getTask(taskId, stored.model);
    } else {
      result = await ark.getTask(taskId);
    }

    // Attach prompt for display
    if (stored?.prompt) {
      result._prompt = stored.prompt;
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/tasks — 任务列表 */
taskRouter.get('/', async (req, res) => {
  try {
    const { pageNum, pageSize, status } = req.query;

    // Fetch Ark tasks
    const arkResult = await ark.listTasks({
      pageNum: pageNum ? Number(pageNum) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
      status,
    });

    // Gather laozhang tasks from taskStore
    const laozhangTasks = [];
    for (const [taskId, info] of taskStore) {
      if (info.provider !== 'laozhang') continue;
      try {
        const task = await laozhang.getTask(taskId, info.model);
        task._prompt = info.prompt;
        laozhangTasks.push(task);
      } catch {
        // Task may have expired or be inaccessible
        laozhangTasks.push({
          id: taskId,
          model: info.model,
          status: 'failed',
          _prompt: info.prompt,
          created_at: info.createdAt,
          updated_at: info.createdAt,
        });
      }
    }

    // Merge: Ark returns { data: [...] } structure, append laozhang tasks
    const arkTasks = Array.isArray(arkResult) ? arkResult : (arkResult?.data || []);
    const allTasks = [...arkTasks, ...laozhangTasks];
    allTasks.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    res.json(allTasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
