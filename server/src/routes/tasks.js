import { Router } from 'express';
import multer from 'multer';
import { createTask, getTask, listTasks } from '../services/ark.js';

export const taskRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });

// 可用模型列表
const MODELS = [
  { id: 'doubao-seedance-2-0-260128', name: 'Seedance 2.0', desc: '最新旗舰，2K 60FPS，多模态' },
  { id: 'doubao-seedance-1-5-pro-251215', name: 'Seedance 1.5 Pro', desc: '均衡之选，支持草稿模式' },
  { id: 'doubao-seedance-1-0-pro-250528', name: 'Seedance 1.0 Pro', desc: '稳定可靠，首尾帧控制' },
  { id: 'doubao-seedance-1-0-pro-fast-251015', name: 'Seedance 1.0 Pro Fast', desc: '快速生成' },
  { id: 'doubao-seedance-1-0-lite-i2v-250428', name: 'Seedance 1.0 Lite I2V', desc: '轻量级图生视频' },
];

/** GET /api/tasks/models */
taskRouter.get('/models', (_req, res) => {
  res.json(MODELS);
});

/** POST /api/tasks — 创建视频任务 */
taskRouter.post('/', upload.single('image'), async (req, res) => {
  try {
    const { prompt, model, ratio, duration, resolution, seed, cameraFixed, returnLastFrame } = req.body;

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

    if (content.length === 0) {
      return res.status(400).json({ error: '请提供文字描述或上传图片' });
    }

    const body = {
      model: model || 'doubao-seedance-2-0-260128',
      content,
    };
    if (ratio) body.ratio = ratio;
    if (duration) body.duration = Number(duration);
    if (resolution) body.resolution = resolution;
    if (seed && seed !== '-1') body.seed = Number(seed);
    if (cameraFixed === 'true') body.camera_fixed = true;
    if (returnLastFrame === 'true') body.return_last_frame = true;

    const result = await createTask(body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/tasks/:id — 查询任务状态 */
taskRouter.get('/:id', async (req, res) => {
  try {
    const result = await getTask(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/tasks — 任务列表 */
taskRouter.get('/', async (req, res) => {
  try {
    const { pageNum, pageSize, status } = req.query;
    const result = await listTasks({
      pageNum: pageNum ? Number(pageNum) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
      status,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
