import { useFinanceViewModel } from '../../viewmodels/useFinanceViewModel';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ArrowDownRight, ArrowUpRight, Search, List, X, Trash2, Save, ChevronDown, Calendar } from 'lucide-react';
import React, { useState, useMemo, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { translations } from '../../utils/translations';
import { Transaction } from '../../models/types';
import { getCategoryIcon, getAccountIcon } from '../../utils/icons';
import CustomSelect from '../../components/CustomSelect';

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];

type TimeFilter = 'all' | 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export default function HistoryTab({ viewModel }: { viewModel: ReturnType<typeof useFinanceViewModel> }) {
  const { transactions, loading, getSetting, updateTransaction, deleteTransaction, categories, accounts, formatCurrency, formatDate, translateName } = viewModel;
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [search, setSearch] = useState('');
  
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editDisplayAmount, setEditDisplayAmount] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(50);

  const language = getSetting('language', 'vi') as 'vi' | 'en';
  const currency = getSetting('currency', 'VND');
  const dateFormat = getSetting('date_format', 'dd/MM/yyyy');
  const t = translations[language];

  const sortCategories = (cats: any[]) => {
    return [...cats].sort((a, b) => {
      const isAOther = a.name.toLowerCase() === 'khác' || a.name.toLowerCase() === 'other';
      const isBOther = b.name.toLowerCase() === 'khác' || b.name.toLowerCase() === 'other';
      if (isAOther && !isBOther) return 1;
      if (!isAOther && isBOther) return -1;
      return a.id - b.id;
    });
  };

  useEffect(() => {
    if (editingTx) {
      setEditDisplayAmount(editingTx.amount.toLocaleString('vi-VN'));
    } else {
      setEditDisplayAmount('');
    }
  }, [editingTx?.id]);

  useEffect(() => {
    setDisplayLimit(50);
  }, [filter, search, timeFilter, customStart, customEnd]);

  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;

    const handleScroll = () => {
      if (main.scrollTop + main.clientHeight >= main.scrollHeight - 100) {
        setDisplayLimit(prev => prev + 50);
      }
    };

    main.addEventListener('scroll', handleScroll);
    return () => main.removeEventListener('scroll', handleScroll);
  }, []);

  const formatEditAmountInput = (val: string) => {
    const cleanVal = val.replace(/\D/g, '');
    if (cleanVal === '') {
      setEditDisplayAmount('');
      if (editingTx) setEditingTx({ ...editingTx, amount: 0 });
      return;
    }
    const num = parseInt(cleanVal);
    setEditDisplayAmount(num.toLocaleString('vi-VN'));
    if (editingTx) setEditingTx({ ...editingTx, amount: num });
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Type filter
      if (filter !== 'all' && tx.type !== filter) return false;
      
      // Search filter
      if (search && !tx.category.toLowerCase().includes(search.toLowerCase()) && !tx.note?.toLowerCase().includes(search.toLowerCase())) return false;
      
      // Time filter
      if (timeFilter !== 'all') {
        const txDate = new Date(tx.date);
        const now = new Date();
        
        if (timeFilter === 'today') {
          if (!isWithinInterval(txDate, { start: startOfDay(now), end: endOfDay(now) })) return false;
        } else if (timeFilter === 'week') {
          if (!isWithinInterval(txDate, { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) })) return false;
        } else if (timeFilter === 'month') {
          if (!isWithinInterval(txDate, { start: startOfMonth(now), end: endOfMonth(now) })) return false;
        } else if (timeFilter === 'quarter') {
          if (!isWithinInterval(txDate, { start: startOfQuarter(now), end: endOfQuarter(now) })) return false;
        } else if (timeFilter === 'year') {
          if (!isWithinInterval(txDate, { start: startOfYear(now), end: endOfYear(now) })) return false;
        } else if (timeFilter === 'custom') {
          if (customStart && txDate < new Date(customStart)) return false;
          if (customEnd && txDate > endOfDay(new Date(customEnd))) return false;
        }
      }
      
      return true;
    });
  }, [transactions, filter, search, timeFilter, customStart, customEnd]);

  const displayedTransactions = useMemo(() => filteredTransactions.slice(0, displayLimit), [filteredTransactions, displayLimit]);

  // Calculate data for pie chart
  const chartData = useMemo(() => {
    // If filter is 'all', default to showing expense chart, otherwise show the selected type
    const chartType = filter === 'income' ? 'income' : 'expense';
    const chartTxs = filteredTransactions.filter(t => t.type === chartType);
    
    const grouped = chartTxs.reduce((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
      return acc;
    }, {} as Record<string, number>);
    
    const values = Object.values(grouped) as number[];
    const total: number = values.reduce((sum: number, val: number) => sum + val, 0);
    
    return Object.entries(grouped)
      .map(([name, value]) => {
        const numValue = Number(value);
        return { 
          name, 
          value: numValue,
          percent: total > 0 ? Math.round((numValue / total) * 100) : 0
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions, filter]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    
    if (editingTx.amount <= 0) {
      alert(t.fillAll); // Using fillAll as generic "invalid input" message or I could add a specific one, but user asked for "require > 0"
      return;
    }

    const success = await updateTransaction(editingTx.id, editingTx);
    if (success) {
      setEditingTx(null);
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAction = async () => {
    if (editingTx) {
      await deleteTransaction(editingTx.id);
      setEditingTx(null);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) return <div className="p-4 text-center text-gray-500">{t.loading}</div>;

  return (
    <div className="p-4 space-y-4 relative min-h-full">
      {/* Search and Filter */}
      <div className="flex space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder={t.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-shadow"
          />
        </div>
        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
          className="bg-white border border-gray-200 text-gray-700 text-sm rounded-xl focus:ring-red-500 focus:border-red-500 block p-2 shadow-sm"
        >
          <option value="all">{t.all}</option>
          <option value="today">{t.today}</option>
          <option value="week">{t.thisWeek}</option>
          <option value="month">{t.thisMonth}</option>
          <option value="quarter">{t.thisQuarter}</option>
          <option value="year">{t.thisYear}</option>
          <option value="custom">{t.customRange}</option>
        </select>
      </div>

      {/* Custom Date Range Inputs */}
      {timeFilter === 'custom' && (
        <div className="flex space-x-2 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">{t.startDate}</label>
            <input 
              type="date" 
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded p-1"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">{t.endDate}</label>
            <input 
              type="date" 
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded p-1"
            />
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${filter === 'all' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
        >
          {t.all}
        </button>
        <button
          onClick={() => setFilter('income')}
          className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${filter === 'income' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          {t.income}
        </button>
        <button
          onClick={() => setFilter('expense')}
          className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${filter === 'expense' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          {t.expense}
        </button>
      </div>

      {/* Pie Chart Section */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-2 text-center">
            {filter === 'income' ? t.incomeChart : t.expenseChart}
          </h3>
          <div className="flex items-center">
            <div className="w-1/2 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 pl-2 max-h-40 overflow-y-auto hide-scrollbar">
              <div className="space-y-2">
                {chartData.map((cat, idx) => {
                  const category = viewModel.categories.find(c => c.name === cat.name);
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center overflow-hidden">
                        <div className="w-3 h-3 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="mr-1 text-gray-400 flex-shrink-0 scale-75">{getCategoryIcon(category?.icon || null)}</span>
                        <span className="text-gray-600 truncate">{translateName(cat.name)}</span>
                      </div>
                      <span className="font-medium text-gray-800 ml-1">{cat.percent}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <List size={24} className="text-gray-300" />
            </div>
            <p>{t.noTransactionsFound}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {displayedTransactions.map((tx) => {
              const category = viewModel.categories.find(c => c.name === tx.category);
              return (
                <div 
                  key={tx.id} 
                  onClick={() => setEditingTx(tx)}
                  className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {getCategoryIcon(category?.icon || null)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{translateName(tx.category)}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(tx.date)}
                        {tx.note && ` • ${tx.note}`}
                      </p>
                    </div>
                  </div>
                  <div className={`font-semibold ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingTx && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-6">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-3 border-b border-gray-100 flex justify-center items-center bg-gray-50 relative">
              <h3 className="font-bold text-gray-800">{t.editTransaction}</h3>
              <button onClick={() => setEditingTx(null)} className="absolute right-2 p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleUpdate} className="p-5 space-y-4">
              <div className="bg-gray-50 py-2 px-3 rounded-2xl border border-gray-100">
                <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">{t.amount} ({currency})</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={editDisplayAmount}
                  onChange={(e) => formatEditAmountInput(e.target.value)}
                  className={`w-full text-2xl font-bold bg-transparent focus:outline-none ${editingTx.type === 'expense' ? 'text-red-600' : 'text-green-600'}`}
                />
              </div>

              <div className="grid grid-cols-[3fr_2fr] gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">{t.account}</label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <CustomSelect
                        value={editingTx.account_id || ''}
                        onChange={(val) => setEditingTx({ ...editingTx, account_id: Number(val) })}
                        options={accounts.map(acc => ({
                          value: acc.id,
                          label: translateName(acc.name),
                          icon: <span className="text-blue-500">{getAccountIcon(acc.icon)}</span>
                        }))}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">{t.date}</label>
                  <div className="relative">
                    <div className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm flex items-center justify-between gap-1.5 h-[38px]">
                      <span className="truncate">{editingTx.date ? formatDate(editingTx.date) : <span className="text-gray-400">{dateFormat.toLowerCase()}</span>}</span>
                      <Calendar size={16} className="text-gray-400 flex-shrink-0" />
                    </div>
                    <input
                      type="date"
                      value={editingTx.date}
                      onClick={(e) => {
                        try {
                          if ('showPicker' in e.currentTarget) {
                            e.currentTarget.showPicker();
                          }
                        } catch (err) {}
                      }}
                      onChange={(e) => setEditingTx({ ...editingTx, date: e.target.value })}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">{t.category}</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <CustomSelect
                      value={editingTx.category}
                      onChange={(val) => setEditingTx({ ...editingTx, category: val })}
                      options={sortCategories(categories.filter(c => c.type === editingTx.type && c.parent_id !== null)).map(c => ({
                        value: c.name,
                        label: translateName(c.name),
                        icon: <span className={editingTx.type === 'expense' ? 'text-red-500' : 'text-green-500'}>{getCategoryIcon(c.icon)}</span>
                      }))}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">{t.note}</label>
                <input
                  type="text"
                  value={editingTx.note || ''}
                  onChange={(e) => setEditingTx({ ...editingTx, note: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl font-bold flex items-center justify-center hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={18} className="mr-2" /> {t.delete}
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-3 bg-red-600 text-white rounded-xl font-bold flex items-center justify-center hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                >
                  <Save size={18} className="mr-2" /> {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-6">
          <div className="bg-white w-full max-w-xs rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 p-6 text-center">
            <h3 className="font-bold text-lg text-gray-800 mb-4">{t.confirmDelete}</h3>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                {t.cancelDelete}
              </button>
              <button
                onClick={confirmDeleteAction}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
              >
                {t.ok}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
