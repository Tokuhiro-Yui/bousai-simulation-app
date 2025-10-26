'use client';

import React from 'react';

// モーダルのPropsを定義
interface SafetyCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SafetyCheckModal: React.FC<SafetyCheckModalProps> = ({ isOpen, onClose }) => {
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
          <h2 className="text-xl font-bold">布製ガムテープを使った安否確認</h2>
        </div>

        {/* コンテンツ */}
        <div className="p-6 flex-1 flex flex-col overflow-y-auto max-h-[70vh]">
          
          {/* 説明文 */}
          <p className="text-gray-700 leading-relaxed mb-4">
            布製ガムテープは、壁やドアなどに貼って伝言を書くことで、家族や近隣への連絡メモとして活用できます。
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            発災時に安否確認を速やかに行うことで、救助が必要な場所を早く把握し、支援を迅速に行うことが可能になります。
          </p>
          <p className="text-gray-700 leading-relaxed mb-6">
            自分が無事であるか、または避難先などの情報を、玄関ドアや門扉の外側など、外から見える位置に掲示しましょう。
          </p>
          
          {/* 画像（仮のパス） */}
          <div className="bg-gray-100 rounded-lg h-48 flex items-center justify-center mb-6 flex-shrink-0 w-full p-2">
            <img 
              src="/images/safety_check_tape.png" // 画像パスは適宜変更してください
              alt="布製ガムテープでの安否確認"
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

export default SafetyCheckModal;