import { Transaction, Budget, Goal, Setting, Category, Account, User, AuthResponse } from '../models/types';
import { initStorage, getItem, setItem } from './storage';

// Helper to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// LocalStorage helpers
const getLocalArray = async (key: string) => {
  const val = await getItem(key);
  return Array.isArray(val) ? val : [];
};

let currentUser: User | null = null;

// Initialize default data if empty
const initializeDefaults = async () => {
  const version = await getItem('data_version');
  if (version !== 'v8') {
    if (version !== 'v7' && version !== 'v6' && version !== 'v5' && version !== 'v4' && version !== 'v3' && version !== 'v2') {
      await setItem('categories', []);
      await setItem('accounts', []);
    }
    
    // Migration from v2 to v3: Rename "Tài khoản ngân hàng" to "Ngân hàng"
    if (version === 'v2') {
      const existingAccs = await getLocalArray('accounts');
      let updatedAccs = false;
      const migratedAccs = existingAccs.map((acc: any) => {
        if (acc.name === 'Tài khoản ngân hàng') {
          updatedAccs = true;
          return { ...acc, name: 'Ngân hàng' };
        }
        return acc;
      });
      if (updatedAccs) {
        await setItem('accounts', migratedAccs);
      }
    }

    // Migration to v4: Update expense categories
    if (version === 'v2' || version === 'v3' || version === 'v4' || !version) {
      const existingCats = await getLocalArray('categories');
      const incomeCats = existingCats.filter((c: any) => c.type === 'income');
      const customExpenseCats = existingCats.filter((c: any) => c.type === 'expense' && !c.is_default);
      
      const newExpenseDefaults = [
        { id: 100, name: 'Ăn uống', type: 'expense', icon: 'Utensils', parent_id: null, is_default: true },
        { id: 101, name: 'Đi chợ, siêu thị', type: 'expense', icon: 'ShoppingCart', parent_id: 100, is_default: true },
        { id: 102, name: 'Ăn tiệm', type: 'expense', icon: 'UtensilsCrossed', parent_id: 100, is_default: true },
        { id: 104, name: 'Đồ uống', type: 'expense', icon: 'Coffee', parent_id: 100, is_default: true },
        { id: 105, name: 'Ăn sáng', type: 'expense', icon: 'Croissant', parent_id: 100, is_default: true },
        { id: 106, name: 'Ăn trưa', type: 'expense', icon: 'Soup', parent_id: 100, is_default: true },
        { id: 107, name: 'Ăn tối', type: 'expense', icon: 'Pizza', parent_id: 100, is_default: true },

        { id: 110, name: 'Hóa đơn', type: 'expense', icon: 'Receipt', parent_id: null, is_default: true },
        { id: 111, name: 'Điện', type: 'expense', icon: 'Zap', parent_id: 110, is_default: true },
        { id: 112, name: 'Nước', type: 'expense', icon: 'Droplets', parent_id: 110, is_default: true },
        { id: 113, name: 'Internet', type: 'expense', icon: 'Wifi', parent_id: 110, is_default: true },
        { id: 114, name: 'Gas', type: 'expense', icon: 'Flame', parent_id: 110, is_default: true },
        { id: 115, name: 'Truyền hình', type: 'expense', icon: 'Tv', parent_id: 110, is_default: true },
        { id: 116, name: 'Điện thoại di động', type: 'expense', icon: 'Smartphone', parent_id: 110, is_default: true },

        { id: 120, name: 'Con cái', type: 'expense', icon: 'Baby', parent_id: null, is_default: true },
        { id: 121, name: 'Học phí', type: 'expense', icon: 'GraduationCap', parent_id: 120, is_default: true },
        { id: 122, name: 'Quần áo', type: 'expense', icon: 'Shirt', parent_id: 120, is_default: true },
        { id: 123, name: 'Sách vở', type: 'expense', icon: 'BookOpen', parent_id: 120, is_default: true },
        { id: 124, name: 'Đồ chơi', type: 'expense', icon: 'Gamepad2', parent_id: 120, is_default: true },
        { id: 125, name: 'Tiền tiêu vặt', type: 'expense', icon: 'Coins', parent_id: 120, is_default: true },
        { id: 126, name: 'Giầy dép', type: 'expense', icon: 'Footprints', parent_id: 120, is_default: true },
        { id: 127, name: 'Phụ kiện khác', type: 'expense', icon: 'MoreHorizontal', parent_id: 120, is_default: true },

        { id: 130, name: 'Nhà cửa', type: 'expense', icon: 'Home', parent_id: null, is_default: true },
        { id: 131, name: 'Tiền thuê nhà', type: 'expense', icon: 'Key', parent_id: 130, is_default: true },
        { id: 132, name: 'Mua sắm đồ', type: 'expense', icon: 'Armchair', parent_id: 130, is_default: true },
        { id: 133, name: 'Sửa chữa', type: 'expense', icon: 'Wrench', parent_id: 130, is_default: true },
        { id: 134, name: 'Phí dịch vụ', type: 'expense', icon: 'ClipboardList', parent_id: 130, is_default: true },

        { id: 140, name: 'Di chuyển', type: 'expense', icon: 'Car', parent_id: null, is_default: true },
        { id: 141, name: 'Xăng xe', type: 'expense', icon: 'Fuel', parent_id: 140, is_default: true },
        { id: 142, name: 'Sửa chữa, bảo dưỡng', type: 'expense', icon: 'Settings', parent_id: 140, is_default: true },
        { id: 143, name: 'Taxi/thuê xe', type: 'expense', icon: 'Car', parent_id: 140, is_default: true },
        { id: 144, name: 'Vé tàu xe', type: 'expense', icon: 'Ticket', parent_id: 140, is_default: true },
        { id: 145, name: 'Gửi xe, rửa xe', type: 'expense', icon: 'ParkingCircle', parent_id: 140, is_default: true },

        { id: 150, name: 'Sức khỏe', type: 'expense', icon: 'HeartPulse', parent_id: null, is_default: true },
        { id: 151, name: 'Khám chữa bệnh', type: 'expense', icon: 'Stethoscope', parent_id: 150, is_default: true },
        { id: 152, name: 'Thuốc men', type: 'expense', icon: 'Pill', parent_id: 150, is_default: true },
        { id: 153, name: 'Thể thao', type: 'expense', icon: 'Dumbbell', parent_id: 150, is_default: true },

        { id: 160, name: 'Thời trang', type: 'expense', icon: 'Shirt', parent_id: null, is_default: true },
        { id: 161, name: 'Quần áo', type: 'expense', icon: 'Shirt', parent_id: 160, is_default: true },
        { id: 162, name: 'Giày dép', type: 'expense', icon: 'Footprints', parent_id: 160, is_default: true },
        { id: 163, name: 'Phụ kiện khác', type: 'expense', icon: 'MoreHorizontal', parent_id: 160, is_default: true },

        { id: 170, name: 'Phát triển bản thân', type: 'expense', icon: 'TrendingUp', parent_id: null, is_default: true },
        { id: 171, name: 'Học hành', type: 'expense', icon: 'GraduationCap', parent_id: 170, is_default: true },
        { id: 172, name: 'Giao lưu bạn bè', type: 'expense', icon: 'Users', parent_id: 170, is_default: true },

        { id: 180, name: 'Hưởng thụ', type: 'expense', icon: 'Sparkles', parent_id: null, is_default: true },
        { id: 181, name: 'Vui chơi giải trí', type: 'expense', icon: 'Gamepad2', parent_id: 180, is_default: true },
        { id: 182, name: 'Du lịch', type: 'expense', icon: 'Plane', parent_id: 180, is_default: true },
        { id: 183, name: 'Làm đẹp', type: 'expense', icon: 'Sparkles', parent_id: 180, is_default: true },
        { id: 184, name: 'Mỹ phẩm', type: 'expense', icon: 'Flower2', parent_id: 180, is_default: true },

        { id: 190, name: 'Quà tặng', type: 'expense', icon: 'Gift', parent_id: null, is_default: true },
        { id: 191, name: 'Cưới xin', type: 'expense', icon: 'Heart', parent_id: 190, is_default: true },
        { id: 192, name: 'Đám hiếu', type: 'expense', icon: 'HeartHandshake', parent_id: 190, is_default: true },
        { id: 193, name: 'Thăm hỏi', type: 'expense', icon: 'UserPlus', parent_id: 190, is_default: true },

        { id: 200, name: 'Đầu tư & Kinh doanh', type: 'expense', icon: 'TrendingUp', parent_id: null, is_default: true },
        { id: 210, name: 'Chi phí khác', type: 'expense', icon: 'MoreHorizontal', parent_id: null, is_default: true },
      ];

      await setItem('categories', [...incomeCats, ...newExpenseDefaults, ...customExpenseCats]);
    }

    // Migration to v5/v6: Add/Update income categories as top-level, remove "Thu nhập"
    if (version !== 'v6') {
      const existingCats = await getLocalArray('categories');
      const otherCats = existingCats.filter((c: any) => c.type !== 'income');
      const customIncomeCats = existingCats.filter((c: any) => c.type === 'income' && !c.is_default);
      
      const newIncomeDefaults = [
        { id: 2, name: 'Lương', type: 'income', icon: 'Banknote', parent_id: null, is_default: true },
        { id: 3, name: 'Thưởng', type: 'income', icon: 'Award', parent_id: null, is_default: true },
        { id: 4, name: 'Bán hàng', type: 'income', icon: 'Store', parent_id: null, is_default: true },
        { id: 5, name: 'Đầu tư', type: 'income', icon: 'TrendingUp', parent_id: null, is_default: true },
        { id: 6, name: 'Cho tặng', type: 'income', icon: 'Gift', parent_id: null, is_default: true },
      ];

      await setItem('categories', [...otherCats, ...newIncomeDefaults, ...customIncomeCats]);
    }

    // Migration to v7: Remove "Cafe" category
    if (version !== 'v7') {
      const catsAfterV6 = await getLocalArray('categories');
      const filteredCats = catsAfterV6.filter((c: any) => c.name !== 'Cafe');
      if (filteredCats.length !== catsAfterV6.length) {
        await setItem('categories', filteredCats);
      }
    }

    // Migration to v8: Update "Đồ uống" icon to "Coffee"
    const catsAfterV7 = await getLocalArray('categories');
    const updatedCats = catsAfterV7.map((c: any) => {
      if (c.name === 'Đồ uống' && c.type === 'expense') {
        return { ...c, icon: 'Coffee' };
      }
      return c;
    });
    await setItem('categories', updatedCats);
    await setItem('data_version', 'v8');
  }

  const cats = await getLocalArray('categories');
  if (cats.length === 0) {
    await setItem('categories', [
      // Income main
      { id: 2, name: 'Lương', type: 'income', icon: 'Banknote', parent_id: null, is_default: true },
      { id: 3, name: 'Thưởng', type: 'income', icon: 'Award', parent_id: null, is_default: true },
      { id: 4, name: 'Bán hàng', type: 'income', icon: 'Store', parent_id: null, is_default: true },
      { id: 5, name: 'Đầu tư', type: 'income', icon: 'TrendingUp', parent_id: null, is_default: true },
      { id: 6, name: 'Cho tặng', type: 'income', icon: 'Gift', parent_id: null, is_default: true },
      
      // Expense main
      { id: 100, name: 'Ăn uống', type: 'expense', icon: 'Utensils', parent_id: null, is_default: true },
      { id: 101, name: 'Đi chợ, siêu thị', type: 'expense', icon: 'ShoppingCart', parent_id: 100, is_default: true },
      { id: 102, name: 'Ăn tiệm', type: 'expense', icon: 'UtensilsCrossed', parent_id: 100, is_default: true },
      { id: 104, name: 'Đồ uống', type: 'expense', icon: 'Coffee', parent_id: 100, is_default: true },
      { id: 105, name: 'Ăn sáng', type: 'expense', icon: 'Croissant', parent_id: 100, is_default: true },
      { id: 106, name: 'Ăn trưa', type: 'expense', icon: 'Soup', parent_id: 100, is_default: true },
      { id: 107, name: 'Ăn tối', type: 'expense', icon: 'Pizza', parent_id: 100, is_default: true },

      { id: 110, name: 'Hóa đơn', type: 'expense', icon: 'Receipt', parent_id: null, is_default: true },
      { id: 111, name: 'Điện', type: 'expense', icon: 'Zap', parent_id: 110, is_default: true },
      { id: 112, name: 'Nước', type: 'expense', icon: 'Droplets', parent_id: 110, is_default: true },
      { id: 113, name: 'Internet', type: 'expense', icon: 'Wifi', parent_id: 110, is_default: true },
      { id: 114, name: 'Gas', type: 'expense', icon: 'Flame', parent_id: 110, is_default: true },
      { id: 115, name: 'Truyền hình', type: 'expense', icon: 'Tv', parent_id: 110, is_default: true },
      { id: 116, name: 'Điện thoại di động', type: 'expense', icon: 'Smartphone', parent_id: 110, is_default: true },

      { id: 120, name: 'Con cái', type: 'expense', icon: 'Baby', parent_id: null, is_default: true },
      { id: 121, name: 'Học phí', type: 'expense', icon: 'GraduationCap', parent_id: 120, is_default: true },
      { id: 122, name: 'Quần áo', type: 'expense', icon: 'Shirt', parent_id: 120, is_default: true },
      { id: 123, name: 'Sách vở', type: 'expense', icon: 'BookOpen', parent_id: 120, is_default: true },
      { id: 124, name: 'Đồ chơi', type: 'expense', icon: 'Gamepad2', parent_id: 120, is_default: true },
      { id: 125, name: 'Tiền tiêu vặt', type: 'expense', icon: 'Coins', parent_id: 120, is_default: true },
      { id: 126, name: 'Giầy dép', type: 'expense', icon: 'Footprints', parent_id: 120, is_default: true },
      { id: 127, name: 'Phụ kiện khác', type: 'expense', icon: 'MoreHorizontal', parent_id: 120, is_default: true },

      { id: 130, name: 'Nhà cửa', type: 'expense', icon: 'Home', parent_id: null, is_default: true },
      { id: 131, name: 'Tiền thuê nhà', type: 'expense', icon: 'Key', parent_id: 130, is_default: true },
      { id: 132, name: 'Mua sắm đồ', type: 'expense', icon: 'Armchair', parent_id: 130, is_default: true },
      { id: 133, name: 'Sửa chữa', type: 'expense', icon: 'Wrench', parent_id: 130, is_default: true },
      { id: 134, name: 'Phí dịch vụ', type: 'expense', icon: 'ClipboardList', parent_id: 130, is_default: true },

      { id: 140, name: 'Di chuyển', type: 'expense', icon: 'Car', parent_id: null, is_default: true },
      { id: 141, name: 'Xăng xe', type: 'expense', icon: 'Fuel', parent_id: 140, is_default: true },
      { id: 142, name: 'Sửa chữa, bảo dưỡng', type: 'expense', icon: 'Settings', parent_id: 140, is_default: true },
      { id: 143, name: 'Taxi/thuê xe', type: 'expense', icon: 'Car', parent_id: 140, is_default: true },
      { id: 144, name: 'Vé tàu xe', type: 'expense', icon: 'Ticket', parent_id: 140, is_default: true },
      { id: 145, name: 'Gửi xe, rửa xe', type: 'expense', icon: 'ParkingCircle', parent_id: 140, is_default: true },

      { id: 150, name: 'Sức khỏe', type: 'expense', icon: 'HeartPulse', parent_id: null, is_default: true },
      { id: 151, name: 'Khám chữa bệnh', type: 'expense', icon: 'Stethoscope', parent_id: 150, is_default: true },
      { id: 152, name: 'Thuốc men', type: 'expense', icon: 'Pill', parent_id: 150, is_default: true },
      { id: 153, name: 'Thể thao', type: 'expense', icon: 'Dumbbell', parent_id: 150, is_default: true },

      { id: 160, name: 'Thời trang', type: 'expense', icon: 'Shirt', parent_id: null, is_default: true },
      { id: 161, name: 'Quần áo', type: 'expense', icon: 'Shirt', parent_id: 160, is_default: true },
      { id: 162, name: 'Giày dép', type: 'expense', icon: 'Footprints', parent_id: 160, is_default: true },
      { id: 163, name: 'Phụ kiện khác', type: 'expense', icon: 'MoreHorizontal', parent_id: 160, is_default: true },

      { id: 170, name: 'Phát triển bản thân', type: 'expense', icon: 'TrendingUp', parent_id: null, is_default: true },
      { id: 171, name: 'Học hành', type: 'expense', icon: 'GraduationCap', parent_id: 170, is_default: true },
      { id: 172, name: 'Giao lưu bạn bè', type: 'expense', icon: 'Users', parent_id: 170, is_default: true },

      { id: 180, name: 'Hưởng thụ', type: 'expense', icon: 'Sparkles', parent_id: null, is_default: true },
      { id: 181, name: 'Vui chơi giải trí', type: 'expense', icon: 'Gamepad2', parent_id: 180, is_default: true },
      { id: 182, name: 'Du lịch', type: 'expense', icon: 'Plane', parent_id: 180, is_default: true },
      { id: 183, name: 'Làm đẹp', type: 'expense', icon: 'Sparkles', parent_id: 180, is_default: true },
      { id: 184, name: 'Mỹ phẩm', type: 'expense', icon: 'Flower2', parent_id: 180, is_default: true },

      { id: 190, name: 'Quà tặng', type: 'expense', icon: 'Gift', parent_id: null, is_default: true },
      { id: 191, name: 'Cưới xin', type: 'expense', icon: 'Heart', parent_id: 190, is_default: true },
      { id: 192, name: 'Đám hiếu', type: 'expense', icon: 'HeartHandshake', parent_id: 190, is_default: true },
      { id: 193, name: 'Thăm hỏi', type: 'expense', icon: 'UserPlus', parent_id: 190, is_default: true },

      { id: 200, name: 'Đầu tư & Kinh doanh', type: 'expense', icon: 'TrendingUp', parent_id: null, is_default: true },
      { id: 210, name: 'Chi phí khác', type: 'expense', icon: 'MoreHorizontal', parent_id: null, is_default: true },
    ]);
  }
  const accs = await getLocalArray('accounts');
  if (accs.length === 0) {
    await setItem('accounts', [
      { id: 1, name: 'Tiền mặt', icon: 'Wallet', balance: 0, is_default: true },
      { id: 2, name: 'Ngân hàng', icon: 'Landmark', balance: 0, is_default: true },
      { id: 3, name: 'Ví điện tử', icon: 'Smartphone', balance: 0, is_default: true },
      { id: 4, name: 'Đầu tư', icon: 'TrendingUp', balance: 0, is_default: true },
    ]);
  }
};

