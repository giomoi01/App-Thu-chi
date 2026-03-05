import { useState } from 'react';
import { Home, List, PlusCircle, Target, PieChart, Settings } from 'lucide-react';
import { useFinanceViewModel } from '../viewmodels/useFinanceViewModel';
import OverviewTab from './tabs/OverviewTab';
import HistoryTab from './tabs/HistoryTab';
import AddTab from './tabs/AddTab';
import BudgetTab from './tabs/BudgetTab';
import ReportTab from './tabs/ReportTab';
import SettingsView from './SettingsView';
import { translations } from '../utils/translations';

export default function MainLayout({ viewModel }: { viewModel: ReturnType<typeof useFinanceViewModel> }) {
  const [activeTab, setActiveTab] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [budgetSubTab, setBudgetSubTab] = useState<'budgets' | 'goals'>('budgets');

  const language = viewModel.getSetting('language', 'vi');
  const t = translations[language] || translations['vi'];

  const handleNavigateToBudget = (subTab: 'budgets' | 'goals') => {
    setBudgetSubTab(subTab);
    setActiveTab(3);
  };

  const tabs = [
    { id: 0, label: t.tabOverview, icon: Home, component: OverviewTab },
    { id: 1, label: t.tabHistory, icon: List, component: HistoryTab },
    { id: 2, label: t.tabAdd, icon: PlusCircle, component: null, highlight: true },
    { id: 3, label: t.tabBudget, icon: Target, component: BudgetTab },
    { id: 4, label: t.tabReport, icon: PieChart, component: ReportTab },
  ];

  const ActiveComponent = tabs[activeTab].component || OverviewTab;
  const theme = viewModel.getSetting('theme', 'light');
  
  const getThemeClass = () => {
    switch(theme) {
      case 'dark': return 'theme-dark';
      case 'luxury': return 'theme-luxury';
      case 'premium': return 'theme-premium';
      default: return '';
    }
  };

  const handleTabClick = (id: number) => {
    if (id === 2) {
      setShowAddModal(true);
    } else {
      setActiveTab(id);
    }
  };

  return (
    <div className={`flex flex-col h-screen bg-gray-50 max-w-md mx-auto shadow-xl overflow-hidden relative ${getThemeClass()}`}>
      {/* App Bar */}
      <header className="bg-red-600 text-white p-4 flex justify-between items-center shadow-md z-10">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold leading-tight">{tabs[activeTab].label}</h1>
          {viewModel.user && (
            <p className="text-[10px] opacity-90 font-medium">
              {t.greeting.replace('{name}', viewModel.user.full_name)}
            </p>
          )}
        </div>
        <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-red-700 rounded-full transition-colors">
          <Settings size={24} />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-20">
        <ActiveComponent 
          viewModel={viewModel} 
          onTabChange={setActiveTab} 
          onNavigateToBudget={handleNavigateToBudget}
          initialTab={budgetSubTab}
        />
      </main>

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-end pb-safe pt-2 px-2 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-20">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`flex flex-col items-center p-2 min-w-[64px] transition-all ${
              activeTab === tab.id ? 'text-red-600' : 'text-gray-500 hover:text-red-400'
            }`}
          >
            {tab.highlight ? (
              <div className="absolute -top-6 bg-red-600 text-white p-3 rounded-full shadow-lg border-4 border-white transform hover:scale-105 transition-transform">
                <tab.icon size={28} />
              </div>
            ) : (
              <tab.icon size={24} className={activeTab === tab.id ? 'transform scale-110 transition-transform' : ''} />
            )}
            <span className={`text-[10px] mt-1 font-medium ${tab.highlight ? 'mt-8' : ''}`}>
              {tab.label}
            </span>
          </button>
        ))}
      </nav>

      {showSettings && <SettingsView viewModel={viewModel} onClose={() => setShowSettings(false)} />}
      {showAddModal && (
        <AddTab 
          viewModel={viewModel} 
          onClose={() => setShowAddModal(false)} 
          onSaveSuccess={() => {
            setShowAddModal(false);
            setActiveTab(1); // Switch to History tab
          }}
        />
      )}
    </div>
  );
}
