import { Transaction, Budget, Goal, Setting, Category, Account, User, AuthResponse } from '../models/types';
import { initStorage, getItem, setItem } from './storage';

// Helper to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// LocalStorage helpers
const getLocalArray = async (key: string) => {
  const val = await getItem(key);
  return Array.isArray(val) ? val : [];
};

let currentUser: User | null = null;

// Initialize default data if empty
const initializeDefaults = async () => {
  const version = await getItem('data_version');
  if (version !== 'v2') {
    await setItem('categories', []);
    await setItem('accounts', []);
    await setItem('data_version', 'v2');
  }

  const cats = await getLocalArray('categories');
  if (cats.length === 0) {
    await setItem('categories', [
      // Income main
      { id: 1, name: 'Thu nhập', type: 'income', icon: 'Wallet', parent_id: null, is_default: true },
      // Income sub
      { id: 2, name: 'Lương', type: 'income', icon: 'Banknote', parent_id: 1, is_default: true },
      { id: 3, name: 'Thưởng', type: 'income', icon: 'Award', parent_id: 1, is_default: true },
      { id: 4, name: 'Bán hàng', type: 'income', icon: 'Store', parent_id: 1, is_default: true },
      { id: 5, name: 'Cho tặng', type: 'income', icon: 'Gift', parent_id: 1, is_default: true },
      
      // Expense main
      { id: 6, name: 'Nhu cầu thiết yếu', type: 'expense', icon: 'ShoppingCart', parent_id: null, is_default: true },
      { id: 7, name: 'Mong muốn', type: 'expense', icon: 'Star', parent_id: null, is_default: true },
      { id: 8, name: 'Phát triển bản thân', type: 'expense', icon: 'TrendingUp', parent_id: null, is_default: true },
      { id: 9, name: 'Chi phí khác', type: 'expense', icon: 'MoreHorizontal', parent_id: null, is_default: true },
      
      // Nhu cầu thiết yếu sub
      { id: 10, name: 'Ăn uống', type: 'expense', icon: 'Utensils', parent_id: 6, is_default: true },
      { id: 11, name: 'Hóa đơn (Điện, nước, internet...)', type: 'expense', icon: 'Receipt', parent_id: 6, is_default: true },
      { id: 12, name: 'Nhà ở (Tiền thuê nhà, phí dịch vụ...)', type: 'expense', icon: 'Home', parent_id: 6, is_default: true },
      { id: 13, name: 'Di chuyển (Xăng xe, vé tàu xe...)', type: 'expense', icon: 'Car', parent_id: 6, is_default: true },
      { id: 14, name: 'Sức khỏe', type: 'expense', icon: 'HeartPulse', parent_id: 6, is_default: true },
      { id: 15, name: 'Khác', type: 'expense', icon: 'MoreHorizontal', parent_id: 6, is_default: true },
      
      // Mong muốn sub
      { id: 16, name: 'Giải trí', type: 'expense', icon: 'Gamepad2', parent_id: 7, is_default: true },
      { id: 17, name: 'Thời trang', type: 'expense', icon: 'Shirt', parent_id: 7, is_default: true },
      { id: 18, name: 'Làm đẹp', type: 'expense', icon: 'Sparkles', parent_id: 7, is_default: true },
      { id: 19, name: 'Liên hoan', type: 'expense', icon: 'PartyPopper', parent_id: 7, is_default: true },
      { id: 20, name: 'Du lịch', type: 'expense', icon: 'Plane', parent_id: 7, is_default: true },
      { id: 21, name: 'Quà tặng', type: 'expense', icon: 'Gift', parent_id: 7, is_default: true },
      { id: 22, name: 'Hiếu hỉ', type: 'expense', icon: 'HeartHandshake', parent_id: 7, is_default: true },
      { id: 23, name: 'Bảo hiểm', type: 'expense', icon: 'Shield', parent_id: 7, is_default: true },
      { id: 24, name: 'Khác', type: 'expense', icon: 'MoreHorizontal', parent_id: 7, is_default: true },
      
      // Phát triển bản thân sub
      { id: 25, name: 'Học tập', type: 'expense', icon: 'GraduationCap', parent_id: 8, is_default: true },
      { id: 26, name: 'Đồ tiện ích (Sách vở, công cụ học tập/làm việc)', type: 'expense', icon: 'Laptop', parent_id: 8, is_default: true },
      { id: 27, name: 'Khác', type: 'expense', icon: 'MoreHorizontal', parent_id: 8, is_default: true },
      
      // Chi phí khác sub
      { id: 28, name: 'Gia đình', type: 'expense', icon: 'Users', parent_id: 9, is_default: true },
      { id: 29, name: 'Đầu tư', type: 'expense', icon: 'TrendingUp', parent_id: 9, is_default: true },
      { id: 30, name: 'Khác', type: 'expense', icon: 'MoreHorizontal', parent_id: 9, is_default: true },
    ]);
  }
  const accs = await getLocalArray('accounts');
  if (accs.length === 0) {
    await setItem('accounts', [
      { id: 1, name: 'Tiền mặt', icon: 'Wallet', balance: 0, is_default: true },
      { id: 2, name: 'Tài khoản ngân hàng', icon: 'Landmark', balance: 0, is_default: true },
      { id: 3, name: 'Ví điện tử', icon: 'Smartphone', balance: 0, is_default: true },
      { id: 4, name: 'Đầu tư', icon: 'TrendingUp', balance: 0, is_default: true },
    ]);
  }
};

