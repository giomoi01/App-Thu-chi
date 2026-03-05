import React, { useState, useEffect } from 'react';
import { useFinanceViewModel } from '../../viewmodels/useFinanceViewModel';
import { format } from 'date-fns';
import { Target, Plus, AlertCircle, X, CheckCircle2, XCircle, Calendar, Wallet, TrendingUp, ChevronDown } from 'lucide-react';
import { translations } from '../../utils/translations';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { getCategoryIcon } from '../../utils/icons';
import CustomSelect from '../../components/CustomSelect';

export default function BudgetTab({ viewModel, initialTab = 'budgets' }: { viewModel: ReturnType<typeof useFinanceViewModel>, initialTab?: 'budgets' | 'goals' }) {
  const { budgets, goals, transactions, loading, getSetting, addBudget, updateBudget, deleteBudget, addGoal, updateGoal, deleteGoal, updateGoalAmount, categories, formatCurrency, formatDate, translateName } = viewModel;
  const [activeTab, setActiveTab] = useState<'budgets' | 'goals'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Modals
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddGoalMoney, setShowAddGoalMoney] = useState<number | null>(null);
  const [editingBudget, setEditingBudget] = useState<number | null>(null);
  const [editingGoal, setEditingGoal] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ type: 'budget' | 'goal', id: number } | null>(null);

  // Form states
  const [budgetCategory, setBudgetCategory] = useState('');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [budgetMonth, setBudgetMonth] = useState(format(new Date(), 'yyyy-MM'));
  
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalCurrent, setGoalCurrent] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');
  
  const [addGoalMoneyAmount, setAddGoalMoneyAmount] = useState('');

  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const language = getSetting('language', 'vi');
  const currency = getSetting('currency', 'VND');
  const dateFormat = getSetting('date_format', 'dd/MM/yyyy');
  const t = translations[language] || translations['vi'];

  const getSpentAmount = (category: string, month: string) => {
    return transactions
      .filter(t => t.type === 'expense' && t.category === category && t.date.startsWith(month))
      .reduce((acc, t) => acc + t.amount, 0);
  };

  const sortCategories = (cats: any[]) => {
    return [...cats].sort((a, b) => {
      const isAOther = a.name.toLowerCase() === 'khác' || a.name.toLowerCase() === 'other';
      const isBOther = b.name.toLowerCase() === 'khác' || b.name.toLowerCase() === 'other';
      if (isAOther && !isBOther) return 1;
      if (!isAOther && isBOther) return -1;
      return a.id - b.id;
    });
  };

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetCategory || !budgetLimit || !budgetMonth) return;
    
    const limit = Number(budgetLimit.replace(/\D/g, ''));
    let success = false;

    if (editingBudget) {
      success = await updateBudget(editingBudget, {
        category: budgetCategory,
        limit_amount: limit,
        month: budgetMonth
      });
    } else {
      success = await addBudget({
        category: budgetCategory,
        limit_amount: limit,
        month: budgetMonth
      });
    }

    if (success) {
      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        setShowAddBudget(false);
        setEditingBudget(null);
        setBudgetCategory('');
        setBudgetLimit('');
      }, 1000);
    } else {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const handleDeleteBudget = (id: number) => {
    setShowDeleteConfirm({ type: 'budget', id });
  };

  const handleDeleteGoal = (id: number) => {
    setShowDeleteConfirm({ type: 'goal', id });
  };

  const confirmDeleteAction = async () => {
    if (!showDeleteConfirm) return;

    let success = false;
    if (showDeleteConfirm.type === 'budget') {
      success = await deleteBudget(showDeleteConfirm.id);
      if (success) {
        setShowAddBudget(false);
        setEditingBudget(null);
      }
    } else {
      success = await deleteGoal(showDeleteConfirm.id);
      if (success) {
        setShowAddGoal(false);
        setEditingGoal(null);
      }
    }
    
    if (success) {
      setShowDeleteConfirm(null);
    }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName || !goalTarget) return;

    const target = Number(goalTarget.replace(/\D/g, ''));
    const current = Number(goalCurrent.replace(/\D/g, '') || 0);
    let success = false;

    if (editingGoal) {
      success = await updateGoal(editingGoal, {
        name: goalName,
        target_amount: target,
        current_amount: current,
        deadline: goalDeadline || undefined
      });
    } else {
      success = await addGoal({
        name: goalName,
        target_amount: target,
        current_amount: current,
        deadline: goalDeadline || undefined
      });
    }

    if (success) {
      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        setShowAddGoal(false);
        setEditingGoal(null);
        setGoalName('');
        setGoalTarget('');
        setGoalCurrent('');
        setGoalDeadline('');
      }, 1000);
    } else {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };


  const openEditBudget = (budget: any) => {
    setEditingBudget(budget.id);
    setBudgetCategory(budget.category);
    setBudgetLimit(budget.limit_amount.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US'));
    setBudgetMonth(budget.month);
    setShowAddBudget(true);
  };

  const openEditGoal = (goal: any) => {
    setEditingGoal(goal.id);
    setGoalName(goal.name);
    setGoalTarget(goal.target_amount.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US'));
    setGoalCurrent(goal.current_amount.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US'));
    setGoalDeadline(goal.deadline || '');
    setShowAddGoal(true);
  };

  const handleAddGoalMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (showAddGoalMoney === null || !addGoalMoneyAmount) return;

    const amountToAdd = Number(addGoalMoneyAmount.replace(/\D/g, ''));
    const success = await updateGoalAmount(showAddGoalMoney, amountToAdd);

    if (success) {
      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        setShowAddGoalMoney(null);
        setAddGoalMoneyAmount('');
      }, 1000);
    } else {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const formatAmountInput = (val: string, setter: (v: string) => void) => {
    const cleanVal = val.replace(/\D/g, '');
    if (cleanVal === '') {
      setter('');
      return;
    }
    const num = parseInt(cleanVal);
    setter(num.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US'));
  };

  if (loading) return <div className="p-4 text-center text-gray-500">{t.loading}</div>;

  const currentMonth = format(new Date(), 'yyyy-MM');
  const currentMonthBudgets = budgets.filter(b => b.month === currentMonth);

  // Budget Stats
  const totalBudgetLimit = currentMonthBudgets.reduce((acc, b) => acc + b.limit_amount, 0);
  const totalSpent = currentMonthBudgets.reduce((acc, b) => acc + getSpentAmount(b.category, b.month), 0);
  const budgetPercent = totalBudgetLimit > 0 ? Math.min(100, (totalSpent / totalBudgetLimit) * 100) : 0;
  
  // Days Remaining
  const today = new Date();
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const daysRemaining = lastDayOfMonth.getDate() - today.getDate();

  // Goal Stats
  const totalTarget = goals.reduce((acc, g) => acc + g.target_amount, 0);
  const totalCurrent = goals.reduce((acc, g) => acc + g.current_amount, 0);
  const overallGoalPercent = totalTarget > 0 ? Math.min(100, (totalCurrent / totalTarget) * 100) : 0;

  const budgetChartData = [
    { name: 'Spent', value: totalSpent },
    { name: 'Remaining', value: Math.max(0, totalBudgetLimit - totalSpent) }
  ];

  const goalChartData = [
    { name: 'Current', value: totalCurrent },
    { name: 'Remaining', value: Math.max(0, totalTarget - totalCurrent) }
  ];

  return (
    <div className="p-4 space-y-6">
      {/* Tab Switcher */}
      <div className="flex bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('budgets')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'budgets' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          {t.budgetThisMonth}
        </button>
        <button
          onClick={() => setActiveTab('goals')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'goals' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          {t.financialGoals}
        </button>
      </div>

      {activeTab === 'budgets' && (
        <div className="space-y-4">
          {/* Budget Summary Card */}
          {currentMonthBudgets.length > 0 && (
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm overflow-hidden relative">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="relative w-32 h-32 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={budgetChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={60}
                        startAngle={90}
                        endAngle={-270}
                        paddingAngle={0}
                        dataKey="value"
                        stroke="none"
                      >
                        <Cell fill={totalSpent > totalBudgetLimit ? '#ef4444' : '#ef4444'} />
                        <Cell fill="#f3f4f6" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-gray-800">{Math.round(budgetPercent)}%</span>
                  </div>
                </div>

                <div className="flex-1 space-y-3 w-full">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-red-50 rounded-lg">
                        <Wallet size={16} className="text-red-600" />
                      </div>
                      <p className="text-[8px] text-gray-400 uppercase font-bold tracking-wider whitespace-nowrap">{t.totalBudget}</p>
                    </div>
                    <p className="text-sm font-bold text-gray-800 ml-10">{formatCurrency(totalBudgetLimit)}</p>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-red-50 rounded-lg">
                        <TrendingUp size={16} className="text-red-600" />
                      </div>
                      <p className="text-[8px] text-gray-400 uppercase font-bold tracking-wider whitespace-nowrap">{t.totalSpent}</p>
                    </div>
                    <p className={`text-sm font-bold ml-10 ${totalSpent > totalBudgetLimit ? 'text-red-600' : 'text-gray-800'}`}>
                      {formatCurrency(totalSpent)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                    <Calendar size={14} className="text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {t.daysRemaining}: <span className="font-bold text-gray-700">{daysRemaining} {t.days}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-gray-800">{t.budgetThisMonth} ({format(new Date(), 'MM/yyyy')})</h3>
            <button 
              onClick={() => setShowAddBudget(true)}
              className="text-red-600 p-1 hover:bg-red-50 rounded-full transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>

          {currentMonthBudgets.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target size={24} className="text-red-300" />
              </div>
              <p className="text-gray-500 mb-4">{t.noBudget}</p>
              <button 
                onClick={() => setShowAddBudget(true)}
                className="px-6 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors shadow-sm"
              >
                {t.createBudget}
              </button>
            </div>
          ) : (
            currentMonthBudgets.map(budget => {
              const spent = getSpentAmount(budget.category, budget.month);
              const percent = Math.min(100, (spent / budget.limit_amount) * 100);
              const isOver = spent > budget.limit_amount;
              const category = categories.find(c => c.name === budget.category);

              return (
                <div 
                  key={budget.id} 
                  className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:border-red-200 transition-colors"
                  onClick={() => openEditBudget(budget)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gray-50 rounded-xl text-gray-400">
                      {getCategoryIcon(category?.icon || null)}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-800">{translateName(budget.category)}</span>
                      <span className="text-xs text-gray-500">
                        {formatCurrency(spent)} / {formatCurrency(budget.limit_amount)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden mb-2">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-red-500' : percent > 80 ? 'bg-orange-400' : 'bg-green-500'}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  {isOver && (
                    <p className="text-[10px] text-red-500 font-medium flex items-center gap-1 mt-1">
                      <AlertCircle size={10} />
                      {t.budgetExceeded.replace('{amount}', formatCurrency(spent - budget.limit_amount))}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'goals' && (
        <div className="space-y-4">
          {/* Goal Summary Card */}
          {goals.length > 0 && (
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm overflow-hidden relative">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="relative w-32 h-32 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={goalChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={60}
                        startAngle={90}
                        endAngle={-270}
                        paddingAngle={0}
                        dataKey="value"
                        stroke="none"
                      >
                        <Cell fill="#3b82f6" />
                        <Cell fill="#f3f4f6" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-blue-600">{Math.round(overallGoalPercent)}%</span>
                  </div>
                </div>

                <div className="flex-1 space-y-3 w-full">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Target size={16} className="text-blue-600" />
                      </div>
                      <p className="text-[8px] text-gray-400 uppercase font-bold tracking-wider whitespace-nowrap">{t.targetAmount}</p>
                    </div>
                    <p className="text-sm font-bold text-gray-800 ml-10">
                      {formatCurrency(totalTarget)}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <TrendingUp size={16} className="text-blue-600" />
                      </div>
                      <p className="text-[8px] text-gray-400 uppercase font-bold tracking-wider whitespace-nowrap">{t.goalSummary}</p>
                    </div>
                    <p className="text-sm font-bold text-gray-800 ml-10">{formatCurrency(totalCurrent)}</p>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                    <span className="text-xs text-gray-500">
                      {t.overallProgress}: <span className="font-bold text-blue-600">{Math.round(overallGoalPercent)}%</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-gray-800">{t.financialGoals}</h3>
            <button 
              onClick={() => setShowAddGoal(true)}
              className="text-red-600 p-1 hover:bg-red-50 rounded-full transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>

          {goals.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target size={24} className="text-blue-300" />
              </div>
              <p className="text-gray-500 mb-4">{t.noGoals}</p>
              <button 
                onClick={() => setShowAddGoal(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm"
              >
                {t.createGoal}
              </button>
            </div>
          ) : (
            goals.map(goal => {
              const percent = Math.min(100, (goal.current_amount / goal.target_amount) * 100);

              return (
                <div 
                  key={goal.id} 
                  className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:border-blue-200 transition-colors"
                  onClick={() => openEditGoal(goal)}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-gray-800">{goal.name}</span>
                    <span className="text-sm font-bold text-blue-600">{Math.round(percent)}%</span>
                  </div>
                  
                  <div className="flex justify-between items-center mb-3">
                    <div className="text-xs text-gray-500">
                      {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                    </div>
                    {goal.deadline && (
                      <div className="flex items-center gap-1 text-[10px] text-gray-400">
                        <Calendar size={10} />
                        {formatDate(goal.deadline)}
                      </div>
                    )}
                  </div>
                  
                  <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden mb-3">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-1000"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAddGoalMoney(goal.id);
                    }}
                    className="w-full py-2 bg-blue-50 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    {t.addMoneyToGoal}
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Add Budget Modal */}
      {showAddBudget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-6">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-3 border-b border-gray-100 flex justify-center items-center bg-gray-50 relative">
              <h3 className="font-bold text-gray-800">{editingBudget ? t.editBudget : t.createBudget}</h3>
              <button onClick={() => { setShowAddBudget(false); setEditingBudget(null); }} className="absolute right-2 p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddBudget} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">{t.category}</label>
                <div className="relative">
                  <CustomSelect
                    value={budgetCategory}
                    onChange={(val) => setBudgetCategory(val)}
                    placeholder={t.selectCategory}
                    options={sortCategories(categories.filter(c => c.type === 'expense' && c.parent_id !== null)).map(c => ({
                      value: c.name,
                      label: translateName(c.name),
                      icon: <span className="text-red-500">{getCategoryIcon(c.icon)}</span>
                    }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">{t.limitAmount} ({currency})</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={budgetLimit}
                  onChange={(e) => formatAmountInput(e.target.value, setBudgetLimit)}
                  placeholder="0"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">{t.month}</label>
                <input
                  type="month"
                  value={budgetMonth}
                  onChange={(e) => setBudgetMonth(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex gap-3">
                {editingBudget && (
                  <button
                    type="button"
                    onClick={() => handleDeleteBudget(editingBudget)}
                    className="flex-1 py-3 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-all"
                  >
                    {t.delete}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={status !== 'idle'}
                  className={`flex-[2] py-3 rounded-xl font-bold text-white shadow-lg transition-all flex justify-center items-center ${
                    status === 'success' ? 'bg-green-500' : 
                    status === 'error' ? 'bg-red-500' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {status === 'success' ? <CheckCircle2 /> : status === 'error' ? <XCircle /> : editingBudget ? t.save : t.add}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddGoal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-6">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-3 border-b border-gray-100 flex justify-center items-center bg-gray-50 relative">
              <h3 className="font-bold text-gray-800">{editingGoal ? t.editGoal : t.createGoal}</h3>
              <button onClick={() => { setShowAddGoal(false); setEditingGoal(null); }} className="absolute right-2 p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddGoal} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">{t.goalName}</label>
                <input
                  type="text"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">{t.targetAmount}</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={goalTarget}
                    onChange={(e) => formatAmountInput(e.target.value, setGoalTarget)}
                    placeholder="0"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">{t.currentAmount}</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={goalCurrent}
                    onChange={(e) => formatAmountInput(e.target.value, setGoalCurrent)}
                    placeholder="0"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">{t.deadline}</label>
                <div className="relative">
                  <div className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm flex items-center justify-between gap-1.5 h-[38px]">
                    <span className="truncate">{goalDeadline ? formatDate(goalDeadline) : <span className="text-gray-400">{dateFormat.toLowerCase()}</span>}</span>
                    <Calendar size={16} className="text-gray-400 flex-shrink-0" />
                  </div>
                  <input
                    type="date"
                    value={goalDeadline}
                    onClick={(e) => {
                      try {
                        if ('showPicker' in e.currentTarget) {
                          e.currentTarget.showPicker();
                        }
                      } catch (err) {}
                    }}
                    onChange={(e) => setGoalDeadline(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                {editingGoal && (
                  <button
                    type="button"
                    onClick={() => handleDeleteGoal(editingGoal)}
                    className="flex-1 py-3 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-all"
                  >
                    {t.delete}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={status !== 'idle'}
                  className={`flex-[2] py-3 rounded-xl font-bold text-white shadow-lg transition-all flex justify-center items-center ${
                    status === 'success' ? 'bg-green-500' : 
                    status === 'error' ? 'bg-red-500' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {status === 'success' ? <CheckCircle2 /> : status === 'error' ? <XCircle /> : editingGoal ? t.save : t.add}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Money to Goal Modal */}
      {showAddGoalMoney !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-6">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-3 border-b border-gray-100 flex justify-center items-center bg-gray-50 relative">
              <h3 className="font-bold text-gray-800">{t.addMoneyToGoal}</h3>
              <button onClick={() => setShowAddGoalMoney(null)} className="absolute right-2 p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddGoalMoney} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">{t.addAmount} ({currency})</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={addGoalMoneyAmount}
                  onChange={(e) => formatAmountInput(e.target.value, setAddGoalMoneyAmount)}
                  placeholder="0"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={status !== 'idle'}
                className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all flex justify-center items-center ${
                  status === 'success' ? 'bg-green-500' : 
                  status === 'error' ? 'bg-red-500' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {status === 'success' ? <CheckCircle2 /> : status === 'error' ? <XCircle /> : t.add}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-6">
          <div className="bg-white w-full max-w-xs rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 p-6 text-center">
            <h3 className="font-bold text-lg text-gray-800 mb-4">{t.confirmDeleteGeneral}</h3>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                {t.cancelDelete || 'Huỷ bỏ'}
              </button>
              <button
                onClick={confirmDeleteAction}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
              >
                {t.ok || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
