'use client';

// ▼▼▼ "useMemo" と "useRef" を 'react' からインポートするよう修正 ▼▼▼
import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
// ▼▼▼ インポートを追加・変更 ▼▼▼
import { getFirestore, collection, getDocs, query, orderBy, limit, where, doc, getDoc } from "firebase/firestore"; // ★ where, doc, getDoc を追加
import { db } from '@/lib/firebase'; // ★ db をインポート
import { useAuth } from '@/context/AuthContext'; // ★ AuthContext をインポート
// ▲▲▲ ここまで ▲▲▲
import { type Item, type Effect, allItems, type HeatingCost } from '../data/items';
import PortableToiletModal from '../components/PortableToiletModal';
import DisasterDialModal from '../components/DisasterDialModal';
import SafetyCheckModal from '../components/SafetyCheckModal';
import WaterStationModal from '../components/WaterStationModal';
import RollingStockModal from '../components/RollingStockModal';
import RetortGohanModal from '../components/RetortGohanModal';
import WrapModal from '../components/WrapModal';

// --- Firebase設定 (db と app の定義は lib/firebase.ts に移したので削除) ---


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

// (変更なし)
const formatEffects = (effects: Effect): string => {
    const parts: string[] = [];
    if (effects.satiety) parts.push(`満腹${effects.satiety > 0 ? '+' : ''}${effects.satiety}`);
    if (effects.hydration) parts.push(`水分${effects.hydration > 0 ? '+' : ''}${effects.hydration}`);
    if (effects.hygiene) parts.push(`衛生${effects.hygiene > 0 ? '+' : ''}${effects.hygiene}`);
    if (effects.morale) parts.push(`精神${effects.morale > 0 ? '+' : ''}${effects.morale}`);
    
    if (parts.length === 0) return "";
    return ` (${parts.join(', ')})`;
};


