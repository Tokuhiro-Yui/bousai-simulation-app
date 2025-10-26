'use client';

import { useRouter } from 'next/navigation';
import { useState, useMemo, useEffect } from 'react';
import { Plus, Minus, CheckCircle2, Loader2 } from 'lucide-react';
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { type Item, allItems, type Effect, type HeatingCost } from '../data/items'; 

// --- Firebase設定 (変更なし) ---
const firebaseConfig = {
    apiKey: "AIzaSyCfhxIYHfNNHxwgXyyvMhTgDJ3pydZL6c8",
    authDomain: "bousaibitiku-2684a.firebaseapp.com",
    projectId: "bousaibitiku-2684a",
    storageBucket: "bousaibitiku-2684a.firebasestorage.app",
    messagingSenderId: "1088804086098",
    appId: "1:1088804086098:web:8054fea7c39dcd13ac9a8b"
};
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// --- 型定義 (変更なし) ---
type SelectedItem = { id: number; quantity: number; };

// --- カテゴリ定義 (変更なし) ---
const categories: { id: 'all' | Item['category'], name: string }[] = [
  { id: 'all', name: 'すべて' },
  { id: 'food', name: '食料・水' },
  { id: 'hygiene', name: '衛生用品' },
  { id: 'lifeline', name: '生活用品' },
];

const MAX_SELECTED_ITEMS = 200;

// ▼▼▼ 【修正】 数量1に制限する生活用品ID (28, 29, 33 を追加) ▼▼▼
// (コンロ、バッテリー、ランタン、ラップ、ポリ袋、ガムテープ、給水袋、リュック)
// (手袋、乾電池、カイロ)
const singletonLifelineItems = [7, 8, 24, 26, 27, 28, 29, 30, 31, 32, 33];
// ▲▲▲ 修正ここまで ▲▲▲

