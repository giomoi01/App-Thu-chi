import React, { useState } from 'react';
import { useFinanceViewModel } from '../viewmodels/useFinanceViewModel';
import { ArrowLeft, Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { Account } from '../models/types';
import { api } from '../services/api';
import { translations } from '../utils/translations';
import { ACCOUNT_ICONS, getAccountIcon } from '../utils/icons';

export default function AccountManager({ viewModel, onClose }: { viewModel: ReturnType<typeof useFinanceViewModel>, onClose: () => void }) {
  const { accounts, refresh, getSetting, formatCurrency, translateName } = viewModel;
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editBalance, setEditBalance] = useState(0);
  const [displayEditBalance, setDisplayEditBalance] = useState('0');
  const [editIcon, setEditIcon] = useState('Wallet');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBalance, setNewBalance] = useState(0);
  const [displayNewBalance, setDisplayNewBalance] = useState('0');
  const [newIcon, setNewIcon] = useState('Wallet');
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean, message: string, onConfirm: () => void } | null>(null);
  const [alertDialog, setAlertDialog] = useState<{ isOpen: boolean, message: string } | null>(null);

  const language = getSetting('language', 'vi');
  const t = translations[language] || translations['vi'];

  const formatBalanceInput = (val: string, isEdit: boolean) => {
    const cleanVal = val.replace(/\D/g, '');
    if (cleanVal === '') {
      if (isEdit) {
        setEditBalance(0);
        setDisplayEditBalance('');
      } else {
        setNewBalance(0);
        setDisplayNewBalance('');
      }
      return;
    }
    const num = parseInt(cleanVal);
    const formatted = num.toLocaleString('vi-VN');
    if (isEdit) {
      setEditBalance(num);
      setDisplayEditBalance(formatted);
    } else {
      setNewBalance(num);
      setDisplayNewBalance(formatted);
    }
  };

  const handleEdit = (account: Account) => {
    setEditingId(account.id);
    setEditName(account.name);
    setEditBalance(account.balance);
    setDisplayEditBalance(account.balance.toLocaleString('vi-VN'));
    setEditIcon(account.icon || 'Wallet');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      await api.updateAccount(editingId, { name: editName, balance: editBalance, icon: editIcon });
      await refresh(true);
      setEditingId(null);
    } catch (err) {
      setAlertDialog({ isOpen: true, message: 'Lỗi khi cập nhật tài khoản / Error updating account' });
    }
  };

  const handleDelete = async (account: Account) => {
    setConfirmDialog({
      isOpen: true,
      message: `${t.confirmDeleteAcc} "${translateName(account.name)}"?`,
      onConfirm: async () => {
        try {
          await api.deleteAccount(account.id);
          await refresh(true);
          setConfirmDialog(null);
        } catch (err) {
          setConfirmDialog(null);
          setAlertDialog({ isOpen: true, message: 'Lỗi khi xóa tài khoản / Error deleting account' });
        }
      }
    });
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await api.addAccount({
        name: newName,
        balance: newBalance,
        icon: newIcon
      });
      await refresh(true);
      setShowAdd(false);
      setNewName('');
      setNewBalance(0);
      setDisplayNewBalance('0');
    } catch (err) {
      setAlertDialog({ isOpen: true, message: 'Lỗi khi thêm tài khoản / Error adding account' });
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col max-w-md mx-auto shadow-xl">
      <header className="bg-red-600 text-white p-4 flex items-center shadow-md">
        <button onClick={onClose} className="p-2 -ml-2 hover:bg-red-700 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold ml-2">{t.accountManagement}</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {accounts.map(account => (
          <div key={account.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-4 flex items-center justify-between">
            {editingId === account.id ? (
              <div className="flex-1 flex flex-col gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-gray-400 uppercase mb-1">{t.accountName}</label>
                  <input 
                    type="text" 
                    value={editName} 
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-400 uppercase mb-1">{t.initialBalance}</label>
                  <input 
                    type="text"
                    inputMode="numeric"
                    value={displayEditBalance} 
                    onChange={(e) => formatBalanceInput(e.target.value, true)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-400 uppercase mb-1">{t.icon}</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(ACCOUNT_ICONS).map(icon => (
                      <button
                        key={icon}
                        onClick={() => setEditIcon(icon)}
                        className={`p-2 rounded-lg border-2 transition-colors ${editIcon === icon ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                      >
                        {ACCOUNT_ICONS[icon]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 justify-end mt-2">
                  <button onClick={handleSaveEdit} className="flex-1 py-2 bg-red-600 text-white rounded-xl font-medium text-sm">{t.save}</button>
                  <button onClick={() => setEditingId(null)} className="py-2 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm">{t.cancel}</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mr-4 bg-blue-100 text-blue-600">
                    {getAccountIcon(account.icon)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{translateName(account.name)}</h3>
                    <p className="text-sm text-gray-500">{formatCurrency(account.balance)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(account)} className="text-blue-500 p-2 hover:bg-blue-50 rounded-full transition-colors"><Edit2 size={18} /></button>
                  {!account.is_default && (
                    <button onClick={() => handleDelete(account)} className="text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors"><Trash2 size={18} /></button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}

        <button 
          onClick={() => {
            setShowAdd(true);
            setNewName('');
            setNewBalance(0);
            setDisplayNewBalance('0');
            setNewIcon('Wallet');
          }}
          className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 font-medium hover:bg-gray-50 hover:border-red-300 hover:text-red-500 transition-colors flex items-center justify-center"
        >
          <Plus size={20} className="mr-2" />
          {t.addAccount}
        </button>
      </main>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{t.addAccountTitle}</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.accountName}</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.initialBalance}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={displayNewBalance}
                  onChange={(e) => formatBalanceInput(e.target.value, false)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.icon}</label>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(ACCOUNT_ICONS).map(icon => (
                    <button
                      key={icon}
                      onClick={() => setNewIcon(icon)}
                      className={`p-3 rounded-xl border-2 transition-colors ${newIcon === icon ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                    >
                      {ACCOUNT_ICONS[icon]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowAdd(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium"
              >
                {t.cancel}
              </button>
              <button 
                onClick={handleAdd}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium"
              >
                {t.add}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-2">{t.confirmDeleteAcc || 'Xác nhận xóa'}</h3>
            <p className="text-gray-600 mb-6">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium"
              >
                {t.cancel || 'Hủy'}
              </button>
              <button 
                onClick={confirmDialog.onConfirm}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium"
              >
                {t.delete || 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {alertDialog && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-2">{t.notification || 'Thông báo'}</h3>
            <p className="text-gray-600 mb-6">{alertDialog.message}</p>
            <button 
              onClick={() => setAlertDialog(null)}
              className="w-full py-3 bg-red-600 text-white rounded-xl font-medium"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
