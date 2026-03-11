import { useState, useMemo, useEffect } from 'react';
import { useFinanceViewModel } from '../../viewmodels/useFinanceViewModel';
import { format, subMonths, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, eachDayOfInterval, eachMonthOfInterval, isSameMonth, getDate, getMonth, getYear, subQuarters, subYears, startOfDay, endOfDay, startOfWeek, endOfWeek, subWeeks, subDays, differenceInDays } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, ComposedChart, Line } from 'recharts';
import { Calendar, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet, Target } from 'lucide-react';
import { translations } from '../../utils/translations';
import { Transaction, Budget } from '../../models/types';
import { getLocale } from '../../utils/formatters';

type TimeFilter = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export default function ReportTab({ viewModel }: { viewModel: ReturnType<typeof useFinanceViewModel> }) {
  const { transactions, budgets, getSetting, loading, formatCurrency, formatDate, translateName } = viewModel;
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const language = getSetting('language', 'vi') as keyof typeof translations;
  const t = translations[language];

  useEffect(() => {
    if (timeFilter === 'custom') {
      setCustomStart('');
      setCustomEnd('');
    }
  }, [timeFilter]);

  // --- Date Logic ---
  const getDateRange = (filter: TimeFilter) => {
    const now = new Date();
    switch (filter) {
      case 'today': return { start: startOfDay(now), end: endOfDay(now) };
      case 'week': return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'month': return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'quarter': return { start: startOfQuarter(now), end: endOfQuarter(now) };
      case 'year': return { start: startOfYear(now), end: endOfYear(now) };
      case 'custom': 
        return { 
          start: customStart ? startOfDay(new Date(customStart)) : startOfMonth(now), 
          end: customEnd ? endOfDay(new Date(customEnd)) : endOfMonth(now) 
        };
      default: return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const { start, end } = getDateRange(timeFilter);

  const getPreviousDateRange = (filter: TimeFilter, currentStart: Date, currentEnd: Date) => {
    switch (filter) {
      case 'today': return { start: subDays(currentStart, 1), end: subDays(currentEnd, 1) };
      case 'week': return { start: subWeeks(currentStart, 1), end: subWeeks(currentEnd, 1) };
      case 'month': return { start: subMonths(currentStart, 1), end: subMonths(currentEnd, 1) };
      case 'quarter': return { start: subQuarters(currentStart, 1), end: subQuarters(currentEnd, 1) };
      case 'year': return { start: subYears(currentStart, 1), end: subYears(currentEnd, 1) };
      case 'custom': 
        const days = differenceInDays(currentEnd, currentStart) + 1;
        return { start: subDays(currentStart, days), end: subDays(currentEnd, days) };
      default: return { start: subMonths(currentStart, 1), end: subMonths(currentEnd, 1) };
    }
  };

  const { start: prevStart, end: prevEnd } = getPreviousDateRange(timeFilter, start, end);

  // --- Data Filtering ---
  const filterTransactions = (txs: Transaction[], s: Date, e: Date) => {
    return txs.filter(t => {
      const d = new Date(t.date);
      return d >= s && d <= e;
    });
  };

  const currentTxs = useMemo(() => filterTransactions(transactions, start, end), [transactions, start, end]);
  const prevTxs = useMemo(() => filterTransactions(transactions, prevStart, prevEnd), [transactions, prevStart, prevEnd]);

  // --- Section 1: Where Money Goes (Spending Analysis) ---
  const expenseTxs = currentTxs.filter(t => t.type === 'expense');
  const totalExpense = expenseTxs.reduce((sum, t) => sum + t.amount, 0);
  
  const prevExpenseTxs = prevTxs.filter(t => t.type === 'expense');
  const prevTotalExpense = prevExpenseTxs.reduce((sum, t) => sum + t.amount, 0);

  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    expenseTxs.forEach(t => {
      map.set(t.category, (map.get(t.category) || 0) + t.amount);
    });
    
    const prevMap = new Map<string, number>();
    prevExpenseTxs.forEach(t => {
      prevMap.set(t.category, (prevMap.get(t.category) || 0) + t.amount);
    });

    return Array.from(map.entries())
      .map(([name, value]) => {
        const prevValue = prevMap.get(name) || 0;
        const percentChange = prevValue === 0 ? 100 : ((value - prevValue) / prevValue) * 100;
        return { name, value, percentChange };
      })
      .sort((a, b) => b.value - a.value);
  }, [expenseTxs, prevExpenseTxs]);

  // --- Section 1.5: Where Income Comes From ---
  const incomeTxs = currentTxs.filter(t => t.type === 'income');
  const prevIncomeTxs = prevTxs.filter(t => t.type === 'income');

  const incomeCategoryData = useMemo(() => {
    const map = new Map<string, number>();
    incomeTxs.forEach(t => {
      map.set(t.category, (map.get(t.category) || 0) + t.amount);
    });
    
    const prevMap = new Map<string, number>();
    prevIncomeTxs.forEach(t => {
      prevMap.set(t.category, (prevMap.get(t.category) || 0) + t.amount);
    });

    return Array.from(map.entries())
      .map(([name, value]) => {
        const prevValue = prevMap.get(name) || 0;
        const percentChange = prevValue === 0 ? 100 : ((value - prevValue) / prevValue) * 100;
        return { name, value, percentChange };
      })
      .sort((a, b) => b.value - a.value);
  }, [incomeTxs, prevIncomeTxs]);

  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];

  // --- Section 2: Cash Flow ---
  const cashFlowData = useMemo(() => {
    let intervals: Date[];
    let dateFormat: string;

    if (timeFilter === 'today') {
        // For today, maybe show hours? Or just one bar? Let's show just one bar for simplicity or maybe 4-hour blocks if needed.
        // But 'eachDayOfInterval' for 1 day returns 1 day.
        intervals = eachDayOfInterval({ start, end });
        dateFormat = 'dd/MM';
    } else if (timeFilter === 'week' || timeFilter === 'month' || (timeFilter === 'custom' && differenceInDays(end, start) <= 31)) {
      intervals = eachDayOfInterval({ start, end });
      dateFormat = 'dd';
    } else {
      intervals = eachMonthOfInterval({ start, end });
      dateFormat = 'MM';
    }

    return intervals.map(date => {
      const isSamePeriod = (d: Date) => {
        if (timeFilter === 'today') return getDate(d) === getDate(date) && getMonth(d) === getMonth(date) && getYear(d) === getYear(date);
        if (timeFilter === 'week' || timeFilter === 'month' || (timeFilter === 'custom' && differenceInDays(end, start) <= 31)) {
             return getDate(d) === getDate(date) && getMonth(d) === getMonth(date) && getYear(d) === getYear(date);
        }
        return getMonth(d) === getMonth(date) && getYear(d) === getYear(date);
      };

      const periodTxs = currentTxs.filter(t => isSamePeriod(new Date(t.date)));
      const income = periodTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expense = periodTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      
      return {
        name: format(date, dateFormat),
        income,
        expense,
        net: income - expense
      };
    });
  }, [currentTxs, start, end, timeFilter]);

  const totalIncome = currentTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const netIncome = totalIncome - totalExpense;

  // --- Section 3: Savings Analysis ---
  const savingsRate = totalIncome === 0 ? 0 : ((totalIncome - totalExpense) / totalIncome) * 100;
  const savingsStatus = savingsRate > 20 ? t.goodSavingsMonth : (savingsRate > 0 ? t.savings : t.spentCleanMonth);

  if (loading) return <div className="p-4 text-center text-gray-500">{t.loading}</div>;

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Header & Filter */}
      <div className="flex flex-col space-y-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center">
          <div className="flex items-center font-bold text-lg text-gray-800">
            <Calendar size={20} className="mr-2 text-indigo-600" />
            {timeFilter === 'today' && t.today}
            {timeFilter === 'week' && t.thisWeek}
            {timeFilter === 'month' && format(start, 'MMMM yyyy', { locale: getLocale(language) })}
            {timeFilter === 'quarter' && t.thisQuarter}
            {timeFilter === 'year' && format(start, 'yyyy')}
            {timeFilter === 'custom' && t.customRange}
          </div>
          
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
            className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-2"
          >
            <option value="today">{t.today}</option>
            <option value="week">{t.thisWeek}</option>
            <option value="month">{t.thisMonth}</option>
            <option value="quarter">{t.thisQuarter}</option>
            <option value="year">{t.thisYear}</option>
            <option value="custom">{t.customRange}</option>
          </select>
        </div>
        
        {timeFilter === 'custom' && (
          <div className="flex space-x-2 bg-gray-50 p-3 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex-1">
              <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">
                {t.startDate}
              </label>
              <div className="relative">
                <input 
                  type="date" 
                  value={customStart}
                  onChange={(e) => {
                    setCustomStart(e.target.value);
                    if (customEnd && e.target.value > customEnd) {
                      setCustomEnd('');
                    }
                  }}
                  className={`date-input-full-picker w-full bg-white border border-gray-200 rounded-lg pl-3 pr-10 py-2 text-sm h-[38px] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${!customStart ? 'text-transparent' : 'text-gray-800'}`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <Calendar size={14} />
                </div>
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">
                {t.endDate}
              </label>
              <div className="relative">
                <input 
                  type="date" 
                  value={customEnd}
                  min={customStart}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className={`date-input-full-picker w-full bg-white border border-gray-200 rounded-lg pl-3 pr-10 py-2 text-sm h-[38px] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${!customEnd ? 'text-transparent' : 'text-gray-800'}`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <Calendar size={14} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 1. Where Income Comes From */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center">
          <Wallet size={18} className="mr-2 text-green-500" />
          {t.whereIncomeComesFrom}
        </h3>
        
        {totalIncome === 0 ? (
          <div className="h-40 flex items-center justify-center text-gray-400 text-sm">{t.noData}</div>
        ) : (
          <>
            <div className="h-64 w-full mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={incomeCategoryData.map(c => ({ ...c, name: translateName(c.name) }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {incomeCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-4">
              {incomeCategoryData.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-2 h-8 rounded-full mr-3" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <div>
                      <div className="font-medium text-gray-800 text-sm">{translateName(item.name)}</div>
                      <div className="text-xs text-gray-500">
                        {((item.value / totalIncome) * 100).toFixed(1)}% • 
                        <span className={item.percentChange > 0 ? 'text-green-500 ml-1' : 'text-red-500 ml-1'}>
                          {item.percentChange > 0 ? '+' : ''}{item.percentChange.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="font-semibold text-gray-900 text-sm">{formatCurrency(item.value)}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">{t.avgDailyIncome}</span>
                <span className="font-bold text-gray-800">
                  {formatCurrency(totalIncome / (differenceInDays(end, start) + 1))}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">{t.totalIncome}</span>
                <span className="font-bold text-green-600">
                  {formatCurrency(totalIncome)}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 2. Where Money Goes */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center">
          <Wallet size={18} className="mr-2 text-orange-500" />
          {t.whereMoneyGoes}
        </h3>
        
        {totalExpense === 0 ? (
          <div className="h-40 flex items-center justify-center text-gray-400 text-sm">{t.noData}</div>
        ) : (
          <>
            <div className="h-64 w-full mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData.map(c => ({ ...c, name: translateName(c.name) }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-4">
              {categoryData.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-2 h-8 rounded-full mr-3" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <div>
                      <div className="font-medium text-gray-800 text-sm">{translateName(item.name)}</div>
                      <div className="text-xs text-gray-500">
                        {((item.value / totalExpense) * 100).toFixed(1)}% • 
                        <span className={item.percentChange > 0 ? 'text-red-500 ml-1' : 'text-green-500 ml-1'}>
                          {item.percentChange > 0 ? '+' : ''}{item.percentChange.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="font-semibold text-gray-900 text-sm">{formatCurrency(item.value)}</div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">{t.avgDailyExpense}</span>
                <span className="font-bold text-gray-800">
                  {formatCurrency(totalExpense / (differenceInDays(end, start) + 1))}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">{t.totalExpense}</span>
                <span className="font-bold text-red-600">
                  {formatCurrency(totalExpense)}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 3. Cash Flow */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center">
          <TrendingUp size={18} className="mr-2 text-blue-500" />
          {t.cashFlow}
        </h3>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-green-50 p-3 rounded-xl">
            <div className="text-xs text-green-600 mb-1">{t.income}</div>
            <div className="font-bold text-green-700">{formatCurrency(totalIncome)}</div>
          </div>
          <div className="bg-red-50 p-3 rounded-xl">
            <div className="text-xs text-red-600 mb-1">{t.expense}</div>
            <div className="font-bold text-red-700">{formatCurrency(totalExpense)}</div>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis hide />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="income" name={t.income} fill="#22c55e" radius={[4, 4, 0, 0]} barSize={8} stackId="a" />
              <Bar dataKey="expense" name={t.expense} fill="#ef4444" radius={[4, 4, 0, 0]} barSize={8} stackId="b" />
              <Area type="monotone" dataKey="net" name={t.netIncome} stroke="#6366f1" fill="#818cf8" fillOpacity={0.1} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 flex justify-between items-center text-sm">
          <span className="text-gray-500">{t.netIncome}</span>
          <span className={`font-bold ${netIncome >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
            {formatCurrency(netIncome)}
          </span>
        </div>
      </div>

      {/* 3. Savings Analysis */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center">
          <Target size={18} className="mr-2 text-emerald-500" />
          {t.amISaving}
        </h3>

        <div className="flex items-center justify-between mb-6">
          <div className="relative w-24 h-24 flex items-center justify-center">
             <svg className="w-full h-full transform -rotate-90">
                <circle cx="48" cy="48" r="36" stroke="#f3f4f6" strokeWidth="8" fill="none" />
                <circle 
                  cx="48" cy="48" r="36" 
                  stroke={savingsRate > 0 ? "#10b981" : "#ef4444"} 
                  strokeWidth="8" 
                  fill="none" 
                  strokeDasharray={226} 
                  strokeDashoffset={226 - (226 * Math.max(0, Math.min(100, savingsRate))) / 100} 
                  className="transition-all duration-1000 ease-out"
                />
             </svg>
             <div className="absolute text-center">
               <div className="text-xs text-gray-400">{t.savingsRate}</div>
               <div className={`font-bold ${savingsRate > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                 {savingsRate.toFixed(0)}%
               </div>
             </div>
          </div>
          
          <div className="flex-1 ml-6 space-y-3">
            <div className="bg-gray-50 p-3 rounded-xl">
              <div className="text-xs text-gray-500 mb-1">{t.surplus}</div>
              <div className="font-bold text-gray-800">{formatCurrency(Math.max(0, netIncome))}</div>
            </div>
            <div className="text-sm font-medium text-gray-600">
              {savingsStatus}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
