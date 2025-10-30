'use client';

import React from 'react';

// モーダルのPropsを定義
interface WrapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WrapModal: React.FC<WrapModalProps> = ({ isOpen, onClose }) => {
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
        <div className="bg-blue-600 text-white p-4 flex-shrink-0 flex justify-center items-center">
          <h2 className="text-xl font-bold">ラップの活用法</h2>
        </div>

        {/* コンテンツ */}
        <div className="p-6 flex-1 flex flex-col overflow-y-auto max-h-[70vh]">
          
          {/* 説明文 */}
          <p className="text-gray-700 leading-relaxed mb-6 text-lg text-center">
            災害時に食器にラップを被せて使うと、
            <br />
            洗う手間と水の節約になります。
          </p>
          
          {/* 画像（仮のパス） */}
          <div className="bg-gray-100 rounded-lg h-56 flex items-center justify-center mb-6 flex-shrink-0 w-full p-2">
            <img 
              src="/images/ラップ1.jpg" // 画像パスは適宜変更してください
              alt="ラップの活用法"
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

export default WrapModal;