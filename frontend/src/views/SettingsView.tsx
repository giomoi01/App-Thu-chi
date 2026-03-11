import React, { useState, useEffect } from 'react';
import { useFinanceViewModel } from '../viewmodels/useFinanceViewModel';
import { ArrowLeft, Globe, DollarSign, Palette, Database, Download, Upload, Star, ChevronRight, Calendar, List, Wallet, User, FileText, ArrowRightLeft, Mic, Camera, AlertCircle } from 'lucide-react';
import CategoryManager from './CategoryManager';
import AccountManager from './AccountManager';
import ProfileView from './ProfileView';
import TransferView from './TransferView';
import { translations } from '../utils/translations';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';

const PermissionChecker = ({ language, t }: { language: string, t: any }) => {
  const [micStatus, setMicStatus] = useState<PermissionState | 'unknown'>('unknown');
  const [camStatus, setCamStatus] = useState<PermissionState | 'unknown'>('unknown');
  const [loading, setLoading] = useState(false);

  const checkStatus = async () => {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const mic = await navigator.permissions.query({ name: 'microphone' as any });
        setMicStatus(mic.state);
        mic.onchange = () => setMicStatus(mic.state);

        const cam = await navigator.permissions.query({ name: 'camera' as any });
        setCamStatus(cam.state);
        cam.onchange = () => setCamStatus(cam.state);
      }
    } catch (e) {
      console.warn("Permissions API not supported", e);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const requestPermission = async (type: 'audio' | 'video') => {
    setLoading(true);
    try {
      const constraints = type === 'audio' ? { audio: true } : { video: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      stream.getTracks().forEach(track => track.stop());
      await checkStatus();
      alert(type === 'audio' ? 'Microphone access granted!' : 'Camera access granted!');
    } catch (err: any) {
      console.error(err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.name === 'SecurityError') {
        alert(language === 'vi' 
          ? 'Quyền đã bị từ chối hoặc bị chặn bởi trình duyệt. Vui lòng bấm vào biểu tượng ổ khóa 🔒 trên thanh địa chỉ -> Quyền -> Bật Camera/Micro. Nếu vẫn không được, hãy thử mở app trong tab mới.' 
          : 'Permission denied or blocked by browser. Please click the lock icon 🔒 in the address bar -> Permissions -> Enable Camera/Microphone. If it still fails, try opening the app in a new tab.');
      } else {
        alert((language === 'vi' ? 'Lỗi: ' : 'Error: ') + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${micStatus === 'granted' ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
            <Mic size={16} />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-800">Microphone</div>
            <div className="text-xs text-gray-500 capitalize">{micStatus === 'granted' ? (language === 'vi' ? 'Đã cấp quyền' : 'Granted') : (language === 'vi' ? 'Chưa cấp quyền' : micStatus)}</div>
          </div>
        </div>
        {micStatus !== 'granted' && (
          <button 
            onClick={() => requestPermission('audio')}
            disabled={loading}
            className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {language === 'vi' ? 'Cấp quyền' : 'Allow'}
          </button>
        )}
      </div>

      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${camStatus === 'granted' ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
            <Camera size={16} />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-800">Camera</div>
            <div className="text-xs text-gray-500 capitalize">{camStatus === 'granted' ? (language === 'vi' ? 'Đã cấp quyền' : 'Granted') : (language === 'vi' ? 'Chưa cấp quyền' : camStatus)}</div>
          </div>
        </div>
        {camStatus !== 'granted' && (
          <button 
            onClick={() => requestPermission('video')}
            disabled={loading}
            className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {language === 'vi' ? 'Cấp quyền' : 'Allow'}
          </button>
        )}
      </div>

      {(micStatus === 'denied' || camStatus === 'denied') && (
        <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl text-xs text-orange-700 flex gap-2">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            {language === 'vi' 
              ? 'Một số quyền đã bị chặn. Vui lòng kiểm tra cài đặt trình duyệt (biểu tượng ổ khóa 🔒) để mở lại.' 
              : 'Some permissions are blocked. Please check your browser settings (lock icon 🔒) to enable them.'}
          </div>
        </div>
      )}
    </div>
  );
};

export default function SettingsView({ viewModel, onClose }: { viewModel: ReturnType<typeof useFinanceViewModel>, onClose: () => void }) {
  const { getSetting, updateSetting, user, transactions, budgets, goals, categories, accounts, formatCurrency, formatDate, translateName } = viewModel;
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const language = getSetting('language', 'vi');
  const currency = getSetting('currency', 'VND');
  const theme = getSetting('theme', 'light');
  const dateFormat = getSetting('date_format', 'dd/MM/yyyy');

  const t = translations[language] || translations['vi'];

  const handleBackup = async () => {
    console.log('Starting client-side backup (converting to SQLite on server)...');
    try {
      const data = {
        transactions,
        budgets,
        goals,
        settings: viewModel.settings,
        categories,
        accounts,
        user,
        export_date: new Date().toISOString(),
        version: 'v6'
      };

      const response = await fetch('/api/export/sqlite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to generate SQLite backup');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      a.href = url;
      a.download = `backup_${dateStr}.db`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert(language === 'vi' ? 'Lỗi khi sao lưu dữ liệu.' : 'Error backing up data.');
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Starting restore...');
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let data: any;

      if (file.name.endsWith('.db')) {
        console.log('Detected SQLite .db file, converting on server...');
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/convert/sqlite-to-json', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Failed to convert SQLite backup');
        data = await response.json();
      } else {
        console.log('Detected .json file, reading locally...');
        const content = await file.text();
        data = JSON.parse(content);
      }

      if (!data.transactions || !data.categories) {
        throw new Error('Invalid backup file');
      }

      // Restore to localStorage (matching the mock api structure)
      localStorage.setItem('mock_transactions', JSON.stringify(data.transactions));
      localStorage.setItem('mock_budgets', JSON.stringify(data.budgets || []));
      localStorage.setItem('mock_goals', JSON.stringify(data.goals || []));
      localStorage.setItem('mock_settings', JSON.stringify(data.settings || []));
      localStorage.setItem('mock_categories', JSON.stringify(data.categories || []));
      localStorage.setItem('mock_accounts', JSON.stringify(data.accounts || []));
      localStorage.setItem('mock_data_version', data.version || 'v6');
      localStorage.setItem('mock_currentUser_obj', JSON.stringify(data.user));

      alert(language === 'vi' ? 'Khôi phục dữ liệu thành công! Ứng dụng sẽ tải lại.' : 'Data restored successfully! App will reload.');
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert(language === 'vi' ? 'Lỗi khi khôi phục dữ liệu: File không hợp lệ.' : 'Error restoring data: Invalid file.');
    }
  };

  const handleExportExcel = async () => {
    console.log('Starting client-side Excel export...');
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Transactions');
      
      sheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Type', key: 'type', width: 15 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Note', key: 'note', width: 30 },
      ];
      
      transactions.forEach(t => {
        sheet.addRow({
          id: t.id,
          type: t.type === 'income' ? '+' : '-',
          amount: t.amount,
          category: translateName(t.category),
          date: formatDate(t.date),
          note: t.note || ''
        });
      });
      
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finance_export_${new Date().getTime()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert(language === 'vi' ? 'Lỗi khi xuất Excel.' : 'Error exporting Excel.');
    }
  };

  const handleExportCSV = () => {
    console.log('Starting client-side CSV export...');
    try {
      let csv = 'ID,Type,Amount,Category,Date,Note\n';
      transactions.forEach(t => {
        csv += `${t.id},${t.type === 'income' ? '+' : '-'},${t.amount},"${translateName(t.category)}",${formatDate(t.date)},"${t.note || ''}"\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finance_export_${new Date().getTime()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert(language === 'vi' ? 'Lỗi khi xuất CSV.' : 'Error exporting CSV.');
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text(t.report || 'Report', 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(100);
      
      // Add user info
      doc.text(`${t.user || 'User'}: ${user?.full_name || ''} (${user?.email || ''})`, 14, 30);
      doc.text(`${t.date || 'Date'}: ${new Date().toLocaleString()}`, 14, 36);
      
      // Prepare table data
      const tableData = transactions.map(tx => [
        formatDate(tx.date),
        tx.type === 'income' ? '+' : '-',
        translateName(tx.category),
        formatCurrency(tx.amount),
        tx.note || ''
      ]);
      
      autoTable(doc, {
        startY: 45,
        head: [[t.date, t.type, t.category, t.amount, t.note]],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [220, 38, 38] }, // red-600
      });
      
      doc.save(`finance_report_${new Date().getTime()}.pdf`);
    } catch (err) {
      console.error(err);
      alert(language === 'vi' ? 'Lỗi khi xuất PDF.' : 'Error exporting PDF.');
    }
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

  if (activeSection === 'transfer') {
    return <TransferView viewModel={viewModel} onClose={() => setActiveSection(null)} />;
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

        <div className="p-4 border-b border-gray-50 flex justify-between items-center">
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

        <div className="p-4 flex justify-between items-center">
          <div className="flex items-center text-gray-700">
            <Star size={20} className="mr-3 text-yellow-500" />
            <div className="flex flex-col">
              <span className="font-medium">{t.notificationsEnabled}</span>
              <span className="text-xs text-gray-400">{t.notificationsDesc}</span>
            </div>
          </div>
          <button 
            onClick={() => {
              const current = getSetting('notifications_enabled', 'false');
              updateSetting('notifications_enabled', current === 'true' ? 'false' : 'true');
            }}
            className={`w-12 h-6 rounded-full transition-colors relative ${getSetting('notifications_enabled', 'false') === 'true' ? 'bg-green-500' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${getSetting('notifications_enabled', 'false') === 'true' ? 'left-7' : 'left-1'}`} />
          </button>
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

        <button onClick={() => setActiveSection('accounts')} className="w-full p-4 border-b border-gray-50 flex items-center justify-between hover:bg-gray-50 transition-colors text-left">
          <div className="flex items-center text-gray-700">
            <Wallet size={20} className="mr-3 text-pink-500" />
            <span className="font-medium">{t.accountManagement}</span>
          </div>
          <ChevronRight size={20} className="text-gray-400" />
        </button>

        <button onClick={() => setActiveSection('transfer')} className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left">
          <div className="flex items-center text-gray-700">
            <ArrowRightLeft size={20} className="mr-3 text-orange-500" />
            <span className="font-medium">{t.transferBetweenAccounts}</span>
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
          <input type="file" accept=".json,.db" className="hidden" onChange={handleRestore} />
        </label>

        <button onClick={handleExportExcel} className="w-full p-4 border-b border-gray-50 flex items-center hover:bg-gray-50 transition-colors text-left">
          <Database size={20} className="mr-3 text-emerald-600" />
          <div className="flex-1">
            <div className="font-medium text-gray-800">{t.exportExcel}</div>
            <div className="text-xs text-gray-500">{t.exportExcelDesc}</div>
          </div>
        </button>

        <button onClick={handleExportCSV} className="w-full p-4 border-b border-gray-50 flex items-center hover:bg-gray-50 transition-colors text-left">
          <Database size={20} className="mr-3 text-teal-600" />
          <div className="flex-1">
            <div className="font-medium text-gray-800">{t.exportCSV}</div>
            <div className="text-xs text-gray-500">{t.exportCSVDesc}</div>
          </div>
        </button>

        <button onClick={handleExportPDF} className="w-full p-4 flex items-center hover:bg-gray-50 transition-colors text-left">
          <FileText size={20} className="mr-3 text-red-500" />
          <div className="flex-1">
            <div className="font-medium text-gray-800">{t.exportPDF}</div>
            <div className="text-xs text-gray-500">{t.exportPDFDesc}</div>
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
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">{t.account || 'Tài khoản'}</h2>
          {renderAccountSection()}
        </section>

        {/* Permissions Section - Temporarily hidden per user request */}
        {/* 
        <section>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">{t.permissions}</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <PermissionChecker language={language} t={t} />
          </div>
        </section>
        */}

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
          <p className="text-sm text-gray-400">{t.version} 1.0.1 (Client-side Export)</p>
        </div>
      </main>
    </div>
  );
}
