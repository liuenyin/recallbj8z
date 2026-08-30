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
  const accounts = read<LocalAccount[]>(ACCOUNTS_KEY, []);
  if (accounts.length > 0) return accounts;
  return [{ id: DEFAULT_ACCOUNT_ID, name: '本机游客', createdAt: Date.now() }];
};

export const saveAccounts = (accounts: LocalAccount[]) => {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
};

export const getActiveAccountId = (): string => {
  const accounts = getAccounts();
  const active = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
  return accounts.some(account => account.id === active) ? active as string : accounts[0].id;
};

export const setActiveAccountId = (id: string) => localStorage.setItem(ACTIVE_ACCOUNT_KEY, id);

export const createLocalAccount = (name: string): LocalAccount => {
  const trimmed = name.trim().slice(0, 24);
  if (!trimmed) throw new Error('请输入账号名称');
  const accounts = getAccounts();
  if (accounts.some(account => account.name === trimmed)) throw new Error('这个账号名称已经存在');
  const account = { id: `account_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, name: trimmed, createdAt: Date.now() };
  saveAccounts([...accounts, account]);
  setActiveAccountId(account.id);
  return account;
};

export const deleteLocalAccount = (id: string) => {
  if (id === DEFAULT_ACCOUNT_ID) return;
  localStorage.removeItem(getAccountSaveKey(id));
  const remaining = getAccounts().filter(account => account.id !== id);
  saveAccounts(remaining.length > 0 ? remaining : [{ id: DEFAULT_ACCOUNT_ID, name: '本机游客', createdAt: Date.now() }]);
  if (getActiveAccountId() === id) setActiveAccountId(DEFAULT_ACCOUNT_ID);
};

export const getAccountSaveKey = (accountId: string): string => `recall_save_v1_${accountId}`;

