import { useState } from 'react';
import { CreatePanel } from './components/CreatePanel';
import { TaskList } from './components/TaskList';

export default function App() {
  const [tab, setTab] = useState<'create' | 'tasks'>('create');

  return (
    <>
      <h1>Seedance Studio</h1>
      <p className="subtitle">AI 视频生成工作台 · Powered by Seedance</p>

      <div className="tabs">
        <button className={`tab ${tab === 'create' ? 'active' : ''}`} onClick={() => setTab('create')}>
          创建视频
        </button>
        <button className={`tab ${tab === 'tasks' ? 'active' : ''}`} onClick={() => setTab('tasks')}>
          任务列表
        </button>
      </div>

      {tab === 'create' ? <CreatePanel onCreated={() => setTab('tasks')} /> : <TaskList />}
    </>
  );
}
