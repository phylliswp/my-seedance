const ARK_BASE = 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks';

function getHeaders() {

  console.log(' process.env', process.env)

  const apiKey = process.env.ARK_API_KEY;
  if (!apiKey) throw new Error('ARK_API_KEY is not configured');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
}

/** 创建视频生成任务 */
export async function createTask(body) {
  const res = await fetch(ARK_BASE, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error: ${res.status}`);
  }
  return res.json();
}

/** 查询任务状态 */
export async function getTask(taskId) {
  const res = await fetch(`${ARK_BASE}/${encodeURIComponent(taskId)}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error: ${res.status}`);
  }
  return res.json();
}

/** 获取任务列表 */
export async function listTasks({ pageNum = 1, pageSize = 20, status } = {}) {
  const params = new URLSearchParams({
    page_num: String(pageNum),
    page_size: String(pageSize),
  });
  if (status) params.set('filter.status', status);

  const res = await fetch(`${ARK_BASE}?${params}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error: ${res.status}`);
  }
  return res.json();
}
