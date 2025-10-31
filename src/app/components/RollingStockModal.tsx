'use client';

import React from 'react';

// モーダルのPropsを定義
interface RollingStockModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RollingStockModal: React.FC<RollingStockModalProps> = ({ isOpen, onClose }) => {
  // isOpenがfalseなら何もレンダリングしない
  if (!isOpen) {
    return null;
  }

  return (
    // 背景のオーバーレイ
    <div className="fixed inset-0 bg-[rgba(0,0,0,0.6)] flex items-center justify-center p-4 z-50">
      {/* モーダル本体 */}
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">

        {/* ヘッダー */}
        <div className="bg-red-600 text-white p-4 flex-shrink-0 flex justify-center items-center">
          <h2 className="text-xl font-bold">ローリングストックとは？</h2>
        </div>

        {/* コンテンツ */}
        <div className="p-6 flex-1 flex flex-col overflow-y-auto max-h-[70vh]">

          {/* 説明文 */}
          <p className="text-gray-700 leading-relaxed mb-4">
            「蓄える → 食べる → 補充する」を繰り返しながら、常に一定量の食品を備蓄する方法をローリングストックといいます。
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            普段食べ慣れた食品を少し多めに買い、消費した分を買い足すことで、
            いつでも新しい状態で備蓄を保つことができます。
          </p>
          <p className="text-gray-700 leading-relaxed mb-6">
            また、普段食べ慣れた味を非常時にも食べられることで、
            ストレスを軽減し、安心して過ごすことができます。
          </p>

          {/* 図解画像 */}
          <div className="bg-gray-100 rounded-lg h-56 flex items-center justify-center mb-6 flex-shrink-0 w-full p-2">
            <img
              src="/images/ローリングストック.png" // 図解の画像パスを指定してください
              alt="ローリングストック図解"
              className="max-h-full max-w-full object-contain"
            />
          </div>


          {/* フッター（閉じるボタン） */}
          <div className="mt-auto text-center">
            <button
              onClick={onClose} // propsで受け取ったonClose関数を呼ぶ
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-8 rounded-lg font-medium transition duration-200"
            >
              確認した
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RollingStockModal;