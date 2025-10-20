'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { type Item, type Effect, allItems, type HeatingCost } from '../data/items';
import PortableToiletModal from '../components/PortableToiletModal'; 

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
type InventoryItem = { id: number; quantity: number; uses?: number; };
type PlayerStatus = { satiety: number; hydration: number; hygiene: number; morale: number; };
type Turn = '朝' | '昼' | '夜';

// --- UIコンポーネント (変更なし) ---
const StatusBar = ({ value, color }: { value: number, color: string }) => ( <div className="w-full bg-[#E9DDCF] rounded-full h-6 overflow-hidden border-2 border-[#D4C3B0] shadow-inner"> <div className={`h-full rounded-full transition-all duration-500`} style={{ width: `${value}%`, backgroundColor: color }}></div> </div>);
const MAX_STATUS = 100;
const TOTAL_TURNS = 9;

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
    if (!effects) return null;
    return (
        <div className="flex flex-wrap gap-1">
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
        <div className="text-xs text-gray-500 font-semibold">
            消費:
            {cost.gas ? <span className="ml-1">燃料x{cost.gas}</span> : null}
            {cost.water ? <span className="ml-1">水{cost.water}ml</span> : null}
        </div>
    );
};

export default function SimulationPage() {
    // --- State定義 (変更なし) ---
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
    const [isSick, setIsSick] = useState(false);
    const [gameOverReason, setGameOverReason] = useState("");
    const [originalSelection, setOriginalSelection] = useState<{id: number, quantity: number}[]>([]);
    const [isResolvingTurn, setIsResolvingTurn] = useState(false);
    
    const [turnStep, setTurnStep] = useState<'idle' | 'decay' | 'intro_message_0' | 'intro_message_1' | 'intro_message_2' | 'intro_message_3' | 'intro_message_4' | 'toilet' | 'wash_hands_check' | 'wash_hands_result'>('idle');
    
    const [nutritionCounter, setNutritionCounter] = useState(0);
    const [mealHistory, setMealHistory] = useState<(string | undefined)[]>([]);
    const [usedHygieneItems, setUsedHygieneItems] = useState<number[]>([]);
    const [hasUsedBoilingWaterToday, setHasUsedBoilingWaterToday] = useState(false);
    
    const arbitraryHygieneItems = [10, 20, 21, 22];
    
    const [isToiletModalOpen, setIsToiletModalOpen] = useState(false);

    const getItemDetails = (id: number): Item | undefined => allItems.find(item => item.id === id);

    const applyEffects = (effects: Effect) => {
        setStatus(prev => ({
            satiety: Math.max(0, Math.min(MAX_STATUS, prev.satiety + (effects.satiety || 0))),
            hydration: Math.max(0, Math.min(MAX_STATUS, prev.hydration + (effects.hydration || 0))),
            hygiene: Math.max(0, Math.min(MAX_STATUS, prev.hygiene + (effects.hygiene || 0))),
            morale: Math.max(0, Math.min(MAX_STATUS, prev.morale + (effects.morale || 0))),
        }));
    };

    const consumeItem = (itemId: number, consumeType: 'uses' | 'quantity', amount: number) => {
        setInventory(prevInventory => {
            const newInventory = [...prevInventory];
            const itemIndex = newInventory.findIndex(item => item.id === itemId);

            if (itemIndex > -1) {
                const item = { ...newInventory[itemIndex] };
                if (consumeType === 'quantity') {
                    item.quantity -= amount;
                } else {
                    item.uses = (item.uses || 0) - amount;
                }

                if (item.uses !== undefined && item.uses <= 0) {
                    item.quantity -= 1;
                    const details = getItemDetails(itemId);
                    if (item.quantity > 0 && details?.maxUses) {
                        item.uses = details.maxUses;
                    }
                }
                 
                if (item.quantity > 0) {
                    newInventory[itemIndex] = item;
                } else {
                    newInventory.splice(itemIndex, 1);
                }
            }
            return newInventory;
        });
    };
     
    useEffect(() => {
        const initializeSimulation = async () => {
            setIsLoading(true);
            try {
                const q = query(collection(db, "userSelections"), orderBy("createdAt", "desc"), limit(1));
                const querySnapshot = await getDocs(q);
                if (querySnapshot.empty) { 
                    setMessage("保存された備蓄品データがありません。"); 
                    setIsLoading(false); 
                    return; 
                }
                const selectedItems = querySnapshot.docs[0].data().items as {id: number, quantity: number}[];
                setOriginalSelection(selectedItems);

                let waterTank = 0;
                const tempInventory: InventoryItem[] = [];
                selectedItems.forEach(item => {
                    const details = getItemDetails(item.id);
                    if (!details) return;
                    if (details.resourceType === 'water') {
                        waterTank += (details.resourceAmount || 0) * item.quantity;
                    } else {
                        tempInventory.push({ ...item, uses: details.maxUses ? details.maxUses * item.quantity : undefined });
                    }
                });
                 
                setTotalWater(waterTank);
                setInventory(tempInventory);

                setTurnCount(1);
                setIsResolvingTurn(true);
                setTurnStep('decay'); 

            } catch (error) {
                console.error("Error fetching data:", error);
                setMessage("データの読み込みに失敗しました。");
            } finally {
                setIsLoading(false);
            }
        };

        initializeSimulation();
    }, []);
     
    useEffect(() => {
        if (!isResolvingTurn || turnCount === 0 || isGameOver) return;

        if(turnStep === 'decay') {
            const newDay = Math.floor((turnCount - 1) / 3) + 1;
            const turnIndex = (turnCount - 1) % 3;
            const newTurn: Turn = (['朝', '昼', '夜'] as const)[turnIndex];
            setDay(newDay);
            setTurn(newTurn);

            if (newTurn === '朝') {
                setHasUsedBoilingWaterToday(false); 
            }
 
            const decayRate = isSick ? 1.5 : 1.0;
            let decayEffects: Effect = {};
            if (newTurn === '朝') {
                decayEffects = { satiety: -20 * decayRate, hydration: -25 * decayRate, hygiene: -20 * decayRate, morale: -15 * decayRate };
            } else {
                decayEffects = { satiety: -25 * decayRate, hydration: -25 * decayRate, hygiene: -30 * decayRate, morale: -15 * decayRate };
            }
            applyEffects(decayEffects);
            
            if (turnCount === 1) {
                setTurnStep('intro_message_0'); 
            } else {
                setMessage(`${newDay}日目の${newTurn}。`);
                setTurnStep('toilet'); 
            }
        }
        else if (turnStep === 'intro_message_0') {
            setMessage("不安でよく眠れないまま朝を迎えた。");
        }
        else if (turnStep === 'intro_message_1') {
            setMessage("「（ピロン…）スマートフォンが鳴った。家族からの連絡か！？」");
        }
        else if (turnStep === 'intro_message_2') {
            setMessage("「…違った。マンションの管理会社からの一斉メールだ。」");
        }
        else if (turnStep === 'intro_message_3') {
            setMessage("『緊急連絡：全住民の皆様へ。配管破損の恐れあり！復旧のアナウンスがあるまで、絶対にトイレの水を流さないでください。下の階で汚水が逆流する可能性があります！』");
        }
        else if (turnStep === 'intro_message_4') {
            setMessage("非常用トイレを使うしかないな・・・");
        }
        else if(turnStep === 'toilet') {
            const toiletDetails = getItemDetails(6)!; 
            const toiletSchedule = toiletDetails.autoConsume!.schedule.find(s => s.turn === turn)!;
            const consumeCount = toiletSchedule.count; 
            const toiletItem = inventory.find(i => i.id === 6);

            if (toiletItem && (toiletItem.uses || 0) >= consumeCount) {
                consumeItem(6, 'uses', consumeCount);
                const effectPerUse = (toiletDetails.effects.hygiene || 0);
                const totalEffect = effectPerUse * consumeCount;
                applyEffects({ hygiene: totalEffect });
                setMessage(`携帯トイレを${consumeCount}回使用した。(衛生+${totalEffect})`);
            } else {
                setGameOverReason('no_toilet');
            }
        }
        else if(turnStep === 'wash_hands_check') {
            setMessage("トイレの後は手を綺麗にしないと・・・");
        }
        else if(turnStep === 'wash_hands_result') {
            const toiletSchedule = getItemDetails(6)!.autoConsume!.schedule.find(s => s.turn === turn)!;
            const consumeCount = toiletSchedule.count;
            const wetWipes = inventory.find(i => i.id === 10); 
            const wipesDetails = getItemDetails(10)!;

            if (wetWipes && (wetWipes.uses || 0) >= consumeCount) {
                consumeItem(10, 'uses', consumeCount);
                const effectPerUse = (wipesDetails.effects.hygiene || 0);
                const totalEffect = effectPerUse * consumeCount;
                applyEffects({ hygiene: totalEffect });
                setMessage(`ウェットティッシュを使用した。(衛生+${totalEffect})`);
            } else {
                setMessage("手を綺麗にしたいけど、ウェットティッシュがない・・・");
            }
        }
    }, [turnStep, isResolvingTurn, isGameOver, turnCount]); 

    const handleAdvanceTurn = () => {
        
        if (turnStep === 'intro_message_0') {
            setTurnStep('intro_message_1');
        } 
        else if (turnStep === 'intro_message_1') {
            setTurnStep('intro_message_2');
        } else if (turnStep === 'intro_message_2') {
            setTurnStep('intro_message_3');
        } else if (turnStep === 'intro_message_3') {
            setTurnStep('intro_message_4');
        } else if (turnStep === 'intro_message_4') {
            setIsToiletModalOpen(true); 
        } 
        else if (turnStep === 'toilet') {
            setTurnStep('wash_hands_check');
        } else if (turnStep === 'wash_hands_check') {
            setTurnStep('wash_hands_result');
        } else if (turnStep === 'wash_hands_result') {
            setTurnStep('idle');
            setIsResolvingTurn(false);
            setMessage("何をしようか...");
        }
    };
     
    const handleNextTurn = () => {
        if (isResolvingTurn || isGameOver) return;
         
        if (turnCount >= TOTAL_TURNS) {
            setIsGameOver(true);
            setMessage("3日間を乗り切った！");
            setTimeout(() => { router.push(`/result`); }, 3000);
            return;
        }

        setIsResolvingTurn(true);
        setUsedHygieneItems([]);
        setTurnCount(prev => prev + 1);
        setTurnStep('decay'); 
    };

    useEffect(() => {
        if (isGameOver || isLoading) return;
        let reason = "";
        if (gameOverReason) reason = gameOverReason;
        else if (status.satiety <= 0) reason = "satiety";
        else if (status.hydration <= 0) reason = "hydration";
        else if (status.hygiene <= 0) reason = "hygiene";
        else if (status.morale <= 0) reason = "morale";
         
        if (reason) {
            setIsGameOver(true);
            const resultData = {
                selectedItems: originalSelection,
                gaugeHistory: [status],
                '不足したアイテム': [], 
                turnCount: turnCount,
                totalTurns: TOTAL_TURNS,
            };
            sessionStorage.setItem('simulationResult', JSON.stringify(resultData));
            let endMessage = "いずれかのステータスが0になり、避難生活を続けることができなくなった...";
            if (reason === 'no_toilet') endMessage = "トイレが使えず、衛生環境が悪化し、活動不能になった...";
            setMessage(endMessage);
            setTimeout(() => { router.push(`/result`); }, 3000);
        }
    }, [status, gameOverReason, isLoading]);
     
    const handleUseItem = (itemId: number, heated = false) => {
        if (isResolvingTurn || isGameOver) return;
        const details = getItemDetails(itemId);
        if (!details) return;

        if (details.category === 'hygiene' && details.id !== 5) {
            if (usedHygieneItems.includes(itemId)) {
                setMessage("この衛生用品は、このターンではもう使用できません。");
                return;
            }
        }
         
        if (itemId === 5) {
            if (isSick) {
                setIsSick(false);
                consumeItem(itemId, 'uses', 1);
                setMessage(`救急箱を使い、体調が回復した！`);
            } else {
                setMessage("体調は悪くないので、救急箱は使わなかった。");
            }
            return;
        }

        if (heated) {
            const hasStove = inventory.some(i => i.id === 7);
            const gasCanister = inventory.find(i => i.id === 23);
            if (!hasStove) { setMessage("加熱にはカセットコンロが必要です。"); return; }
            const cost = details.heatingCost;
            if (!cost) { setMessage("このアイテムは加熱できません。"); return; }

            const boilingItems = [2, 3, 13]; 
            const fuelCost = cost.gas || 0;
            const waterCost = cost.water || 0; 

            if (!gasCanister || (gasCanister.uses || 0) < fuelCost) { setMessage("燃料が足りません。"); return; }

            let waterConsumedThisTurn = 0;
            let customMessage = "";

            if (boilingItems.includes(itemId)) {
                if (!hasUsedBoilingWaterToday) {
                    if (totalWater < waterCost) { setMessage(`湯煎に必要な水が${waterCost}ml足りません。`); return; }
                    waterConsumedThisTurn = waterCost;
                    setHasUsedBoilingWaterToday(true);
                    customMessage = `湯煎のために水${waterCost}mlを使い、コンロで加熱した。この水は今日中なら使い回せる。`;
                } else {
                    waterConsumedThisTurn = 0; 
                    customMessage = `今日は既にお湯を沸かしているので、それを使って加熱した。`;
                }
            } else {
                if (totalWater < waterCost) { setMessage(`調理に使う水が${waterCost}ml足りません。`); return; }
                waterConsumedThisTurn = waterCost;
                customMessage = `${details.name}を加熱して食べた。`;
            }
             
            consumeItem(23, 'uses', fuelCost); 
            consumeItem(itemId, 'quantity', 1); 
            setTotalWater(prev => prev - waterConsumedThisTurn); 
            applyEffects(details.heatedEffects || {});
            setMessage(customMessage);

        } else {
            applyEffects(details.effects || {});
            if (details.maxUses) {
                consumeItem(itemId, 'uses', 1);
            } else {
                consumeItem(itemId, 'quantity', 1);
            }
            setMessage(`${details.name}を使用した。`);
        }

        if (details.category === 'hygiene' && details.id !== 5) {
            setUsedHygieneItems(prev => [...prev, itemId]);
        }
    };

    const handleDrinkWater = () => {
        if (isResolvingTurn || isGameOver) return;
        if (totalWater < 500) {
            setMessage("飲める水が足りません。");
            return;
        }
        setTotalWater(prev => prev - 500);
        applyEffects({ hydration: 20 });
        setMessage(`水を500ml飲んだ。`);
    };
     
    const categorizedInventory = useMemo(() => {
        const grouped: Record<string, InventoryItem[]> = { food: [], hygiene: [], lifeline: [] };
        inventory.forEach(invItem => {
            const details = getItemDetails(invItem.id);
            if (details) { grouped[details.category]?.push(invItem); }
        });
        return grouped;
    }, [inventory]);

    const categoryNames: { [key in Item['category'] | 'other']: string } = { food: '食料・水', hygiene: '衛生用品', lifeline: '生活用品', other: 'その他' };

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
                        
                        {/* ▼▼▼ 修正 ▼▼▼ (min-h-[6rem] を h-36 に変更) */}
                        <div className="bg-[#F9F6F0] w-full max-w-2xl mx-auto px-6 py-4 rounded-lg shadow-lg text-center border-2 border-[#E9DDCF] flex items-center justify-center gap-4 h-36">
                            <p className="text-xl font-semibold flex-grow whitespace-pre-wrap">{message}</p>
                            {isResolvingTurn && !isGameOver && !isToiletModalOpen && (<button onClick={handleAdvanceTurn} className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 flex-shrink-0">次へ</button>)}
                        </div>
                        {/* ▲▲▲ 修正ここまで ▲▲▲ */}

                    </div>
                    <div className="bg-[#F9F6F0] p-6 rounded-2xl shadow-md border-2 border-[#E9DDCF] flex flex-col min-h-0">
                        <h2 className="text-2xl font-bold mb-4 text-center flex-shrink-0">備蓄品</h2>
                        <div className="space-y-4 flex-grow overflow-y-auto pr-2">
                            {Object.entries(categorizedInventory).map(([category, items]) => {
                                if (items.length === 0 && !(category === 'food' && totalWater > 0)) return null;
                                return (
                                    <div key={category}>
                                        <h3 className="font-bold text-lg border-b-2 border-orange-300 pb-1 mb-2">{categoryNames[category as Item['category']]}</h3>
                                        <div className="space-y-2">
                                            {category === 'food' && totalWater > 0 && (
                                                <div className="bg-white p-3 rounded-lg shadow-sm">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center p-1"><img src="/images/water.png" alt="水" className="max-w-full max-h-full object-contain" /></div>
                                                            <div><p className="font-bold text-base">水</p><p className="text-xl font-bold">{totalWater}<span className="text-xs ml-1">ml</span></p></div>
                                                        </div>
                                                        <button onClick={handleDrinkWater} disabled={isResolvingTurn || isGameOver} className="text-sm bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600 disabled:bg-gray-400">飲む</button>
                                                    </div>
                                                    <div className="mt-2 text-center"><RenderEffects effects={{ hydration: 20 }} /></div>
                                                </div>
                                            )}
                                            {items.map(invItem => {
                                                const details = getItemDetails(invItem.id);
                                                if (!details) return null;
                                                const isHygieneItemUsed = details.category === 'hygiene' && usedHygieneItems.includes(invItem.id);
                                                return (
                                                    <div key={invItem.id} className="bg-white p-2 rounded-lg shadow-sm">
                                                        <div className="flex items-center justify-between">
                                                            <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center p-1"><img src={details.image} alt={details.name} className="max-w-full max-h-full object-contain" /></div>
                                                            <p className="font-semibold flex-grow mx-2 text-sm">{details.name}</p>
                                                            <div className="text-lg font-bold text-right">
                                                                {(details.id === 6 || details.id === 23) ? (
                                                                    <>{invItem.uses}<span className="text-xs">回</span></>
                                                                ) : (details.maxUses && invItem.quantity === 1) ? (
                                                                    <>{invItem.uses}<span className="text-xs">回</span></>
                                                                ) : (
                                                                    <>x {invItem.quantity}</>
                                                                )}
                                                                {details.maxUses && invItem.quantity > 1 && details.id !== 6 && details.id !== 23 && (
                                                                    <span className="text-xs text-gray-500 ml-1">(残{invItem.uses})</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        { details.id !== 6 && (
                                                            <div className="mt-2 space-y-2">
                                                                
                                                                {details.effects && Object.keys(details.effects).length > 0 && !details.heatable && 
                                                                 (details.category === 'food' || arbitraryHygieneItems.includes(details.id) ) && (
                                                                    <div className="flex justify-between items-center">
                                                                        <RenderEffects effects={details.effects} />
                                                                        <button onClick={() => handleUseItem(invItem.id)} disabled={isResolvingTurn || isGameOver || isHygieneItemUsed} className="w-20 text-xs bg-green-500 text-white font-bold py-1 rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed">{isHygieneItemUsed ? '使用済み' : '使用'}</button>
                                                                    </div>
                                                                )}

                                                                {details.id === 5 && (<button onClick={() => handleUseItem(invItem.id)} disabled={!isSick || isResolvingTurn || isGameOver} className="w-full text-xs bg-green-500 text-white font-bold py-1 rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed">体調不良を治す</button>)}
                                                                
                                                                {details.heatable && (
                                                                    <>
                                                                        {details.effects && Object.keys(details.effects).length > 0 && (
                                                                            <div className="bg-gray-50 p-1.5 rounded-md">
                                                                                <div className="flex justify-between items-center">
                                                                                    <RenderEffects effects={details.effects} />
                                                                                    <button onClick={() => handleUseItem(invItem.id, false)} disabled={isResolvingTurn || isGameOver} className="w-20 text-xs bg-gray-400 text-white font-bold py-1 rounded hover:bg-gray-500 disabled:opacity-50">そのまま</button>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        <div className="bg-red-50 p-1.5 rounded-md">
                                                                            <div className="flex justify-between items-center">
                                                                                <div>
                                                                                    <RenderEffects effects={details.heatedEffects} />
                                                                                    <RenderHeatingCost cost={details.heatingCost} />
                                                                                </div>
                                                                                <button onClick={() => handleUseItem(invItem.id, true)} disabled={isResolvingTurn || isGameOver} className="w-20 text-xs bg-red-500 text-white font-bold py-1 rounded hover:bg-red-600 disabled:bg-gray-400">加熱する</button>
                                                                            </div>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-auto pt-4 flex-shrink-0">
                            <button onClick={handleNextTurn} disabled={isResolvingTurn || isGameOver} className="w-full bg-blue-500 text-white font-bold py-3 rounded-lg hover:bg-blue-600 transition-all shadow-md text-lg disabled:bg-gray-400 disabled:cursor-not-allowed">
                                {isGameOver ? "シミュレーション終了" : (isResolvingTurn ? "ターン進行中..." : "次のターンへ")}
                            </button>
                        </div>
                    </div>
                </main>
            </div>
            
            <PortableToiletModal 
                isOpen={isToiletModalOpen} 
                onClose={() => {
                    setIsToiletModalOpen(false);
                    setTurnStep('toilet'); 
                }}
            />
        </div>
    );
}