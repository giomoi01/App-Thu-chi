import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import db from './db';
import Database from 'better-sqlite3';
import multer from 'multer';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import webpush from 'web-push';
import axios from 'axios';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

// VAPID keys for push notifications
// In production, these should be in .env
let vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY
};

const isValidVapidKey = (key: string | undefined) => {
  if (!key || key.trim() === '' || key === 'undefined') return false;
  try {
    // Basic check: should be base64url encoded
    return key.length > 30; 
  } catch (e) {
    return false;
  }
};

if (!isValidVapidKey(vapidKeys.publicKey) || !isValidVapidKey(vapidKeys.privateKey)) {
  const generated = webpush.generateVAPIDKeys();
  vapidKeys.publicKey = generated.publicKey;
  vapidKeys.privateKey = generated.privateKey;
  console.log('Generated new VAPID keys. Save these to your .env file:');
  console.log('VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
  console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);
}

try {
  webpush.setVapidDetails(
    'mailto:example@yourdomain.com',
    vapidKeys.publicKey!,
    vapidKeys.privateKey!
  );
} catch (error) {
  console.error('Failed to set VAPID details with provided keys, generating new ones...', error);
  const generated = webpush.generateVAPIDKeys();
  vapidKeys.publicKey = generated.publicKey;
  vapidKeys.privateKey = generated.privateKey;
  webpush.setVapidDetails(
    'mailto:example@yourdomain.com',
    vapidKeys.publicKey!,
    vapidKeys.privateKey!
  );
  console.log('New VAPID keys generated and set:');
  console.log('VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
  console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);
}