export default function SimulationPage() {
    // --- State定義 ---
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [status, setStatus] = useState<PlayerStatus>({ satiety: 100, hydration: 100, hygiene: 100, morale: 100 });
    const [day, setDay] = useState(1);
    const [turn, setTurn] = useState<Turn>('朝');
    const [turnCount, setTurnCount] = useState(0);
    const [message, setMessage] = useState("データを読み込んでいます...");
    const [isGameOver, setIsGameOver] = useState(false);
    // ▼▼▼ useAuthフックでユーザー情報を取得 ▼▼▼
    const { user, isLoading: isAuthLoading } = useAuth(); // ★
    const router = useRouter(); // ★ routerの定義をこちらに移動
    // ▲▲▲ ここまで ▲▲▲
    const [totalWater, setTotalWater] = useState(0);
    const [isSick, setIsSick] = useState(false);
    const [gameOverReason, setGameOverReason] = useState("");
    const [originalSelection, setOriginalSelection] = useState<{id: number, quantity: number}[]>([]);
    const [isResolvingTurn, setIsResolvingTurn] = useState(false);

    // ▼▼▼ 【追加】 キャラクター表情管理用の State と Ref ▼▼▼
    const [characterExpression, setCharacterExpression] = useState<'normal' | 'relieved'>('normal');
    const expressionTimerRef = useRef<NodeJS.Timeout | null>(null);
    // ▲▲▲ 【追加】 ここまで ▲▲▲

    // (変更なし)
    const [turnStep, setTurnStep] = useState<'idle' | 'decay' | 'intro_message_0' | 'intro_message_1' | 'intro_message_2' | 'intro_message_3' | 'intro_message_4' | 'toilet' | 'wash_hands_check' | 'wash_hands_result' | 'dial_intro_1' | 'dial_intro_2' | 'dial_modal_open' | 'dial_result' | 'night_event_start' | 'night_event_result' | 'safety_check_intro_1' | 'safety_check_intro_2' | 'safety_check_modal_open' | 'safety_check_result' | 'shop_visit_1' | 'shop_visit_2' | 'shop_visit_3' | 'lantern_check' | 'battery_check_result' | 'water_station_intro_1' | 'water_station_intro_2' | 'water_station_modal_open' | 'water_station_result' | 'rolling_stock_intro_1' | 'rolling_stock_intro_2' | 'rolling_stock_modal_open' | 'rolling_stock_result' | 'cairo_check_1' | 'cairo_check_2' | 'cairo_result' | 'final_message'>('idle');
    
    // (変更なし)
    const [backgroundImage, setBackgroundImage] = useState('/images/background.png');

    // (変更なし)
    const [nutritionCounter, setNutritionCounter] = useState(0);
    const [mealHistory, setMealHistory] = useState<(string | undefined)[]>([]);
    const [usedHygieneItems, setUsedHygieneItems] = useState<number[]>([]);
    
    // (変更なし) 湯煎システム
    const [boilingWaterAmount, setBoilingWaterAmount] = useState(0); // その日に沸かしたお湯の量(ml)

    const arbitraryHygieneItems = [10, 20, 21, 22];

    const [isToiletModalOpen, setIsToiletModalOpen] = useState(false);
    const [isDialModalOpen, setIsDialModalOpen] = useState(false);
    const [isSafetyCheckModalOpen, setIsSafetyCheckModalOpen] = useState(false);
    const [isWaterStationModalOpen, setIsWaterStationModalOpen] = useState(false);
    const [isRollingStockModalOpen, setIsRollingStockModalOpen] = useState(false);
    const [isRetortGohanModalOpen, setIsRetortGohanModalOpen] = useState(false);
    const [hasUsedRetortGohan, setHasUsedRetortGohan] = useState(false);
    const [isWrapModalOpen, setIsWrapModalOpen] = useState(false);
    const [hasUsedRetortFood, setHasUsedRetortFood] = useState(false);
    // ▼▼▼ 【追加】 レトルト食品のアクション保存用State ▼▼▼
    const [retortFoodAction, setRetortFoodAction] = useState<'heated' | 'raw' | null>(null);

    // (変更なし) 体調不良 State
    const [hygieneLowCounter, setHygieneLowCounter] = useState(0); 
    const [nutritionNeglectCounter, setNutritionNeglectCounter] = useState(0); 
    const [usedNutritionItemThisTurn, setUsedNutritionItemThisTurn] = useState(false); 

    // ▼▼▼ 【追加】 表情を一時的にフラッシュさせる関数 ▼▼▼
    const flashExpression = (expression: 'relieved', duration: number = 2000) => {
        // 既にタイマーが動いていたらクリア
        if (expressionTimerRef.current) {
            clearTimeout(expressionTimerRef.current);
        }
        
        setCharacterExpression(expression); // 表情をセット

        // durationミリ秒後に 'normal' に戻すタイマーをセット
        expressionTimerRef.current = setTimeout(() => {
            setCharacterExpression('normal');
            expressionTimerRef.current = null;
        }, duration);
    };
    // ▲▲▲ 【追加】 ここまで ▲▲▲

    // (変更なし)
    const getItemDetails = (id: number): Item | undefined => allItems.find(item => item.id === id);

    // (変更なし)
    const applyEffects = (effects: Effect) => {
        setStatus(prev => ({
            satiety: Math.max(0, Math.min(MAX_STATUS, prev.satiety + (effects.satiety || 0))),
            hydration: Math.max(0, Math.min(MAX_STATUS, prev.hydration + (effects.hydration || 0))),
            hygiene: Math.max(0, Math.min(MAX_STATUS, prev.hygiene + (effects.hygiene || 0))),
            morale: Math.max(0, Math.min(MAX_STATUS, prev.morale + (effects.morale || 0))),
        }));
    };

    // (変更なし)
    const consumeItem = (itemId: number, consumeType: 'uses' | 'quantity', amount: number) => {
        setInventory(prevInventory => {
            const newInventory = [...prevInventory];
            const itemIndex = newInventory.findIndex(item => item.id === itemId);

            if (itemIndex > -1) {
                const item = { ...newInventory[itemIndex] };
                if (consumeType === 'quantity') {
                    item.quantity -= amount;
                } else {
                    if (item.uses === undefined) {
                        const details = getItemDetails(itemId);
                        item.uses = details?.maxUses ? details.maxUses * item.quantity : Infinity;
                    }
                    item.uses -= amount;
                }

                const details = getItemDetails(itemId);
                if (details?.maxUses && item.uses !== undefined && item.uses <= 0) {
                    item.quantity -= 1;
                    if (item.quantity > 0) {
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

    // ▼▼▼ ページ保護機能を追加 ▼▼▼
    useEffect(() => {
        if (!isAuthLoading && !user) {
          // 認証読み込みが完了していて、かつユーザーがいない場合
          router.push('/'); // ログインページ（トップ）に戻す
        }
    }, [user, isAuthLoading, router]);
    // ▲▲▲ ここまで ▲▲▲

    // (変更なし)
    useEffect(() => {
        const initializeSimulation = async () => {
            // ▼▼▼ ユーザー情報が読み込めるまで待つ ▼▼▼
            if (!user) {
                // user がまだ null の場合は、読み込みを保留
                return;
            }
            // ▲▲▲ ここまで ▲▲▲

            setIsLoading(true);
            try {
                // ▼▼▼ クエリを「自分のIDに一致する最新の1件」に変更 ▼▼▼
                const q = query(
                    collection(db, "userSelections"), 
                    where("userId", "==", user.uid), // ★ ログイン中のユーザーIDで絞り込み
                    orderBy("createdAt", "desc"), 
                    limit(1)
                );
                // ▲▲▲ ここまで ▲▲▲

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

        // ▼▼▼ 認証読み込み中(isAuthLoading)でないことを確認してから実行 ▼▼▼
        if (!isAuthLoading) {
            initializeSimulation();
        }
        // ▲▲▲ 実行トリガーを [user, isAuthLoading] に変更 ▲▲▲
    }, [user, isAuthLoading]); // ★

    // (変更なし) ターン進行ロジック
    useEffect(() => {
        if (!isResolvingTurn || turnCount === 0 || isGameOver) return;

        // --- ステップ1: ターン開始＆ゲージ減少 ---
        if(turnStep === 'decay') {
            const newDay = Math.floor((turnCount - 1) / 3) + 1;
            const turnIndex = (turnCount - 1) % 3;
            const newTurn: Turn = (['朝', '昼', '夜'] as const)[turnIndex];
            setDay(newDay);
            setTurn(newTurn);

            if (newTurn === '朝') {
                setBoilingWaterAmount(0); 
                setBackgroundImage('/images/background.png');
            }
            else if (newTurn === '夜') {
                const hasLantern = inventory.some(i => i.id === 24);
                
                if (turnCount === 3) {
                    // 1日目の夜: ランタンを持っていればON
                    if (hasLantern) {
                        setBackgroundImage('/images/background_LED.png');
                    } else {
                        setBackgroundImage('/images/background_night.png');
                    }
                } else if (turnCount === 6) {
                    // 2日目の夜: 1日目と同じ状態を引き継ぐ
                    if (hasLantern) {
                        setBackgroundImage('/images/background_LED.png');
                    } else {
                        setBackgroundImage('/images/background_night.png');
                    }
                } else if (turnCount === 9) {
                    // 3日目の夜: 電池が残っているかチェック
                    const batteryItem = inventory.find(i => i.id === 29);
                    const hasBattery = batteryItem && batteryItem.quantity > 0;
                    
                    if (hasLantern && hasBattery) {
                        setBackgroundImage('/images/background_LED.png');
                    } else {
                        setBackgroundImage('/images/background_night.png');
                    }
                }
            }

            // (変更なし) 体調不良チェック
            let sickReasonHygiene = false;
            let sickReasonNutrition = false;
            
            if (!isSick) { 
                if (hygieneLowCounter >= 2) {
                    sickReasonHygiene = true;
                }
                if (nutritionNeglectCounter >= 3) {
                    sickReasonNutrition = true;
                }
    
                if (sickReasonHygiene || sickReasonNutrition) {
                    setIsSick(true); 
                }
            }
            
            const isNowSick = isSick || sickReasonHygiene || sickReasonNutrition;
            
            let decayEffects: Effect = {};
            if (isNowSick) {
                // ペナルティ
                if (newTurn === '朝') {
                    decayEffects = { satiety: -25, hydration: -30, hygiene: -25, morale: -20 };
                } else { // 昼・夜
                    decayEffects = { satiety: -25, hydration: -30, hygiene: -35, morale: -20 };
                }
            } else {
                // 通常
                const decayRate = 1.0;
                if (newTurn === '朝') {
                    decayEffects = { satiety: -20 * decayRate, hydration: -25 * decayRate, hygiene: -20 * decayRate, morale: -15 * decayRate };
                } else {
                    decayEffects = { satiety: -25 * decayRate, hydration: -25 * decayRate, hygiene: -30 * decayRate, morale: -15 * decayRate };
                }
            }
            applyEffects(decayEffects);

            // (変更なし) メッセージ設定
            if (sickReasonHygiene || sickReasonNutrition) {
                let reasonText = "";
                if (sickReasonHygiene && sickReasonNutrition) {
                    reasonText = "衛生状態の悪化と栄養の偏り";
                } else if (sickReasonHygiene) {
                    reasonText = "衛生状態の悪化";
                } else {
                    reasonText = "栄養の偏り";
                }
                setMessage(`${newDay}日目の${newTurn}。\n${reasonText}が原因で体調不良になった。\n(ペナルティでターンごとのゲージ減少が増大)`);
    
            } else if (turnCount === 1) {
                setMessage("1日目の朝。不安でよく眠れないまま朝を迎えた。");
            } else {
                setMessage(`${newDay}日目の${newTurn}。`);
            }
        }

        // (変更なし) 1日目・朝 イントロ
        else if (turnStep === 'intro_message_0') { setMessage("「（ピロン…）スマートフォンが鳴った。家族からの連絡か！？」"); }
        else if (turnStep === 'intro_message_1') { setMessage("「…違った。マンションの管理会社からの一斉メールだ。」"); }
        else if (turnStep === 'intro_message_2') { setMessage("『緊急連絡：全住民の皆様へ。配管破損の恐れあり！復旧のアナウンスがあるまで、絶対にトイレの水を流さないでください。下の階で汚水が逆流する可能性があります！』"); }
        else if (turnStep === 'intro_message_3') { setMessage("非常用トイレを使うしかないな・・・"); }

        // ▼▼▼ 【修正】 トイレ自動消費 (ID 28: ビニール手袋の *消費を削除*) ▼▼▼
        else if(turnStep === 'toilet') {
            const toiletDetails = getItemDetails(6);
            const glovesDetails = getItemDetails(28);
            const toiletSchedule = toiletDetails?.autoConsume?.schedule.find(s => s.turn === turn);
            const consumeCount = toiletSchedule?.count || 1;

            const toiletItem = inventory.find(i => i.id === 6);
            const glovesItem = inventory.find(i => i.id === 28);

            if (toiletDetails && toiletItem && (toiletItem.uses || 0) >= consumeCount) {
                if (glovesDetails && glovesItem && (glovesItem.quantity || 0) >= consumeCount) { // ★ quantity でチェック
                    const hygienePerUse = 6;
                    const totalRecovery = hygienePerUse * consumeCount;
                    const effects: Effect = { hygiene: totalRecovery };
                    consumeItem(6, 'uses', consumeCount);
                    // consumeItem(28, 'quantity', consumeCount); // ★★★【削除】★★★
                    applyEffects(effects);
                    setMessage(`使い捨て手袋と非常用トイレを${consumeCount}回使った。\n衛生的に処理できた。${formatEffects(effects)}`);
                } else {
                    const hygienePerUse = 4;
                    const totalRecovery = hygienePerUse * consumeCount;
                    const effects: Effect = { hygiene: totalRecovery };
                    consumeItem(6, 'uses', consumeCount);
                    applyEffects(effects);
                    setMessage(`非常用トイレを${consumeCount}回使った。${formatEffects(effects)}`);
                }
            } else {
                setMessage("トイレがないと、在宅避難を続けるのは難しい……");
                setGameOverReason('no_toilet');
            }
        }
        // ▲▲▲ 修正ここまで ▲▲▲

        // (変更なし) 手洗いチェック
        else if(turnStep === 'wash_hands_check') { setMessage("トイレの後は、手をきれいにしないと……"); }

        // (変更なし) 手洗い実行
        else if(turnStep === 'wash_hands_result') {
            const toiletSchedule = getItemDetails(6)?.autoConsume?.schedule.find(s => s.turn === turn);
            const consumeCount = toiletSchedule?.count || 1;

            const wetWipes = inventory.find(i => i.id === 10);
            const wipesDetails = getItemDetails(10);

            if (wipesDetails && wetWipes && (wetWipes.uses || 0) >= consumeCount) {
                const hygienePerUse = 4;
                const totalRecovery = hygienePerUse * consumeCount;
                const effects: Effect = { hygiene: totalRecovery };
                consumeItem(10, 'uses', consumeCount);
                applyEffects(effects);
                setMessage(`ウェットティッシュを${consumeCount}回使用した。${formatEffects(effects)}`);
            } else {
                setMessage("手を綺麗にしたいけど、ウェットティッシュがない・・・");
            }
        }

        // ▼▼▼ 【修正】 ターン固有イベント (dial) (ID 8: バッテリーの *消費を削除*) ▼▼▼
        else if (turnStep === 'dial_intro_1') { setMessage("スマートフォンの充電が残り少ない。"); }
        else if (turnStep === 'dial_intro_2') { setMessage("「家族は今、どこにいるんだろう……。無事に避難できたかな。」"); }
        else if (turnStep === 'dial_result') {
            const batteryItem = inventory.find(i => i.id === 8);
            if (batteryItem && (batteryItem.quantity || 0) > 0) { // ★ quantity でチェック
                const effects: Effect = { morale: 8 };
                applyEffects(effects);
                // consumeItem(8, 'quantity', 1); // ★★★【削除】★★★
                setMessage(`モバイルバッテリーのおかげで、家族の伝言を聞けた。無事で、小学校に避難しているようだ。安心した。${formatEffects(effects)}`);
                flashExpression('relieved'); // ★【追加】
            } else {
                const effects: Effect = { morale: -5 };
                applyEffects(effects);
                setMessage(`「ああ、こんな時に限ってスマホの充電が……。モバイルバッテリーを用意しておけばよかった。」${formatEffects(effects)}`);
            }
        }
        // ▲▲▲ 修正ここまで ▲▲▲
        
        // (変更なし)
        else if (turnStep === 'night_event_start') {
            setMessage("夜になり、部屋が暗くなった。");
        }
        
        // (変更なし)
        else if (turnStep === 'night_event_result') {
            const hasLantern = inventory.some(i => i.id === 24);
            if (hasLantern) {
                const effects: Effect = { morale: 4 };
                applyEffects(effects);
                setMessage(`明かりがあるだけで、こんなに安心するんだ……。${formatEffects(effects)}`);
                flashExpression('relieved'); // ★【追加】
            } else {
                const effects: Effect = { morale: -4 };
                applyEffects(effects);
                setMessage(`ランタンを買っておけばよかった。暗いのは不安だ……。${formatEffects(effects)}`);
            }
        }
        // (変更なし) ターン固有イベント (safety_check)
        else if (turnStep === 'safety_check_intro_1') { setMessage("（コン、コン…）ドアをノックする音が聞こえた。\n停電でインターホンは使えない。"); }
        else if (turnStep === 'safety_check_intro_2') { setMessage("ドアを開けると、管理人さんが立っていた。\n「大丈夫ですか？全戸の安否確認をしています。無事でしたら、玄関に“無事”と分かる印を貼ってください。」"); }
        else if (turnStep === 'safety_check_result') {
            const ductTapeItem = inventory.find(i => i.id === 30);
            if (ductTapeItem && (ductTapeItem.quantity > 0 || (ductTapeItem.uses !== undefined && ductTapeItem.uses > 0))) {
                const effects: Effect = { morale: 3 };
                applyEffects(effects);
                setMessage(`布製ガムテープで玄関に安否を張り出した。\nこれで、自分が無事だと周囲に知らせることができる。少し安心した。${formatEffects(effects)}`);
                flashExpression('relieved'); // ★【追加】
            } else {
                setMessage("伝言に使えるものがない…");
            }
        }
        // (変更なし) ターン固有イベント (shop_visit)
        else if (turnStep === 'shop_visit_1') { setMessage("何か買えるものがないかと、近くのコンビニやスーパーを見て回った。"); }
        else if (turnStep === 'shop_visit_2') { setMessage("けれど、棚はすっかり空っぽだった。"); }
        else if (turnStep === 'shop_visit_3') { setMessage("「普段からの備蓄が、やっぱり大事なんだな……」"); }
        
        // (変更なし) ターン固有イベント (lantern_check)
        else if (turnStep === 'lantern_check') {
             const hasLantern = inventory.some(i => i.id === 24);
             if (hasLantern) {
                 setMessage("ランタンが突然消えた。どうやら電池が切れたようだ。");
                 setBackgroundImage('/images/background_night.png'); // ランタン消灯
             } else {
                 setMessage("暗くて料理も片付けも大変だ…。やっぱり明かりは大事だな。");
                 setTurnStep('battery_check_result');
             }
        }
        // ▼▼▼ 【修正】 ターン固有イベント (battery_check_result) (ID 29: 乾電池の *消費を削除*) ▼▼▼
        else if (turnStep === 'battery_check_result') {
             const hasLantern = inventory.some(i => i.id === 24);
             if (hasLantern) {
                 const batteryItem = inventory.find(i => i.id === 29);
                 if (batteryItem && batteryItem.quantity > 0) {
                     // consumeItem(29, 'quantity', 1); // ★★★【削除】★★★
                     setMessage("電池を備蓄しておいて本当によかった。これでまだ明かりが使える！");
                     setBackgroundImage('/images/background_LED.png'); // ランタン再点灯
                     flashExpression('relieved'); // ★【追加】
                 } else {
                     setMessage("電池も備えておくべきだった…。こんなタイミングで切れるなんて。");
                 }
             }
        }
        // ▲▲▲ 修正ここまで ▲▲▲

        // (変更なし) ターン固有イベント (water_station)
        else if (turnStep === 'water_station_intro_1') { setMessage("近くの公園に給水車が到着したらしい。\n近所の人たちがポリタンクを持って集まっている。"); }
        else if (turnStep === 'water_station_intro_2') { setMessage("私も水をもらいに行こう。"); }
        else if (turnStep === 'water_station_result') {
            const hasBackpack = inventory.some(i => i.id === 32);
            const hasWaterBag = inventory.some(i => i.id === 31);

            if (hasBackpack && hasWaterBag) {
                setTotalWater(prev => prev + 3000);
                setMessage("給水袋をリュックに入れて運んだ。階段の上り下りも少し楽だった。(水+3L)");
                flashExpression('relieved'); // ★【追加】
            } else if (hasWaterBag) {
                setTotalWater(prev => prev + 2500);
                setMessage("手で運ぶのは重かったけれど、なんとか運びきった。(水+2.5L)");
                flashExpression('relieved'); // ★【追加】
            } else {
                setMessage("水をもらいに行きたいけど、入れる容器がない……");
            }
        }
        // (変更なし) ターン固有イベント (rolling_stock)
        else if (turnStep === 'rolling_stock_intro_1') { setMessage("台所の奥から、以前買っていた乾パンが出てきた。"); }
        else if (turnStep === 'rolling_stock_intro_2') { setMessage("でも、賞味期限が切れている……。"); }
        else if (turnStep === 'rolling_stock_result') {
             setMessage("普段から食べるものを備えた方がいいのかも…");
        }
        
        // (変更なし)
        else if (turnStep === 'cairo_check_1') {
            setMessage("こんな生活はいつまで続くんだろう……"); 
        }
        
        // (変更なし)
        else if (turnStep === 'cairo_check_2') { setMessage("今日は寒いな…"); }
        
        // ▼▼▼ 【修正】 ターン固有イベント (cairo_result) (ID 33: カイロの *消費を削除*) ▼▼▼
        else if (turnStep === 'cairo_result') {
            const cairoItem = inventory.find(i => i.id === 33);
            if (cairoItem && (cairoItem.quantity || 0) > 0) { // ★ quantity でチェック
                const effects: Effect = { morale: 5 };
                applyEffects(effects);
                // consumeItem(33, 'quantity', 1); // ★★★【削除】★★★
                setMessage(`カイロを使った。かじかんだ手が温まる…${formatEffects(effects)}`);
                flashExpression('relieved'); // ★【追加】
            } else {
                setMessage("カイロも備蓄しておくべきだった…");
            }
        }
        // ▲▲▲ 修正ここまで ▲▲▲

        else if (turnStep === 'final_message') {
            setMessage("（...何かメッセージがあればここに）");
        }
        
    }, [turnStep, isResolvingTurn, isGameOver, turnCount]);
    // ▲▲▲ ターン進行ロジック修正ここまで ▲▲▲

    // --- 「次へ」ボタン進行ロジック (変更なし) ---
    const handleAdvanceTurn = () => {
        if (turnStep === 'decay') {
            if (turnCount === 1) { setTurnStep('intro_message_0'); }
            else { setTurnStep('toilet'); }
        }
        else if (turnStep === 'intro_message_0') { setTurnStep('intro_message_1'); }
        else if (turnStep === 'intro_message_1') { setTurnStep('intro_message_2'); }
        else if (turnStep === 'intro_message_2') { setTurnStep('intro_message_3'); }
        else if (turnStep === 'intro_message_3') {
            setIsToiletModalOpen(true);
            setTurnStep('intro_message_4');
        }
        else if (turnStep === 'toilet') { setTurnStep('wash_hands_check'); }
        else if (turnStep === 'wash_hands_check') { setTurnStep('wash_hands_result'); }
        
        else if (turnStep === 'wash_hands_result') {
            if (turnCount === 2) { setTurnStep('dial_intro_1'); }
            else if (turnCount === 3) { setTurnStep('night_event_start'); }
            else if (turnCount === 4) { setTurnStep('safety_check_intro_1'); }
            else if (turnCount === 5) { setTurnStep('shop_visit_1'); }
            else if (turnCount === 6) { setTurnStep('lantern_check'); }
            else if (turnCount === 7) { setTurnStep('water_station_intro_1'); }
            else if (turnCount === 8) { setTurnStep('rolling_stock_intro_1'); }
            else if (turnCount === 9) { setTurnStep('cairo_check_1'); }
            else {
                setTurnStep('idle');
                setIsResolvingTurn(false);
                setMessage("何をしようか...");
            }
        }

        else if (turnStep === 'dial_intro_1') { setTurnStep('dial_intro_2'); }
        else if (turnStep === 'dial_intro_2') {
            setIsDialModalOpen(true);
            setTurnStep('dial_modal_open');
        }
        else if (turnStep === 'night_event_start') { setTurnStep('night_event_result'); }
        else if (turnStep === 'safety_check_intro_1') { setTurnStep('safety_check_intro_2'); }
        else if (turnStep === 'safety_check_intro_2') {
            setIsSafetyCheckModalOpen(true);
            setTurnStep('safety_check_modal_open');
        }
        else if (turnStep === 'shop_visit_1') { setTurnStep('shop_visit_2'); }
        else if (turnStep === 'shop_visit_2') { setTurnStep('shop_visit_3'); }
        else if (turnStep === 'lantern_check') { setTurnStep('battery_check_result'); }
        else if (turnStep === 'water_station_intro_1') { setTurnStep('water_station_intro_2'); }
        else if (turnStep === 'water_station_intro_2') {
            setIsWaterStationModalOpen(true);
            setTurnStep('water_station_modal_open');
        }
        else if (turnStep === 'rolling_stock_intro_1') { setTurnStep('rolling_stock_intro_2'); }
        else if (turnStep === 'rolling_stock_intro_2') {
            setIsRollingStockModalOpen(true);
            setTurnStep('rolling_stock_modal_open');
        }
        
        else if (turnStep === 'cairo_check_1') { setTurnStep('cairo_check_2'); }
        else if (turnStep === 'cairo_check_2') { setTurnStep('cairo_result'); }

        else if (turnStep === 'dial_result' || turnStep === 'night_event_result' || turnStep === 'safety_check_result' || turnStep === 'shop_visit_3' || turnStep === 'battery_check_result' || turnStep === 'water_station_result' || turnStep === 'rolling_stock_result' || turnStep === 'cairo_result' || turnStep === 'final_message') {
            setTurnStep('idle');
            setIsResolvingTurn(false);
            setMessage("何をしようか...");
        }
    };

    // --- 「次のターンへ」ロジック (変更なし) ---
    const handleNextTurn = () => {
        if (isResolvingTurn || isGameOver) return;

        if (!isSick) { 
            if (status.hygiene < 40) {
                setHygieneLowCounter(prev => prev + 1);
            } else {
                setHygieneLowCounter(0);
            }

            if (!usedNutritionItemThisTurn) {
                setNutritionNeglectCounter(prev => prev + 1);
            } else {
                setNutritionNeglectCounter(0);
            }
        }
        setUsedNutritionItemThisTurn(false); 

        if (turnCount >= TOTAL_TURNS) {
            setIsGameOver(true);
            setMessage("3日間を乗り切った！");
            const resultData = {
                selectedItems: originalSelection,
                gaugeHistory: [status],
                '不足したアイテム': [],
                turnCount: turnCount,
                totalTurns: TOTAL_TURNS,
            };
            sessionStorage.setItem('simulationResult', JSON.stringify(resultData));
            setTimeout(() => { router.push(`/result`); }, 3000);
            return;
        }

        setIsResolvingTurn(true);
        setUsedHygieneItems([]);
        setTurnCount(prev => prev + 1);
        setTurnStep('decay');
    };

    // --- ゲームオーバー処理 (変更なし) ---
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

            if (reason !== 'no_toilet') {
                 const endMessage = "いずれかのステータスが0になり、避難生活を続けることができなくなった...";
                 setMessage(endMessage);
            }

            setTimeout(() => { router.push(`/result`); }, 3000);
        }
    }, [status, gameOverReason, isLoading]);


    // --- 加熱処理 (executeHeating) (変更なし) ---
    const executeHeating = (itemId: number) => {
        const details = getItemDetails(itemId);
        if (!details || !details.heatable) return;

        const hasStove = inventory.some(i => i.id === 7);
        const gasCanister = inventory.find(i => i.id === 23);
        if (!hasStove) { setMessage("加熱にはカセットコンロが必要です。"); return; }
        const cost = details.heatingCost;
        if (!cost) { setMessage("このアイテムは加熱できません。"); return; }
        if (!gasCanister || (gasCanister.uses || 0) < (cost.gas || 0)) { setMessage("燃料が足りません。"); return; }
        
        const fuelCost = cost.gas || 0;
        const boilingItems = [2, 3, 13]; // 湯煎システム対象アイテム
        const hasPolyBag = inventory.some(i => i.id === 27); 

        // --- ここから湯煎ロジック修正 ---
        let waterCost = 0; // 実際に消費する水の量 (Noodlesなども含む)
        let requiredBoilingWater = 0; // 湯煎アイテム [2, 3, 13] が必要とするお湯の量

        if (itemId === 2) { // レトルトご飯
            requiredBoilingWater = hasPolyBag ? 800 : 1200;
        } else if (boilingItems.includes(itemId)) { // 缶詰, レトルト食品
            requiredBoilingWater = cost.water || 800; // 800
        } else {
            // 湯煎システム対象外のアイテム (即席麺など)
            waterCost = cost.water || 0;
        }
        
        let waterConsumedThisTurn = 0;
        let customMessage = "";

        if (boilingItems.includes(itemId)) {
            // --- 湯煎システム対象アイテム [2, 3, 13] ---

            if (boilingWaterAmount < requiredBoilingWater) {
                // (例: 0 < 800) or (0 < 1200) or (800 < 1200)
                // 必要な水が足りない（初めて沸かすか、800ml→1200mlに増やす）

                const additionalWaterNeeded = requiredBoilingWater - boilingWaterAmount;
                
                if (totalWater < additionalWaterNeeded) { 
                    setMessage(`湯煎に必要な水が${additionalWaterNeeded}ml足りません。 (現在のお湯 ${boilingWaterAmount}ml / 必要なお湯 ${requiredBoilingWater}ml)`); 
                    return; 
                }
                
                waterConsumedThisTurn = additionalWaterNeeded;
                
                if (boilingWaterAmount === 0) {
                    // --- A: その日初めての湯煎 ---
                    setBoilingWaterAmount(requiredBoilingWater); // ポットの量を更新
                    
                    if (itemId === 2) { // ご飯
                         customMessage = hasPolyBag
                            ? `ポリ袋を使い、湯煎のために水${requiredBoilingWater}mlを使って加熱した。`
                            : `ポリ袋がないため、湯煎のために水${requiredBoilingWater}mlを使って加熱した。`;
                    } else { // 缶詰・レトルト
                         customMessage = `湯煎のために水${requiredBoilingWater}mlを使い、コンロで加熱した。この水は今日中なら使い回せる。`;
                    }
                } else {
                    // --- B: 800ml → 1200ml に増やす湯煎 ---
                    setBoilingWaterAmount(requiredBoilingWater); // ポットの量を1200に更新
                    customMessage = `今日は既にお湯(800ml)を沸かしているが、ポリ袋がないため追加で水${additionalWaterNeeded}mlを使って加熱した。`;
                }

            } else {
                // --- C: 既にお湯が十分ある (800 >= 800) or (1200 >= 800) or (1200 >= 1200) ---
                waterConsumedThisTurn = 0; 
                customMessage = `今日は既にお湯(${boilingWaterAmount}ml)を沸かしているので、それを使って加熱した。`;
            }
        
        } else {
            // --- 湯煎システム対象外 (即席麺 ID:16 など) ---
            if (totalWater < waterCost) { 
                setMessage(`調理に使う水が${waterCost}ml足りません。`); 
                return; 
            }
            waterConsumedThisTurn = waterCost;
            customMessage = `${details.name}を加熱して食べた。`;
        }

        consumeItem(23, 'uses', fuelCost); // 燃料消費
        
        if (details.maxUses) {
            consumeItem(itemId, 'uses', 1); // maxUsesがある場合は uses を消費
        } else {
            consumeItem(itemId, 'quantity', 1); // ない場合は quantity を消費
        }
        
        setTotalWater(prev => prev - waterConsumedThisTurn); // 水消費
        
        const effects = details.heatedEffects || {};
        applyEffects(effects);
        setMessage(`${customMessage}${formatEffects(effects)}`);

        // ▼▼▼ 【追加】 精神(morale)が回復したら安堵表情にする ▼▼▼
        if (effects.morale && effects.morale > 0) {
            flashExpression('relieved');
        }
        // ▲▲▲ 【追加】 ここまで ▲▲▲
    };


    // ▼▼▼ 【修正】 handleUseItem (ID 13のチェックを加熱分岐の *外* に移動) ▼▼▼
    const handleUseItem = (itemId: number, heated = false) => {
        if (isResolvingTurn || isGameOver) return;
        const details = getItemDetails(itemId);
        if (!details) return;

        if (itemId === 14 || itemId === 15) {
            setUsedNutritionItemThisTurn(true);
        }

        if (details.category === 'hygiene' && details.id !== 5) {
            if (usedHygieneItems.includes(itemId)) {
                setMessage("この衛生用品は、このターンではもう使用できません。");
                return;
            }
        }

        if (itemId === 5) {
            if (isSick) {
                setIsSick(false);
                setHygieneLowCounter(0);
                setNutritionNeglectCounter(0);
                consumeItem(itemId, 'uses', 1);
                setMessage(`救急箱を使い、体調が回復した！`);
                flashExpression('relieved'); // ★【追加】
            } else {
                setMessage("体調は悪くないので、救急箱は使わなかった。");
            }
            return;
        }

        // ▼▼▼ 【ロジック修正】 ▼▼▼
        // 先にモーダル対象のアイテム（ID 2, 13）をチェック

        // 1. レトルトご飯 (ID: 2) の加熱時
        if (heated && itemId === 2 && !hasUsedRetortGohan) {
            setIsRetortGohanModalOpen(true); 
            setHasUsedRetortGohan(true);      
            return; // モーダル表示のため中断
        }

        // 2. レトルト食品 (ID: 13) の初回使用時 (加熱・そのまま両方)
        if (itemId === 13 && !hasUsedRetortFood) {
            setIsWrapModalOpen(true); 
            setHasUsedRetortFood(true);  
            setRetortFoodAction(heated ? 'heated' : 'raw'); // 実行するアクションを保存
            return; // モーダル表示のため中断
        }
        
        // --- モーダル対象外、または2回目以降の使用 ---

        let itemEffects: Effect = {}; // ★【追加】

        if (heated) {
            // (ID 2, ID 13(初回) は上で処理されたので、ここはID 13(2回目以降)や他の加熱アイテムが実行される)
            // ★ executeHeating 内部で flashExpression が呼ばれる
            executeHeating(itemId);

        } else {
            // (ID 13(初回) は上で処理されたので、ここはID 13(2回目以降)や他のアイテムが実行される)
            const effects = details.effects || {};
            applyEffects(effects);
            if (details.maxUses) {
                consumeItem(itemId, 'uses', 1);
            } else {
                consumeItem(itemId, 'quantity', 1);
            }
            setMessage(`${details.name}を使用した。${formatEffects(effects)}`);
            
            itemEffects = effects; // ★【追加】
        }
        // ▲▲▲ 【修正ここまで】 ▲▲▲

        // ★【追加】 精神(morale)が回復したら安堵表情にする
        // (加熱の場合は executeHeating 内部で処理されるため、 'else' の場合のみチェック)
        if (!heated && itemEffects.morale && itemEffects.morale > 0) {
            flashExpression('relieved');
        }


        if (details.category === 'hygiene' && details.id !== 5) {
            setUsedHygieneItems(prev => [...prev, itemId]);
        }
    };
    // ▲▲▲ 修正ここまで ▲▲▲


    // --- 水飲みロジック (変更なし) ---
    const handleDrinkWater = () => {
        if (isResolvingTurn || isGameOver) return;
        if (totalWater < 500) {
            setMessage("飲める水が足りません。");
            return;
        }
        setTotalWater(prev => prev - 500);
        const effects: Effect = { hydration: 20 };
        applyEffects(effects);
        setMessage(`水を500ml飲んだ。${formatEffects(effects)}`);
    };

    // ▼▼▼ 【修正】 インベントリ表示用 (ID 23: カセットボンベをソート) ▼▼▼
    const categorizedInventory = useMemo(() => {
        const grouped: Record<string, InventoryItem[]> = { food: [], hygiene: [], lifeline: [] };
        inventory.forEach(invItem => {
            const details = getItemDetails(invItem.id);
            if (details) { grouped[details.category]?.push(invItem); }
        });
        
        // ★ カセットボンベ(ID: 23)を生活用品の先頭にソート
        grouped.lifeline.sort((a, b) => {
            if (a.id === 23 && b.id !== 23) return -1; // ID 23 を先頭に
            if (a.id !== 23 && b.id === 23) return 1;  // ID 23 を先頭に
            return a.id - b.id; // それ以外はID順
        });

        return grouped;
    }, [inventory]);
    // ▲▲▲ 修正ここまで ▲▲▲

    const categoryNames: { [key in Item['category'] | 'other']: string } = { food: '食料・水', hygiene: '衛生用品', lifeline: '生活用品', other: 'その他' };

    // ▼▼▼ 【追加】 優先度に基づき、表示する画像パスを決定する ▼▼▼
    // ※※※ ご自身の画像パスに合わせてファイル名を変更してください ※※※
    const characterImagePath = useMemo(() => {
        // 優先度1: 体調不良
        if (isSick) {
            // ★体調不良時の画像パス
            return "/images/体調不良.png"; 
        }
        
        // 優先度2: 安堵（一時的な表情）
        if (characterExpression === 'relieved') {
            // ★安堵した表情の画像パス
            return "/images/character_relieved.png"; 
        }

        // 優先度3: 不安（体躯座り）
        const isDark = turn === '夜' && backgroundImage === '/images/background_night.png';
        const isAnxious = status.morale < 40 || isDark; // 精神が40未満、または暗闇
        
        if (isAnxious) {
            // ★不安（体躯座り）の画像パス
            return "/images/character_anxious.png"; 
        }

        // 優先度4: ノーマル
        // ★ノーマル（少し不満げ）の画像パス
        return "/images/my-character.png"; 
    
    }, [isSick, characterExpression, status.morale, turn, backgroundImage]);
    // ▲▲▲ 【追加】 ここまで ▲▲▲


    // --- レンダリング (JSX) ---
    // ▼▼▼ 認証読み込み中（isAuthLoading）の場合の表示を追加 ▼▼▼
    if (isLoading || isAuthLoading || !user) { 
        return <div className="bg-[#F3EADF] min-h-screen flex items-center justify-center text-2xl text-[#5C4033]">データを読み込んでいます...</div>; 
    }
    // ▲▲▲ ここまで ▲▲▲

    return (
        // (変更なし)
        <div className="min-h-screen font-sans p-4 sm:p-8 text-[#5C4033] bg-cover bg-center h-screen flex flex-col relative" style={{ backgroundImage: `url(${backgroundImage})` }}>
            
            {/* (変更なし) ゲージコンテナ */}
            <div className="absolute top-4 sm:top-8 left-4 sm:left-8 z-10 w-full max-w-sm bg-[#F9F6F0] border-2 border-[#E9DDCF] p-4 rounded-xl shadow-xl text-[#5C4033]">
                <div className="space-y-4">
                    <div> <div className="flex justify-between items-center mb-1 px-1"> <span className="font-bold">満腹</span> <span className="text-sm font-mono">{Math.round(status.satiety)} / 100</span> </div> <StatusBar value={status.satiety} color="#D97706" /> </div>
                    <div> <div className="flex justify-between items-center mb-1 px-1"> <span className="font-bold">水分</span> <span className="text-sm font-mono">{Math.round(status.hydration)} / 100</span> </div> <StatusBar value={status.hydration} color="#2563EB" /> </div>
                    <div> <div className="flex justify-between items-center mb-1 px-1"> <span className="font-bold">衛生</span> <span className="text-sm font-mono">{Math.round(status.hygiene)} / 100</span> </div> <StatusBar value={status.hygiene} color="#16A34A" /> </div>
                    <div> <div className="flex justify-between items-center mb-1 px-1"> <span className="font-bold">精神</span> <span className="text-sm font-mono">{Math.round(status.morale)} / 100</span> </div> <StatusBar value={status.morale} color="#FBBF24" /> </div>
                </div>
                
                {isSick && (
                    <div className="mt-4 text-center">
                        <p className="font-bold text-red-600 text-lg animate-pulse">
                            体調不良状態 😷
                        </p>
                    </div>
                )}
            </div>

            {/* (変更なし) メインコンテナ */}
            <div className="container mx-auto max-w-6xl flex flex-col flex-grow min-h-0">
                <header className="text-center mb-8 flex-shrink-0">
                    <div className="inline-block bg-[#F9F6F0] px-10 py-3 rounded-lg shadow-lg border-2 border-[#E9DDCF]">
                        <h1 className="text-3xl sm:text-4xl font-bold tracking-wider">{day}日目 - {turn}</h1>
                    </div>
                </header>
                <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-grow min-h-0">
                    {/* (変更なし) キャラクター・メッセージ欄 */}
                    <div className="lg:col-span-2 flex flex-col items-center justify-between min-h-0">
                        
                        {/* ▼▼▼ 【修正】 体調不良で画像変更 → useMemo を使うように変更 ▼▼▼ */}
                        <div className="flex-grow flex items-center justify-start relative pt-24">
                            <img 
                                src={characterImagePath} // ★ 決定された画像パスを使用
                                alt="キャラクター" 
                                className="drop-shadow-2xl max-h-[55vh] ml-50" 
                            />
                        </div>
                        {/* ▲▲▲ 修正ここまで ▲▲▲ */}

                        <div className="bg-[#F9F6F0] w-full max-w-2xl mx-auto px-6 py-4 rounded-lg shadow-lg text-center border-2 border-[#E9DDCF] flex items-center justify-center gap-4 h-36">
                            <p className="text-xl font-semibold flex-grow whitespace-pre-wrap">{message}</p>
                            {isResolvingTurn && !isGameOver && !isToiletModalOpen && !isDialModalOpen && !isSafetyCheckModalOpen && !isWaterStationModalOpen && !isRollingStockModalOpen && !isRetortGohanModalOpen && !isWrapModalOpen && (<button onClick={handleAdvanceTurn} className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 flex-shrink-0">次へ</button>)}
                        </div>

                    </div>
                    {/* ▼▼▼ 【修正】 インベントリ欄 (表示ロジック変更) ▼▼▼ */}
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
                                                            <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center p-1"><img src="/images/水.png" alt="水" className="max-w-full max-h-full object-contain" /></div>
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
                                                            
                                                            {/* ▼▼▼ 【修正】 ID 8, 28, 33 を「回」表記から「x 数量」表記に変更 ▼▼▼ */}
                                                            <div className="text-lg font-bold text-right">
                                                                {(details.id === 6 || details.id === 23) ? ( // usesで管理 (ID 8, 28, 33 を除外)
                                                                    <>{invItem.uses}<span className="text-xs">回</span></>
                                                                ) : (details.maxUses && invItem.quantity === 1 && ![30, 29, 31, 32].includes(details.id)) ? ( // uses管理(単数)
                                                                    <>{invItem.uses}<span className="text-xs">{details.id === 25 ? '個' : '回'}</span></>
                                                                 ) : ( // 数量で管理 (ID 8, 28, 33 はここに含まれる)
                                                                    <>x {invItem.quantity}</>
                                                                )}
                                                                {/* (ID 8, 28, 33はmaxUsesがないので、以下の条件にはマッチしない) */}
                                                                {details.maxUses && invItem.quantity > 1 && ![6, 8, 23, 28, 30, 29, 31, 32, 33].includes(details.id) && (
                                                                    <span className="text-xs text-gray-500 ml-1">(残{invItem.uses})</span>
                                                                )}
                                                            </div>
                                                            {/* ▲▲▲ 修正ここまで ▲▲▲ */}

                                                        </div>
                                                        { ![6, 8, 9, 24, 28, 29, 30, 31, 32, 33].includes(details.id) && ( // イベント用・自動消費アイテムはボタン非表示
                                                            <div className="mt-2 space-y-2">

                                                                {details.effects && Object.keys(details.effects).length > 0 && !details.heatable &&
                                                                 (details.category === 'food' || arbitraryHygieneItems.includes(details.id) ) && (
                                                                    <div className="flex justify-between items-center">
                                                                        <RenderEffects effects={details.effects} />
                                                                        <button onClick={() => handleUseItem(invItem.id)} disabled={isResolvingTurn || isGameOver || isHygieneItemUsed} className="w-20 text-xs bg-green-500 text-white font-bold py-1 rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed">{isHygieneItemUsed ? '使用済み' : '使用'}</button>
                                                                    </div>
                                                                )}
                                                                
                                                                {details.id === 5 && (<button onClick={() => handleUseItem(invItem.id)} disabled={!isSick || isResolvingTurn || isGameOver} className="w-full text-xs bg-green-500 text-white font-bold py-1 rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed">{isSick ? '体調不良を治す' : '健康なため使用不可'}</button>)}

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
                                                                                    {invItem.id === 2 ? (
                                                                                        <div className="text-xs text-gray-500 font-semibold mt-1">
                                                                                            消費: 燃料x1, 水(ポリ袋あり: 800ml / なし: 1200ml)
                                                                                        </div>
                                                                                    ) : (
                                                                                        <RenderHeatingCost cost={details.heatingCost} />
                                                                                    )}
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
                    {/* ▲▲▲ 修正ここまで ▲▲▲ */}
                </main>
            </div>

            {/* --- モーダル (変更なし) --- */}
            <PortableToiletModal
                isOpen={isToiletModalOpen}
                onClose={() => {
                    setIsToiletModalOpen(false);
                    setTurnStep('toilet');
                }}
            />
            <DisasterDialModal
                isOpen={isDialModalOpen}
                onClose={() => {
                    setIsDialModalOpen(false);
                    setTurnStep('dial_result');
                }}
            />
            <SafetyCheckModal
                isOpen={isSafetyCheckModalOpen}
                onClose={() => {
                    setIsSafetyCheckModalOpen(false);
                    setTurnStep('safety_check_result');
                }}
            />
            <WaterStationModal
                 isOpen={isWaterStationModalOpen}
                 onClose={() => {
                     setIsWaterStationModalOpen(false);
                     setTurnStep('water_station_result');
                 }}
             />
             <RollingStockModal
                  isOpen={isRollingStockModalOpen}
                  onClose={() => {
                      setIsRollingStockModalOpen(false);
                      setTurnStep('rolling_stock_result');
                  }}
              />
            
            <RetortGohanModal
                isOpen={isRetortGohanModalOpen}
                onClose={() => {
                    setIsRetortGohanModalOpen(false);
                    executeHeating(2); 
                }}
            />

            {/* ▼▼▼ 【修正】 WrapModal (onCloseのロジック変更) ▼▼▼ */}
            <WrapModal
                isOpen={isWrapModalOpen}
                onClose={() => {
                    setIsWrapModalOpen(false);
                    
                    if (retortFoodAction === 'heated') {
                        // 「加熱する」が押された場合
                        executeHeating(13); 
                    
                    } else if (retortFoodAction === 'raw') {
                        // 「そのまま」が押された場合
                        const details = getItemDetails(13);
                        if(details) {
                            const effects = details.effects || {};
                            applyEffects(effects);
                            if (details.maxUses) {
                                consumeItem(13, 'uses', 1);
                            } else {
                                consumeItem(13, 'quantity', 1);
                            }
                            // executeHeatingは内部でsetMessageするので、"raw"の場合だけここでセット
                            setMessage(`${details.name}を使用した。${formatEffects(effects)}`);

                            // ★ "raw" の場合も morale があれば flash
                            if (effects.morale && effects.morale > 0) {
                                flashExpression('relieved');
                            }
                        }
                    }
                    
                    const hasWrap = inventory.some(i => i.id === 26);
                    if (hasWrap) {
                        const wrapEffect: Effect = { hygiene: 4 };
                        applyEffects(wrapEffect);
                        // setMessageが上書きされないよう、関数型アップデートで追記
                        setMessage(prev => prev + `\nラップを使ったので衛生を保てた。${formatEffects(wrapEffect)}`);
                    } else {
                        const wrapEffect: Effect = { hygiene: -4 };
                        applyEffects(wrapEffect);
                        setMessage(prev => prev + `\nラップがない...食器が汚れてしまった。${formatEffects(wrapEffect)}`);
                    }

                    setRetortFoodAction(null); // アクションをリセット
                }}
            />
            {/* ▲▲▲ 修正ここまで ▲▲▲ */}
        </div>
    );
}