const checkAuth = () => {
  if (!currentUser) throw new Error('Unauthorized');
};

export const api = {
  // Init DB
  init: async () => {
    try {
      const initPromise = (async () => {
        await initStorage();
        const userStr = await getItem('currentUser_obj');
        if (userStr && !Array.isArray(userStr)) {
          currentUser = userStr;
        }
        await initializeDefaults();
      })();
      
      // Timeout after 5 seconds to prevent hanging
      await Promise.race([
        initPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("API Init Timeout")), 5000))
      ]);
    } catch (e) {
      console.error("API Init Error:", e);
    }
  },

  isAuthenticated: () => {
    return !!currentUser;
  },

  // Auth
  register: async (data: any): Promise<AuthResponse> => {
    await delay(500);
    const users = await getLocalArray('users');
    if (users.find((u: any) => u.email === data.email)) {
      throw new Error('Email đã được sử dụng');
    }
    const newUser = { 
      id: Date.now(), 
      email: data.email, 
      password: data.password, // In a real app, never store plain text
      full_name: data.full_name || data.email.split('@')[0],
      avatar_url: null,
      created_at: new Date().toISOString() 
    };
    users.push(newUser);
    await setItem('users', users);
    currentUser = newUser;
    await setItem('currentUser_obj', newUser);
    return { token: `mock-token-${newUser.id}`, user: newUser };
  },

  login: async (data: any): Promise<AuthResponse> => {
    await delay(500);
    const users = await getLocalArray('users');
    const user = users.find((u: any) => u.email === data.email && u.password === data.password);
    if (!user) {
      throw new Error('Email hoặc mật khẩu không đúng');
    }
    currentUser = user;
    await setItem('currentUser_obj', user);
    return { token: `mock-token-${user.id}`, user };
  },

  logout: async (): Promise<void> => {
    currentUser = null;
    await setItem('currentUser_obj', null);
  },

  forgotPassword: async (email: string): Promise<void> => {
    await delay(1000);
    const users = await getLocalArray('users');
    const user = users.find((u: any) => u.email === email);
    if (!user) {
      throw new Error('Email không tồn tại trong hệ thống');
    }
    // In a real app, this would send an email
    console.log(`Password reset link sent to ${email}`);
  },

  getMe: async (): Promise<User> => {
    await delay(200);
    checkAuth();
    return currentUser!;
  },

  updateProfile: async (data: any): Promise<User> => {
    await delay(300);
    checkAuth();
    const users = await getLocalArray('users');
    const index = users.findIndex((u: any) => u.id === currentUser!.id);
    if (index !== -1) {
      users[index] = { ...users[index], ...data };
      await setItem('users', users);
      currentUser = users[index];
      await setItem('currentUser_obj', currentUser);
    }
    return currentUser!;
  },

  changePassword: async (data: any): Promise<void> => {
    await delay(300);
    checkAuth();
    const users = await getLocalArray('users');
    const index = users.findIndex((u: any) => u.id === currentUser!.id);
    if (index !== -1) {
      if (users[index].password !== data.currentPassword) {
        throw new Error('Mật khẩu hiện tại không đúng');
      }
      users[index].password = data.newPassword;
      await setItem('users', users);
    }
  },

  // Transactions
  getTransactions: async (): Promise<Transaction[]> => {
    await delay(200);
    checkAuth();
    const txs = await getLocalArray('transactions');
    return txs.filter((t: any) => t.user_id === currentUser!.id);
  },
  
  addTransaction: async (data: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction> => {
    await delay(300);
    checkAuth();
    const txs = await getLocalArray('transactions');
    const newTx = { ...data, id: Date.now(), user_id: currentUser!.id, created_at: new Date().toISOString() } as Transaction;
    txs.unshift(newTx);
    await setItem('transactions', txs);

    // Update account balance
    if (data.account_id) {
      const accs = await getLocalArray('accounts');
      const index = accs.findIndex((a: any) => a.id === data.account_id);
      if (index !== -1) {
        if (data.type === 'income') {
          accs[index].balance += data.amount;
        } else {
          accs[index].balance -= data.amount;
        }
        await setItem('accounts', accs);
      }
    }

    return newTx;
  },

  deleteTransaction: async (id: number): Promise<void> => {
    await delay(300);
    checkAuth();
    let txs = await getLocalArray('transactions');
    const txToDelete = txs.find((t: any) => t.id === id);
    
    if (txToDelete && txToDelete.account_id) {
      const accs = await getLocalArray('accounts');
      const index = accs.findIndex((a: any) => a.id === txToDelete.account_id);
      if (index !== -1) {
        if (txToDelete.type === 'income') {
          accs[index].balance -= txToDelete.amount;
        } else {
          accs[index].balance += txToDelete.amount;
        }
        await setItem('accounts', accs);
      }
    }

    txs = txs.filter((t: any) => t.id !== id);
    await setItem('transactions', txs);
  },
  
  updateTransaction: async (id: number, data: Partial<Transaction>): Promise<Transaction> => {
    await delay(300);
    checkAuth();
    const txs = await getLocalArray('transactions');
    const index = txs.findIndex((t: any) => t.id === id);
    if (index === -1) throw new Error('Not found');
    
    const oldTx = txs[index];
    
    // Revert old balance
    if (oldTx.account_id) {
      const accs = await getLocalArray('accounts');
      const accIndex = accs.findIndex((a: any) => a.id === oldTx.account_id);
      if (accIndex !== -1) {
        if (oldTx.type === 'income') {
          accs[accIndex].balance -= oldTx.amount;
        } else {
          accs[accIndex].balance += oldTx.amount;
        }
        await setItem('accounts', accs);
      }
    }

    txs[index] = { ...txs[index], ...data };
    const updatedTx = txs[index];

    // Apply new balance
    if (updatedTx.account_id) {
      const accs = await getLocalArray('accounts');
      const accIndex = accs.findIndex((a: any) => a.id === updatedTx.account_id);
      if (accIndex !== -1) {
        if (updatedTx.type === 'income') {
          accs[accIndex].balance += updatedTx.amount;
        } else {
          accs[accIndex].balance -= updatedTx.amount;
        }
        await setItem('accounts', accs);
      }
    }

    await setItem('transactions', txs);
    return updatedTx;
  },

  // Budgets
  getBudgets: async (): Promise<Budget[]> => {
    await delay(200);
    checkAuth();
    const budgets = await getLocalArray('budgets');
    return budgets.filter((b: any) => b.user_id === currentUser!.id);
  },

  addBudget: async (data: Omit<Budget, 'id' | 'created_at'>): Promise<Budget> => {
    await delay(300);
    checkAuth();
    const budgets = await getLocalArray('budgets');
    const newBudget = { ...data, id: Date.now(), user_id: currentUser!.id, created_at: new Date().toISOString() } as Budget;
    budgets.unshift(newBudget);
    await setItem('budgets', budgets);
    return newBudget;
  },

  updateBudget: async (id: number, data: Partial<Budget>): Promise<Budget> => {
    await delay(300);
    checkAuth();
    const budgets = await getLocalArray('budgets');
    const index = budgets.findIndex((b: any) => b.id === id);
    if (index === -1) throw new Error('Not found');
    budgets[index] = { ...budgets[index], ...data };
    await setItem('budgets', budgets);
    return budgets[index];
  },

  deleteBudget: async (id: number): Promise<void> => {
    await delay(300);
    checkAuth();
    let budgets = await getLocalArray('budgets');
    budgets = budgets.filter((b: any) => b.id !== id);
    await setItem('budgets', budgets);
  },

  // Goals
  getGoals: async (): Promise<Goal[]> => {
    await delay(200);
    checkAuth();
    const goals = await getLocalArray('goals');
    return goals.filter((g: any) => g.user_id === currentUser!.id);
  },

  addGoal: async (data: Omit<Goal, 'id' | 'created_at'>): Promise<Goal> => {
    await delay(300);
    checkAuth();
    const goals = await getLocalArray('goals');
    const newGoal = { ...data, id: Date.now(), user_id: currentUser!.id, created_at: new Date().toISOString() } as Goal;
    goals.unshift(newGoal);
    await setItem('goals', goals);
    return newGoal;
  },

  updateGoal: async (id: number, data: Partial<Goal>): Promise<Goal> => {
    await delay(300);
    checkAuth();
    const goals = await getLocalArray('goals');
    const index = goals.findIndex((g: any) => g.id === id);
    if (index === -1) throw new Error('Not found');
    goals[index] = { ...goals[index], ...data };
    await setItem('goals', goals);
    return goals[index];
  },

  deleteGoal: async (id: number): Promise<void> => {
    await delay(300);
    checkAuth();
    let goals = await getLocalArray('goals');
    goals = goals.filter((g: any) => g.id !== id);
    await setItem('goals', goals);
  },

  updateGoalAmount: async (id: number, current_amount: number): Promise<Goal> => {
    return api.updateGoal(id, { current_amount });
  },

  // Settings
  getSettings: async (): Promise<Setting[]> => {
    await delay(200);
    checkAuth();
    const settings = await getLocalArray('settings');
    return settings.filter((s: any) => s.user_id === currentUser!.id);
  },

  updateSetting: async (key: string, value: string): Promise<void> => {
    await delay(200);
    checkAuth();
    const settings = await getLocalArray('settings');
    const index = settings.findIndex((s: any) => s.key === key && s.user_id === currentUser!.id);
    if (index !== -1) {
      settings[index].value = value;
    } else {
      settings.push({ id: Date.now(), user_id: currentUser!.id, key, value, created_at: new Date().toISOString() });
    }
    await setItem('settings', settings);
  },

  // Categories
  getCategories: async (): Promise<Category[]> => {
    await delay(200);
    checkAuth();
    const cats = await getLocalArray('categories');
    return cats.filter((c: any) => !c.is_deleted && (c.is_default || c.user_id === currentUser!.id));
  },

  addCategory: async (data: Partial<Category>): Promise<Category> => {
    await delay(300);
    checkAuth();
    const cats = await getLocalArray('categories');
    const newCat = { 
      ...data, 
      id: Date.now(), 
      is_default: false,
      user_id: currentUser!.id,
      is_deleted: false,
      created_at: new Date().toISOString() 
    } as Category;
    cats.push(newCat);
    await setItem('categories', cats);
    return newCat;
  },

  updateCategory: async (id: number, data: Partial<Category>): Promise<void> => {
    await delay(300);
    checkAuth();
    const cats = await getLocalArray('categories');
    const index = cats.findIndex((c: any) => c.id === id && c.user_id === currentUser!.id && !c.is_default);
    if (index !== -1) {
      cats[index] = { ...cats[index], ...data };
      await setItem('categories', cats);
    }
  },

  deleteCategory: async (id: number): Promise<void> => {
    await delay(300);
    checkAuth();
    const cats = await getLocalArray('categories');
    const index = cats.findIndex((c: any) => c.id === id && c.user_id === currentUser!.id && !c.is_default);
    if (index !== -1) {
      cats[index].is_deleted = true;
      await setItem('categories', cats);
    }
  },

  // Accounts
  getAccounts: async (): Promise<Account[]> => {
    await delay(200);
    return getLocalArray('accounts');
  },

  addAccount: async (data: Partial<Account>): Promise<Account> => {
    await delay(300);
    const accs = await getLocalArray('accounts');
    const newAcc = { ...data, id: Date.now(), created_at: new Date().toISOString() } as Account;
    accs.push(newAcc);
    await setItem('accounts', accs);
    return newAcc;
  },

  updateAccount: async (id: number, data: Partial<Account>): Promise<void> => {
    await delay(300);
    const accs = await getLocalArray('accounts');
    const index = accs.findIndex((a: any) => a.id === id);
    if (index !== -1) {
      accs[index] = { ...accs[index], ...data };
      await setItem('accounts', accs);
    }
  },

  deleteAccount: async (id: number): Promise<void> => {
    await delay(300);
    let accs = await getLocalArray('accounts');
    accs = accs.filter((a: any) => a.id !== id);
    await setItem('accounts', accs);
  },

  transfer: async (fromAccountId: number, toAccountId: number, amount: number, note?: string): Promise<void> => {
    await delay(500);
    checkAuth();
    const accs = await getLocalArray('accounts');
    const fromIndex = accs.findIndex((a: any) => a.id === fromAccountId);
    const toIndex = accs.findIndex((a: any) => a.id === toAccountId);
    
    if (fromIndex === -1 || toIndex === -1) throw new Error('Account not found');
    
    accs[fromIndex].balance -= amount;
    accs[toIndex].balance += amount;
    
    await setItem('accounts', accs);
    
    // Add transactions for history
    const txs = await getLocalArray('transactions');
    const now = new Date().toISOString();
    
    const expenseTx = {
      id: Date.now(),
      user_id: currentUser!.id,
      type: 'expense',
      amount: amount,
      category: 'Chuyển khoản',
      account_id: fromAccountId,
      date: now.split('T')[0],
      note: note || `Chuyển đến ${accs[toIndex].name}`,
      created_at: now
    };
    
    const incomeTx = {
      id: Date.now() + 1,
      user_id: currentUser!.id,
      type: 'income',
      amount: amount,
      category: 'Chuyển khoản',
      account_id: toAccountId,
      date: now.split('T')[0],
      note: note || `Nhận từ ${accs[fromIndex].name}`,
      created_at: now
    };
    
    txs.unshift(expenseTx, incomeTx);
    await setItem('transactions', txs);
  },

  // Notifications
  getVapidKey: async (): Promise<string> => {
    const res = await fetch('/api/notifications/vapid-key');
    const data = await res.json();
    return data.publicKey;
  },

  subscribeNotifications: async (subscription: any): Promise<void> => {
    const token = localStorage.getItem('auth_token');
    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ subscription })
    });
  },

  unsubscribeNotifications: async (subscription: any): Promise<void> => {
    const token = localStorage.getItem('auth_token');
    await fetch('/api/notifications/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ subscription })
    });
  },

  getGoogleAuthUrl: async (): Promise<{ url: string }> => {
    const origin = window.location.origin;
    const res = await fetch(`/api/auth/google/url?origin=${encodeURIComponent(origin)}`);
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Google Auth URL Error (${res.status}): ${errorText}`);
    }
    return res.json();
  },

  getFacebookAuthUrl: async (): Promise<{ url: string }> => {
    const origin = window.location.origin;
    const res = await fetch(`/api/auth/facebook/url?origin=${encodeURIComponent(origin)}`);
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Facebook Auth URL Error (${res.status}): ${errorText}`);
    }
    return res.json();
  },

  setAuth: async (token: string, user: User): Promise<void> => {
    localStorage.setItem('auth_token', token);
    currentUser = user;
    await setItem('currentUser_obj', user);
  },
};
