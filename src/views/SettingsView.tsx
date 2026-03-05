import React, { useState } from 'react';
import { useFinanceViewModel } from '../viewmodels/useFinanceViewModel';
import { ArrowLeft, Globe, DollarSign, Palette, Database, Download, Upload, Star, ChevronRight, Calendar, List, Wallet, User, LogOut } from 'lucide-react';
import CategoryManager from './CategoryManager';
import AccountManager from './AccountManager';
import ProfileView from './ProfileView';
import { translations } from '../utils/translations';

export default function SettingsView({ viewModel, onClose }: { viewModel: ReturnType<typeof useFinanceViewModel>, onClose: () => void }) {
  const { getSetting, updateSetting, user, logout } = viewModel;
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const language = getSetting('language', 'vi');
  const currency = getSetting('currency', 'VND');
  const theme = getSetting('theme', 'light');
  const dateFormat = getSetting('date_format', 'dd/MM/yyyy');

  const t = translations[language] || translations['vi'];

  const handleBackup = () => {
    const token = localStorage.getItem('auth_token');
    window.location.href = `/api/backup?token=${token}`;
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/restore', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });
      if (res.ok) {
        alert('Khôi phục dữ liệu thành công! Ứng dụng sẽ tải lại.');
        window.location.reload();
      } else {
        alert('Lỗi khi khôi phục dữ liệu.');
      }
    } catch (err) {
      alert('Lỗi khi khôi phục dữ liệu.');
    }
  };

  const handleExportExcel = () => {
    const token = localStorage.getItem('auth_token');
    window.location.href = `/api/export/excel?token=${token}`;
  };

  const handleExportCSV = () => {
    const token = localStorage.getItem('auth_token');
    window.location.href = `/api/export/csv?token=${token}`;
  };

  if (activeSection === 'categories') {
    return <CategoryManager viewModel={viewModel} onClose={() => setActiveSection(null)} />;
  }

  if (activeSection === 'accounts') {
    return <AccountManager viewModel={viewModel} onClose={() => setActiveSection(null)} />;
  }

  if (activeSection === 'profile') {
    return <ProfileView viewModel={viewModel} onClose={() => setActiveSection(null)} />;
  }

  const renderAccountSection = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <button onClick={() => setActiveSection('profile')} className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mr-3 overflow-hidden">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={20} className="text-red-600" />
              )}
            </div>
            <div>
              <div className="font-bold text-gray-800">{user?.full_name || 'Người dùng'}</div>
              <div className="text-xs text-gray-500">{user?.email}</div>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-400" />
        </button>
      </div>
    </div>
  );

  const renderGeneralSettings = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-50 flex justify-between items-center">
          <div className="flex items-center text-gray-700">
            <Globe size={20} className="mr-3 text-blue-500" />
            <span className="font-medium">{t.language}</span>
          </div>
          <select 
            value={language} 
            onChange={(e) => updateSetting('language', e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="es">Español</option>
            <option value="zh">中文</option>
            <option value="ja">日本語</option>
            <option value="ko">한국어</option>
            <option value="it">Italiano</option>
            <option value="pt">Português</option>
            <option value="ru">Русский</option>
          </select>
        </div>

        <div className="p-4 border-b border-gray-50 flex justify-between items-center">
          <div className="flex items-center text-gray-700">
            <DollarSign size={20} className="mr-3 text-green-500" />
            <span className="font-medium">{t.currency}</span>
          </div>
          <div className="flex items-center space-x-2">
            <select 
              value={currency} 
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  const newCurrency = prompt('Nhập ký hiệu tiền tệ mới (VD: AUD, CAD):');
                  if (newCurrency && newCurrency.trim()) {
                    updateSetting('currency', newCurrency.trim().toUpperCase());
                  }
                } else {
                  updateSetting('currency', e.target.value);
                }
              }}
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="VND">VND (₫)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EURO (€)</option>
              <option value="JPY">Yên (¥)</option>
              <option value="CNY">Nhân dân tệ (¥)</option>
              <option value="RUB">Rúp (₽)</option>
              {!['VND', 'USD', 'EUR', 'JPY', 'CNY', 'RUB'].includes(currency) && (
                <option value={currency}>{currency}</option>
              )}
              <option value="custom">+ Thêm ngoại tệ khác</option>
            </select>
          </div>
        </div>

        <div className="p-4 border-b border-gray-50 flex justify-between items-center">
          <div className="flex items-center text-gray-700">
            <Calendar size={20} className="mr-3 text-purple-500" />
            <span className="font-medium">{t.dateFormat}</span>
          </div>
          <select 
            value={dateFormat} 
            onChange={(e) => updateSetting('date_format', e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="dd/MM/yyyy">dd/MM/yyyy</option>
            <option value="yyyy/MM/dd">yyyy/MM/dd</option>
            <option value="MM/dd/yyyy">MM/dd/yyyy</option>
          </select>
        </div>

        <div className="p-4 flex justify-between items-center">
          <div className="flex items-center text-gray-700">
            <Palette size={20} className="mr-3 text-orange-500" />
            <span className="font-medium">{t.theme}</span>
          </div>
          <select 
            value={theme} 
            onChange={(e) => updateSetting('theme', e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="light">{t.themeLight}</option>
            <option value="dark">{t.themeDark}</option>
            <option value="luxury">{t.themeLuxury}</option>
            <option value="premium">{t.themePremium}</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderManagementSettings = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <button onClick={() => setActiveSection('categories')} className="w-full p-4 border-b border-gray-50 flex items-center justify-between hover:bg-gray-50 transition-colors text-left">
          <div className="flex items-center text-gray-700">
            <List size={20} className="mr-3 text-indigo-500" />
            <span className="font-medium">{t.categoryManagement}</span>
          </div>
          <ChevronRight size={20} className="text-gray-400" />
        </button>

        <button onClick={() => setActiveSection('accounts')} className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left">
          <div className="flex items-center text-gray-700">
            <Wallet size={20} className="mr-3 text-pink-500" />
            <span className="font-medium">{t.accountManagement}</span>
          </div>
          <ChevronRight size={20} className="text-gray-400" />
        </button>
      </div>
    </div>
  );

  const renderDataSettings = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <button onClick={handleBackup} className="w-full p-4 border-b border-gray-50 flex items-center hover:bg-gray-50 transition-colors text-left">
          <Download size={20} className="mr-3 text-blue-500" />
          <div className="flex-1">
            <div className="font-medium text-gray-800">{t.backup}</div>
            <div className="text-xs text-gray-500">{t.backupDesc}</div>
          </div>
        </button>

        <label className="w-full p-4 border-b border-gray-50 flex items-center hover:bg-gray-50 transition-colors cursor-pointer">
          <Upload size={20} className="mr-3 text-green-500" />
          <div className="flex-1">
            <div className="font-medium text-gray-800">{t.restore}</div>
            <div className="text-xs text-gray-500">{t.restoreDesc}</div>
          </div>
          <input type="file" accept=".db" className="hidden" onChange={handleRestore} />
        </label>

        <button onClick={handleExportExcel} className="w-full p-4 border-b border-gray-50 flex items-center hover:bg-gray-50 transition-colors text-left">
          <Database size={20} className="mr-3 text-emerald-600" />
          <div className="flex-1">
            <div className="font-medium text-gray-800">{t.exportExcel}</div>
            <div className="text-xs text-gray-500">{t.exportExcelDesc}</div>
          </div>
        </button>

        <button onClick={handleExportCSV} className="w-full p-4 flex items-center hover:bg-gray-50 transition-colors text-left">
          <Database size={20} className="mr-3 text-teal-600" />
          <div className="flex-1">
            <div className="font-medium text-gray-800">{t.exportCSV}</div>
            <div className="text-xs text-gray-500">{t.exportCSVDesc}</div>
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col max-w-md mx-auto shadow-xl">
      <header className="bg-red-600 text-white p-4 flex items-center shadow-md">
        <button onClick={onClose} className="p-2 -ml-2 hover:bg-red-700 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold ml-2">{t.settings}</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        <section>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">Tài khoản</h2>
          {renderAccountSection()}
        </section>

        <section>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">{t.general}</h2>
          {renderGeneralSettings()}
        </section>

        <section>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">{t.management}</h2>
          {renderManagementSettings()}
        </section>

        <section>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">{t.data}</h2>
          {renderDataSettings()}
        </section>

        <section>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button className="w-full p-4 flex items-center hover:bg-gray-50 transition-colors text-left">
              <Star size={20} className="mr-3 text-yellow-500 fill-yellow-500" />
              <div className="flex-1">
                <div className="font-medium text-gray-800">{t.rate}</div>
                <div className="text-xs text-gray-500">{t.rateDesc}</div>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </button>
          </div>
        </section>
        
        <div className="text-center pb-6">
          <p className="text-sm text-gray-400">{t.version} 1.0.0</p>
        </div>
      </main>
    </div>
  );
}
