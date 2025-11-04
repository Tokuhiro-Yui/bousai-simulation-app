//
// =======================================================
//   アプリケーション全体のアイテムマスターデータ
// =======================================================
//
// --- 1. アイテムの型定義 ---
export type Effect = { satiety?: number; hydration?: number; hygiene?: number; morale?: number; };
export type HeatingCost = { water?: number; gas?: number; };

export type Item = {
  id: number;
  name: string;
  image: string;
  description: string;
  category: 'food' | 'hygiene' | 'lifeline' | 'other';
  effects: Effect;
  heatable?: boolean;
  heatingCost?: HeatingCost;
  heatedEffects?: Effect;
  maxUses?: number;
  resourceType?: 'water' | 'rice';
  resourceAmount?: number;
  foodCategory?: 'main' | 'side' | 'snack' | 'nutrition';
  nutritionEffect?: number;
  autoConsume?: {
    schedule: { turn: '朝' | '昼' | '夜', count: number }[];
  };
};

// --- 2. アイテムリスト本体 (無洗米を削除) ---
export const allItems: Item[] = [
    // --- 食料・水 ---
    { id: 1, name: '水', description: '生命維持に不可欠。調理にも使えます。', image: '/images/水.png', category: 'food', effects: {}, resourceType: 'water', resourceAmount: 3000, foodCategory: 'nutrition' },
    { id: 2, name: 'レトルトご飯', description: '加熱が必要ですが、主食として満足度が高いです。', image: '/images/レトルトごはん.png', category: 'food', effects: {}, heatable: true, heatingCost: { gas: 1, water: 800 }, heatedEffects: { satiety: 10, morale: 1 }, foodCategory: 'main', nutritionEffect: 1 },
    { id: 3, name: '缶詰', description: 'おかずになる長期保存食。たんぱく源としても優秀。', image: '/images/缶詰.png', category: 'food', effects: { satiety: 6, morale: 1 }, heatable: true, heatingCost: { gas: 1, water: 800 }, heatedEffects: { satiety: 6, morale: 3 }, foodCategory: 'side', nutritionEffect: 0 },
    { id: 4, name: 'お菓子', description: '手軽な糖分補給。精神的な安らぎに繋がります。', image: '/images/チョコ.png', category: 'food', effects: { satiety: 5, morale: 5 }, foodCategory: 'snack', nutritionEffect: 2 },
    { id: 13, name: 'レトルト食品', description: 'カレーやパスタソースなど。そのままでも食べられます。', image: '/images/レトルトカレー.png', category: 'food', effects: { satiety: 8 }, heatable: true, heatingCost: { gas: 1, water: 800 }, heatedEffects: { satiety: 8, morale: 2 }, foodCategory: 'side', nutritionEffect: 0 },
    { id: 14, name: '栄養補助食品', description: '不足しがちな栄養を補給できます。', image: '/images/栄養補助食品.png', category: 'food', effects: { satiety: 10 }, foodCategory: 'nutrition', nutritionEffect: -2 },
    { id: 15, name: '野菜ジュース', description: '不足しがちなビタミンと水分を同時に補給できます。', image: '/images/野菜ジュース.png', category: 'food', effects: { hydration: 15, morale: 2 }, foodCategory: 'nutrition', nutritionEffect: -1 },
    { id: 16, name: '即席麺', description: 'お湯と燃料が必要ですが、温かい食事は心も温めます。', image: '/images/即席麺.png', category: 'food', effects: {}, heatable: true, heatingCost: { gas: 1, water: 300 }, heatedEffects: { satiety: 12, morale: 5 }, foodCategory: 'main', nutritionEffect: 1 },
    { id: 18, name: '飲み物', description: 'ジュースやお茶など。水分補給と気分転換に。', image: '/images/飲み物.png', category: 'food', effects: { hydration: 10, morale: 5 }, foodCategory: 'snack' },
    { id: 19, name: '果物缶詰', description: '甘いものは元気が出ます。ビタミン補給にも。', image: '/images/フルーツ缶.png', category: 'food', effects: { satiety: 4, morale: 5 }, foodCategory: 'snack', nutritionEffect: 1 },
    { id: 25, name: 'フリーズドライ', description: 'お湯を注ぐだけで温かい食事ができます。', image: '/images/フリーズドライ.png', category: 'food', effects: {}, heatable: true, heatingCost: { gas: 1, water: 150 }, heatedEffects: { satiety: 5, morale: 3 }, foodCategory: 'side', nutritionEffect: 0, maxUses: 3 },

    // --- 衛生用品 ---
    { id: 5, name: '救急セット', description: '絆創膏、消毒液、常備薬など。怪我の応急手当や体調不良時に必須です。', image: '/images/救急セット.png', category: 'hygiene', effects: {}, maxUses: 3},
    { id: 6, name: '非常用トイレ', description: '断水時に非常に重要。衛生環境を保ち、感染症を防ぎます。', image: '/images/トイレ.png', category: 'hygiene', effects: { hygiene: 4 }, maxUses: 5, autoConsume: { schedule: [{ turn: '朝', count: 1 }, { turn: '昼', count: 2 }, { turn: '夜', count: 2 }] } },
    { id: 10, name: 'ウェットティッシュ', description: '水が使えない状況で体を清潔に保つのに役立ちます。', image: '/images/ウェットティッシュ.png', category: 'hygiene', effects: { hygiene: 4 }, maxUses: 30 },
    { id: 20, name: '口内洗浄液', description: '水を使わず口の中をすすげます。感染症予防にも。', image: '/images/口内洗浄液.png', category: 'hygiene', effects: { hygiene: 4, morale: 2 }, maxUses: 9, resourceAmount: 270 },
    // ▼▼▼ 【修正】 description と maxUses を変更 ▼▼▼
    { id: 21, name: '歯みがき用ウェットティッシュ', description: '水なしで歯をきれいにできます。爽快感も得られます。', image: '/images/歯磨きティッシュ.png', category: 'hygiene', effects: { hygiene: 4, morale: 2 }, maxUses: 30 ,resourceAmount: 30 },
    // ▲▲▲ 修正ここまで ▲▲▲
    { id: 22, name: 'ウェットボディタオル', description: '体全体を拭くための大判シート。お風呂代わりになります。', image: '/images/からだふきシート.png', category: 'hygiene', effects: { hygiene: 6, morale: 3 }, maxUses: 3 },

    // --- 生活用品 ---
    { id: 7, name: 'カセットコンロ', description: '温かい食事を作るために不可欠なアイテムです。', image: '/images/ガスコンロ.png', category: 'lifeline', effects: {} },
    { id: 8, name: 'モバイルバッテリー', description: 'スマートフォンの充電に。情報収集や連絡手段の確保に。', image: '/images/モバイルバッテリー.png', category: 'lifeline', effects: {} },
    { id: 9, name: '手回し充電ラジオ', description: '電池がなくても情報収集ができます。', image: '/images/ラジオ.png', category: 'lifeline', effects: {} },
    { id: 23, name: 'カセットボンベ', description: 'コンロの燃料。1本で4回の加熱が可能です。', image: '/images/ガスボンベ.png', category: 'lifeline', effects: {}, maxUses: 4 },
    { id: 24, 'name': 'LEDランタン', 'description': '停電時の夜の明かり。安全確保と不安の軽減に。', image: '/images/ランタン.png', category: 'lifeline', effects: {} ,resourceAmount: 3 ,maxUses: 3},
    { id: 26, name: 'ラップ', description: '食器に被せたり、体に巻いて保温したりと多用途に使えます。', image: '/images/ラップ.png', category: 'lifeline', effects: {} },
    { id: 27, name: 'ポリ袋', description: 'ごみ袋、調理、応急手当など幅広く活躍します。', image: '/images/ポリ袋.png', category: 'lifeline', effects: {} },
    // ▼▼▼ 【修正】 ID 28 (ビニール手袋) の description と maxUses を変更 ▼▼▼
    { id: 28, name: 'ビニール手袋', description: '衛生的な調理やトイレの処理、看病の際に手を守ります。', image: '/images/ビニール手袋.png', category: 'lifeline', effects: {} },
    // ▲▲▲ 修正ここまで ▲▲▲
    { id: 29, name: '乾電池', description: 'ラジオやランタン、懐中電灯などの電源として必要です。', image: '/images/乾電池.png', category: 'lifeline', effects: {} },
    { id: 30, name: '布製ガムテープ', description: '物の補修、固定、メモ書き、応急手当など、万能なテープ。', image: '/images/布製ガムテープ.png', category: 'lifeline', effects: {} },
    { id: 31, name: '給水袋', description: '給水所で水を受け取る際に必要。折りたためて便利です。', image: '/images/給水袋.png', category: 'lifeline', effects: {} },
    { id: 32, name: 'リュックサック', description: '両手を空けて荷物を運ぶことができます。避難時や水の運搬に。', image: '/images/リュック.png', category: 'lifeline', effects: {} },
    // ▼▼▼ 【修正】 ID 33 (カイロ) の description, maxUses, effects を変更 ▼▼▼
    { id: 33, name: '使い捨てカイロ', description: '冬の寒さ対策に。体を温めると安心します。', image: '/images/カイロ.png', category: 'lifeline', effects: {} ,maxUses: 6},
    // ▲▲▲ 修正ここまで ▲▲▲
];

// --- 3. Resultページで使うカテゴリマッピング ---
export const idToCategoryMap = {
    1: 'water', 15: 'water', 18: 'water',
    2: 'emergency_food', 3: 'emergency_food', 4: 'emergency_food', 13: 'emergency_food', 14: 'emergency_food', 16: 'emergency_food', 19: 'emergency_food', 25: 'emergency_food',
    6: 'portable_toilet',
    24: 'light',
    9: 'radio',
    8: 'battery',
    5: 'first_aid',
    10: 'sanitary_items', 20: 'sanitary_items', 21: 'sanitary_items', 22: 'sanitary_items',
    26: 'lifeline', 27: 'lifeline', 28: 'lifeline', 29: 'lifeline', 30: 'lifeline', 31: 'lifeline', 32: 'lifeline',
    33: 'lifeline',
};