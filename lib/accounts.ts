export interface LocalAccount {
  id: string;
  name: string;
  createdAt: number;
}

const ACCOUNTS_KEY = 'recall_accounts_v1';
const ACTIVE_ACCOUNT_KEY = 'recall_active_account_v1';
export const DEFAULT_ACCOUNT_ID = 'guest';

const read = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
};

export const getAccounts = (): LocalAccount[] => {
  const stored = read<unknown>(ACCOUNTS_KEY, []);
  const accounts = Array.isArray(stored)
    ? stored.filter((account): account is LocalAccount => !!account
      && typeof account === 'object'
      && typeof account.id === 'string'
      && typeof account.name === 'string'
      && account.id.trim().length > 0
      && account.name.trim().length > 0
      && Number.isFinite(account.createdAt))
      .filter((account, index, all) => all.findIndex(other => other.id === account.id) === index)
    : [];
  if (!accounts.some(account => account.id === DEFAULT_ACCOUNT_ID)) {
    accounts.unshift({ id: DEFAULT_ACCOUNT_ID, name: '本机游客', createdAt: Date.now() });
  }
  return accounts;
};

export const saveAccounts = (accounts: LocalAccount[]) => {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (error) {
    throw new Error('账号保存失败：浏览器存储空间不可用或已满。');
  }
};

export const getActiveAccountId = (): string => {
  const accounts = getAccounts();
  let active: string | null = null;
  try {
    active = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
  } catch (error) {
    console.error('Failed to read active account', error);
  }
  return accounts.some(account => account.id === active) ? active as string : accounts[0].id;
};

export const setActiveAccountId = (id: string) => {
  if (!getAccounts().some(account => account.id === id)) throw new Error('账号不存在');
  try {
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, id);
  } catch (error) {
    throw new Error('账号切换失败：浏览器存储不可用。');
  }
};

export const createLocalAccount = (name: string): LocalAccount => {
  const trimmed = name.trim().slice(0, 24);
  if (!trimmed) throw new Error('请输入账号名称');
  const accounts = getAccounts();
  if (accounts.some(account => account.name === trimmed)) throw new Error('这个账号名称已经存在');
  const account = { id: `account_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, name: trimmed, createdAt: Date.now() };
  saveAccounts([...accounts, account]);
  try {
    setActiveAccountId(account.id);
  } catch (error) {
    saveAccounts(accounts);
    throw error;
  }
  return account;
};

export const deleteLocalAccount = (id: string) => {
  if (id === DEFAULT_ACCOUNT_ID) return;
  const wasActive = getActiveAccountId() === id;
  const remaining = getAccounts().filter(account => account.id !== id);
  // Switch before removing the active profile; otherwise the getter has
  // already fallen back and can no longer detect the deleted active id.
  if (wasActive) setActiveAccountId(DEFAULT_ACCOUNT_ID);
  saveAccounts(remaining);
  try {
    localStorage.removeItem(getAccountSaveKey(id));
  } catch (error) {
    throw new Error('账号已移除，但浏览器未能清理其存档。');
  }
};

export const getAccountSaveKey = (accountId: string): string => `recall_save_v1_${accountId}`;