const upload = multer({ dest: 'uploads/' });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;

    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    // Allow mock tokens for development/hybrid mode
    if (typeof token === 'string' && token.startsWith('mock-token-')) {
      const parts = token.split('-');
      const id = parseInt(parts[parts.length - 1]);
      req.user = { id };
      return next();
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: 'Forbidden' });
      req.user = user;
      
      // Update last activity
      try {
        db.prepare('UPDATE users SET last_activity = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
      } catch (e) {
        console.error('Failed to update last activity', e);
      }
      
      next();
    });
  };

  // Auth Routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, full_name } = req.body;
      const password_hash = await bcrypt.hash(password, 10);
      
      const stmt = db.prepare('INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)');
      const info = stmt.run(email, password_hash, full_name);
      
      const user = db.prepare('SELECT id, email, full_name FROM users WHERE id = ?').get(info.lastInsertRowid);
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
      
      res.status(201).json({ user, token });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        res.status(400).json({ error: 'Email already exists' });
      } else {
        res.status(500).json({ error: 'Registration failed' });
      }
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
      
      if (!user || !user.password_hash) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
      const { password_hash, ...userWithoutPassword } = user;
      
      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      res.status(500).json({ error: 'Login failed' });
    }
  });

  app.get('/api/auth/me', authenticateToken, (req: any, res) => {
    try {
      const user = db.prepare('SELECT id, email, full_name, avatar_url FROM users WHERE id = ?').get(req.user.id);
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  app.put('/api/auth/update', authenticateToken, (req: any, res) => {
    try {
      const { full_name, avatar_url } = req.body;
      db.prepare('UPDATE users SET full_name = ?, avatar_url = ? WHERE id = ?').run(full_name, avatar_url, req.user.id);
      const updatedUser = db.prepare('SELECT id, email, full_name, avatar_url FROM users WHERE id = ?').get(req.user.id);
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  app.put('/api/auth/change-password', authenticateToken, async (req: any, res) => {
    try {
      const { current_password, new_password } = req.body;
      const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id) as any;
      
      const validPassword = await bcrypt.compare(current_password, user.password_hash);
      if (!validPassword) {
        return res.status(400).json({ error: 'Invalid current password' });
      }

      const new_password_hash = await bcrypt.hash(new_password, 10);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(new_password_hash, req.user.id);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to change password' });
    }
  });

  // OAuth Routes
  const getBaseUrl = (req: any) => {
    const host = req.get('x-forwarded-host') || req.get('host') || '';
    
    // Nếu đang chạy ở localhost
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      return `http://${host}`;
    }

    // Luôn sử dụng host hiện tại của request để đảm bảo redirect_uri khớp 100% với URL người dùng đang truy cập
    // (Tránh lỗi khi người dùng truy cập link Shared nhưng APP_URL lại là link Dev)
    const protocol = req.get('x-forwarded-proto') || (host.endsWith('.run.app') ? 'https' : 'http');
    return `${protocol}://${host}`.replace(/\/$/, '');
  };

  app.get('/api/auth/google/url', (req, res) => {
    const clientOrigin = req.query.origin as string;
    const baseUrl = (clientOrigin && clientOrigin !== 'null' ? clientOrigin : getBaseUrl(req)).replace(/\/$/, '');
    console.log(`[OAuth] Google Auth URL requested. Origin: ${clientOrigin}, Resolved BaseUrl: ${baseUrl}`);
    
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const redirect_uri = `${baseUrl}/api/auth/google/callback`;
    
    // Encode baseUrl into state to ensure consistency in callback
    const state = Buffer.from(JSON.stringify({ baseUrl })).toString('base64');

    const options = {
      redirect_uri,
      client_id: (process.env.GOOGLE_CLIENT_ID || '').trim(),
      access_type: 'offline',
      response_type: 'code',
      prompt: 'consent',
      state,
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' '),
    };

    const qs = new URLSearchParams(options);
    const url = `${rootUrl}?${qs.toString()}`;
    console.log('Step 1: Generated Google Auth URL with redirect_uri:', redirect_uri);
    res.json({ url });
  });

  app.get('/api/auth/google/callback', async (req, res) => {
    const code = req.query.code as string;
    const stateStr = req.query.state as string;
    
    if (!code) {
      console.error('Google OAuth Error: No code received in callback');
      return res.status(400).send('Authentication failed: No code received');
    }

    // Recover baseUrl from state if possible, otherwise fallback to getBaseUrl
    let baseUrl = getBaseUrl(req);
    if (stateStr) {
      try {
        const decoded = JSON.parse(Buffer.from(stateStr, 'base64').toString());
        if (decoded.baseUrl) {
          baseUrl = decoded.baseUrl;
          console.log('Recovered baseUrl from state:', baseUrl);
        }
      } catch (e) {
        console.error('Failed to parse state from Google callback', e);
      }
    }

    const rootUrl = 'https://oauth2.googleapis.com/token';
    const redirect_uri = `${baseUrl}/api/auth/google/callback`;

    const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();

    if (!clientId || !clientSecret) {
      console.error('Google OAuth Error: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
      return res.status(500).send('Authentication failed: Server configuration error');
    }

    const options = {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri,
      grant_type: 'authorization_code',
    };

    try {
      console.log('Step 2: Exchanging Google code for token...');
      console.log('Using redirect_uri for exchange:', redirect_uri);
      
      const { data } = await axios({
        method: 'post',
        url: rootUrl,
        data: new URLSearchParams(options).toString(),
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
      });

      console.log('Token exchange successful, fetching user profile...');

      const { data: profile } = await axios.get(
        'https://www.googleapis.com/oauth2/v1/userinfo?alt=json',
        { headers: { Authorization: `Bearer ${data.access_token}` } }
      );

      // Find or create user
      let user = db.prepare('SELECT * FROM users WHERE email = ?').get(profile.email) as any;
      if (!user) {
        const stmt = db.prepare('INSERT INTO users (email, full_name, avatar_url, google_id) VALUES (?, ?, ?, ?)');
        const info = stmt.run(profile.email, profile.name, profile.picture, profile.id);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
      } else {
        db.prepare('UPDATE users SET google_id = ?, avatar_url = ? WHERE id = ?').run(profile.id, profile.picture, user.id);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
      }

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
      
      res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'OAUTH_SUCCESS', token: '${token}', user: ${JSON.stringify(user)} }, '*');
              window.close();
            </script>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error('Google OAuth Error Details:', error.response?.data || error.message);
      res.status(500).send(`Authentication failed: ${JSON.stringify(error.response?.data || error.message)}`);
    }
  });

  app.get('/api/auth/facebook/url', (req, res) => {
    const clientOrigin = req.query.origin as string;
    const baseUrl = (clientOrigin && clientOrigin !== 'null' ? clientOrigin : getBaseUrl(req)).replace(/\/$/, '');
    console.log(`[OAuth] Facebook Auth URL requested. Origin: ${clientOrigin}, Resolved BaseUrl: ${baseUrl}`);
    
    const rootUrl = 'https://www.facebook.com/v12.0/dialog/oauth';
    const redirect_uri = `${baseUrl}/api/auth/facebook/callback`;
    
    const state = Buffer.from(JSON.stringify({ baseUrl })).toString('base64');

    const options = {
      client_id: process.env.FACEBOOK_APP_ID || '',
      redirect_uri,
      scope: ['email', 'public_profile'].join(','),
      response_type: 'code',
      state,
      auth_type: 'rerequest',
      display: 'popup',
    };

    const qs = new URLSearchParams(options);
    res.json({ url: `${rootUrl}?${qs.toString()}` });
  });

  app.get('/api/auth/facebook/callback', async (req, res) => {
    const code = req.query.code as string;
    const stateStr = req.query.state as string;
    
    let baseUrl = getBaseUrl(req);
    if (stateStr) {
      try {
        const decoded = JSON.parse(Buffer.from(stateStr, 'base64').toString());
        if (decoded.baseUrl) baseUrl = decoded.baseUrl;
      } catch (e) {}
    }

    const rootUrl = 'https://graph.facebook.com/v12.0/oauth/access_token';
    const redirect_uri = `${baseUrl}/api/auth/facebook/callback`;

    const options = {
      client_id: process.env.FACEBOOK_APP_ID || '',
      client_secret: process.env.FACEBOOK_APP_SECRET || '',
      redirect_uri,
      code,
    };

    try {
      console.log('Exchanging Facebook code for token...');
      console.log('Redirect URI:', redirect_uri);
      
      const { data } = await axios.get(rootUrl, { params: options });
      const { data: profile } = await axios.get(
        `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${data.access_token}`
      );

      const email = profile.email || `${profile.id}@facebook.com`;
      const avatar_url = profile.picture?.data?.url;

      let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
      if (!user) {
        const stmt = db.prepare('INSERT INTO users (email, full_name, avatar_url, facebook_id) VALUES (?, ?, ?, ?)');
        const info = stmt.run(email, profile.name, avatar_url, profile.id);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
      } else {
        db.prepare('UPDATE users SET facebook_id = ?, avatar_url = ? WHERE id = ?').run(profile.id, avatar_url, user.id);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
      }

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
      
      res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'OAUTH_SUCCESS', token: '${token}', user: ${JSON.stringify(user)} }, '*');
              window.close();
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Facebook OAuth Error', error);
      res.status(500).send('Authentication failed');
    }
  });

  // Privacy Policy Route for Facebook/Google requirements
  app.get('/privacy', (req, res) => {
    res.send(`
      <html>
        <head>
          <title>Chính sách quyền riêng tư - e-Money</title>
          <style>
            body { font-family: sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #333; }
            h1 { color: #d32f2f; }
            h2 { border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <h1>Chính sách quyền riêng tư</h1>
          <p>Chào mừng bạn đến với ứng dụng e-Money. Chúng tôi cam kết bảo vệ thông tin cá nhân của bạn.</p>
          
          <h2>1. Thông tin chúng tôi thu thập</h2>
          <p>Khi bạn đăng nhập bằng Google hoặc Facebook, chúng tôi chỉ thu thập các thông tin cơ bản như: Tên, Email và Ảnh đại diện để tạo tài khoản cho bạn.</p>
          
          <h2>2. Cách chúng tôi sử dụng thông tin</h2>
          <p>Thông tin của bạn chỉ được sử dụng để định danh người dùng và cá nhân hóa trải nghiệm trong ứng dụng quản lý tài chính của bạn.</p>
          
          <h2>3. Bảo mật dữ liệu</h2>
          <p>Chúng tôi không chia sẻ thông tin cá nhân của bạn với bất kỳ bên thứ ba nào. Dữ liệu của bạn được lưu trữ an toàn.</p>
          
          <h2>4. Quyền của bạn</h2>
          <p>Bạn có quyền yêu cầu xóa tài khoản và toàn bộ dữ liệu liên quan bất cứ lúc nào thông qua phần cài đặt trong ứng dụng.</p>
          
          <p>Cập nhật lần cuối: 07/03/2026</p>
        </body>
      </html>
    `);
  });

  // API Routes
  
  // Transactions
  app.get('/api/transactions', authenticateToken, (req: any, res) => {
    try {
      const stmt = db.prepare('SELECT * FROM transactions WHERE user_id = ? OR user_id IS NULL ORDER BY date DESC, created_at DESC');
      const transactions = stmt.all(req.user.id);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  });

  app.post('/api/transactions', authenticateToken, (req: any, res) => {
    try {
      const { type, amount, category, date, note, account_id } = req.body;
      const stmt = db.prepare('INSERT INTO transactions (type, amount, category, date, note, account_id, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
      const info = stmt.run(type, amount, category, date, note, account_id, req.user.id);
      
      const newTransaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(info.lastInsertRowid);
      res.status(201).json(newTransaction);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create transaction' });
    }
  });

  app.delete('/api/transactions/:id', authenticateToken, (req: any, res) => {
    try {
      const { id } = req.params;
      const stmt = db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?');
      const info = stmt.run(id, req.user.id);
      if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete transaction' });
    }
  });

  app.put('/api/transactions/:id', authenticateToken, (req: any, res) => {
    try {
      const { id } = req.params;
      const { type, amount, category, date, note, account_id } = req.body;
      const stmt = db.prepare('UPDATE transactions SET type = ?, amount = ?, category = ?, date = ?, note = ?, account_id = ? WHERE id = ? AND user_id = ?');
      const info = stmt.run(type, amount, category, date, note, account_id, id, req.user.id);
      
      if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
      const updatedTransaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
      res.json(updatedTransaction);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update transaction' });
    }
  });

  // Budgets
  app.get('/api/budgets', authenticateToken, (req: any, res) => {
    try {
      const stmt = db.prepare('SELECT * FROM budgets WHERE user_id = ? OR user_id IS NULL ORDER BY month DESC');
      const budgets = stmt.all(req.user.id);
      res.json(budgets);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch budgets' });
    }
  });

  app.post('/api/budgets', authenticateToken, (req: any, res) => {
    try {
      const { category, limit_amount, month } = req.body;
      const stmt = db.prepare('INSERT INTO budgets (category, limit_amount, month, user_id) VALUES (?, ?, ?, ?)');
      const info = stmt.run(category, limit_amount, month, req.user.id);
      
      const newBudget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(info.lastInsertRowid);
      res.status(201).json(newBudget);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create budget' });
    }
  });

  app.put('/api/budgets/:id', authenticateToken, (req: any, res) => {
    try {
      const { id } = req.params;
      const { category, limit_amount, month } = req.body;
      const stmt = db.prepare('UPDATE budgets SET category = ?, limit_amount = ?, month = ? WHERE id = ? AND user_id = ?');
      const info = stmt.run(category, limit_amount, month, id, req.user.id);
      if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
      
      const updatedBudget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(id);
      res.json(updatedBudget);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update budget' });
    }
  });

  app.delete('/api/budgets/:id', authenticateToken, (req: any, res) => {
    try {
      const { id } = req.params;
      const stmt = db.prepare('DELETE FROM budgets WHERE id = ? AND user_id = ?');
      const info = stmt.run(id, req.user.id);
      if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete budget' });
    }
  });

  // Goals
  app.get('/api/goals', authenticateToken, (req: any, res) => {
    try {
      const stmt = db.prepare('SELECT * FROM goals WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC');
      const goals = stmt.all(req.user.id);
      res.json(goals);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch goals' });
    }
  });

  app.post('/api/goals', authenticateToken, (req: any, res) => {
    try {
      const { name, target_amount, current_amount, deadline } = req.body;
      const stmt = db.prepare('INSERT INTO goals (name, target_amount, current_amount, deadline, user_id) VALUES (?, ?, ?, ?, ?)');
      const info = stmt.run(name, target_amount, current_amount || 0, deadline, req.user.id);
      
      const newGoal = db.prepare('SELECT * FROM goals WHERE id = ?').get(info.lastInsertRowid);
      res.status(201).json(newGoal);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create goal' });
    }
  });

  app.put('/api/goals/:id', authenticateToken, (req: any, res) => {
    try {
      const { id } = req.params;
      const { name, target_amount, current_amount, deadline } = req.body;
      const stmt = db.prepare('UPDATE goals SET name = ?, target_amount = ?, current_amount = ?, deadline = ? WHERE id = ? AND user_id = ?');
      const info = stmt.run(name, target_amount, current_amount, deadline, id, req.user.id);
      if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
      
      const updatedGoal = db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
      res.json(updatedGoal);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update goal' });
    }
  });

  app.delete('/api/goals/:id', authenticateToken, (req: any, res) => {
    try {
      const { id } = req.params;
      const stmt = db.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?');
      const info = stmt.run(id, req.user.id);
      if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete goal' });
    }
  });

  app.put('/api/goals/:id/amount', authenticateToken, (req: any, res) => {
    try {
      const { id } = req.params;
      const { current_amount } = req.body;
      const stmt = db.prepare('UPDATE goals SET current_amount = ? WHERE id = ? AND user_id = ?');
      const info = stmt.run(current_amount, id, req.user.id);
      if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
      
      const updatedGoal = db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
      res.json(updatedGoal);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update goal amount' });
    }
  });

  // Settings
  app.get('/api/settings', authenticateToken, (req: any, res) => {
    try {
      const settings = db.prepare('SELECT * FROM settings WHERE user_id = ? OR user_id IS NULL').all(req.user.id);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  app.put('/api/settings', authenticateToken, (req: any, res) => {
    try {
      const { key, value } = req.body;
      const stmt = db.prepare('INSERT INTO settings (key, value, user_id) VALUES (?, ?, ?) ON CONFLICT(key, user_id) DO UPDATE SET value = excluded.value');
      stmt.run(key, value, req.user.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update setting' });
    }
  });

  // Categories
  app.get('/api/categories', authenticateToken, (req: any, res) => {
    try {
      const categories = db.prepare('SELECT * FROM categories WHERE user_id = ? OR user_id IS NULL').all(req.user.id);
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  app.post('/api/categories', authenticateToken, (req: any, res) => {
    try {
      const { type, parent_id, name, icon } = req.body;
      const stmt = db.prepare('INSERT INTO categories (type, parent_id, name, icon, is_default, user_id) VALUES (?, ?, ?, ?, 0, ?)');
      const info = stmt.run(type, parent_id || null, name, icon, req.user.id);
      const newCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid);
      res.status(201).json(newCategory);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create category' });
    }
  });

  app.put('/api/categories/:id', authenticateToken, (req: any, res) => {
    try {
      const { id } = req.params;
      const { name, icon } = req.body;
      const stmt = db.prepare('UPDATE categories SET name = ?, icon = ? WHERE id = ? AND is_default = 0 AND user_id = ?');
      const info = stmt.run(name, icon, id, req.user.id);
      if (info.changes === 0) return res.status(403).json({ error: 'Cannot edit default category or not found' });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update category' });
    }
  });

  app.delete('/api/categories/:id', authenticateToken, (req: any, res) => {
    try {
      const { id } = req.params;
      const categoryId = Number(id);
      const userId = req.user.id;
      
      // First delete child categories
      db.prepare('DELETE FROM categories WHERE parent_id = ? AND is_default = 0 AND user_id = ?').run(categoryId, userId);
      
      // Then delete the parent
      const stmt = db.prepare('DELETE FROM categories WHERE id = ? AND is_default = 0 AND user_id = ?');
      const info = stmt.run(categoryId, userId);
      
      if (info.changes === 0) return res.status(403).json({ error: 'Cannot delete default category or not found' });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete category' });
    }
  });

  // Accounts
  app.get('/api/accounts', authenticateToken, (req: any, res) => {
    try {
      const accounts = db.prepare('SELECT * FROM accounts WHERE user_id = ? OR user_id IS NULL').all(req.user.id);
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch accounts' });
    }
  });

  app.post('/api/accounts', authenticateToken, (req: any, res) => {
    try {
      const { name, icon, balance } = req.body;
      const stmt = db.prepare('INSERT INTO accounts (name, icon, balance, is_default, user_id) VALUES (?, ?, ?, 0, ?)');
      const info = stmt.run(name, icon, balance || 0, req.user.id);
      const newAccount = db.prepare('SELECT * FROM accounts WHERE id = ?').get(info.lastInsertRowid);
      res.status(201).json(newAccount);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create account' });
    }
  });

  app.put('/api/accounts/:id', authenticateToken, (req: any, res) => {
    try {
      const { id } = req.params;
      const { name, icon, balance } = req.body;
      const stmt = db.prepare('UPDATE accounts SET name = ?, icon = ?, balance = ? WHERE id = ? AND user_id = ?');
      const info = stmt.run(name, icon, balance, id, req.user.id);
      if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update account' });
    }
  });

  app.delete('/api/accounts/:id', authenticateToken, (req: any, res) => {
    try {
      const { id } = req.params;
      const stmt = db.prepare('DELETE FROM accounts WHERE id = ? AND is_default = 0 AND user_id = ?');
      const info = stmt.run(id, req.user.id);
      if (info.changes === 0) return res.status(403).json({ error: 'Cannot delete default account or not found' });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete account' });
    }
  });

  // Backup
  app.get('/api/backup', authenticateToken, (req: any, res) => {
    try {
      const userId = req.user.id;
      const data: any = {};
      
      data.transactions = db.prepare('SELECT * FROM transactions WHERE user_id = ?').all(userId);
      data.budgets = db.prepare('SELECT * FROM budgets WHERE user_id = ?').all(userId);
      data.goals = db.prepare('SELECT * FROM goals WHERE user_id = ?').all(userId);
      data.categories = db.prepare('SELECT * FROM categories WHERE user_id = ?').all(userId);
      data.accounts = db.prepare('SELECT * FROM accounts WHERE user_id = ?').all(userId);
      data.settings = db.prepare('SELECT * FROM settings WHERE user_id = ?').all(userId);
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=finance_backup.json');
      res.send(JSON.stringify(data, null, 2));
    } catch (error) {
      res.status(500).json({ error: 'Failed to create backup' });
    }
  });

  // Restore
  app.post('/api/restore', authenticateToken, upload.single('file'), (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      
      const fileContent = fs.readFileSync(req.file.path, 'utf8');
      const data = JSON.parse(fileContent);
      const userId = req.user.id;

      // Transactional restore
      const transaction = db.transaction(() => {
        // Clear existing data for this user
        db.prepare('DELETE FROM transactions WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM budgets WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM goals WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM categories WHERE user_id = ? AND is_default = 0').run(userId);
        db.prepare('DELETE FROM accounts WHERE user_id = ? AND is_default = 0').run(userId);
        db.prepare('DELETE FROM settings WHERE user_id = ?').run(userId);

        // Insert new data
        if (data.transactions) {
          const stmt = db.prepare('INSERT INTO transactions (type, amount, category, date, note, account_id, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
          data.transactions.forEach((t: any) => stmt.run(t.type, t.amount, t.category, t.date, t.note, t.account_id, userId));
        }
        if (data.budgets) {
          const stmt = db.prepare('INSERT INTO budgets (category, limit_amount, month, user_id) VALUES (?, ?, ?, ?)');
          data.budgets.forEach((b: any) => stmt.run(b.category, b.limit_amount, b.month, userId));
        }
        if (data.goals) {
          const stmt = db.prepare('INSERT INTO goals (name, target_amount, current_amount, deadline, user_id) VALUES (?, ?, ?, ?, ?)');
          data.goals.forEach((g: any) => stmt.run(g.name, g.target_amount, g.current_amount, g.deadline, userId));
        }
        if (data.categories) {
          const stmt = db.prepare('INSERT INTO categories (type, parent_id, name, icon, is_default, user_id) VALUES (?, ?, ?, ?, 0, ?)');
          data.categories.forEach((c: any) => stmt.run(c.type, c.parent_id, c.name, c.icon, userId));
        }
        if (data.accounts) {
          const stmt = db.prepare('INSERT INTO accounts (name, icon, balance, is_default, user_id) VALUES (?, ?, ?, 0, ?)');
          data.accounts.forEach((a: any) => stmt.run(a.name, a.icon, a.balance, userId));
        }
        if (data.settings) {
          const stmt = db.prepare('INSERT INTO settings (key, value, user_id) VALUES (?, ?, ?)');
          data.settings.forEach((s: any) => stmt.run(s.key, s.value, userId));
        }
      });

      transaction();
      fs.unlinkSync(req.file.path);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to restore backup' });
    }
  });

  // Export Excel
  // Export as SQLite
  app.post('/api/export/sqlite', (req: any, res) => {
    const tempFile = path.join('uploads', `backup_${Date.now()}.db`);
    try {
      const data = req.body;
      const tempDb = new Database(tempFile);

      // Create schema
      tempDb.exec(`
        CREATE TABLE transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT,
          amount REAL,
          category TEXT,
          date TEXT,
          note TEXT,
          account_id INTEGER
        );
        CREATE TABLE budgets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category TEXT,
          limit_amount REAL,
          month TEXT
        );
        CREATE TABLE goals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          target_amount REAL,
          current_amount REAL,
          deadline TEXT
        );
        CREATE TABLE categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT,
          parent_id INTEGER,
          name TEXT,
          icon TEXT,
          is_default BOOLEAN
        );
        CREATE TABLE accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          icon TEXT,
          balance REAL,
          is_default BOOLEAN
        );
        CREATE TABLE settings (
          key TEXT PRIMARY KEY,
          value TEXT
        );
      `);

      // Insert data
      const insertTransaction = tempDb.prepare('INSERT INTO transactions (type, amount, category, date, note, account_id) VALUES (?, ?, ?, ?, ?, ?)');
      const insertBudget = tempDb.prepare('INSERT INTO budgets (category, limit_amount, month) VALUES (?, ?, ?)');
      const insertGoal = tempDb.prepare('INSERT INTO goals (name, target_amount, current_amount, deadline) VALUES (?, ?, ?, ?)');
      const insertCategory = tempDb.prepare('INSERT INTO categories (type, parent_id, name, icon, is_default) VALUES (?, ?, ?, ?, ?)');
      const insertAccount = tempDb.prepare('INSERT INTO accounts (name, icon, balance, is_default) VALUES (?, ?, ?, ?)');
      const insertSetting = tempDb.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');

      tempDb.transaction(() => {
        (data.transactions || []).forEach((t: any) => insertTransaction.run(t.type, t.amount, t.category, t.date, t.note, t.account_id));
        (data.budgets || []).forEach((b: any) => insertBudget.run(b.category, b.limit_amount, b.month));
        (data.goals || []).forEach((g: any) => insertGoal.run(g.name, g.target_amount, g.current_amount, g.deadline));
        (data.categories || []).forEach((c: any) => insertCategory.run(c.type, c.parent_id, c.name, c.icon, c.is_default ? 1 : 0));
        (data.accounts || []).forEach((a: any) => insertAccount.run(a.name, a.icon, a.balance, a.is_default ? 1 : 0));
        (data.settings || []).forEach((s: any) => insertSetting.run(s.key, s.value));
      })();

      tempDb.close();

      res.download(tempFile, `backup_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.db`, (err) => {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      });
    } catch (error) {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      console.error('SQLite Export Error:', error);
      res.status(500).json({ error: 'Failed to export SQLite database' });
    }
  });

  // Convert SQLite to JSON for Restore
  app.post('/api/convert/sqlite-to-json', upload.single('file'), (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const tempDb = new Database(req.file.path);
    try {
      const data: any = { version: 'v6' };
      
      // Helper to check if table exists
      const tableExists = (name: string) => {
        const row = tempDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);
        return !!row;
      };

      if (tableExists('transactions')) data.transactions = tempDb.prepare('SELECT * FROM transactions').all();
      if (tableExists('budgets')) data.budgets = tempDb.prepare('SELECT * FROM budgets').all();
      if (tableExists('goals')) data.goals = tempDb.prepare('SELECT * FROM goals').all();
      if (tableExists('categories')) data.categories = tempDb.prepare('SELECT * FROM categories').all();
      if (tableExists('accounts')) data.accounts = tempDb.prepare('SELECT * FROM accounts').all();
      if (tableExists('settings')) data.settings = tempDb.prepare('SELECT * FROM settings').all();

      tempDb.close();
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      
      res.json(data);
    } catch (error) {
      tempDb.close();
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      console.error('SQLite Restore Error:', error);
      res.status(500).json({ error: 'Failed to parse SQLite backup' });
    }
  });

  app.get('/api/export/excel', authenticateToken, async (req: any, res) => {
    try {
      const transactions = db.prepare('SELECT * FROM transactions WHERE user_id = ? OR user_id IS NULL ORDER BY date DESC').all(req.user.id) as any[];
      
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
        sheet.addRow(t);
      });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=finance_export.xlsx');
      
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      res.status(500).json({ error: 'Failed to export excel' });
    }
  });

  // Export CSV
  app.get('/api/export/csv', authenticateToken, (req: any, res) => {
    try {
      const transactions = db.prepare('SELECT * FROM transactions WHERE user_id = ? OR user_id IS NULL ORDER BY date DESC').all(req.user.id) as any[];
      
      let csv = 'ID,Type,Amount,Category,Date,Note\n';
      transactions.forEach(t => {
        csv += `${t.id},${t.type},${t.amount},"${t.category}",${t.date},"${t.note || ''}"\n`;
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=finance_export.csv');
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: 'Failed to export csv' });
    }
  });

  // OAuth Placeholders
  app.post('/api/auth/social', async (req, res) => {
    try {
      const { provider, email, full_name, avatar_url, social_id } = req.body;
      
      // Find or create user
      let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
      
      if (!user) {
        const stmt = db.prepare(`INSERT INTO users (email, full_name, avatar_url, ${provider}_id) VALUES (?, ?, ?, ?)`);
        const info = stmt.run(email, full_name, avatar_url, social_id);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
      } else {
        // Update social ID if not set
        db.prepare(`UPDATE users SET ${provider}_id = ?, avatar_url = ? WHERE id = ?`).run(social_id, avatar_url, user.id);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
      }

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
      const { password_hash, ...userWithoutPassword } = user;
      
      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      res.status(500).json({ error: 'Social login failed' });
    }
  });

  // Notifications
  app.get('/api/notifications/vapid-key', (req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
  });

  app.post('/api/notifications/subscribe', authenticateToken, (req: any, res) => {
    try {
      const { subscription } = req.body;
      const subscription_json = JSON.stringify(subscription);
      
      // Check if subscription already exists
      const existing = db.prepare('SELECT id FROM push_subscriptions WHERE user_id = ? AND subscription_json = ?').get(req.user.id, subscription_json);
      
      if (!existing) {
        db.prepare('INSERT INTO push_subscriptions (user_id, subscription_json) VALUES (?, ?)').run(req.user.id, subscription_json);
      }
      
      res.status(201).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to subscribe' });
    }
  });

  app.post('/api/notifications/unsubscribe', authenticateToken, (req: any, res) => {
    try {
      const { subscription } = req.body;
      const subscription_json = JSON.stringify(subscription);
      db.prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND subscription_json = ?').run(req.user.id, subscription_json);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to unsubscribe' });
    }
  });

  // Background task to check for inactive users (every 12 hours)
  const checkInactiveUsers = async () => {
    try {
      console.log('Checking for inactive users...');
      // Find users who haven't been active for 2 days and haven't been notified recently
      // For this demo, we just check last_activity > 2 days
      const inactiveUsers = db.prepare(`
        SELECT u.id, u.full_name, ps.subscription_json 
        FROM users u
        JOIN push_subscriptions ps ON u.id = ps.user_id
        JOIN settings s ON u.id = s.user_id AND s.key = 'notifications_enabled' AND s.value = 'true'
        WHERE u.last_activity < datetime('now', '-2 days')
      `).all() as any[];

      for (const user of inactiveUsers) {
        const subscription = JSON.parse(user.subscription_json);
        const payload = JSON.stringify({
          title: 'e-Money nhớ bạn!',
          body: `Chào ${user.full_name || 'bạn'}, đã 2 ngày rồi bạn chưa cập nhật chi tiêu. Hãy vào app ngay nhé!`,
          url: '/'
        });

        try {
          await webpush.sendNotification(subscription, payload);
          console.log(`Notification sent to user ${user.id}`);
        } catch (error: any) {
          if (error.statusCode === 410 || error.statusCode === 404) {
            // Subscription expired or invalid
            db.prepare('DELETE FROM push_subscriptions WHERE subscription_json = ?').run(user.subscription_json);
          } else {
            console.error(`Failed to send notification to user ${user.id}`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error in checkInactiveUsers task', error);
    }
  };

  // Run every 12 hours
  setInterval(checkInactiveUsers, 12 * 60 * 60 * 1000);
  // Also run once on startup after a short delay
  setTimeout(checkInactiveUsers, 10000);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
