import React, { useState, useMemo } from 'react';
import { useFinanceViewModel } from '../../viewmodels/useFinanceViewModel';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subDays, subWeeks, subMonths, subQuarters, subYears, isWithinInterval } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ArrowDownRight, ArrowUpRight, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { translations } from '../../utils/translations';
import { getCategoryIcon } from '../../utils/icons';

type TimeFilter = 'today' | 'week' | 'month' | 'quarter' | 'year';

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];

export default function OverviewTab({ viewModel, onTabChange, onNavigateToBudget }: { viewModel: ReturnType<typeof useFinanceViewModel>, onTabChange: (index: number) => void, onNavigateToBudget?: (subTab: 'budgets' | 'goals') => void }) {
  const { transactions, budgets, goals, loading, getSetting, formatCurrency, formatDate, translateName } = viewModel;
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');

  const language = getSetting('language', 'vi');
  const dateFormat = getSetting('date_format', 'dd/MM/yyyy');
  const t = translations[language] || translations['vi'];

  const { currentInterval, prevInterval } = useMemo(() => {
    const now = new Date();
    let currentStart, currentEnd, prevStart, prevEnd;
    
    switch (timeFilter) {
      case 'today':
        currentStart = startOfDay(now); currentEnd = endOfDay(now);
        prevStart = startOfDay(subDays(now, 1)); prevEnd = endOfDay(subDays(now, 1));
        break;
      case 'week':
        currentStart = startOfWeek(now, { weekStartsOn: 1 }); currentEnd = endOfWeek(now, { weekStartsOn: 1 });
        prevStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }); prevEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        break;
      case 'month':
        currentStart = startOfMonth(now); currentEnd = endOfMonth(now);
        prevStart = startOfMonth(subMonths(now, 1)); prevEnd = endOfMonth(subMonths(now, 1));
        break;
      case 'quarter':
        currentStart = startOfQuarter(now); currentEnd = endOfQuarter(now);
        prevStart = startOfQuarter(subQuarters(now, 1)); prevEnd = endOfQuarter(subQuarters(now, 1));
        break;
      case 'year':
        currentStart = startOfYear(now); currentEnd = endOfYear(now);
        prevStart = startOfYear(subYears(now, 1)); prevEnd = endOfYear(subYears(now, 1));
        break;
    }
    return {
      currentInterval: { start: currentStart, end: currentEnd },
      prevInterval: { start: prevStart, end: prevEnd }
    };
  }, [timeFilter]);

  const { currentTxs, prevTxs } = useMemo(() => {
    const current = transactions.filter(tx => isWithinInterval(new Date(tx.date), currentInterval));
    const prev = transactions.filter(tx => isWithinInterval(new Date(tx.date), prevInterval));
    return { currentTxs: current, prevTxs: prev };
  }, [transactions, currentInterval, prevInterval]);

  const currentStats = useMemo(() => {
    const income = currentTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = currentTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [currentTxs]);

  const prevStats = useMemo(() => {
    const income = prevTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = prevTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [prevTxs]);

  const categoryExpenses = useMemo(() => {
    const expenses = currentTxs.filter(t => t.type === 'expense');
    const grouped = expenses.reduce((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value: Number(value) }))
      .sort((a, b) => b.value - a.value);
  }, [currentTxs]);

  const warnings = useMemo(() => {
    if (timeFilter === 'today') return []; // Don't warn for daily
    
    const prevExpenses = prevTxs.filter(t => t.type === 'expense').reduce((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
      return acc;
    }, {} as Record<string, number>);

    const warns: string[] = [];
    categoryExpenses.forEach(cat => {
      const prevAmount = prevExpenses[cat.name] || 0;
      if (prevAmount > 0 && cat.value > prevAmount) {
        const percentIncrease = Math.round(((cat.value - prevAmount) / prevAmount) * 100);
        if (percentIncrease > 20) { // Only warn if > 20% increase
          warns.push(`${t.spendingMore} "${cat.name}" ${t.moreThan} ${percentIncrease}% ${t.comparedToLastPeriod}`);
        }
      }
    });
    return warns;
  }, [categoryExpenses, prevTxs, timeFilter]);

  const currentMonth = format(new Date(), 'yyyy-MM');
  const currentMonthBudgets = budgets.filter(b => b.month === currentMonth);
  
  const budgetStatusData = useMemo(() => {
    return currentMonthBudgets.map(budget => {
      const spent = transactions
        .filter(t => t.type === 'expense' && t.category === budget.category && format(new Date(t.date), 'yyyy-MM') === currentMonth)
        .reduce((acc, t) => acc + t.amount, 0);
      const percent = budget.limit_amount > 0 ? Math.round((spent / budget.limit_amount) * 100) : 0;
      return { category: budget.category, spent, limit: budget.limit_amount, percent };
    });
  }, [currentMonthBudgets, transactions, currentMonth]);

  if (loading) return <div className="p-4 text-center text-gray-500">Đang tải...</div>;

  const barData = [
    { name: t.income, value: currentStats.income, fill: '#16a34a' },
    { name: t.expense, value: currentStats.expense, fill: '#dc2626' }
  ];

  const recentTransactions = currentTxs.slice(0, 5);

  return (
    <div className="p-4 space-y-6">
      {/* Greeting and Balance */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-gray-500 text-sm">{t.greeting.replace('{name}', viewModel.user?.full_name || '')}</p>
          <h2 className="text-2xl font-bold text-gray-800">{formatCurrency(currentStats.balance)}</h2>
        </div>
        
        {/* Time Filter Dropdown */}
        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
          className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-red-500 focus:border-red-500 block p-2 shadow-sm"
        >
          <option value="month">{t.thisMonth}</option>
          <option value="today">{t.today}</option>
          <option value="week">{t.thisWeek}</option>
          <option value="quarter">{t.thisQuarter}</option>
          <option value="year">{t.thisYear}</option>
        </select>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center text-orange-600 font-bold text-sm mb-2">
            <AlertTriangle size={18} className="mr-2" />
            {t.spendingWarning}
          </div>
          {warnings.slice(0, 2).map((warn, idx) => (
            <p key={idx} className="text-xs text-orange-700">{warn}</p>
          ))}
        </div>
      )}

      {/* Overview Chart & Stats */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4">{t.overviewIncomeExpense}</h3>
        <div className="flex items-center">
          <div className="w-1/2 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis hide />
                <RechartsTooltip formatter={(value: number) => formatCurrency(value)} cursor={{ fill: 'transparent' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="w-1/2 pl-4 space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">{t.totalIncome}</p>
              <p className="font-bold text-green-600">{formatCurrency(currentStats.income)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">{t.totalExpense}</p>
              <p className="font-bold text-red-600">{formatCurrency(currentStats.expense)}</p>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">{t.remaining}</p>
              <p className={`font-bold ${currentStats.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatCurrency(currentStats.balance)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Budget Status Section */}
      {budgetStatusData.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800">{t.budgetStatus}</h3>
            <button onClick={() => onNavigateToBudget?.('budgets')} className="text-xs text-red-600 font-medium hover:underline">{t.seeAll}</button>
          </div>
          <div className="space-y-3 font-mono text-xs">
            {budgetStatusData.map((b, idx) => {
              const category = viewModel.categories.find(c => c.name === b.category);
              return (
                <div key={idx} className="grid grid-cols-[120px_1fr] items-center gap-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-gray-400 flex-shrink-0">{getCategoryIcon(category?.icon || null)}</span>
                    <span className="truncate">{translateName(b.category)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${b.percent > 100 ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(b.percent, 100)}%` }}
                      />
                    </div>
                    <span className={`font-bold whitespace-nowrap ${b.percent > 100 ? 'text-red-500' : 'text-gray-700'}`}>
                      {b.percent}% {b.percent > 100 && '⚠'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Goals Progress Section */}
      {goals.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800">{t.goalsProgress}</h3>
            <button onClick={() => onNavigateToBudget?.('goals')} className="text-xs text-red-600 font-medium hover:underline">{t.seeAll}</button>
          </div>
          <div className="space-y-3 text-xs">
            {goals.map((goal, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <span className="font-medium text-gray-700 truncate w-32">{translateName(goal.name)}</span>
                <span className="text-gray-500 font-mono">
                  {formatCurrency(goal.current_amount).replace('₫', '').trim()} / {formatCurrency(goal.target_amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Pie Chart */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4">{t.spendingStructure}</h3>
        {categoryExpenses.length === 0 ? (
          <div className="text-center text-gray-400 py-8 text-sm">{t.noSpendingData}</div>
        ) : (
          <div className="flex items-center">
            <div className="w-1/2 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryExpenses.map(c => ({ ...c, name: translateName(c.name) }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryExpenses.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 pl-2 max-h-48 overflow-y-auto hide-scrollbar">
              <div className="space-y-3">
                {categoryExpenses.map((cat, idx) => {
                  const percent = Math.round((cat.value / currentStats.expense) * 100);
                  const category = viewModel.categories.find(c => c.name === cat.name);
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center overflow-hidden">
                        <div className="w-3 h-3 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="mr-1.5 text-gray-400 flex-shrink-0 scale-75">{getCategoryIcon(category?.icon || null)}</span>
                        <span className="text-gray-600 truncate">{translateName(cat.name)}</span>
                      </div>
                      <span className="font-medium text-gray-800 ml-2">{percent}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Comparison */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4">{t.compareWithLastPeriod}</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{t.totalExpenseThisPeriod}</span>
            <span className="font-bold text-gray-800">{formatCurrency(currentStats.expense)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{t.totalExpenseLastPeriod}</span>
            <span className="font-bold text-gray-800">{formatCurrency(prevStats.expense)}</span>
          </div>
          <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-800">{t.difference}</span>
            {currentStats.expense > prevStats.expense ? (
              <span className="text-sm font-bold text-red-600 flex items-center">
                <ArrowUpRight size={16} className="mr-1" />
                {formatCurrency(currentStats.expense - prevStats.expense)}
              </span>
            ) : (
              <span className="text-sm font-bold text-green-600 flex items-center">
                <ArrowDownRight size={16} className="mr-1" />
                {formatCurrency(prevStats.expense - currentStats.expense)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-800">{t.recentTransactions}</h3>
          <button onClick={() => onTabChange(1)} className="text-sm text-red-600 font-medium hover:underline">{t.seeAll}</button>
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {recentTransactions.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">{t.noTransactions}</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentTransactions.map((tx) => {
                const category = viewModel.categories.find(c => c.name === tx.category);
                return (
                  <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
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
      </div>
    </div>
  );
}
