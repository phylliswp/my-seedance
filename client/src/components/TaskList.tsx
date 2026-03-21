import { useState, useEffect, useCallback, useRef } from 'react';
import type { Task } from '../types';
import { fetchTask, fetchTasks } from '../api';

const STATUS_LABEL: Record<string, string> = {
  queued: '排队中',
  running: '生成中',
  succeeded: '已完成',
  failed: '失败',
  expired: '已过期',
  cancelled: '已取消',
};

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const pollRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const loadTasks = useCallback(async () => {
    try {
      const list = await fetchTasks();
      const arr = Array.isArray(list) ? list : [];
      setTasks(arr);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
    const interval = setInterval(loadTasks, 30000);
    return () => clearInterval(interval);
  }, [loadTasks]);

  // Poll individual in-progress tasks
  const startPolling = useCallback((taskId: string) => {
    if (pollRef.current.has(taskId)) return;
    const interval = setInterval(async () => {
      try {
        const updated = await fetchTask(taskId);
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updated } : t)));
        if (updated.status === 'succeeded' || updated.status === 'failed' || updated.status === 'expired') {
          clearInterval(interval);
          pollRef.current.delete(taskId);
        }
      } catch {
        // ignore
      }
    }, 10000);
    pollRef.current.set(taskId, interval);
  }, []);

  useEffect(() => {
    tasks.forEach((t) => {
      if (t.status === 'queued' || t.status === 'running') {
        startPolling(t.id);
      }
    });
  }, [tasks, startPolling]);

  useEffect(() => {
    return () => {
      pollRef.current.forEach((interval) => clearInterval(interval));
    };
  }, []);

  const handleRefresh = async (taskId: string) => {
    try {
      const updated = await fetchTask(taskId);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updated } : t)));
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="empty"><span className="spinner" /> 加载中...</div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="card">
        <div className="empty">
          暂无任务，去「创建视频」提交一个吧
        </div>
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button className="btn btn-secondary" onClick={loadTasks}>刷新</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>📋 任务列表</h2>
        <button className="btn btn-secondary" onClick={loadTasks}>刷新</button>
      </div>

      <div className="task-list">
        {tasks.map((task) => (
          <div key={task.id}>
            <div
              className="task-item"
              style={{ cursor: 'pointer' }}
              onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}
            >
              <span className={`badge ${task.status}`}>
                {(task.status === 'queued' || task.status === 'running') && <span className="spinner" style={{ width: 10, height: 10, marginRight: 4, verticalAlign: 'middle' }} />}
                {STATUS_LABEL[task.status] || task.status}
              </span>
              <span className="prompt-text">{task._prompt || task.id}</span>
              <span className="meta">{formatTime(task.created_at)}</span>
              <button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: 12 }} onClick={(e) => { e.stopPropagation(); handleRefresh(task.id); }}>
                刷新
              </button>
            </div>

            {expandedId === task.id && (
              <div style={{ padding: '12px 16px', background: 'var(--surface-2)', borderRadius: '0 0 12px 12px', marginTop: -1, borderTop: 'none' }}>
                <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 8 }}>
                  任务 ID: {task.id}
                </p>
                {task.error && (
                  <p className="error-msg">错误: {task.error.message}</p>
                )}
                {task.status === 'succeeded' && task.content?.video_url && (
                  <div className="video-preview">
                    <video controls src={task.content.video_url} />
                    <div style={{ padding: 12, display: 'flex', gap: 8 }}>
                      <a
                        className="btn btn-primary"
                        href={task.content.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                      >
                        下载视频
                      </a>
                      {task.content.last_frame_url && (
                        <a
                          className="btn btn-secondary"
                          href={task.content.last_frame_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          查看末帧
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}