const checkAuth = () => {
  if (!currentUser) throw new Error('Unauthorized');
};

export const api = {
  // Init DB
  init: async () => {
    try {
      const initPromise = (async () => {
        await initStorage();
        const userStr = await getItem('currentUser_obj');
        if (userStr && !Array.isArray(userStr)) {
          currentUser = userStr;
        }
        await initializeDefaults();
      })();
      
      // Timeout after 5 seconds to prevent hanging
      await Promise.race([
        initPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("API Init Timeout")), 5000))
      ]);
    } catch (e) {
      console.error("API Init Error:", e);
    }
  },

  isAuthenticated: () => {
    return !!currentUser;
  },

  // Auth
  register: async (data: any): Promise<AuthResponse> => {
    await delay(500);
    const users = await getLocalArray('users');
    if (users.find((u: any) => u.email === data.email)) {
      throw new Error('Email đã được sử dụng');
    }
    const newUser = { 
      id: Date.now(), 
      email: data.email, 
      password: data.password, // In a real app, never store plain text
      full_name: data.full_name || data.email.split('@')[0],
      created_at: new Date().toISOString() 
    };
    users.push(newUser);
    await setItem('users', users);
    currentUser = newUser;
    await setItem('currentUser_obj', newUser);
    return { token: `mock-token-${newUser.id}`, user: newUser };
  },

  login: async (data: any): Promise<AuthResponse> => {
    await delay(500);
    const users = await getLocalArray('users');
    const user = users.find((u: any) => u.email === data.email && u.password === data.password);
    if (!user) {
      throw new Error('Email hoặc mật khẩu không đúng');
    }
    currentUser = user;
    await setItem('currentUser_obj', user);
    return { token: `mock-token-${user.id}`, user };
  },

  logout: async (): Promise<void> => {
    currentUser = null;
    await setItem('currentUser_obj', null);
  },

  getMe: async (): Promise<User> => {
    await delay(200);
    checkAuth();
    return currentUser!;
  },

  updateProfile: async (data: any): Promise<User> => {
    await delay(300);
    checkAuth();
    const users = await getLocalArray('users');
    const index = users.findIndex((u: any) => u.id === currentUser!.id);
    if (index !== -1) {
      users[index] = { ...users[index], ...data };
      await setItem('users', users);
      currentUser = users[index];
      await setItem('currentUser_obj', currentUser);
    }
    return currentUser!;
  },

  changePassword: async (data: any): Promise<void> => {
    await delay(300);
    checkAuth();
    const users = await getLocalArray('users');
    const index = users.findIndex((u: any) => u.id === currentUser!.id);
    if (index !== -1) {
      if (users[index].password !== data.currentPassword) {
        throw new Error('Mật khẩu hiện tại không đúng');
      }
      users[index].password = data.newPassword;
      await setItem('users', users);
    }
  },

  socialLogin: async (data: any): Promise<AuthResponse> => {
    return api.register({ ...data, password: 'social-mock-password' }).catch(() => {
       return api.login({ email: data.email, password: 'social-mock-password' });
    });
  },

  // Transactions
  getTransactions: async (): Promise<Transaction[]> => {
    await delay(200);
    checkAuth();
    const txs = await getLocalArray('transactions');
    return txs.filter((t: any) => t.user_id === currentUser!.id);
  },
  
  addTransaction: async (data: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction> => {
    await delay(300);
    checkAuth();
    const txs = await getLocalArray('transactions');
    const newTx = { ...data, id: Date.now(), user_id: currentUser!.id, created_at: new Date().toISOString() } as Transaction;
    txs.unshift(newTx);
    await setItem('transactions', txs);
    return newTx;
  },

  deleteTransaction: async (id: number): Promise<void> => {
    await delay(300);
    checkAuth();
    let txs = await getLocalArray('transactions');
    txs = txs.filter((t: any) => t.id !== id);
    await setItem('transactions', txs);
  },
  
  updateTransaction: async (id: number, data: Partial<Transaction>): Promise<Transaction> => {
    await delay(300);
    checkAuth();
    const txs = await getLocalArray('transactions');
    const index = txs.findIndex((t: any) => t.id === id);
    if (index === -1) throw new Error('Not found');
    txs[index] = { ...txs[index], ...data };
    await setItem('transactions', txs);
    return txs[index];
  },

  // Budgets
  getBudgets: async (): Promise<Budget[]> => {
    await delay(200);
    checkAuth();
    const budgets = await getLocalArray('budgets');
    return budgets.filter((b: any) => b.user_id === currentUser!.id);
  },

  addBudget: async (data: Omit<Budget, 'id' | 'created_at'>): Promise<Budget> => {
    await delay(300);
    checkAuth();
    const budgets = await getLocalArray('budgets');
    const newBudget = { ...data, id: Date.now(), user_id: currentUser!.id, created_at: new Date().toISOString() } as Budget;
    budgets.unshift(newBudget);
    await setItem('budgets', budgets);
    return newBudget;
  },

  updateBudget: async (id: number, data: Partial<Budget>): Promise<Budget> => {
    await delay(300);
    checkAuth();
    const budgets = await getLocalArray('budgets');
    const index = budgets.findIndex((b: any) => b.id === id);
    if (index === -1) throw new Error('Not found');
    budgets[index] = { ...budgets[index], ...data };
    await setItem('budgets', budgets);
    return budgets[index];
  },

  deleteBudget: async (id: number): Promise<void> => {
    await delay(300);
    checkAuth();
    let budgets = await getLocalArray('budgets');
    budgets = budgets.filter((b: any) => b.id !== id);
    await setItem('budgets', budgets);
  },

  // Goals
  getGoals: async (): Promise<Goal[]> => {
    await delay(200);
    checkAuth();
    const goals = await getLocalArray('goals');
    return goals.filter((g: any) => g.user_id === currentUser!.id);
  },

  addGoal: async (data: Omit<Goal, 'id' | 'created_at'>): Promise<Goal> => {
    await delay(300);
    checkAuth();
    const goals = await getLocalArray('goals');
    const newGoal = { ...data, id: Date.now(), user_id: currentUser!.id, created_at: new Date().toISOString() } as Goal;
    goals.unshift(newGoal);
    await setItem('goals', goals);
    return newGoal;
  },

  updateGoal: async (id: number, data: Partial<Goal>): Promise<Goal> => {
    await delay(300);
    checkAuth();
    const goals = await getLocalArray('goals');
    const index = goals.findIndex((g: any) => g.id === id);
    if (index === -1) throw new Error('Not found');
    goals[index] = { ...goals[index], ...data };
    await setItem('goals', goals);
    return goals[index];
  },

  deleteGoal: async (id: number): Promise<void> => {
    await delay(300);
    checkAuth();
    let goals = await getLocalArray('goals');
    goals = goals.filter((g: any) => g.id !== id);
    await setItem('goals', goals);
  },

  updateGoalAmount: async (id: number, current_amount: number): Promise<Goal> => {
    return api.updateGoal(id, { current_amount });
  },

  // Settings
  getSettings: async (): Promise<Setting[]> => {
    await delay(200);
    checkAuth();
    const settings = await getLocalArray('settings');
    return settings.filter((s: any) => s.user_id === currentUser!.id);
  },

  updateSetting: async (key: string, value: string): Promise<void> => {
    await delay(200);
    checkAuth();
    const settings = await getLocalArray('settings');
    const index = settings.findIndex((s: any) => s.key === key && s.user_id === currentUser!.id);
    if (index !== -1) {
      settings[index].value = value;
    } else {
      settings.push({ id: Date.now(), user_id: currentUser!.id, key, value, created_at: new Date().toISOString() });
    }
    await setItem('settings', settings);
  },

  // Categories
  getCategories: async (): Promise<Category[]> => {
    await delay(200);
    return getLocalArray('categories');
  },

  addCategory: async (data: Partial<Category>): Promise<Category> => {
    await delay(300);
    const cats = await getLocalArray('categories');
    const newCat = { ...data, id: Date.now(), created_at: new Date().toISOString() } as Category;
    cats.push(newCat);
    await setItem('categories', cats);
    return newCat;
  },

  updateCategory: async (id: number, data: Partial<Category>): Promise<void> => {
    await delay(300);
    const cats = await getLocalArray('categories');
    const index = cats.findIndex((c: any) => c.id === id);
    if (index !== -1) {
      cats[index] = { ...cats[index], ...data };
      await setItem('categories', cats);
    }
  },

  deleteCategory: async (id: number): Promise<void> => {
    await delay(300);
    let cats = await getLocalArray('categories');
    cats = cats.filter((c: any) => c.id !== id);
    await setItem('categories', cats);
  },

  // Accounts
  getAccounts: async (): Promise<Account[]> => {
    await delay(200);
    return getLocalArray('accounts');
  },

  addAccount: async (data: Partial<Account>): Promise<Account> => {
    await delay(300);
    const accs = await getLocalArray('accounts');
    const newAcc = { ...data, id: Date.now(), created_at: new Date().toISOString() } as Account;
    accs.push(newAcc);
    await setItem('accounts', accs);
    return newAcc;
  },

  updateAccount: async (id: number, data: Partial<Account>): Promise<void> => {
    await delay(300);
    const accs = await getLocalArray('accounts');
    const index = accs.findIndex((a: any) => a.id === id);
    if (index !== -1) {
      accs[index] = { ...accs[index], ...data };
      await setItem('accounts', accs);
    }
  },

  deleteAccount: async (id: number): Promise<void> => {
    await delay(300);
    let accs = await getLocalArray('accounts');
    accs = accs.filter((a: any) => a.id !== id);
    await setItem('accounts', accs);
  },
};
