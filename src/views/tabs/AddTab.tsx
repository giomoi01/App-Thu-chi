import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useFinanceViewModel } from '../../viewmodels/useFinanceViewModel';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, X, AlertCircle, Mic, Camera, Loader2, ChevronDown, Calendar } from 'lucide-react';
import { translations } from '../../utils/translations';
import { getCategoryIcon, getAccountIcon } from '../../utils/icons';
import CustomSelect from '../../components/CustomSelect';
import { GoogleGenAI, Type } from "@google/genai";

export default function AddTab({ viewModel, onClose, onSaveSuccess }: { viewModel: ReturnType<typeof useFinanceViewModel>, onClose: () => void, onSaveSuccess?: () => void }) {
  const { addTransaction, categories, accounts, budgets, transactions, getSetting, formatCurrency, formatDate, translateName } = viewModel;
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [displayAmount, setDisplayAmount] = useState('');
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [accountId, setAccountId] = useState<number | ''>('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'processing' | 'listening'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const language = getSetting('language', 'vi') as keyof typeof translations;
  const currency = getSetting('currency', 'VND');
  const dateFormat = getSetting('date_format', 'dd/MM/yyyy');
  const t = translations[language] || translations['vi'];

  // Set default account to "Tiền mặt"
  useEffect(() => {
    if (accounts.length > 0 && accountId === '') {
      const cashAcc = accounts.find(a => a.name === 'Tiền mặt' || a.name === 'Cash' || a.name === 'cash');
      if (cashAcc) setAccountId(cashAcc.id);
      else setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  const formatAmountInput = (val: string) => {
    const cleanVal = val.replace(/\D/g, '');
    if (cleanVal === '') {
      setDisplayAmount('');
      setAmount(0);
      return;
    }
    const num = parseInt(cleanVal);
    setAmount(num);
    setDisplayAmount(num.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US'));
  };

  const filteredCategories = categories.filter(c => c.type === type);
  
  const sortCategories = (cats: any[]) => {
    return [...cats].sort((a, b) => {
      const isAOther = a.name.toLowerCase() === 'khác' || a.name.toLowerCase() === 'other';
      const isBOther = b.name.toLowerCase() === 'khác' || b.name.toLowerCase() === 'other';
      if (isAOther && !isBOther) return 1;
      if (!isAOther && isBOther) return -1;
      return a.id - b.id;
    });
  };

  const parentCategories = sortCategories(filteredCategories.filter(c => c.parent_id === null));

  const sortedAccounts = [...accounts].sort((a, b) => {
    if (a.name === 'Tiền mặt') return -1;
    if (b.name === 'Tiền mặt') return 1;
    return a.id - b.id;
  });

  const budgetWarning = useMemo(() => {
    if (type !== 'expense' || !category) return null;
    
    const currentMonth = format(new Date(), 'yyyy-MM');
    const budget = budgets.find(b => b.category === category && b.month === currentMonth);
    if (!budget) return null;

    const spent = transactions
      .filter(t => t.type === 'expense' && t.category === category && format(new Date(t.date), 'yyyy-MM') === currentMonth)
      .reduce((acc, t) => acc + t.amount, 0);
    
    const remaining = budget.limit_amount - spent;
    const absRemaining = Math.abs(remaining);
    const formattedAmount = formatCurrency(absRemaining);

    if (remaining >= 0) {
      return t.budgetRemaining.replace('{amount}', formattedAmount);
    } else {
      return t.budgetExceeded.replace('{amount}', formattedAmount);
    }
  }, [type, category, budgets, transactions, currency, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || amount <= 0 || !category || !date || !accountId) {
      alert(t.fillAll);
      return;
    }

    const success = await addTransaction({
      type,
      amount,
      category,
      date,
      note,
      account_id: Number(accountId)
    });

    if (success) {
      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        if (onSaveSuccess) {
          onSaveSuccess();
        } else {
          onClose();
        }
      }, 1000);
    } else {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // --- Voice Input Logic ---
  const handleVoiceInput = async () => {
    if (status === 'listening') {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      return;
    }

    try {
      // Check for browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (audioInputRef.current) {
          audioInputRef.current.click();
          return;
        }
        throw new Error("Trình duyệt của bạn không hỗ trợ ghi âm trực tiếp.");
      }

      // Explicitly request permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        if (audioChunksRef.current.length === 0) {
          setStatus('idle');
          return;
        }
        setStatus('processing');
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          await parseAudioWithGemini(base64Audio, audioBlob.type);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setStatus('listening');
    } catch (err: any) {
      console.warn("Voice input error:", err);
      
      // If permission denied or other error, try to use file input fallback
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.name === 'SecurityError') {
        if (audioInputRef.current) {
          audioInputRef.current.click();
        } else {
          alert("Bạn đã từ chối quyền truy cập Micro. Vui lòng cấp quyền trong cài đặt trình duyệt để sử dụng tính năng này.");
        }
        setStatus('idle');
      } else if (audioInputRef.current) {
        // Fallback to file picker if getUserMedia is not supported or fails for other reasons
        audioInputRef.current.click();
      } else {
        alert(`Lỗi Micro: ${err.message || "Không thể khởi động ghi âm"}`);
        setStatus('idle');
      }
    }
  };

  const handleAudioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('processing');
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        await parseAudioWithGemini(base64Data, file.type);
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error(error);
      setStatus('error');
      setErrorMsg(error.message || t.voiceError);
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  const parseAudioWithGemini = async (base64Data: string, mimeType: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const categoryNames = categories.map(c => c.name).join(', ');
      
      let cleanMimeType = mimeType || 'audio/webm';
      if (cleanMimeType.includes(';')) {
        cleanMimeType = cleanMimeType.split(';')[0];
      }
      if (!cleanMimeType.startsWith('audio/')) {
         cleanMimeType = 'audio/webm';
      }
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: cleanMimeType
              }
            },
            {
              text: `Nghe đoạn âm thanh này và trích xuất thông tin giao dịch tài chính.
              Trả về JSON với các trường: 
              - amount (số tiền, ví dụ 45000)
              - category (tên danh mục, chọn từ danh sách sau: [${categoryNames}]. Nếu không chắc chọn 'Khác')
              - note (ghi chú ngắn gọn)
              - type (loại giao dịch: 'expense' hoặc 'income'. Mặc định là 'expense' nếu không rõ)
              
              Ví dụ: "Cà phê 45k" -> {"amount": 45000, "category": "Ăn uống", "note": "Cà phê", "type": "expense"}`
            }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              amount: { type: Type.NUMBER },
              category: { type: Type.STRING },
              note: { type: Type.STRING },
              type: { type: Type.STRING }
            },
            required: ["amount", "category", "note", "type"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      if (data.amount) {
        setAmount(data.amount);
        setDisplayAmount(data.amount.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US'));
      }
      if (data.category) setCategory(data.category);
      if (data.note) setNote(data.note);
      if (data.type) setType(data.type as 'expense' | 'income');
      
      setStatus('idle');
    } catch (error: any) {
      console.error(error);
      setStatus('error');
      setErrorMsg(error.message || t.voiceError);
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  // --- OCR Logic ---
  const handleScanClick = async () => {
    // On mobile, direct file input with capture="environment" is much more reliable
    // than trying to use getUserMedia in an iframe.
    if (isMobile) {
      cameraInputRef.current?.click();
      return;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        stream.getTracks().forEach(track => track.stop());
      }
      cameraInputRef.current?.click();
    } catch (err: any) {
      console.warn("Camera permission error:", err);
      cameraInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('processing');
    
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        await parseImageWithGemini(base64Data, file.type);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      setStatus('error');
      setErrorMsg(t.ocrError);
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const parseImageWithGemini = async (base64Data: string, mimeType: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const categoryNames = categories.map(c => c.name).join(', ');

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            },
            {
              text: `Phân tích hóa đơn này và trích xuất thông tin:
              - amount (tổng tiền)
              - date (ngày giao dịch định dạng yyyy-mm-dd)
              - note (tên cửa hàng hoặc nội dung chính)
              - category (chọn từ: [${categoryNames}])
              - type (mặc định 'expense')
              
              Trả về JSON.`
            }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              amount: { type: Type.NUMBER },
              date: { type: Type.STRING },
              note: { type: Type.STRING },
              category: { type: Type.STRING },
              type: { type: Type.STRING }
            },
            required: ["amount", "date", "note", "category", "type"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      if (data.amount) {
        setAmount(data.amount);
        setDisplayAmount(data.amount.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US'));
      }
      if (data.date) setDate(data.date);
      if (data.category) setCategory(data.category);
      if (data.note) setNote(data.note);
      if (data.type) setType(data.type as 'expense' | 'income');

      setStatus('idle');
    } catch (error) {
      console.error(error);
      setStatus('error');
      setErrorMsg(t.ocrError);
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-6">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-3 border-b border-gray-100 flex justify-center items-center bg-gray-50 relative">
          <h3 className="font-bold text-gray-800">{type === 'expense' ? t.expense : t.income}</h3>
          <button onClick={onClose} className="absolute right-2 p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          {/* AI Tools - Temporarily hidden per user request */}
          {/* 
          <div className="flex gap-2 mb-4">
            <button 
              type="button"
              onClick={handleVoiceInput}
              disabled={status !== 'idle' && status !== 'listening'}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-semibold hover:bg-indigo-100 transition-colors disabled:opacity-50 ${status === 'listening' ? 'ring-2 ring-indigo-500 animate-pulse' : ''}`}
            >
              {status === 'listening' ? <Loader2 className="animate-spin" size={16} /> : <Mic size={16} />}
              {status === 'listening' ? t.listening : (status === 'processing' ? t.processing : t.voiceInput)}
            </button>

            <button 
              type="button"
              onClick={handleScanClick}
              disabled={status !== 'idle'}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-semibold hover:bg-emerald-100 transition-colors disabled:opacity-50"
            >
              {status === 'processing' ? <Loader2 className="animate-spin" size={16} /> : <Camera size={16} />}
              {status === 'processing' ? t.processing : t.scanReceipt}
            </button>

            <input 
              ref={audioInputRef}
              type="file" 
              className="hidden" 
              accept="audio/*" 
              onChange={handleAudioFileChange}
            />
            <input 
              ref={cameraInputRef}
              type="file" 
              className="hidden" 
              accept="image/*" 
              capture="environment"
              onChange={handleFileChange}
            />
          </div>
          */}

          {/* Type Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
            <button
              onClick={() => setType('expense')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${type === 'expense' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t.expense}
            </button>
            <button
              onClick={() => setType('income')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${type === 'income' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t.income}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount Input */}
            <div className="bg-gray-50 py-2 px-3 rounded-2xl border border-gray-100">
              <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">{t.amount} ({currency})</label>
              <input
                type="text"
                inputMode="numeric"
                value={displayAmount}
                onChange={(e) => formatAmountInput(e.target.value)}
                placeholder="0"
                className={`w-full text-2xl font-bold bg-transparent focus:outline-none ${type === 'expense' ? 'text-red-600' : 'text-green-600'}`}
                autoFocus
              />
            </div>

            {/* Category Input */}
            <div>
              <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">{t.category}</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <CustomSelect
                    value={category}
                    onChange={(val) => setCategory(val)}
                    placeholder={t.selectCategory}
                    options={parentCategories.flatMap(parent => {
                      const children = sortCategories(filteredCategories.filter(c => c.parent_id === parent.id));
                      if (children.length === 0) {
                        return [{
                          value: parent.name,
                          label: translateName(parent.name),
                          icon: <span className={type === 'expense' ? 'text-red-500' : 'text-green-500'}>{getCategoryIcon(parent.icon)}</span>
                        }];
                      }
                      return [
                        { value: `group-${parent.id}`, label: translateName(parent.name), isGroup: true, icon: <span className={type === 'expense' ? 'text-red-500' : 'text-green-500'}>{getCategoryIcon(parent.icon)}</span> },
                        ...children.map(child => ({
                          value: child.name,
                          label: translateName(child.name),
                          icon: <span className={type === 'expense' ? 'text-red-500' : 'text-green-500'}>{getCategoryIcon(child.icon)}</span>,
                          level: 1
                        }))
                      ];
                    })}
                  />
                </div>
              </div>
              {budgetWarning && (
                <p className={`mt-1.5 text-[11px] font-medium flex items-center gap-1 ${budgetWarning.includes(t.budgetExceeded.split('{')[0]) ? 'text-red-500' : 'text-orange-500'}`}>
                  <AlertCircle size={12} />
                  {budgetWarning}
                </p>
              )}
            </div>

            {/* Account & Date Input */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">{t.account}</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <CustomSelect
                      value={accountId}
                      onChange={(val) => setAccountId(Number(val))}
                      options={sortedAccounts.map(acc => ({
                        value: acc.id,
                        label: translateName(acc.name),
                        icon: <span className="text-blue-500">{getAccountIcon(acc.icon)}</span>
                      }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex-1">
                <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">{t.date}</label>
                <div className="relative">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`date-input-full-picker w-full bg-gray-50 border border-gray-200 rounded-xl pl-3 pr-10 py-2 text-sm h-[38px] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${!date ? 'text-transparent' : 'text-gray-800'}`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <Calendar size={16} />
                  </div>
                </div>
              </div>
            </div>

            {/* Note Input */}
            <div>
              <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">{t.note}</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={status !== 'idle'}
                className={`w-full py-3.5 rounded-2xl font-bold text-white shadow-lg transition-all flex justify-center items-center ${
                  status === 'success' ? 'bg-green-500' : 
                  status === 'error' ? 'bg-red-500' : 
                  type === 'expense' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {status === 'success' ? (
                  <><CheckCircle2 className="mr-2" /> {t.saveSuccess}</>
                ) : status === 'error' ? (
                  <><XCircle className="mr-2" /> {errorMsg || t.saveError}</>
                ) : (
                  t.save
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
