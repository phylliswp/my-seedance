import { useState, useEffect, useRef, useCallback } from 'react';
import type { Model } from '../types';
import { fetchModels, createTask } from '../api';

interface Props {
  onCreated: () => void;
}

export function CreatePanel({ onCreated }: Props) {
  const [models, setModels] = useState<Model[]>([]);
  const [model, setModel] = useState('doubao-seedance-2-0-260128');
  const [prompt, setPrompt] = useState('');
  const [ratio, setRatio] = useState('16:9');
  const [duration, setDuration] = useState(5);
  const [resolution, setResolution] = useState('1080p');
  const [seed, setSeed] = useState('-1');
  const [cameraFixed, setCameraFixed] = useState(false);
  const [returnLastFrame, setReturnLastFrame] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchModels().then(setModels).catch(() => {});
  }, []);

  const handleImage = useCallback((file: File | undefined) => {
    if (!file) return;
    setImage(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  }, []);

  const removeImage = useCallback(() => {
    setImage(null);
    setImagePreview('');
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  const handleSubmit = async () => {
    if (!prompt.trim() && !image) {
      setError('请输入文字描述或上传参考图片');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await createTask({ prompt, model, ratio, duration, resolution, seed, cameraFixed, returnLastFrame, image });
      setPrompt('');
      removeImage();
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>🎬 创建视频生成任务</h2>

      {/* Prompt */}
      <div className="form-group full" style={{ marginBottom: 16 }}>
        <label>文字描述 (Prompt)</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="描述你想生成的视频内容，例如：一只老虎在丛林中奔跑的电影镜头，光线穿透树叶..."
        />
      </div>

      {/* Image Upload */}
      <div className="form-group full" style={{ marginBottom: 16 }}>
        <label>参考图片（首帧，可选）</label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => handleImage(e.target.files?.[0])}
        />
        <div className="upload-zone" onClick={() => fileRef.current?.click()}>
          {imagePreview ? (
            <>
              <img src={imagePreview} alt="preview" />
              <br />
              <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); removeImage(); }} style={{ marginTop: 8 }}>
                移除图片
              </button>
            </>
          ) : (
            <span>点击上传图片，或拖拽到此处（最大 30MB）</span>
          )}
        </div>
      </div>

      {/* Parameters */}
      <div className="form-grid">
        <div className="form-group">
          <label>模型</label>
          <select value={model} onChange={(e) => setModel(e.target.value)}>
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.name} — {m.desc}</option>
            ))}
            {models.length === 0 && <option value={model}>Seedance 2.0</option>}
          </select>
        </div>

        <div className="form-group">
          <label>画面比例</label>
          <select value={ratio} onChange={(e) => setRatio(e.target.value)}>
            <option value="16:9">16:9（横屏）</option>
            <option value="9:16">9:16（竖屏）</option>
            <option value="1:1">1:1（方形）</option>
            <option value="4:3">4:3</option>
            <option value="3:4">3:4</option>
            <option value="21:9">21:9（超宽）</option>
          </select>
        </div>

        <div className="form-group">
          <label>时长（秒）</label>
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            <option value={-1}>自动</option>
            <option value={4}>4 秒</option>
            <option value={5}>5 秒</option>
            <option value={8}>8 秒</option>
            <option value={10}>10 秒</option>
            <option value={12}>12 秒</option>
            <option value={15}>15 秒</option>
          </select>
        </div>

        <div className="form-group">
          <label>分辨率</label>
          <select value={resolution} onChange={(e) => setResolution(e.target.value)}>
            <option value="1080p">1080p</option>
            <option value="720p">720p</option>
            <option value="480p">480p</option>
          </select>
        </div>

        <div className="form-group">
          <label>随机种子</label>
          <input type="text" value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="-1 表示随机" />
        </div>

        <div className="form-group" style={{ justifyContent: 'flex-end', gap: 12 }}>
          <div className="checkbox-row">
            <input type="checkbox" checked={cameraFixed} onChange={(e) => setCameraFixed(e.target.checked)} id="cam" />
            <label htmlFor="cam" style={{ color: 'var(--text)' }}>锁定镜头</label>
          </div>
          <div className="checkbox-row">
            <input type="checkbox" checked={returnLastFrame} onChange={(e) => setReturnLastFrame(e.target.checked)} id="lf" />
            <label htmlFor="lf" style={{ color: 'var(--text)' }}>返回末帧</label>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="actions-row">
        <button className="btn btn-primary" disabled={loading} onClick={handleSubmit}>
          {loading ? <><span className="spinner" /> 提交中...</> : '🚀 开始生成'}
        </button>
      </div>
      {error && <p className="error-msg">{error}</p>}
    </div>
  );
}
