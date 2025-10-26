'use client';

import React from 'react';

// モーダルのPropsを定義
interface DisasterDialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DisasterDialModal: React.FC<DisasterDialModalProps> = ({ isOpen, onClose }) => {
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
          <h2 className="text-xl font-bold">災害用伝言ダイヤル（171）</h2>
        </div>

        {/* コンテンツ */}
        <div className="p-6 flex-1 flex flex-col overflow-y-auto max-h-[70vh]">
          
          {/* 説明文 */}
          <p className="text-gray-700 leading-relaxed mb-4">
            災害時に、安否情報を音声で録音・再生できるサービスです。
            電話がつながりにくい状況でも、安否確認を行うことができます。
          </p>

          {/* 利用方法 */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">利用方法：</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-700">
              <li>「171」をダイヤルする</li>
              <li>ガイダンスに従い、録音する場合は「1」、再生する場合は「2」を押す</li>
              <li>連絡を取りたい相手の電話番号（自宅・携帯など）をダイヤル</li>
              <li>案内に従って、伝言を録音または再生</li>
            </ol>
          </div>

          {/* ポイント */}
          <div className="bg-yellow-100 border-l-4 border-yellow-400 text-yellow-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">ポイント：</h3>
            <p>
              家族や知人と「どの電話番号を使って伝言を残すか」を事前に決めておくことが大切。
              これも立派な「日ごろの備え」です。
            </p>
          </div>

          {/* フッター（閉じるボタン） */}
          <div className="mt-8 text-center">
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

export default DisasterDialModal;