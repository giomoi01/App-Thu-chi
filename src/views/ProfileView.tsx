import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, User, Mail, Camera, Save, Lock, LogOut, Eye, EyeOff } from 'lucide-react';
import { useFinanceViewModel } from '../viewmodels/useFinanceViewModel';
import { translations } from '../utils/translations';

export default function ProfileView({ viewModel, onClose }: { viewModel: ReturnType<typeof useFinanceViewModel>, onClose: () => void }) {
  const { user, updateProfile, changePassword, logout, getSetting } = viewModel;
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const language = getSetting('language', 'vi');
  const t = translations[language] || translations['vi'];

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const success = await updateProfile({ full_name: fullName, avatar_url: avatarUrl });
    if (success) {
      setMessage({ text: 'Cập nhật thông tin thành công', type: 'success' });
    } else {
      setMessage({ text: 'Cập nhật thất bại', type: 'error' });
    }
    setLoading(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ text: 'Mật khẩu xác nhận không khớp', type: 'error' });
      return;
    }
    setPasswordLoading(true);
    const success = await changePassword({ current_password: currentPassword, new_password: newPassword });
    if (success) {
      setMessage({ text: 'Đổi mật khẩu thành công', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setMessage({ text: 'Mật khẩu hiện tại không đúng', type: 'error' });
    }
    setPasswordLoading(false);
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="fixed inset-0 bg-white z-[150] flex flex-col">
      <div className="p-4 border-b border-gray-100 flex items-center gap-4">
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-all">
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <h2 className="text-xl font-bold text-gray-800">Thông tin cá nhân</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Avatar Section */}
        <div className="flex flex-col items-center">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-red-50 bg-gray-100 flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User size={48} className="text-gray-300" />
              )}
            </div>
            <button className="absolute bottom-0 right-0 p-2 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-all">
              <Camera size={16} />
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-500">{user?.email}</p>
        </div>

        {message && (
          <div className={`p-4 rounded-xl text-sm font-medium text-center ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            {message.text}
          </div>
        )}

        {/* Profile Form */}
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Thông tin cơ bản</h3>
          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Họ và tên"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-gray-100 rounded-xl text-gray-500"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save size={18} /> Lưu thay đổi</>}
          </button>
        </form>

        {/* Password Form */}
        <form onSubmit={handleChangePassword} className="space-y-4 pt-4 border-t border-gray-100">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Đổi mật khẩu</h3>
          <div className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type={showCurrentPassword ? "text" : "password"}
                placeholder="Mật khẩu hiện tại"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type={showNewPassword ? "text" : "password"}
                placeholder="Mật khẩu mới"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Xác nhận mật khẩu mới"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={passwordLoading}
            className="w-full py-3 bg-gray-800 text-white font-bold rounded-xl shadow-lg hover:bg-gray-900 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {passwordLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Lock size={18} /> Cập nhật mật khẩu</>}
          </button>
        </form>

        <button
          onClick={() => {
            logout();
            onClose();
          }}
          className="w-full py-3 bg-gray-50 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-all flex items-center justify-center gap-2"
        >
          <LogOut size={18} /> Đăng xuất
        </button>
      </div>
    </div>
  );
}
