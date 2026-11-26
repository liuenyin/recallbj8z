import { useLanguage } from '../lib/i18n';
import React, { useEffect, useState } from 'react';
import { LocalAccount, createLocalAccount, deleteLocalAccount, getAccounts, setActiveAccountId } from '../lib/accounts';

interface Props {
  activeAccountId: string;
  onClose: () => void;
  onChanged: (accountId: string) => void;
}

const AccountModal: React.FC<Props> = ({ activeAccountId, onClose, onChanged }) => {
    const { t: tr } = useLanguage();
  const [accounts, setAccounts] = useState<LocalAccount[]>(getAccounts());
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const switchAccount = (id: string) => {
    try {
      setActiveAccountId(id);
      onChanged(id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '切换失败');
    }
  };

  const addAccount = () => {
    try {
      const account = createLocalAccount(name);
      setAccounts(getAccounts());
      setName('');
      setError('');
      onChanged(account.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    }
  };

  const removeAccount = (id: string) => {
    if (id === activeAccountId) return;
    try {
      deleteLocalAccount(id);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setAccounts(getAccounts());
    }
  };

  return (
    <div className="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={tr("账号与存档")}>
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full max-h-[90dvh] overflow-y-auto custom-scroll shadow-2xl" onClick={event => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="text-2xl font-black text-slate-800">{tr("账号与存档")}</h2>
            <p className="text-xs text-slate-500 mt-1">{tr("账号仅保存在本机，用于分开管理多份进度。")}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={tr("关闭")} className="w-9 h-9 shrink-0 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"><i className="fas fa-times" /></button>
        </div>
        <div className="space-y-2 mb-6">
          {accounts.map(account => (
            <div key={account.id} className={`flex items-center gap-3 p-3 rounded-xl border ${account.id === activeAccountId ? 'border-indigo-300 bg-indigo-50' : 'border-slate-100 bg-slate-50'}`}>
              <i className={`fas fa-user-circle text-lg shrink-0 ${account.id === activeAccountId ? 'text-indigo-500' : 'text-slate-400'}`} />
              <button type="button" onClick={() => switchAccount(account.id)} className="flex-1 min-w-0 truncate text-left font-bold text-slate-700">{tr(account.name)}{account.id === activeAccountId && <span className="ml-2 text-[10px] text-indigo-600">{tr("当前使用")}</span>}</button>
              {account.id !== activeAccountId && account.id !== 'guest' && <button type="button" onClick={() => removeAccount(account.id)} aria-label={tr("删除本地账号")} className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50" title={tr("删除本地账号")}><i className="fas fa-trash" /></button>}
            </div>
          ))}
        </div>
        <div className="border-t border-slate-100 pt-5">
          <label className="text-xs font-bold text-slate-500">{tr("新建本地账号")}</label>
          <div className="flex gap-2 mt-2">
            <input value={name} onChange={event => setName(event.target.value)} onKeyDown={event => event.key === 'Enter' && addAccount()} placeholder={tr("例如：高一重开")} className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-indigo-400" />
            <button type="button" onClick={addAccount} className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold">{tr("创建")}</button>
          </div>
          {error && <p className="text-xs text-rose-500 mt-2">{tr(error)}</p>}
        </div>
      </div>
    </div>
  );
};

export default AccountModal;
