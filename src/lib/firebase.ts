// src/lib/firebase.ts

// ▼▼▼ getAuth を 'firebase/auth' からインポート ▼▼▼
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // ← ★これを追加

const firebaseConfig = {
  apiKey: "AIzaSyCfhxIYHfNNHxwgXyyvMhTgDJ3pydZL6c8",
  authDomain: "bousaibitiku-2684a.firebaseapp.com",
  projectId: "bousaibitiku-2684a",
  storageBucket: "bousaibitiku-2684a.firebasestorage.app",
  messagingSenderId: "1088804086098",
  appId: "1:1088804086098:web:8054fea7c39dcd13ac9a8b"
};

// Firebaseアプリを初期化
// ▼▼▼ getApps().length が 0 かどうかをチェックするよう修正 ▼▼▼
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Firestoreのインスタンスを取得
const db = getFirestore(app);

// ▼▼▼ Authのインスタンスを取得 ▼▼▼
const auth = getAuth(app); // ← ★これを追加

// 他のファイルで使えるようにdbとauthをエクスポート
export { db, auth }; // ← ★auth を追加