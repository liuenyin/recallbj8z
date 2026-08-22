import React, { useEffect, useState } from 'react';
import { AiConfig } from '../types';
import { testAiConnection } from '../lib/gemini';

interface AiSettingsModalProps {
  config: AiConfig;
  onSave: (config: AiConfig) => void;
  onClose: () => void;
}

const AiSettingsModal: React.FC<AiSettingsModalProps> = ({ config, onSave, onClose }) => {
  const [draft, setDraft] = useState<AiConfig>(config);
  const [testing, setTesting] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [testOk, setTestOk] = useState<boolean | null>(null);

  useEffect(() => setDraft(config), [config]);

  const update = <K extends keyof AiConfig>(key: K, value: AiConfig[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }));
    setTestMessage('');
    setTestOk(null);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestMessage('正在测试连接...');
    setTestOk(null);
    try {
      await testAiConnection({ ...draft, enabled: true });
      setTestMessage('连接成功，可以开始使用 AI 事件。');
      setTestOk(true);
    } catch (error) {
      setTestMessage(error instanceof Error ? error.message : '连接失败');
      setTestOk(false);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    onSave({ ...draft, apiUrl: draft.apiUrl.trim(), model: draft.model.trim() });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-6" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl" onClick={event => event.stopPropagation()}>
        <div className="flex justify-between items-start gap-4 border-b border-slate-100 pb-4 mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><i className="fas fa-robot text-indigo-500"></i> AI 事件模式</h2>
            <p className="text-xs text-slate-500 mt-1">使用 OpenAI 兼容的 Chat Completions 接口生成本周事件。</p>
          </div>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500" title="关闭">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between gap-4 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 cursor-pointer">
            <span>
              <span className="block font-black text-slate-800">启用 AI 事件</span>
              <span className="block text-xs text-slate-500 mt-1">关闭后继续使用仓库内置的离线事件。</span>
            </span>
            <input type="checkbox" checked={draft.enabled} onChange={event => update('enabled', event.target.checked)} className="h-5 w-5 accent-indigo-600" />
          </label>

          <label className="block">
            <span className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">API 地址</span>
            <input value={draft.apiUrl} onChange={event => update('apiUrl', event.target.value)} placeholder="https://api.deepseek.com/chat/completions" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
            <span className="block text-[11px] text-slate-400 mt-1">可填完整的 `/chat/completions` 地址，也可填服务根地址。</span>
          </label>

          <label className="block">
            <span className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">API Key</span>
            <input type="password" value={draft.apiKey} onChange={event => update('apiKey', event.target.value)} placeholder="sk-...（本地代理可留空）" autoComplete="off" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
          </label>

          <label className="block">
            <span className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">模型名称</span>
            <input value={draft.model} onChange={event => update('model', event.target.value)} placeholder="deepseek-chat" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
          </label>
        </div>

        <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
          API Key 只保存在当前浏览器的 localStorage，并会直接发送到你填写的服务地址。请勿在公共电脑上使用个人密钥；请求失败时游戏会自动回退到离线事件。
        </div>

        {testMessage && <div className={`mt-4 text-sm font-bold ${testOk === true ? 'text-emerald-600' : testOk === false ? 'text-rose-600' : 'text-slate-500'}`}>{testMessage}</div>}

        <div className="flex gap-3 mt-6">
          <button type="button" onClick={handleTest} disabled={testing} className="flex-1 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 font-black text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
            <i className="fas fa-plug mr-2"></i>{testing ? '测试中...' : '测试连接'}
          </button>
          <button type="button" onClick={handleSave} className="flex-1 rounded-xl bg-slate-900 px-4 py-3 font-black text-white hover:bg-black">
            <i className="fas fa-save mr-2"></i>保存配置
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiSettingsModal;
