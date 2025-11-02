"use client";

import { useRouter } from 'next/navigation';
import OpeningScene from '../components/OpeningScene'; // パスが '../' に変わっている可能性に注意

export default function OpeningPage() {
  const router = useRouter();

  const handleOpeningComplete = () => {
    router.push('/stockpile');
  };

  return (
    <OpeningScene onComplete={handleOpeningComplete} />
  );
}