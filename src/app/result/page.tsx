'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, AlertTriangle, Lightbulb, ChevronDown } from 'lucide-react';
// ▼▼▼ allItemsとidToCategoryMapの両方をインポート ▼▼▼
import { allItems, idToCategoryMap } from '../data/items';

// --- ▼▼▼ 新しい推奨備蓄品リスト ▼▼▼ ---
// 7日間の避難生活を想定した推奨量
const recommendedItems = [
    // --- 食料・水 ---
    { id: 'item_1', name: '水', recommendedQuantity: 21, unit: 'L', description: '飲料・調理用(1人1日3L)', importance: '生命維持に不可欠。飲用だけでなく、調理や衛生にも使用します。' },
    { id: 'item_17', name: '無洗米', recommendedQuantity: 3, unit: 'kg', description: '主食の基本(3kg袋)', importance: '炊く手間はかかりますが、日常に近い温かい食事は満足度が高いです。' },
    { id: 'item_2', name: 'レトルトご飯', recommendedQuantity: 21, unit: '食', description: '1日3食分', importance: 'お米が炊けない状況でも、すぐに主食を確保できます。' },
    { id: 'item_16', name: '即席麺・乾麺', recommendedQuantity: 7, unit: '食', description: '食事のバリエーションとして', importance: '温かい汁物は心も温めます。お湯と燃料が必要になります。' },
    { id: 'item_13', name: 'レトルト食品', recommendedQuantity: 7, unit: '個', description: '主菜(カレー・パスタソース等)', importance: 'ご飯や麺と組み合わせることで、食事が豊かになります。' },
    { id: 'item_3', name: '缶詰 (おかず)', recommendedQuantity: 7, unit: '缶', description: '主菜(さば味噌煮など)', importance: '調理不要で食べられるたんぱく源として非常に優秀です。' },
    { id: 'item_14', name: '栄養補助食品', recommendedQuantity: 7, unit: '個', description: '補助食・非常時用', importance: '食欲がない時や、手早く栄養を摂りたい時に重宝します。' },
    { id: 'item_15', name: '野菜ジュース', recommendedQuantity: 7, unit: '本', description: 'ビタミン補給', importance: '不足しがちな野菜の栄養素と水分を補給できます。' },
    { id: 'item_18', name: '飲み物 (嗜好品)', recommendedQuantity: 7, unit: '本', description: 'お茶、ジュースなど', importance: '水分補給だけでなく、精神的な安らぎや気分転換に繋がります。' },
    { id: 'item_4', name: 'お菓子', recommendedQuantity: 7, unit: '個', description: '糖分補給・気分転換', importance: '非常時のストレスを和らげる重要なアイテムです。' },
    { id: 'item_19', name: '果物の缶詰', recommendedQuantity: 7, unit: '缶', description: 'ビタミン・糖分補給', importance: '甘いものは精神的な充足感を与えてくれます。' },
    
    // --- 衛生用品 ---
    { id: 'item_6', name: '携帯トイレ', recommendedQuantity: 35, unit: '回分', description: '1人1日5回分', importance: '断水時に最も困る問題の一つ。感染症予防の観点からも極めて重要です。' },
    { id: 'item_10', name: '除菌ウェットティッシュ', recommendedQuantity: 70, unit: '枚', description: '手指の消毒・清掃用', importance: '水が使えない状況で、手指や身の回りを清潔に保つために必須です。' },
    { id: 'item_22', name: 'ウェットボディタオル', recommendedQuantity: 7, unit: '枚', description: '体拭き用(1日1枚)', importance: '入浴ができない状況で体を清潔に保ち、精神的なリフレッシュにも繋がります。' },
    { id: 'item_21', name: '歯みがき用ウェットティッシュ', recommendedQuantity: 70, unit: '枚', description: '口腔ケア(毎食後+就寝前)', importance: '口腔内の衛生を保つことは、誤嚥性肺炎などの二次的な健康被害を防ぎます。' },
    { id: 'item_20', name: '口内洗浄液', recommendedQuantity: 630, unit: 'ml', description: '口腔ケア(1回30ml程度)', importance: '水なしで口内を浄化でき、感染症予防にも繋がります。' },
    { id: 'item_5', name: '救急箱', recommendedQuantity: 1, unit: '箱', description: '基本的な救急セット', importance: '怪我をした際に応急手当ができるように。常備薬も忘れずに入れておきましょう。' },

    // --- ライフライン ---
    { id: 'item_7', name: 'カセットコンロ', recommendedQuantity: 1, unit: '台', description: '調理・湯沸かし用', importance: '温かい食事は体と心を温めます。ライフラインの寸断に備えて必須です。' },
    { id: 'item_23', name: 'カセットボンベ', recommendedQuantity: 10, unit: '本', description: '7日分の燃料(1日4/3本計算)', importance: 'コンロがあっても燃料がなければ意味がありません。余裕を持った備蓄を。' },
    { id: 'item_8', name: 'モバイルバッテリー', recommendedQuantity: 1, unit: '個', description: 'スマートフォン等の充電用', importance: '情報収集や連絡手段であるスマートフォンの電源確保は非常に重要です。' },
    { id: 'item_9', name: '手回し充電ラジオ', recommendedQuantity: 1, unit: '台', description: '情報収集の生命線', importance: 'スマホが使えない状況でも、公的な災害情報を得るための重要な手段です。' },
    { id: 'item_24', name: 'LEDランタン', recommendedQuantity: 3, unit: '台', description: '夜間の照明用', importance: '停電時の夜間の安全確保、不安の軽減に必須。部屋ごとにあると理想的です。' },
];
// ▲▲▲ 新しい推奨備蓄品リストここまで ▲▲▲

