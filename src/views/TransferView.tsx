import React, { useState } from 'react';
import { useFinanceViewModel } from '../viewmodels/useFinanceViewModel';
import { ArrowLeft, ArrowRightLeft, Check, X, AlertCircle } from 'lucide-react';
import { translations } from '../utils/translations';

export default function TransferView({ viewModel, onClose }: { viewModel: ReturnType<typeof useFinanceViewModel>, onClose: () => void }) {
  const { accounts, transferBetweenAccounts, getSetting, formatCurrency, translateName } = viewModel;
  
  const [fromAccountId, setFromAccountId] = useState<number>(accounts[0]?.id || 0);
  const [toAccountId, setToAccountId] = useState<number>(accounts[1]?.id || accounts[0]?.id || 0);
  const [amount, setAmount] = useState<number>(0);
  const [displayAmount, setDisplayAmount] = useState<string>('0');
  const [note, setNote] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const language = getSetting('language', 'vi');
  const t = translations[language] || translations['vi'];

  const handleAmountChange = (val: string) => {
    const cleanVal = val.replace(/\D/g, '');
    if (cleanVal === '') {
      setAmount(0);
      setDisplayAmount('');
      return;
    }
    const num = parseInt(cleanVal);
    setAmount(num);
    setDisplayAmount(num.toLocaleString('vi-VN'));
  };

  const handleTransfer = async () => {
    if (fromAccountId === toAccountId) {
      setError(t.sameAccountError);
      return;
    }
    if (amount <= 0) {
      setError(t.enterValidAmount);
      return;
    }

    const fromAccount = accounts.find(a => a.id === fromAccountId);
    if (fromAccount && fromAccount.balance < amount) {
      setError(t.insufficientBalance);
      return;
    }

    setLoading(true);
    setError(null);
    
    const success = await transferBetweenAccounts(fromAccountId, toAccountId, amount, note);
    
    if (success) {
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setError(t.transferError);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col max-w-md mx-auto shadow-xl">
      <header className="bg-red-600 text-white p-4 flex items-center shadow-md">
        <button onClick={onClose} className="p-2 -ml-2 hover:bg-red-700 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold ml-2">{t.transfer}</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {success ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
              <Check size={40} />
            </div>
            <p className="text-lg font-bold text-gray-800">{t.transferSuccess}</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.fromAccount}</label>
                <select
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {translateName(acc.name)} ({formatCurrency(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-center">
                <div className="bg-gray-100 p-2 rounded-full text-gray-400">
                  <ArrowRightLeft size={20} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.toAccount}</label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {translateName(acc.name)} ({formatCurrency(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.amount}</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={displayAmount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500 text-xl font-bold text-gray-800"
                    placeholder="0"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                    {viewModel.getSetting('currency', 'VND')}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.note}</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={3}
                  placeholder={t.transferNote}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-600">
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleTransfer}
              disabled={loading}
              className="w-full py-4 bg-red-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>{t.performTransfer}</>
              )}
            </button>
          </>
        )}
      </main>
    </div>
  );
}
