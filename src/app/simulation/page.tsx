'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { type Item, type Effect, allItems } from '../data/items';

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

type InventoryItem = { id: number; quantity: number; uses?: number; };
type PlayerStatus = { satiety: number; hydration: number; hygiene: number; morale: number; };
type Turn = '朝' | '昼' | '夜';

const StatusBar = ({ value, color }: { value: number, color: string }) => ( <div className="w-full bg-[#E9DDCF] rounded-full h-6 overflow-hidden border-2 border-[#D4C3B0] shadow-inner"> <div className={`h-full rounded-full transition-all duration-500`} style={{ width: `${value}%`, backgroundColor: color }}></div> </div>);
const MAX_STATUS = 100;
const TOTAL_TURNS = 21; 

export default function SimulationPage() {
    const [initialInventory, setInitialInventory] = useState<InventoryItem[]>([]);
    const [gaugeHistory, setGaugeHistory] = useState<PlayerStatus[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [status, setStatus] = useState<PlayerStatus>({ satiety: 100, hydration: 100, hygiene: 100, morale: 100 });
    const [day, setDay] = useState(1);
    const [turn, setTurn] = useState<Turn>('朝');
    const [turnCount, setTurnCount] = useState(0);
    const [message, setMessage] = useState("データを読み込んでいます...");
    const [isGameOver, setIsGameOver] = useState(false);
    const router = useRouter();

    const [totalWater, setTotalWater] = useState(0);
    const [totalRice, setTotalRice] = useState(0);
    const [nutritionCounter, setNutritionCounter] = useState(0);
    const [hygieneCounter, setHygieneCounter] = useState(0);
    const [isSick, setIsSick] = useState(false);
    const [mealHistory, setMealHistory] = useState<(string | undefined)[]>([]);
    const [gameOverReason, setGameOverReason] = useState("");
    const [originalSelection, setOriginalSelection] = useState<{id: number, quantity: number}[]>([]);
    
    const [turnEventQueue, setTurnEventQueue] = useState<(() => void)[]>([]);
    const [isResolvingTurn, setIsResolvingTurn] = useState(false);

    // ▼▼▼ 修正点1: シミュレーション開始時に、朝のイベントキューを自動で開始する ▼▼▼
    useEffect(() => {
        const initializeSimulation = async () => {
            try {
                const q = query(collection(db, "userSelections"), orderBy("createdAt", "desc"), limit(1));
                const querySnapshot = await getDocs(q);
                if (querySnapshot.empty) { setMessage("保存された備蓄品データがありません。"); setIsLoading(false); return; }
                const selectedItems = querySnapshot.docs[0].data().items as {id: number, quantity: number}[];
                
                setOriginalSelection(selectedItems);
                let waterTank = 0; let riceBin = 0;
                const startingInventory: InventoryItem[] = [];
                selectedItems.forEach(item => {
                    const details = allItems.find(d => d.id === item.id);
                    if (!details) return;
                    if (details.resourceType === 'water') { waterTank += (details.resourceAmount || 0) * item.quantity; }
                    else if (details.resourceType === 'rice') { riceBin += (details.resourceAmount || 0) * item.quantity; }
                    else {
                        startingInventory.push({ ...item, uses: details.maxUses ? details.maxUses * item.quantity : undefined });
                    }
                });
                
                setTotalWater(waterTank); 
                setTotalRice(riceBin);
                setInventory(startingInventory);
                setInitialInventory(JSON.parse(JSON.stringify(startingInventory)));
                
                // --- 1日目の朝専用のイベントキューを作成 ---
                const queue: (() => void)[] = [];
                
                // イベント1: 初期消耗
                queue.push(() => {
                    const startingStatus = {
                        satiety: 100 - 30,
                        hydration: 100 - 30,
                        hygiene: 100 - 20,
                        morale: 100 - 20,
                    };
                    setStatus(startingStatus);
                    setGaugeHistory([startingStatus]);
                    setMessage("避難生活1日目の朝。");
                });

                // イベント2: 朝のトイレ消費
                const toiletDetails = getItemDetails(6);
                const toiletItem = startingInventory.find(i => i.id === 6);
                if (toiletDetails && toiletItem) {
                    queue.push(() => {
                        const consumeCount = 1; // 朝は1回
                        if ((toiletItem.uses || 0) >= consumeCount) {
                            consumeItem(6, 'uses', consumeCount);
                            const effects = { hygiene: (toiletDetails.effects.hygiene || 0) * consumeCount };
                            applyEffects(effects);
                            setMessage(`携帯トイレを${consumeCount}回使用した。${formatEffects(effects)}`);
                        } else {
                            setGameOverReason('no_toilet');
                        }
                    });
                } else {
                    queue.push(() => setGameOverReason('no_toilet'));
                }

                // イベントキューを開始
                setTurnEventQueue(queue);
                setIsResolvingTurn(true);

            } catch (error) { console.error("Error fetching data:", error); setMessage("データの読み込みに失敗しました。");
            } finally { setIsLoading(false); }
        };
        initializeSimulation();
    }, []);

    useEffect(() => {
        if (isLoading || isGameOver) return;
        let reason = "";
        if (gameOverReason) reason = gameOverReason;
        else if (status.satiety <= 0) reason = "satiety";
        else if (status.hydration <= 0) reason = "hydration";
        else if (status.hygiene <= 0) reason = "hygiene";
        else if (status.morale <= 0) reason = "morale";
        else if (turnCount >= TOTAL_TURNS) reason = "clear";
        if (reason) {
            setIsGameOver(true);
            const resultData = { selectedItems: originalSelection, gaugeHistory: [...gaugeHistory, status], '不足したアイテム': generateLackingItems(reason), };
            sessionStorage.setItem('simulationResult', JSON.stringify(resultData));
            let endMessage = "いずれかのステータスが0になり、避難生活を続けることができなくなった...";
            if (reason === 'clear') endMessage = "7日間を乗り切った！";
            if (reason === 'no_toilet') endMessage = "トイレが使えず、衛生環境が悪化し、活動不能になった...";
            setMessage(endMessage);
            setTimeout(() => { router.push(`/result`); }, 3000);
        }
    }, [status, turnCount, isLoading, gameOverReason]);

    const generateLackingItems = (reason: string) => { return []; };
    const getItemDetails = (id: number): Item | undefined => allItems.find(item => item.id === id);
    const formatEffects = (effects: Effect): string => { const parts = []; if (effects.satiety) parts.push(`満腹${effects.satiety > 0 ? '+' : ''}${effects.satiety}`); if (effects.hydration) parts.push(`水分${effects.hydration > 0 ? '+' : ''}${effects.hydration}`); if (effects.hygiene) parts.push(`衛生${effects.hygiene > 0 ? '+' : ''}${effects.hygiene}`); if (effects.morale) parts.push(`精神${effects.morale > 0 ? '+' : ''}${effects.morale}`); return parts.length > 0 ? ` (${parts.join(', ')})` : ''; };
    const applyEffects = (effects: Effect, foodCategory?: string, nutritionEffect?: number) => { setStatus(prev => ({ satiety: Math.max(0,Math.min(MAX_STATUS, prev.satiety + (effects.satiety || 0))), hydration: Math.max(0,Math.min(MAX_STATUS, prev.hydration + (effects.hydration || 0))), hygiene: Math.max(0,Math.min(MAX_STATUS, prev.hygiene + (effects.hygiene || 0))), morale: Math.max(0,Math.min(MAX_STATUS, prev.morale + (effects.morale || 0))), })); if (foodCategory) { setMealHistory(prev => [...prev.slice(-2), foodCategory]); } if (nutritionEffect != null) { setNutritionCounter(prev => Math.max(0, prev + nutritionEffect)); } };
    const consumeItem = (itemId: number, consumeType: 'quantity' | 'uses' = 'quantity', amount: number = 1) => { setInventory(currentInventory => currentInventory.map(item => { if (item.id === itemId) { const newItem = { ...item }; if (consumeType === 'quantity') { newItem.quantity -= amount; } else { newItem.uses = (newItem.uses || 0) - amount; if (newItem.uses <= 0) { newItem.quantity -= 1; const details = getItemDetails(itemId); if (newItem.quantity > 0 && details?.maxUses) { newItem.uses = details.maxUses; } } } return newItem; } return item; }).filter(item => item.quantity > 0)); };
    const handleUseItem = (itemId: number, heated = false) => { if (isResolvingTurn || isGameOver) return; const details = getItemDetails(itemId); if (!details) return; if (itemId === 5) { if (isSick) { setIsSick(false); applyEffects(details.effects); consumeItem(itemId, 'uses'); setMessage(`救急箱を使い、体調が回復した！${formatEffects(details.effects)}`); } else { setMessage("体調は悪くないので、救急箱は使わなかった。"); } return; } if (heated) { const hasStove = inventory.some(i => i.id === 7); const gasCanister = inventory.find(i => i.id === 23); if (!hasStove) { setMessage("加熱にはカセットコンロが必要です。"); return; } const cost = details.heatingCost; if (!cost) { setMessage("このアイテムは加熱できません。"); return; } const fuelCost = cost.gas || 0; const waterCost = cost.water || 0; if (!gasCanister || (gasCanister.uses || 0) < fuelCost) { setMessage("燃料が足りません。"); return; } if (totalWater < waterCost) { setMessage("調理に使う水が足りません。"); return; } consumeItem(23, 'uses', fuelCost); setTotalWater(prev => prev - waterCost); applyEffects(details.heatedEffects || {}, details.foodCategory, details.nutritionEffect); consumeItem(itemId); setMessage(`${details.name}を加熱して食べた。${formatEffects(details.heatedEffects || {})}`); } else { applyEffects(details.effects, details.foodCategory, details.nutritionEffect); if (details.maxUses) { consumeItem(itemId, 'uses'); } else { consumeItem(itemId); } setMessage(`${details.name}を使用した。${formatEffects(details.effects)}`); } };
    const handleDrinkWater = () => { if (isResolvingTurn || isGameOver) return; if (totalWater < 500) { setMessage("飲める水が足りません。"); return; } setTotalWater(prev => prev - 500); const effects = { hydration: 25 }; applyEffects(effects, 'nutrition', -1); setMessage(`水を500ml飲んだ。${formatEffects(effects)}`); };
    const handleCookRice = () => { if (isResolvingTurn || isGameOver) return; const hasStove = inventory.some(i => i.id === 7); const gasCanister = inventory.find(i => i.id === 23); if (!hasStove) { setMessage("加熱にはカセットコンロが必要です。"); return; } if (totalRice < 150) { setMessage("炊くお米がありません。"); return; } if (totalWater < 200) { setMessage("お米を炊く水が足りません。"); return; } if (!gasCanister || (gasCanister.uses || 0) < 2) { setMessage("燃料が足りません（炊飯には2回分必要）。"); return; } setTotalRice(prev => prev - 150); setTotalWater(prev => prev - 200); consumeItem(23, 'uses', 2); const effects = { satiety: 25, morale: 5 }; applyEffects(effects, 'main', 0); setMessage(`ご飯を1合炊いて食べた。${formatEffects(effects)}`); };
    
    // ▼▼▼ 修正点3: handleNextTurnは、次のターンのイベントキューを作成するだけのシンプルな役割に ▼▼▼
    const handleNextTurn = () => {
        if (isResolvingTurn || isGameOver) return;
        setIsResolvingTurn(true);

        const queue: (() => void)[] = [];

        const nextTurnCount = turnCount + 1;
        const newDay = Math.floor(nextTurnCount / 3) + 1;
        const turnIndex = nextTurnCount % 3;
        const newTurn: Turn = ['朝', '昼', '夜'][turnIndex];
        const prevTurn = turn;
        
        // イベント1: 次のターンに進み、ゲージを自然減少させる
        queue.push(() => {
            let decayRate = isSick ? 1.5 : 1.0;
            applyEffects({
                satiety: -30 * decayRate, hydration: -30 * decayRate,
                hygiene: -20 * decayRate, morale: -20 * decayRate,
            });
            setTurnCount(nextTurnCount);
            setDay(newDay);
            setTurn(newTurn);
            if (prevTurn === '夜') { setMealHistory([]); }
            setMessage(`${newDay}日目の${newTurn}になった。`);
        });

        // イベント2: 新しいターンのトイレ消費
        const toiletDetails = getItemDetails(6);
        const toiletSchedule = toiletDetails?.autoConsume?.schedule.find(s => s.turn === newTurn);
        if (toiletSchedule) {
            queue.push(() => {
                const currentToiletItem = inventory.find(i => i.id === 6);
                const consumeCount = toiletSchedule.count;
                if (currentToiletItem && (currentToiletItem.uses || 0) >= consumeCount) {
                    consumeItem(6, 'uses', consumeCount);
                    const effects = { hygiene: (toiletDetails.effects.hygiene || 0) * consumeCount };
                    applyEffects(effects);
                    setMessage(`携帯トイレを${consumeCount}回使用した。${formatEffects(effects)}`);
                } else {
                    setGameOverReason('no_toilet');
                }
            });
        }
        
        // イベント3: 体調不良/食事マンネリ判定
        queue.push(() => {
            let messageLog = "";
            let effects: Effect = {};
            let newHygieneCounter = hygieneCounter;
            if (!isSick) {
                if (status.hygiene < 40) { newHygieneCounter++; }
                else { newHygieneCounter = 0; }
                if (newHygieneCounter >= 2) {
                    setIsSick(true);
                    effects = { ...effects, satiety: -10, hydration: -10, hygiene: -10, morale: -10 };
                    messageLog = "体調不良になった。（衛生状態の悪化が原因）";
                    setNutritionCounter(0); 
                    newHygieneCounter = 0;
                } else if (nutritionCounter >= 3) {
                    setIsSick(true);
                    effects = { ...effects, satiety: -10, hydration: -10, hygiene: -10, morale: -10 };
                    messageLog = "体調不良になった。（栄養の偏りが原因）";
                    setNutritionCounter(0);
                    newHygieneCounter = 0;
                }
            }
            if (mealHistory.length === 3 && mealHistory.every(cat => cat === 'main' || cat === 'side')) {
                effects = { ...effects, morale: (effects.morale || 0) - 5 };
                messageLog += (messageLog ? " " : "") + "同じような食事ばかりで、気が滅入る...";
            }
            setHygieneCounter(newHygieneCounter);
            if (messageLog) {
                applyEffects(effects);
                setMessage(messageLog);
            } else {
                handleAdvanceTurn();
            }
        });

        setTurnEventQueue(queue);
    };

    useEffect(() => {
        if (turnEventQueue.length > 0 && isResolvingTurn) {
            const nextEvent = turnEventQueue[0];
            nextEvent();
        }
    }, [turnEventQueue, isResolvingTurn]);

    const handleAdvanceTurn = () => {
        const nextQueue = turnEventQueue.slice(1);
        if (nextQueue.length > 0) {
            setTurnEventQueue(nextQueue);
        } else {
            setTurnEventQueue([]);
            setIsResolvingTurn(false);
        }
    };
    
    if (isLoading) { return <div className="bg-[#F3EADF] min-h-screen flex items-center justify-center text-2xl text-[#5C4033]">データを読み込んでいます...</div>; }

    return (
        <div className="min-h-screen font-sans p-4 sm:p-8 text-[#5C4033] bg-cover bg-center h-screen flex flex-col relative" style={{ backgroundImage: `url('/images/background.png')` }}>
            <div className="absolute top-4 sm:top-8 left-4 sm:left-8 z-10 w-full max-w-sm bg-[#F9F6F0] border-2 border-[#E9DDCF] p-4 rounded-xl shadow-xl text-[#5C4033]">
                <div className="space-y-4">
                    <div> <div className="flex justify-between items-center mb-1 px-1"> <span className="font-bold">満腹</span> <span className="text-sm font-mono">{Math.round(status.satiety)} / 100</span> </div> <StatusBar value={status.satiety} color="#D97706" /> </div>
                    <div> <div className="flex justify-between items-center mb-1 px-1"> <span className="font-bold">水分</span> <span className="text-sm font-mono">{Math.round(status.hydration)} / 100</span> </div> <StatusBar value={status.hydration} color="#2563EB" /> </div>
                    <div> <div className="flex justify-between items-center mb-1 px-1"> <span className="font-bold">衛生</span> <span className="text-sm font-mono">{Math.round(status.hygiene)} / 100</span> </div> <StatusBar value={status.hygiene} color="#16A34A" /> </div>
                    <div> <div className="flex justify-between items-center mb-1 px-1"> <span className="font-bold">精神</span> <span className="text-sm font-mono">{Math.round(status.morale)} / 100</span> </div> <StatusBar value={status.morale} color="#FBBF24" /> </div>
                </div>
            </div>
            <div className="container mx-auto max-w-6xl flex flex-col flex-grow min-h-0">
                <header className="text-center mb-8 flex-shrink-0">
                    <div className="inline-block bg-[#F9F6F0] px-10 py-3 rounded-lg shadow-lg border-2 border-[#E9DDCF]">
                        <h1 className="text-3xl sm:text-4xl font-bold tracking-wider">{day}日目 - {turn}</h1>
                    </div>
                </header>
                <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-grow min-h-0">
                    <div className="lg:col-span-2 flex flex-col items-center justify-between min-h-0">
                        <div className="flex-grow flex items-center justify-center relative pt-24">
                            <img src="/images/my-character.png" alt="キャラクター" className="drop-shadow-2xl max-h-[55vh]" />
                            {isSick && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl animate-ping">😷</div>}
                        </div>
                        <div className="bg-[#F9F6F0] w-full max-w-2xl mx-auto px-6 py-4 rounded-lg shadow-lg text-center border-2 border-[#E9DDCF] flex items-center justify-center gap-4 h-24">
                            <p className="text-xl font-semibold flex-grow">{message}</p>
                            {isResolvingTurn && (
                                <button onClick={handleAdvanceTurn} className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 flex-shrink-0">
                                    次へ
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="bg-[#F9F6F0] p-6 rounded-2xl shadow-md border-2 border-[#E9DDCF] flex flex-col min-h-0">
                        <h2 className="text-2xl font-bold mb-4 text-center flex-shrink-0">所持品・資源</h2>
                        <div className="space-y-3 flex-grow overflow-y-auto pr-2">
                            {totalWater > 0 && ( <div className="bg-white p-2 rounded-lg shadow-sm"> <div className="flex items-center justify-between"> <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center p-1"><img src="/images/water.png" alt="水" className="max-w-full max-h-full object-contain" /></div> <p className="font-semibold flex-grow mx-2 text-sm">水</p> <div className="text-lg font-bold">{totalWater}<span className="text-xs">ml</span></div> </div> <div className="mt-2"><button onClick={handleDrinkWater} disabled={isResolvingTurn || isGameOver} className="w-full text-xs bg-blue-500 text-white font-bold py-1 rounded hover:bg-blue-600 disabled:bg-gray-400">水を飲む</button></div> </div> )}
                            {totalRice > 0 && ( <div className="bg-white p-2 rounded-lg shadow-sm"> <div className="flex items-center justify-between"> <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center p-1"><img src="/images/rice.png" alt="無洗米" className="max-w-full max-h-full object-contain" /></div> <p className="font-semibold flex-grow mx-2 text-sm">無洗米</p> <div className="text-lg font-bold">{totalRice}<span className="text-xs">g</span></div> </div> <div className="mt-2"><button onClick={handleCookRice} disabled={isResolvingTurn || isGameOver} className="w-full text-xs bg-amber-600 text-white font-bold py-1 rounded hover:bg-amber-700 disabled:bg-gray-400">ご飯を炊く</button></div> </div> )}
                            {inventory.map(invItem => { const details = getItemDetails(invItem.id); if (!details) return null; return ( <div key={invItem.id} className="bg-white p-2 rounded-lg shadow-sm"> <div className="flex items-center justify-between"> <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center p-1"><img src={details.image} alt={details.name} className="max-w-full max-h-full object-contain" /></div> <p className="font-semibold flex-grow mx-2 text-sm">{details.name}</p> <div className="text-lg font-bold"> {details.id === 6 || details.id === 23 ? (<>{invItem.uses}<span className="text-xs">回</span></>) : (<> x {invItem.quantity} {invItem.uses != null && <span className="text-xs text-gray-500 ml-1"> (残{invItem.uses})</span>} </>)} </div> </div> <div className="mt-2 flex gap-2"> {details.id === 5 ? ( <button onClick={() => handleUseItem(invItem.id)} disabled={!isSick || isResolvingTurn || isGameOver} className="w-full text-xs bg-green-500 text-white font-bold py-1 rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed">体調不良を治す</button> ) : ( <> {Object.keys(details.effects).length > 0 && !details.heatable && details.id !== 6 && details.id !== 23 && ( <button onClick={() => handleUseItem(invItem.id)} disabled={isResolvingTurn || isGameOver} className="w-full text-xs bg-green-500 text-white font-bold py-1 rounded hover:bg-green-600 disabled:bg-gray-400">使用</button> )}
                                            {details.heatable && (
                                                (details.id === 2 || details.id === 16) ? (
                                                    <button onClick={() => handleUseItem(invItem.id, true)} disabled={isResolvingTurn || isGameOver} className="w-full text-xs bg-red-500 text-white font-bold py-1 rounded hover:bg-red-600 disabled:bg-gray-400">加熱する</button>
                                                ) : (
                                                    <>
                                                        <button onClick={() => handleUseItem(invItem.id, false)} disabled={Object.keys(details.effects).length === 0 || isResolvingTurn || isGameOver} className="w-1/2 text-xs bg-gray-400 text-white font-bold py-1 rounded hover:bg-gray-500 disabled:opacity-50">そのまま</button>
                                                        <button onClick={() => handleUseItem(invItem.id, true)} disabled={isResolvingTurn || isGameOver} className="w-1/2 text-xs bg-red-500 text-white font-bold py-1 rounded hover:bg-red-600 disabled:bg-gray-400">加熱</button>
                                                    </>
                                                )
                                            )}
                                            </> )} </div> </div> ); })}
                        </div>
                        <div className="mt-auto pt-4 flex-shrink-0">
                            <button onClick={handleNextTurn} disabled={isResolvingTurn || isGameOver} className="w-full bg-blue-500 text-white font-bold py-3 rounded-lg hover:bg-blue-600 transition-all shadow-md text-lg disabled:bg-gray-400 disabled:cursor-not-allowed">
                                {isGameOver ? "シミュレーション終了" : (isResolvingTurn ? "ターン進行中..." : "次のターンへ")}
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}