import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, User, LogIn, UserPlus, Github, Chrome, Facebook, Coins, Eye, EyeOff } from 'lucide-react';
import { useFinanceViewModel } from '../viewmodels/useFinanceViewModel';
import { translations } from '../utils/translations';
import { api } from '../services/api';

export default function AuthView({ viewModel }: { viewModel: ReturnType<typeof useFinanceViewModel> }) {
  const { login, register, forgotPassword, setAuth, getSetting, updateSetting } = viewModel;
  const [view, setView] = useState<'login' | 'register' | 'forgotPassword'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const language = getSetting('language', 'vi');
  const t = translations[language] || translations['vi'];

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_SUCCESS') {
        const { token, user } = event.data;
        setAuth(token, user);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setAuth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    
    if (view === 'forgotPassword') {
      if (!email.trim()) {
        setError(t.fillEmailPassword); // Or a more specific one if available
        return;
      }
      setLoading(true);
      const success = await forgotPassword(email);
      setLoading(false);
      if (success) {
        setMessage(t.resetLinkSent);
      }
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError(t.fillEmailPassword);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError(t.invalidEmail);
      return;
    }

    setLoading(true);

    try {
      let success = false;
      if (view === 'login') {
        success = await login({ email, password });
      } else {
        success = await register({ email, password, full_name: fullName });
      }

      if (!success) {
        setError(view === 'login' ? t.loginFailed : t.registerFailed);
      }
    } catch (err: any) {
      setError(err.message || (view === 'login' ? t.loginFailed : t.registerFailed));
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: string) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    
    // Mở cửa sổ mới ngay lập tức để tránh bị trình duyệt mobile chặn (do mất user gesture sau await)
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    // Mở một cửa sổ trắng trước để giữ user gesture
    const authWindow = window.open('', 'oauth_popup', `width=${width},height=${height},left=${left},top=${top}`);
    
    if (!authWindow) {
      setError(t.popupBlocked);
      setLoading(false);
      return;
    }

    try {
      let urlData;
      
      if (provider === 'google') {
        urlData = await api.getGoogleAuthUrl();
      } else if (provider === 'facebook') {
        urlData = await api.getFacebookAuthUrl();
      }

      if (urlData?.url) {
        authWindow.location.href = urlData.url;
      } else {
        authWindow.close();
        throw new Error(t.failedGetAuthUrl);
      }
    } catch (err: any) {
      if (authWindow) authWindow.close();
      console.error(`${provider} auth error:`, err);
      const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
      setError(`${providerName} error: ${err.message || 'Connection error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-red-600 flex flex-col items-center justify-center p-6 relative">
      {/* Language Selector */}
      <div className="absolute top-6 right-6 z-10">
        <select
          value={language}
          onChange={(e) => updateSetting('language', e.target.value)}
          className="bg-white text-gray-800 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium shadow-md focus:outline-none focus:ring-2 focus:ring-red-500"
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

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4 overflow-hidden border-2 border-yellow-400">
              <img src="/favicon.svg" alt="e-Money" className="w-full h-full object-contain p-2" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">e-Money</h1>
            <p className="text-gray-500 text-sm">
              {view === 'login' ? t.welcomeBack : view === 'register' ? t.startManagingToday : t.resetPassword}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {view === 'register' && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder={t.fullName}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                  required
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="email"
                placeholder={t.email}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                required
              />
            </div>

            {view !== 'forgotPassword' && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={t.password}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            )}

            {view === 'login' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setView('forgotPassword')}
                  className="text-xs text-red-600 hover:underline"
                >
                  {t.forgotPassword}
                </button>
              </div>
            )}

            {error && <p className="text-red-500 text-xs text-center">{error}</p>}
            {message && <p className="text-green-500 text-xs text-center">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                view === 'login' ? <><LogIn size={20} /> {t.login}</> : 
                view === 'register' ? <><UserPlus size={20} /> {t.register}</> :
                <>{t.sendResetLink}</>
              )}
            </button>
          </form>

          {view !== 'forgotPassword' && (
            <div className="mt-8">
              <div className="relative flex items-center justify-center mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100"></div>
                </div>
                <span className="relative px-4 bg-white text-gray-400 text-xs uppercase tracking-widest">{t.orLoginWith}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleSocialLogin('google')}
                  className="flex items-center justify-center gap-2 py-2.5 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all"
                >
                  <Chrome size={18} className="text-red-500" />
                  <span className="text-sm font-medium text-gray-600">Google</span>
                </button>
                <button
                  onClick={() => handleSocialLogin('facebook')}
                  className="flex items-center justify-center gap-2 py-2.5 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all"
                >
                  <Facebook size={18} className="text-blue-600" />
                  <span className="text-sm font-medium text-gray-600">Facebook</span>
                </button>
              </div>
            </div>
          )}

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setError(null);
                setMessage(null);
                if (view === 'forgotPassword') setView('login');
                else setView(view === 'login' ? 'register' : 'login');
              }}
              className="text-sm text-gray-500 hover:text-red-600 transition-all"
            >
              {view === 'login' ? t.noAccountYet : view === 'register' ? t.alreadyHaveAccount : t.backToLogin}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
