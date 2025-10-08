'use client';

import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { Plus, Minus, CheckCircle2, Loader2 } from 'lucide-react';
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { type Item, allItems } from './data/items'; // 共通ファイルからインポート

// --- Firebase設定 ---
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

// --- このページで必要な型定義 ---
type SelectedItem = {
  id: number;
  quantity: number;
};

// --- このページのUIで使うカテゴリ定義 ---
const categories: { id: 'all' | Item['category'], name: string }[] = [
  { id: 'all', name: 'すべて' },
  { id: 'food', name: '食料・水' },
  { id: 'hygiene', name: '衛生用品' },
  { id: 'lifeline', name: '生活用品' },
];

const MAX_SELECTED_ITEMS = 30;

export default function Home() {
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [activeItem, setActiveItem] = useState<Item>(allItems[0]);
  const [currentQuantity, setCurrentQuantity] = useState(0);
  const [activeCategory, setActiveCategory] = useState<'all' | Item['category']>('all');
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const totalSelectedCount = useMemo(() => selectedItems.reduce((sum, item) => sum + item.quantity, 0), [selectedItems]);
  const filteredItems = useMemo(() => activeCategory === 'all' ? allItems : allItems.filter(item => item.category === activeCategory), [activeCategory]);

  const handleItemClick = (item: Item) => {
    setActiveItem(item);
    const found = selectedItems.find(si => si.id === item.id);
    setCurrentQuantity(found ? found.quantity : 0);
  };

  const handleIncrease = () => {
    if (totalSelectedCount < MAX_SELECTED_ITEMS) setCurrentQuantity(prev => prev + 1);
  };

  const handleDecrease = () => {
    if (currentQuantity > 0) setCurrentQuantity(prev => prev - 1);
  };

  const handleSelect = () => {
    const otherItems = selectedItems.filter(item => item.id !== activeItem.id);
    const currentTotal = otherItems.reduce((sum, item) => sum + item.quantity, 0);
    if (currentTotal + currentQuantity > MAX_SELECTED_ITEMS) {
      alert(`備蓄品は合計${MAX_SELECTED_ITEMS}個までしか選べません。`);
      setCurrentQuantity(MAX_SELECTED_ITEMS - currentTotal);
      return;
    }
    let newSelectedItems = [...otherItems];
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
      const docRef = await addDoc(collection(db, "userSelections"), {
        items: selectedItems,
        totalCount: totalSelectedCount,
        createdAt: serverTimestamp()
      });
      console.log("Document written with ID: ", docRef.id);
      router.push('/simulation');
    } catch (e) {
      console.error("Error adding document: ", e);
      alert("データの保存に失敗しました。");
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[#F3EADF] min-h-screen font-sans text-[#5C4033]">
      <div className="container mx-auto max-w-6xl h-screen flex flex-col p-4 sm:p-8">
        <header className="text-center mb-8 flex-shrink-0">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-wider">備蓄を選択してください</h1>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-grow min-h-0">
          
          <div className="lg:col-span-2 bg-[#F9F6F0] p-6 rounded-2xl shadow-md border-2 border-[#E9DDCF] flex flex-col min-h-0">
            <h2 className="text-2xl font-semibold flex-shrink-0">選択済みアイテム ({totalSelectedCount}/{MAX_SELECTED_ITEMS})</h2>
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
                        <img src={item.image} alt={item.name} className="max-w-full max-h-full object-contain" />
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

          <div className="bg-[#F9F6F0] p-6 rounded-2xl shadow-md border-2 border-[#E9DDCF] flex flex-col items-center">
            <div className="w-full">
              <div className="bg-white rounded-lg w-full aspect-square mb-4 flex items-center justify-center p-4">
                <img src={activeItem.image} alt={activeItem.name} className="max-w-full max-h-full object-contain" />
              </div>
              <h3 className="text-2xl font-bold text-center mb-2">{activeItem.name}</h3>
              <p className="text-sm text-center text-gray-600 h-20 overflow-y-auto px-2">{activeItem.description}</p>
              
              <div className="flex items-center justify-center gap-4 my-6">
                <button onClick={handleDecrease} className="p-3 bg-white rounded-full shadow-sm hover:bg-gray-100 transition-colors disabled:opacity-50" disabled={currentQuantity <= 0}>
                  <Minus size={20} />
                </button>
                <span className="text-4xl font-bold w-16 text-center">{currentQuantity}</span>
                <button onClick={handleIncrease} className="p-3 bg-white rounded-full shadow-sm hover:bg-gray-100 transition-colors disabled:opacity-50" disabled={totalSelectedCount >= MAX_SELECTED_ITEMS}>
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
        </main>
        
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