// --- SimulationPageと統一したゲージの色定義 ---
const gaugeSettings = {
  satiety: { name: '満腹度', color: '#D97706' },
  hydration: { name: '水分', color: '#2563EB' },
  hygiene: { name: '衛生', color: '#16A34A' },
  morale: { name: '精神力', color: '#FBBF24' },
};

export default function ResultPage() {
  const [resultData, setResultData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openItemId, setOpenItemId] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const storedResult = sessionStorage.getItem('simulationResult');
    if (storedResult) {
      setResultData(JSON.parse(storedResult));
    }
    setIsLoading(false);
  }, []);

  const handleToggle = (id) => {
    setOpenItemId(openItemId === id ? null : id);
  };

  if (isLoading) { return <div className="bg-slate-50 min-h-screen flex items-center justify-center text-2xl text-gray-700">結果を読み込んでいます...</div>; }
  if (!resultData) { return ( <div className="bg-slate-50 min-h-screen flex flex-col items-center justify-center text-2xl text-gray-700"> <p>シミュレーションデータが見つかりません。</p> <button onClick={() => router.push('/')} className="mt-4 bg-blue-600 text-white font-bold py-3 px-8 rounded-full hover:bg-blue-700 transition-colors duration-300 text-lg shadow-md">トップページに戻る</button> </div> ); }

  const { '不足したアイテム': lackingItems, gaugeHistory, selectedItems } = resultData;
  const finalGauges = gaugeHistory[gaugeHistory.length - 1];
  const { satiety, hydration, morale, hygiene } = finalGauges;
  const score = Math.round((satiety + hydration + morale + hygiene) / 4);

  return (
    <div className="bg-slate-50 min-h-screen font-sans text-gray-800">
      <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">シミュレーション結果</h1>
          <p className="text-lg text-gray-600 mt-2">あなたの防災備蓄レベルを確認しましょう</p>
        </header>

        <section className="bg-white p-6 rounded-2xl shadow-lg mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-center">総合スコア</h2>
          <div className="text-7xl font-bold text-blue-600 text-center mb-4">{score} <span className="text-3xl text-gray-500">点</span></div>
          <p className="text-center text-gray-600">
            {score > 80 ? '素晴らしい備えです！' : score > 60 ? '良い備えですが、さらに改善できます。' : '備えにいくつかの課題が見られます。'}
            下の結果を参考に、あなたの備蓄品を見直してみましょう。
          </p>
        </section>
        
        <section className="bg-white p-6 rounded-2xl shadow-lg mb-8">
            <h2 className="text-2xl font-semibold mb-6">最終的な状況</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries({ satiety, hydration, hygiene, morale }).map(([key, value]) => (
                    <div key={key} className="text-center">
                        <p className="capitalize font-medium mb-2">{gaugeSettings[key].name}</p>
                        <div className="w-full bg-gray-200 rounded-full h-4">
                            <div className="h-4 rounded-full" style={{ width: `${value}%`, backgroundColor: gaugeSettings[key].color }}></div>
                        </div>
                        <p className="font-bold text-lg mt-1">{value}%</p>
                    </div>
                ))}
            </div>
        </section>

        <section className="bg-white p-6 rounded-2xl shadow-lg mb-8">
          <h2 className="text-2xl font-semibold mb-6">備蓄品の過不足チェック</h2>
          <div className="space-y-3">
            {recommendedItems.map(recommended => {
              // ▼▼▼ 計算ロジックを全面的に書き換え ▼▼▼
              let userQuantity = 0;
              const itemId = parseInt(recommended.id.split('_')[1]); // 'item_1' -> 1

              if (!isNaN(itemId)) {
                  const details = allItems.find(item => item.id === itemId);
                  const selected = selectedItems.find(selItem => selItem.id === itemId);

                  if (details && selected) {
                      if (details.resourceType === 'water') {
                          // 水は全ての水系アイテムを合算して計算
                          let totalMl = 0;
                          selectedItems.forEach(sel => {
                              const itemDetails = allItems.find(i => i.id === sel.id);
                              if (itemDetails?.resourceType === 'water') {
                                  totalMl += (itemDetails.resourceAmount || 0) * sel.quantity;
                              }
                          });
                          userQuantity = totalMl / 1000; // Lに変換
                      } else if (details.resourceType === 'rice') {
                          userQuantity = (details.resourceAmount || 0) * selected.quantity / 1000; // kgに変換
                      } else if (details.maxUses) {
                          userQuantity = details.maxUses * selected.quantity; // 総使用回数を計算
                      } else {
                          userQuantity = selected.quantity; // それ以外は単純な個数
                      }
                  }
              }
              // ▲▲▲ 計算ロジックの書き換えここまで ▲▲▲

              const percentage = Math.min((userQuantity / recommended.recommendedQuantity) * 100, 100);
              const isSufficient = percentage >= 100;
              const isOpen = openItemId === recommended.id;

              return (
                <div key={recommended.id} className="border border-gray-200 rounded-lg transition-shadow hover:shadow-md">
                  <div className="p-4 cursor-pointer" onClick={() => handleToggle(recommended.id)}>
                    <div className="flex justify-between items-start mb-2">
                        <div><h3 className="font-bold text-lg text-gray-800">{recommended.name}</h3></div>
                        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 flex-shrink-0 ${isOpen ? 'transform rotate-180' : ''}`} />
                    </div>
                    <div className="flex justify-between items-center mb-1">
                        <div className="w-full bg-gray-200 rounded-full h-4 mr-4">
                            <div className={`h-4 rounded-full transition-all duration-500 ${isSufficient ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${percentage}%` }}></div>
                        </div>
                        <p className="text-sm text-gray-700 font-medium whitespace-nowrap">
                            <span className={`font-bold text-lg ${isSufficient ? 'text-green-600' : 'text-red-600'}`}>{userQuantity.toFixed(1).replace('.0', '')}</span> / {recommended.recommendedQuantity} {recommended.unit}
                        </p>
                    </div>
                     <p className="text-xs text-gray-500">{recommended.description}</p>
                  </div>
                  {isOpen && (
                    <div className="px-4 pb-4">
                        <div className="mt-2 pt-3 border-t border-gray-200"><p className="text-sm text-gray-700">{recommended.importance}</p></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {lackingItems && lackingItems.length > 0 && (
            <section className="mb-8">
                <h2 className="text-3xl font-bold text-center mb-6 flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 mr-3 text-red-500" />
                    シミュレーションで困ったこと
                </h2>
                <div className="space-y-4">
                    {lackingItems.map((item) => (
                    <div key={item.id} className="bg-white p-5 rounded-xl shadow-lg border border-l-4 border-red-500">
                        <h3 className="text-xl font-semibold text-red-700">{item.name}</h3>
                        <p className="text-gray-600 mt-2">{item.reason}</p>
                        <div className="mt-4 bg-yellow-100 border-l-4 border-yellow-400 text-yellow-800 p-3 rounded-lg">
                            <div className="flex">
                                <div className="py-1"><Lightbulb className="w-5 h-5 mr-3"/></div>
                                <div>
                                    <p className="font-semibold">改善のヒント</p>
                                    <p className="text-sm">{item.recommendation}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    ))}
                </div>
            </section>
        )}

        <div className="text-center mt-10">
            <button 
                onClick={() => router.push('/')}
                className="bg-blue-600 text-white font-bold py-3 px-8 rounded-full hover:bg-blue-700 transition-colors duration-300 text-lg shadow-md">
                もう一度備蓄品を選ぶ
            </button>
        </div>
      </main>
    </div>
  );
}