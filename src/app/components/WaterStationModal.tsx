'use client';

import React from 'react';

// モーダルのPropsを定義
interface WaterStationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WaterStationModal: React.FC<WaterStationModalProps> = ({ isOpen, onClose }) => {
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
          <h2 className="text-xl font-bold">給水所で水をもらうとき</h2>
        </div>

        {/* コンテンツ */}
        <div className="p-6 flex-1 flex flex-col overflow-y-auto max-h-[70vh]">

          {/* ▼▼▼ 説明文 (修正) ▼▼▼ */}
          <p className="text-gray-700 leading-relaxed mb-4">
            災害時は、給水車から水を受け取るには容器の持参が必要です。
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            ポリタンクや給水袋をリュックに入れて背負うと運びやすく、階段の上り下りも楽になります。
            水は重く（2L＝約2kg）、何往復もするのは大変です。
          </p>
          <p className="text-gray-700 leading-relaxed mb-6 font-semibold">
            日ごろから「水をどう運ぶか」も考えて備えておきましょう。
          </p>
          {/* ▲▲▲ 修正ここまで ▲▲▲ */}

          {/* 注意点 */}
           <div className="bg-yellow-100 border-l-4 border-yellow-400 text-yellow-800 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-semibold mb-2">注意点：</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>給水時間や場所は、ラジオや地域の広報で確認しましょう。</li>
              <li>一度に給水できる量に制限がある場合があります。</li>
              <li>容器は清潔に保ちましょう。</li>
              <li>運搬時は転倒などに注意し、無理のない量を運びましょう。</li>
            </ul>
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

export default WaterStationModal;