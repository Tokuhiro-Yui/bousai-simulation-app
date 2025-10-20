// src/lib/firebase.ts

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// ▼▼▼▼▼ ここに、Firebaseコンソールでコピーした自分の設定を貼り付ける ▼▼▼▼▼
const firebaseConfig = {
apiKey: "AIzaSyCfhxIYHfNNHxwgXyyvMhTgDJ3pydZL6c8",
authDomain: "bousaibitiku-2684a.firebaseapp.com",
projectId: "bousaibitiku-2684a",
storageBucket: "bousaibitiku-2684a.firebasestorage.app",
messagingSenderId: "1088804086098",
appId: "1:1088804086098:web:8054fea7c39dcd13ac9a8b"
};
// ▲▲▲▲▲ ここまで ▲▲▲▲▲

// Firebaseアプリを初期化
const app = initializeApp(firebaseConfig);

// Firestoreのインスタンスを取得
const db = getFirestore(app);

// 他のファイルで使えるようにdbをエクスポート
export { db };