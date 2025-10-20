"use client";

import { useRouter } from 'next/navigation';
// ▼▼▼▼▼ この行を確認してください ▼▼▼▼▼
import OpeningScene from './components/OpeningScene'; // 正しいインポート

// ❌ 間違いの例: import { OpeningScene } from '../components/OpeningScene';

export default function OpeningPage() {
  const router = useRouter();

  const handleOpeningComplete = () => {
    router.push('/stockpile');
  };

  return (
    <OpeningScene onComplete={handleOpeningComplete} />
  );
}