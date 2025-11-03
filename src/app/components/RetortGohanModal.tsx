'use client';

import React, { useState, useEffect } from 'react';

interface Step {
  title: string;
  description: string;
  image: string; // 表示する画像パス
}

// モーダルのPropsを定義
interface RetortGohanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// モーダルに表示するステップを定義
const steps: Step[] = [
  {
    title: 'ステップ1',
    description: '耐熱のポリ袋にパックごはんを移して、なるべく空気を抜き、袋の口をしっかり閉める',
    image: '/images/レトルトご飯1.jpg' // ※画像パスはご用意ください
  },
  {
    title: 'ステップ2',
    description: '水を張った鍋の底に耐熱皿をひく（鍋底に袋が直接当たるのを防ぐため）',
    image: '/images/レトルトご飯2.jpg' // ※画像パスはご用意ください
  },
  {
    title: 'ステップ3',
    description: '袋が鍋の淵に当たらないようにご飯を入れて、10分加熱 (途中でひっくり返すとムラがなくなる)',
    image: '/images/レトルトご飯3.jpg' // ※画像パスはご用意ください
  },
  {
    title: 'ポイント：ポリ袋の利点',
    description: '鍋が汚れずお湯を繰り返し使える（節水）。また、袋が小さい分、少ない水で早く温まる（燃料節約）。',
    image: '/images/レトルトご飯4.JPG' // ※画像パスはご用意ください
  }
];

const RetortGohanModal: React.FC<RetortGohanModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  // モーダルが閉じられたら、ステップをリセット
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setCurrentStep(0);
      }, 300); // 閉じるアニメーションを待つ
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose(); // 最後のステップで「完了」を押したら閉じる
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    // 背景のオーバーレイ
    <div className="fixed inset-0 bg-[rgba(0,0,0,0.5)] flex items-center justify-center p-4 z-50">
      {/* モーダル本体 (PortableToiletModalとほぼ同じレイアウト) */}
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md h-[600px] flex flex-col overflow-hidden">
        
        {/* ヘッダー (色を緑系に変更) */}
        <div className="bg-blue-600 text-white p-4 flex-shrink-0 flex justify-center items-center">
          <h2 className="text-xl font-bold">レトルトご飯の食べ方</h2>
        </div>

        {/* コンテンツ */}
        <div className="p-6 flex-1 flex flex-col overflow-hidden items-center">
          {/* ステップインジケーター */}
          <div className="flex justify-center mb-6 flex-shrink-0 w-full">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 flex-1 mx-1 rounded-full ${
                  index === currentStep ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          {/* 画像エリア */}
          <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center mb-6 flex-shrink-0 w-full p-2">
            <img 
              src={steps[currentStep].image} 
              alt={steps[currentStep].title}
              className="max-h-full max-w-full object-contain"
            />
          </div>

          {/* テキストエリア */}
          <div className="flex flex-col h-32 mb-4 w-full">
            {/* ステップタイトル */}
            <h3 className="text-lg font-bold text-gray-800 mb-2 flex-shrink-0">
              {steps[currentStep].title}
            </h3>
            {/* 説明文 - スクロール可能 */}
            <div className="flex-1 overflow-y-auto pr-2">
              <p className="text-gray-600 leading-relaxed">
                {steps[currentStep].description}
              </p>
            </div>
          </div>

          {/* ボタンエリア */}
          <div className="flex justify-between w-full flex-shrink-0">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`py-2 px-6 rounded-lg font-medium transition duration-200 ${
                currentStep === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
              }`}
            >
              戻る
            </button>
            <button
              onClick={handleNext}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg font-medium transition duration-200"
            >
              {currentStep === steps.length - 1 ? '完了' : '次へ'}
            </button>
          </div>

          {/* ステップ表示 */}
          <div className="text-center mt-4 text-sm text-gray-500">
            {currentStep + 1} / {steps.length}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RetortGohanModal;