// --- UIコンポーネント (変更なし) ---
const EffectBadge = ({ effect, value }: { effect: 'satiety' | 'hydration' | 'hygiene' | 'morale', value: number }) => {
    const settings = {
        satiety: { name: '満腹', color: 'bg-amber-100 text-amber-800' },
        hydration: { name: '水分', color: 'bg-blue-100 text-blue-800' },
        hygiene: { name: '衛生', color: 'bg-green-100 text-green-800' },
        morale: { name: '精神', color: 'bg-yellow-100 text-yellow-800' },
    };
    if (!value || value === 0) return null;
    return (
        <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${settings[effect].color}`}>
            {settings[effect].name} {value > 0 ? `+${value}` : value}
        </span>
    );
};

const RenderEffects = ({ effects }: { effects?: Effect }) => {
    if (!effects || Object.values(effects).every(v => v === 0)) return null;
    return (
        <div className="flex flex-wrap gap-1 justify-center">
            <EffectBadge effect="satiety" value={effects.satiety || 0} />
            <EffectBadge effect="hydration" value={effects.hydration || 0} />
            <EffectBadge effect="hygiene" value={effects.hygiene || 0} />
            <EffectBadge effect="morale" value={effects.morale || 0} />
        </div>
    );
};

const RenderHeatingCost = ({ cost }: { cost?: HeatingCost }) => {
    if (!cost) return null;
    return (
        <div className="text-xs text-gray-500 font-semibold mt-1">
            消費:
            {cost.gas ? <span className="ml-1">燃料x{cost.gas}</span> : null}
            {cost.water ? <span className="ml-1">水{cost.water}ml</span> : null}
        </div>
    );
};

export default function Home() {
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [activeItem, setActiveItem] = useState<Item>(allItems.find(item => item.id !== 9) || allItems[0]); // 初期アイテムが9でないことを確認
  const [currentQuantity, setCurrentQuantity] = useState(0);
  const [activeCategory, setActiveCategory] = useState<'all' | Item['category']>('all');
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const totalSelectedCount = useMemo(() => selectedItems.reduce((sum, item) => sum + item.quantity, 0), [selectedItems]);
  
  // (変更なし)
  const filteredItems = useMemo(() => {
    const baseList = activeCategory === 'all' 
      ? allItems 
      : allItems.filter(item => item.category === activeCategory);
    // 手回し充電ラジオ(id: 9)を除外
    return baseList.filter(item => item.id !== 9);
  }, [activeCategory]);

  const handleItemClick = (item: Item) => {
    setActiveItem(item);
    const found = selectedItems.find(si => si.id === item.id);
    setCurrentQuantity(found ? found.quantity : 0);
  };

  // (変更なし) handleIncrease ロジック
  const handleIncrease = () => {
    const isSingleton = singletonLifelineItems.includes(activeItem.id);
    
    if (isSingleton) {
        if (currentQuantity >= 1 || totalSelectedCount >= MAX_SELECTED_ITEMS) {
            return; 
        }
        const currentTotalWithoutThis = selectedItems
            .filter(item => item.id !== activeItem.id)
            .reduce((sum, item) => sum + item.quantity, 0);
        
        if (currentTotalWithoutThis + 1 <= MAX_SELECTED_ITEMS) {
            setCurrentQuantity(1);
        }

    } else {
        if (totalSelectedCount < MAX_SELECTED_ITEMS) {
            setCurrentQuantity(prev => prev + 1);
        }
    }
  };

  const handleDecrease = () => {
    if (currentQuantity > 0) setCurrentQuantity(prev => prev - 1);
  };

  const handleSelect = () => {
    const otherItems = selectedItems.filter(item => item.id !== activeItem.id);
    const newSelectedItems = [...otherItems];
    if (currentQuantity > 0) {
      newSelectedItems.push({ id: activeItem.id, quantity: currentQuantity });
    }
    newSelectedItems.sort((a, b) => a.id - b.id);
    setSelectedItems(newSelectedItems);
  };
  
  const handleConfirm = async () => {
    if (selectedItems.length === 0 || isSaving) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, "userSelections"), {
        items: selectedItems,
        totalCount: totalSelectedCount,
        createdAt: serverTimestamp()
      });
      router.push('/simulation');
    } catch (e) {
      console.error("Error adding document: ", e);
      alert("データの保存に失敗しました。");
      setIsSaving(false);
    }
  };
  
  // (変更なし)
  useEffect(() => {
    if (activeItem.id === 9 && filteredItems.length > 0) {
      setActiveItem(filteredItems[0]);
    }
  }, [activeItem, filteredItems]);

  return (
    <div className="bg-[#F3EADF] min-h-screen font-sans text-[#5C4033]">
      <div className="container mx-auto max-w-6xl h-screen flex flex-col p-4 sm:p-8">
        <header className="text-center mb-8 flex-shrink-0">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-wider">備蓄を選択してください</h1>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-grow min-h-0">
          
          <div className="lg:col-span-2 bg-[#F9F6F0] p-6 rounded-2xl shadow-md border-2 border-[#E9DDCF] flex flex-col min-h-0">
            <h2 className="text-2xl font-semibold flex-shrink-0">選択済みアイテム ({totalSelectedCount})</h2>
            <div className="flex flex-wrap gap-2 my-4 border-b border-[#E9DDCF] pb-4 flex-shrink-0">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors shadow-sm ${activeCategory === category.id ? 'bg-orange-400 text-white' : 'bg-white hover:bg-orange-100'}`}
                >
                  {category.name}
                </button>
              ))}
            </div>
            <div className="flex-grow overflow-y-auto pr-2">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {filteredItems.map(item => {
                  const selected = selectedItems.find(si => si.id === item.id);
                  return (
                    <div key={item.id} onClick={() => handleItemClick(item)} className="relative cursor-pointer group transition-transform transform hover:scale-105">
                      <div className={`aspect-square bg-white rounded-lg flex items-center justify-center p-2 border-2 ${activeItem.id === item.id ? 'border-orange-400' : 'border-transparent'} ${selected ? 'shadow-lg' : ''}`}>
                        <img src={item.image} alt={item.name} className="h-5/6 w-5/6 object-contain" />
                      </div>
                      {selected && (
                        <div className="absolute -top-2 -right-2 bg-orange-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold border-2 border-white">{selected.quantity}</div>
                      )}
                      <p className="text-center text-sm mt-1 font-medium truncate">{item.name}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-[#F9F6F0] p-6 rounded-2xl shadow-md border-2 border-[#E9DDCF] flex flex-col items-center min-h-0 overflow-y-auto">
            <div className="w-full flex flex-col flex-grow">
              <div className="bg-white rounded-lg w-full h-48 mb-4 flex items-center justify-center p-4 flex-shrink-0">
                <img src={activeItem.image} alt={activeItem.name} className="h-5/6 w-5/6 object-contain" />
              </div>
              <h3 className="text-2xl font-bold text-center mb-2 flex-shrink-0">{activeItem.name}</h3>

              {/* (変更なし) 説明エリア */}
              <div className="text-center min-h-[7rem] px-2 mb-4">
                <p className="text-sm text-gray-600 mb-3">{activeItem.description}</p>
                <div className='space-y-2'>
                  {activeItem.id === 1 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">500mlあたり</p>
                      <RenderEffects effects={{ hydration: 20 }} />
                    </div>
                  )}
                  {activeItem.id !== 1 && activeItem.effects && Object.keys(activeItem.effects).length > 0 && (
                    <div className={activeItem.heatable ? "bg-gray-100 p-2 rounded-md" : ""}>
                      {activeItem.heatable && <p className="text-xs font-semibold text-gray-500 mb-1">そのまま</p>}
                      <RenderEffects effects={activeItem.effects} />
                    </div>
                  )}
                  {activeItem.id !== 1 && activeItem.heatable && activeItem.heatedEffects && (
                    <div className={Object.keys(activeItem.effects).length > 0 ? "bg-red-50 p-2 rounded-md" : "p-2 rounded-md"}>
                      {Object.keys(activeItem.effects).length > 0 && 
                        <p className="text-xs font-semibold text-red-600 mb-1">加熱時</p>
                      }
                      <RenderEffects effects={activeItem.heatedEffects} />
                      <RenderHeatingCost cost={activeItem.heatingCost} />
                    </div>
                  )}
                </div>
              </div>

              {/* (変更なし) 操作ボタンエリア */}
              <div className="mt-auto">
                <div className="flex items-center justify-center gap-4 my-2">
                  <button onClick={handleDecrease} className="p-3 bg-white rounded-full shadow-sm hover:bg-gray-100 transition-colors disabled:opacity-50" disabled={currentQuantity <= 0}>
                    <Minus size={20} />
                  </button>
                  <span className="text-4xl font-bold w-16 text-center">{currentQuantity}</span>
                  <button 
                    onClick={handleIncrease} 
                    className="p-3 bg-white rounded-full shadow-sm hover:bg-gray-100 transition-colors disabled:opacity-50" 
                    disabled={
                        (singletonLifelineItems.includes(activeItem.id) && currentQuantity >= 1) || // Singletonは1が上限
                        totalSelectedCount >= MAX_SELECTED_ITEMS // 全体の上限
                    }
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <button 
                  onClick={handleSelect}
                  className="w-full bg-orange-400 text-white font-bold py-3 rounded-lg hover:bg-orange-500 transition-all shadow-md flex items-center justify-center gap-2 text-lg"
                >
                  <CheckCircle2 size={24} />
                  選択
                </button>
              </div>
            </div>
          </div>
        </main>
        
        {/* (変更なし) フッター */}
        <div className="mt-8 flex justify-center flex-shrink-0">
          <button 
            onClick={handleConfirm}
            className="w-full max-w-md bg-green-500 text-white font-bold py-4 px-8 rounded-lg hover:bg-green-600 transition-all shadow-lg text-xl disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            disabled={selectedItems.length === 0 || isSaving}
          >
            {isSaving && <Loader2 className="animate-spin" />}
            {isSaving ? '保存中...' : 'シミュレーション開始'}
          </button>
        </div>
      </div>
    </div>
  );
}