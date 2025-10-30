'use client';

import React, { useState, useEffect } from 'react';

interface Step {
  title: string;
  description: string;
  image: string; // 絵文字から画像パスに変更
}

// モーダルのPropsを定義
interface PortableToiletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const steps: Step[] = [
  {
    title: 'ステップ1',
    description: 'ポリ袋を便器に被せる',
    image: '/images/トイレ1.png' // 仮の画像パス
  },
  {
    title: 'ステップ2',
    description: 'ポリ袋が動かないように便座を下げて、その上から排泄用の袋を被せる',
    image: '/images/トイレ2.png' // 仮の画像パス
  },
  {
    title: 'ステップ3',
    description: '用をたす',
    image: '/images/トイレ3.png' // 仮の画像パス
  },
  {
    title: 'ステップ4',
    description: '凝固剤を入れる',
    image: '/images/トイレ4.png' // 仮の画像パス
  },
  {
    title: 'ステップ5',
    description: '排泄用の袋を取り出し、空気を抜いて縛る',
    image: '/images/トイレ5.png' // 仮の画像パス
  },
  {
    title: 'ステップ6',
    description: '臭いや衛生上の問題が発生しないよう、ふた付きの容器を用意し、保管する場所は生活空間からなるべく離れた、直射日光が当たらない場所を選ぶ',
    image: '/images/トイレ6.jpg' // 仮の画像パス
  },
  {
    title: 'ポイント1：布テープ',
    description: '誤ってトイレを流してしまわないように、流すレバーやボタンにテープを貼り、止めておく',
    image: '/images/使用禁止.HEIC' // 仮の画像パス
  },
  {
    title: 'ポイント2：使い捨て手袋',
    description: '衛生的に作業中は使い捨て手袋を使用する',
    image: '/images/ビニール手袋.png' // 仮の画像パス
  }
];

// propsを受け取るように変更
const PortableToiletModal: React.FC<PortableToiletModalProps> = ({ isOpen, onClose }) => {
  // 内部のisOpen stateを削除
  const [currentStep, setCurrentStep] = useState(0);

  // isOpenがfalseに変わったら（モーダルが閉じられたら）、ステップをリセット
  useEffect(() => {
    if (!isOpen) {
      // 閉じるアニメーションの後にリセットされるように少し遅延させる
      const timer = setTimeout(() => {
        setCurrentStep(0);
      }, 300); // 300msは適宜調整
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose(); // 最後のステップで「完了」を押したら閉じる
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // 親コンポーネントのonCloseを呼ぶように変更
  const handleClose = () => {
    onClose();
  };

  // トリガーボタンを削除し、isOpen propで表示を制御
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-[rgba(0,0,0,0.5)] flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md h-[600px] flex flex-col overflow-hidden">
        
        {/* ▼▼▼ 修正 ▼▼▼ (「×」ボタンを削除し、タイトルを中央揃えに) */}
        <div className="bg-blue-600 text-white p-4 flex-shrink-0 flex justify-center items-center">
          <h2 className="text-xl font-bold">携帯トイレの使用方法</h2>
          {/* <button onClick={handleClose} className="text-white text-2xl font-bold">&times;</button> */}
        </div>
        {/* ▲▲▲ 修正ここまで ▲▲▲ */}

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
            {/* imgタグに変更 */}
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

export default PortableToiletModal;