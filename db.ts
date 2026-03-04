import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'finance.db');
const db = new Database(dbPath);

// Get current user version
const userVersion = db.pragma('user_version', { simple: true }) as number;

// Migration 0 -> 1 (Initial schema)
if (userVersion < 1) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      limit_amount REAL NOT NULL,
      month TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL NOT NULL DEFAULT 0,
      deadline TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  db.pragma('user_version = 1');
}

// Migration 1 -> 2 (Settings, Categories, Accounts)
if (userVersion < 2) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      parent_id INTEGER,
      name TEXT NOT NULL,
      icon TEXT,
      is_default BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT,
      balance REAL DEFAULT 0,
      is_default BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Add account_id to transactions if it doesn't exist
  try {
    db.exec(`ALTER TABLE transactions ADD COLUMN account_id INTEGER REFERENCES accounts(id)`);
  } catch (e) {
    // Column might already exist
  }

  // Insert default settings
  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  insertSetting.run('currency', 'VND');
  insertSetting.run('theme', 'light');
  insertSetting.run('date_format', 'dd/MM/yyyy');

  // Insert default accounts
  const insertAccount = db.prepare('INSERT OR IGNORE INTO accounts (name, icon, balance, is_default) VALUES (?, ?, ?, ?)');
  insertAccount.run('Tiền mặt', 'Wallet', 0, 1);
  insertAccount.run('Tài khoản ngân hàng', 'Landmark', 0, 0);
  insertAccount.run('Ví điện tử', 'Smartphone', 0, 0);
  insertAccount.run('Đầu tư', 'TrendingUp', 0, 0);

  // Insert default categories
  const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (type, parent_id, name, icon, is_default) VALUES (?, ?, ?, ?, ?)');
  
  // Expense - Nhu cầu thiết yếu
  const needsInfo = insertCategory.run('expense', null, 'Nhu cầu thiết yếu', 'ShoppingCart', 1);
  const needsId = needsInfo.lastInsertRowid;
  insertCategory.run('expense', needsId, 'Ăn uống', 'Utensils', 1);
  insertCategory.run('expense', needsId, 'Hóa đơn (Điện, nước, internet...)', 'Receipt', 1);
  insertCategory.run('expense', needsId, 'Nhà ở (Tiền thuê nhà, phí dịch vụ...)', 'Home', 1);
  insertCategory.run('expense', needsId, 'Di chuyển (Xăng xe, vé tàu xe...)', 'Car', 1);
  insertCategory.run('expense', needsId, 'Sức khỏe', 'HeartPulse', 1);
  insertCategory.run('expense', needsId, 'Khác', 'MoreHorizontal', 1);

  // Expense - Mong muốn
  const wantsInfo = insertCategory.run('expense', null, 'Mong muốn', 'Star', 1);
  const wantsId = wantsInfo.lastInsertRowid;
  insertCategory.run('expense', wantsId, 'Giải trí', 'Gamepad2', 1);
  insertCategory.run('expense', wantsId, 'Thời trang', 'Shirt', 1);
  insertCategory.run('expense', wantsId, 'Làm đẹp', 'Sparkles', 1);
  insertCategory.run('expense', wantsId, 'Liên hoan', 'PartyPopper', 1);
  insertCategory.run('expense', wantsId, 'Du lịch', 'Plane', 1);
  insertCategory.run('expense', wantsId, 'Quà tặng', 'Gift', 1);
  insertCategory.run('expense', wantsId, 'Hiếu hỉ', 'HeartHandshake', 1);
  insertCategory.run('expense', wantsId, 'Bảo hiểm', 'Shield', 1);
  insertCategory.run('expense', wantsId, 'Khác', 'MoreHorizontal', 1);

  // Expense - Phát triển bản thân
  const devInfo = insertCategory.run('expense', null, 'Phát triển bản thân', 'TrendingUp', 1);
  const devId = devInfo.lastInsertRowid;
  insertCategory.run('expense', devId, 'Học tập', 'GraduationCap', 1);
  insertCategory.run('expense', devId, 'Đồ tiện ích (Sách vở, công cụ học tập/làm việc)', 'Laptop', 1);
  insertCategory.run('expense', devId, 'Khác', 'MoreHorizontal', 1);

  // Expense - Chi phí khác
  const extraInfo = insertCategory.run('expense', null, 'Chi phí khác', 'MoreHorizontal', 1);
  const extraId = extraInfo.lastInsertRowid;
  insertCategory.run('expense', extraId, 'Gia đình', 'Users', 1);
  insertCategory.run('expense', extraId, 'Đầu tư', 'TrendingUp', 1);
  insertCategory.run('expense', extraId, 'Khác', 'MoreHorizontal', 1);

  // Income
  const incomeInfo = insertCategory.run('income', null, 'Thu nhập', 'Wallet', 1);
  const incomeId = incomeInfo.lastInsertRowid;
  insertCategory.run('income', incomeId, 'Lương', 'Banknote', 1);
  insertCategory.run('income', incomeId, 'Thưởng', 'Award', 1);
  insertCategory.run('income', incomeId, 'Bán hàng', 'Store', 1);
  insertCategory.run('income', incomeId, 'Cho tặng', 'Gift', 1);

  db.pragma('user_version = 2');
}

// Migration 2 -> 3 (Authentication)
if (userVersion < 3) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      full_name TEXT,
      avatar_url TEXT,
      google_id TEXT UNIQUE,
      facebook_id TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Add user_id to all relevant tables
  const tables = ['transactions', 'budgets', 'goals', 'categories', 'accounts', 'settings'];
  for (const table of tables) {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN user_id INTEGER REFERENCES users(id)`);
    } catch (e) {
      // Column might already exist
    }
  }

  db.pragma('user_version = 3');
}

// Migration 3 -> 4 (Fix settings table primary key)
if (userVersion < 4) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings_new (
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      user_id INTEGER,
      PRIMARY KEY (key, user_id)
    );
    
    INSERT OR IGNORE INTO settings_new (key, value, user_id)
    SELECT key, value, user_id FROM settings;
    
    DROP TABLE settings;
    ALTER TABLE settings_new RENAME TO settings;
  `);
  db.pragma('user_version = 4');
}

export default db;
