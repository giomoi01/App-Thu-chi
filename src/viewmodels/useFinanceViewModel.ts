import { useState, useEffect, useCallback } from 'react';
import { Transaction, Budget, Goal, Setting, Category, Account, User } from '../models/types';
import { api } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { translations } from '../utils/translations';

export function useFinanceViewModel() {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    api.init().then(() => {
      setIsInitialized(true);
    }).catch((e) => {
      console.error(e);
      setIsInitialized(true);
    });
  }, []);

  const getSetting = useCallback((key: string, defaultValue: string) => {
    const setting = settings.find((s) => s.key === key);
    if (setting) return setting.value;
    
    if (key === 'language') {
      const isVN = navigator.language.toLowerCase().includes('vi');
      return isVN ? 'vi' : 'en';
    }
    
    return defaultValue;
  }, [settings]);

  const currency = getSetting('currency', 'VND');
  const language = getSetting('language', 'vi');
  const dateFormat = getSetting('date_format', 'dd/MM/yyyy');

  const formatCurrencyValue = useCallback((amount: number) => formatCurrency(amount, currency, language), [currency, language]);
  const formatDateValue = useCallback((date: Date | string) => formatDate(date, dateFormat, language), [dateFormat, language]);
  
  const translateName = useCallback((name: string) => {
    const t = translations[language] || translations['vi'];
    return (t as any)[name] || name;
  }, [language]);

  const parseDateValue = useCallback((dateString: string) => {
    if (!dateString) return '';
    // Input dateString is always yyyy-MM-dd from input type="date"
    // We need to return it as is for input value, but when displaying text we use formatDateValue
    return dateString;
  }, []);

  const loadData = useCallback(async () => {
    if (!isInitialized) return;
    if (!api.isAuthenticated()) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      const loadPromise = Promise.all([
        api.getTransactions(),
        api.getBudgets(),
        api.getGoals(),
        api.getSettings(),
        api.getCategories(),
        api.getAccounts(),
        api.getMe(),
      ]);

      const [txs, bdgts, gls, sets, cats, accs, userData] = await Promise.race([
        loadPromise,
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Load Data Timeout")), 5000))
      ]);
      
      setTransactions(txs);
      setBudgets(bdgts);
      setGoals(gls);
      setSettings(sets);
      setCategories(cats);
      setAccounts(accs);
      setUser(userData);
      setError(null);
    } catch (err: any) {
      console.error("loadData error:", err);
      if (err.message === 'Failed to fetch user' || err.message === 'Unauthorized') {
        await logout();
      } else {
        setError(err.message || 'Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  }, [isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      loadData();
    }
  }, [loadData, isInitialized]);

  const login = async (data: any) => {
    try {
      const res = await api.login(data);
      localStorage.setItem('auth_token', res.token);
      setUser(res.user);
      await loadData();
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const register = async (data: any) => {
    try {
      const res = await api.register(data);
      localStorage.setItem('auth_token', res.token);
      setUser(res.user);
      await loadData();
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const logout = async () => {
    await api.logout();
    localStorage.removeItem('auth_token');
    setUser(null);
    setTransactions([]);
    setBudgets([]);
    setGoals([]);
    setCategories([]);
    setAccounts([]);
    window.location.reload();
  };

  const updateProfile = async (data: any) => {
    try {
      const updatedUser = await api.updateProfile(data);
      setUser(updatedUser);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const changePassword = async (data: any) => {
    try {
      await api.changePassword(data);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const socialLogin = async (data: any) => {
    try {
      const res = await api.socialLogin(data);
      localStorage.setItem('auth_token', res.token);
      setUser(res.user);
      await loadData();
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const addTransaction = async (data: Omit<Transaction, 'id' | 'created_at'>) => {
    try {
      const newTx = await api.addTransaction(data);
      setTransactions((prev) => [newTx, ...prev]);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const deleteTransaction = async (id: number) => {
    try {
      await api.deleteTransaction(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };
  
  const updateTransaction = async (id: number, data: Partial<Transaction>) => {
    try {
      const updatedTx = await api.updateTransaction(id, data);
      setTransactions((prev) => prev.map((t) => (t.id === id ? updatedTx : t)));
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const addBudget = async (data: Omit<Budget, 'id' | 'created_at'>) => {
    try {
      const newBudget = await api.addBudget(data);
      setBudgets((prev) => [newBudget, ...prev]);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const updateBudget = async (id: number, data: Partial<Budget>) => {
    try {
      const updatedBudget = await api.updateBudget(id, data);
      setBudgets((prev) => prev.map((b) => (b.id === id ? updatedBudget : b)));
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const deleteBudget = async (id: number) => {
    try {
      await api.deleteBudget(id);
      setBudgets((prev) => prev.filter((b) => b.id !== id));
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const addGoal = async (data: Omit<Goal, 'id' | 'created_at'>) => {
    try {
      const newGoal = await api.addGoal(data);
      setGoals((prev) => [newGoal, ...prev]);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const updateGoal = async (id: number, data: Partial<Goal>) => {
    try {
      const updatedGoal = await api.updateGoal(id, data);
      setGoals((prev) => prev.map((g) => (g.id === id ? updatedGoal : g)));
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const deleteGoal = async (id: number) => {
    try {
      await api.deleteGoal(id);
      setGoals((prev) => prev.filter((g) => g.id !== id));
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const updateGoalAmount = async (id: number, amount: number) => {
    try {
      const updatedGoal = await api.updateGoalAmount(id, amount);
      setGoals((prev) => prev.map((g) => (g.id === id ? updatedGoal : g)));
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      await api.updateSetting(key, value);
      setSettings((prev) => {
        const existing = prev.find((s) => s.key === key);
        if (existing) {
          return prev.map((s) => (s.key === key ? { ...s, value } : s));
        }
        return [...prev, { key, value }];
      });
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  return {
    transactions,
    budgets,
    goals,
    settings,
    categories,
    accounts,
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    socialLogin,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    addBudget,
    updateBudget,
    deleteBudget,
    addGoal,
    updateGoal,
    deleteGoal,
    updateGoalAmount,
    updateSetting,
    getSetting,
    formatCurrency: formatCurrencyValue,
    formatDate: formatDateValue,
    parseDate: parseDateValue,
    translateName,
    refresh: loadData,
  };
}
