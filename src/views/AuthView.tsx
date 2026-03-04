import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, User, LogIn, UserPlus, Github, Chrome, Facebook, Coins, Eye, EyeOff } from 'lucide-react';
import { useFinanceViewModel } from '../viewmodels/useFinanceViewModel';
import { translations } from '../utils/translations';

export default function AuthView({ viewModel }: { viewModel: ReturnType<typeof useFinanceViewModel> }) {
  const { login, register, socialLogin, getSetting, updateSetting } = viewModel;
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const language = getSetting('language', 'vi') as 'vi' | 'en';
  const t = translations[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      setError(language === 'vi' ? 'Vui lòng nhập đầy đủ email và mật khẩu' : 'Please enter email and password');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError(language === 'vi' ? 'Định dạng email không hợp lệ' : 'Invalid email format');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let success = false;
      if (isLogin) {
        success = await login({ email, password });
      } else {
        success = await register({ email, password, full_name: fullName });
      }

      if (!success) {
        setError(isLogin ? (language === 'vi' ? 'Email hoặc mật khẩu không đúng' : 'Incorrect email or password') : (language === 'vi' ? 'Đăng ký thất bại' : 'Registration failed'));
      }
    } catch (err: any) {
      setError(err.message || (isLogin ? (language === 'vi' ? 'Email hoặc mật khẩu không đúng' : 'Incorrect email or password') : (language === 'vi' ? 'Đăng ký thất bại' : 'Registration failed')));
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: string) => {
    setLoading(true);
    const success = await socialLogin({
      provider,
      email: `${provider}_user@example.com`,
      full_name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${provider}`,
      social_id: `mock_${provider}_id`
    });
    if (!success) setError(language === 'vi' ? `${provider} đăng nhập thất bại` : `${provider} login failed`);
    setLoading(false);
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
        </select>
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-yellow-400 rounded-2xl flex items-center justify-center shadow-lg mb-4">
              <Coins size={48} className="text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Thần Tài</h1>
            <p className="text-gray-500 text-sm">{isLogin ? (language === 'vi' ? 'Chào mừng bạn trở lại!' : 'Welcome back!') : (language === 'vi' ? 'Bắt đầu quản lý tài chính ngay hôm nay' : 'Start managing your finances today')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder={language === 'vi' ? "Họ và tên" : "Full Name"}
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
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder={language === 'vi' ? "Mật khẩu" : "Password"}
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

            {error && <p className="text-red-500 text-xs text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                isLogin ? <><LogIn size={20} /> {language === 'vi' ? 'Đăng nhập' : 'Login'}</> : <><UserPlus size={20} /> {language === 'vi' ? 'Đăng ký' : 'Register'}</>
              )}
            </button>
          </form>

          <div className="mt-8">
            <div className="relative flex items-center justify-center mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <span className="relative px-4 bg-white text-gray-400 text-xs uppercase tracking-widest">{language === 'vi' ? 'Hoặc đăng nhập với' : 'Or login with'}</span>
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

          <div className="mt-8 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-gray-500 hover:text-red-600 transition-all"
            >
              {isLogin ? (language === 'vi' ? 'Chưa có tài khoản? Đăng ký ngay' : "Don't have an account? Register now") : (language === 'vi' ? 'Đã có tài khoản? Đăng nhập' : 'Already have an account? Login')}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
