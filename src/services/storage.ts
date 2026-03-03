import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

export const isNative = Capacitor.isNativePlatform();
let sqlite: SQLiteConnection;
let db: SQLiteDBConnection | null = null;

export const initStorage = async () => {
  if (isNative) {
    try {
      sqlite = new SQLiteConnection(CapacitorSQLite);
      const ret = await sqlite.checkConnectionsConsistency();
      const isConn = (await sqlite.isConnection("finance_db", false)).result;
      
      if (ret.result && isConn) {
        db = await sqlite.retrieveConnection("finance_db", false);
      } else {
        db = await sqlite.createConnection("finance_db", false, "no-encryption", 1, false);
      }
      
      await db.open();
      
      const query = `
        CREATE TABLE IF NOT EXISTS kv_store (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
      `;
      await db.execute(query);
      console.log("SQLite initialized successfully");
    } catch (err) {
      console.error("SQLite Init Error, falling back to localStorage", err);
      db = null; // Fallback to localStorage if SQLite fails
    }
  }
};

export const getItem = async (key: string): Promise<any> => {
  if (isNative && db) {
    try {
      const res = await db.query("SELECT value FROM kv_store WHERE key = ?", [key]);
      if (res?.values && res.values.length > 0) {
        return JSON.parse(res.values[0].value);
      }
      return null;
    } catch (e) {
      console.error("SQLite GET Error", e);
      return null;
    }
  } else {
    const val = localStorage.getItem(`mock_${key}`);
    return val ? JSON.parse(val) : null;
  }
};

export const setItem = async (key: string, data: any): Promise<void> => {
  const value = JSON.stringify(data);
  if (isNative && db) {
    try {
      // Use standard SQLite INSERT OR REPLACE
      await db.run("INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)", [key, value]);
    } catch (e) {
      console.error("SQLite SET Error", e);
    }
  } else {
    localStorage.setItem(`mock_${key}`, value);
  }
};
