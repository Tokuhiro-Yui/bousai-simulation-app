'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut 
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // --- Googleログイン処理 ---
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // ログイン成功時の処理 (useEffectが検知してリダイレクト)
    } catch (error) {
      console.error("ログインエラー:", error);
      alert("ログインに失敗しました。");
    }
  };

  // --- ログアウト処理 ---
  const handleLogout = async () => {
    try {
      await signOut(auth);
      // ログアウト成功 (useAuthが検知して表示が変わる)
    } catch (error) {
      console.error("ログアウトエラー:", error);
    }
  };

  // --- ログイン状態に応じてリダイレクト ---
  useEffect(() => {
    if (!isLoading && user) {
      // ▼▼▼ ログイン済みなら、オープニングページにリダイレクト ▼▼▼
      router.push('/opening'); // ← ★ '/stockpile' から変更
    }
  }, [user, isLoading, router]);

  // --- 表示 ---
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-xl">読み込み中...</p>
      </div>
    );
  }

  if (user) {
    // ログイン済みの場合（リダイレクト前）
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-8">
        <div className="bg-white p-10 rounded-lg shadow-xl text-center">
          <h1 className="text-2xl font-bold mb-4">ログイン済み</h1>
          <p className="mb-6">{user.displayName || user.email} さん</p>
          {/* ▼▼▼ メッセージを変更 ▼▼▼ */}
          <p className="mb-6 text-sm text-gray-600">オープニングへ移動します...</p>
          <button
            onClick={handleLogout}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition duration-200"
          >
            ログアウト
          </button>
        </div>
      </div>
    );
  }

  // 未ログインの場合
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F3EADF]">
      <div className="bg-[#F9F6F0] p-10 rounded-2xl shadow-lg text-center border-2 border-[#E9DDCF] max-w-sm w-full">
        <h1 className="text-3xl font-bold text-[#5C4033] mb-8">
          防災備蓄
          <br />
          シミュレーション
        </h1>
        <p className="text-[#5C4033] mb-8">
          ログインして、
          <br />
          あなたの備蓄データで挑戦しよう。
        </p>
        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg transition duration-200 shadow-md flex items-center justify-center gap-3"
        >
          <svg 
            className="w-6 h-6" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
            fill="white"
          >
            <path d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.19,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.19,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.19,22C17.6,22 21.5,18.33 21.5,12.91C21.5,11.76 21.35,11.1 21.35,11.1V11.1Z"/>
          </svg>
          Googleでログイン
        </button>
      </div>
    </div>
  );
}