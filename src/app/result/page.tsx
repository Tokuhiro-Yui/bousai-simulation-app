'use client';
// ▼▼▼▼▼ このブロックを貼り付ける ▼▼▼▼▼
interface PlayerStatus {
  satiety: number;
  hydration: number;
  hygiene: number;
  morale: number;
}

interface ResultData {
  selectedItems: { id: number; quantity: number }[];
  gaugeHistory: PlayerStatus[];
  '不足したアイテム': { id: string; name: string; reason: string; recommendation: string }[];
  turnCount: number;
  totalTurns: number;
}
// ▲▲▲▲▲ ここまで ▲▲▲▲▲
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Lightbulb } from 'lucide-react';
import { allItems } from '../data/items';

// ▼▼▼ recommendedItems を更新 ▼▼▼
const recommendedItems = [
    // --- 食料・水 ---
    { id: 'item_1', category: 'food', name: '水', recommendedQuantity: '9', unit: 'L', description: '1人1日3リットルが目安量', importance: '人が生命を維持するのに必要な水分量は、年齢や体重によって変わってきますが1日1人3リットルが目安量です。', simulated: true },
    { id: 'item_2', category: 'food', name: 'レトルトご飯', recommendedQuantity: '9', unit: '食', description: '水の節約になる主食', importance: '災害時には、洗わなくてもよいレトルトのおかゆやご飯があると少しでも水の節約になります。おかゆは乳幼児や高齢者の食事としても使えます。', simulated: true },
    { id: 'item_extra_food_0', category: 'food', name: '無洗米', image: '/images/無洗米2.png', recommendedQuantity: '2', unit: 'kg', description: '水の節約になる主食', importance: '災害時に無洗米があると水の節約になります。おかゆは乳幼児や高齢者の食事としても使えます。', simulated: false },
    { id: 'item_16', category: 'food', name: '乾麺・即席麺', recommendedQuantity: '3', unit: 'パック', description: 'メニューに変化を', importance: '災害時はご飯やパンが中心になるので、乾麺があるとメニューに変化をつけられます。賞味期限が長いので長期保存でき、冷めてもおいしく食べられます。普段食べているものを少し多めにストックしておきましょう。', simulated: true },
    { id: 'item_13', category: 'food', name: 'レトルト食品', recommendedQuantity: '3', unit: '個', description: '栄養バランスを考えて', importance: '調理不要のバラエイティーに富んだレトルト食品。災害時は栄養バランスが偏りがちなので、たんぱく質が取れるお肉やお魚を使ったものを選びましょう。', simulated: true },
    { id: 'item_3', category: 'food', name: '缶詰', recommendedQuantity: '3', unit: '缶', description: '保存食の王様', importance: '缶詰は保存食の王様。種類も豊富で味も良く、日常に欠かせない食材でもあります。家族の好みや栄養バランスを考え、たんぱく質が取れるお肉やお魚、豆類の缶詰を選びましょう。缶切りも忘れずに。', simulated: true },
    { id: 'item_19', category: 'food', name: '果物の缶詰', recommendedQuantity: '3', unit: '缶', description: 'ビタミンや水分を摂取', importance: '果物でビタミンや水分を摂取。缶詰でない場合は、包丁を使わずに済むミカンやバナナ、日持ちのするリンゴや梨、ブドウやスイカもおすすめです。', simulated: true },
    { id: 'item_14', category: 'food', name: '栄養補助食品', recommendedQuantity: '3', unit: '箱', description: '手軽に栄養補給', importance: '食料不足になる災害時は、必要な栄養を食材で取れるとは限りません。サプリメントのほか、必要な栄養が詰まったバランス栄養食は、災害時、十分な調理ができないときでも手軽に栄養補補給できます。', simulated: true },
    { id: 'item_15', category: 'food', name: '野菜ジュース', recommendedQuantity: '3', unit: '本', description: '野菜不足を解消', importance: 'ジュースで野菜不足を解消。ミネラルやビタミンが摂取できます。冷凍保存することで、保冷剤としても使えます。', simulated: true },
    { id: 'item_18', category: 'food', name: '飲み物', recommendedQuantity: '3', unit: '本', description: '普段通りの環境づくり', importance: '水以外に、自分が普段好んで飲んでいる飲料があれば用意しておきましょう。災害時であっても、普段通りに自分の好きなものを飲んだり食べたりできる環境をつくっておくことが大切です。', simulated: true },
    { id: 'item_4', category: 'food', name: 'お菓子', recommendedQuantity: '3', unit: 'パック', description: '気分転換にも', importance: 'お菓子は栄養価を考えて選ぶのがベター。米菓子は栄養素が豊富。ようかんは高齢者も食べやすく、気軽に口に入れられる一口サイズのものがおすすめ。乾燥野菜や果物のスナックチップスでビタミン補給。いずれも、保存の効く個別包装のものがおすすめです。避難生活が長引くときには気分転換にもつながります。', simulated: true },
    { id: 'item_25', category: 'food', name: 'フリーズドライ', recommendedQuantity: '3', unit: '食', description: '3食分。お湯で戻すタイプ。', importance: 'フリーズドライ食品は、少量のお湯で食べられ、災害時に不足しがちな野菜の栄養素が取れます。スープなので摂取しやすく副菜として用意しておくと有効です。', simulated: true },
    { id: 'item_extra_food_2', category: 'food', name: '健康飲料粉末', image: '/images/健康飲料粉末.jpg', recommendedQuantity: '3', unit: '袋', description: 'スポーツドリンクの粉末など', importance: '食料不足になる災害時は、必要な栄養を食材で取れるとは限りません。サプリメントのほか健康飲料の粉末などは、調理ができないときや疲れて食べ物がのどを通らないときでも、手軽に栄養補給できます。', simulated: false },
    { id: 'item_extra_food_3', category: 'food', name: 'チーズ・プロテインバー等', image: '/images/プロテインバー.png', recommendedQuantity: '1', unit: 'パック', description: '高タンパク食品', importance: '被災地で支援物資として配られる食料は炭水化物が中心で、たんぱく質やビタミンといった栄養素が不足しがちです。健康を維持するためにも、チーズやプロテインバーといった高タンパクで保存可能な食料をストックしておくと安心です。', simulated: false },
    { id: 'item_extra_food_4', category: 'food', name: '乾物', image: '/images/乾物.png', recommendedQuantity: '適量', unit: '', description: 'わかめ、切り干し大根など', importance: '乾物は保存期間が長く栄養素が豊富なので、栄養不足になりがちな災害時には有効な食材です。ミネラル・食物繊維が豊富な切り干し大根や寒天がおすすめです。', simulated: false },
    { id: 'item_extra_food_5', category: 'food', name: '調味料セット', image: '/images/調味料.png', recommendedQuantity: '適宜', unit: '', description: '塩、醤油、砂糖など', importance: '料理に欠かせない調味料。野菜がたくさん入ったソースは、いろいろな食材に合う万能調味料です。', simulated: false },

    // --- 衛生用品 ---
    { id: 'item_6', category: 'hygiene', name: '携帯トイレ・簡易トイレ', recommendedQuantity: '15', unit: '回分', description: '断水時の必需品', importance: '断水するとトイレは流せません。水が使えたとしても、集合住宅で配管が破損していた場合、汚水が逆流し下階のトイレからあふれる可能性もあります。トイレを我慢するために、食事や水を飲む量を減らすと、健康状態の悪化にもつながるので、家庭の便器に設置して固めて処理できる携帯トイレ・簡易トイレを用意しましょう。', simulated: true },
    { id: 'item_10', category: 'hygiene', name: '除菌ウェットティッシュ', recommendedQuantity: '30', unit: '枚', description: '手指や身の回りの消毒に', importance: '災害時には水が不足し、手を洗ったり拭き掃除をしたりすることが気軽にできなくなります。除菌タイプのウェットティッシュがあれば手指やテーブル、キッチンやトイレ回りなどの汚れを拭きとるのに使えます。', simulated: true },
    { id: 'item_22', category: 'hygiene', name: 'ウェットボディタオル', recommendedQuantity: '3', unit: '枚', description: 'お風呂の代わりに', importance: '水道やガスが止まりお風呂に入れなくなったときには、タオルなどで体を拭くことになります。一般的なウェットティッシュだと体を拭くには小さいので、厚手で背中が拭ける大判サイズのウェットタオルの準備をしておくと安心です。', simulated: true },
    { id: 'item_5', category: 'hygiene', name: '救急箱', recommendedQuantity: '1', unit: '箱', description: '応急手当用品', importance: '災害時に備えて応急手当用品があると安心です。ばんそうこうやガーゼ、包帯、ピンセット、綿棒、爪切り、体温計、マスクなどを救急箱に備えておきましょう。また、薬は災害時に手に入りにくくなるので、鎮痛薬、胃腸薬、風邪薬なども備えておきましょう', simulated: true },
    { id: 'item_21', category: 'hygiene', name: '歯みがき用ウェットティッシュ', recommendedQuantity: '30', unit: '枚', description: '口腔ケアで感染症予防', importance: '断水により歯磨きができず口の中が不衛生になると、免疫力の低い高齢者や小さな子供は肺炎などの感染症にかかりやすくなります。歯みがき用のウェットティッシュでこまめに歯を拭き、口の中をきれいに保ちましょう。アルコールフリーなのでボディケアや食器拭きにも使えます。', simulated: true },
    { id: 'item_20', category: 'hygiene', name: '口内洗浄液', recommendedQuantity: '270', unit: 'ml', description: '口腔ケアで感染症予防', importance: '水道が使えず歯磨きができない場合に備えて、口内洗浄液を準備しておきましょう。お口の健康は体の健康にも影響します。水不足で口の中を清潔に保つことができないと、口の中の菌が体に悪影響を及ぼす可能性があります。特に肺炎になりやすい高齢者の方は注意が必要です。', simulated: true },
    { id: 'item_extra_hygiene_1', category: 'hygiene', name: 'マスク', image: '/images/マスク.png', recommendedQuantity: '3', unit: '枚', description: '感染症対策', importance: '感染症対策として飛沫感染を防ぐほかに、周囲への飛沫の拡散を防ぐためにも、コロナ禍の今、エチケットとして必要です。また、鼻づまりで口呼吸になっている場合にも、口の乾燥を防いでくれるため、冬場の乾燥対策としても有効です。', simulated: false },
    { id: 'item_extra_hygiene_2', category: 'hygiene', name: 'アルコールスプレー', image: '/images/消毒液.png', recommendedQuantity: '1', unit: '本', description: '手指の消毒に', importance: '水道が止まっている時の手洗いや食器を拭くのに活用します。アルコールには消臭効果もあるため、ニオイが気になるところに吹きかけるといった使い方もできます。さらに、現在のコロナ禍での感染症対策としても効果を発揮します。', simulated: false },
    { id: 'item_extra_hygiene_3', category: 'hygiene', name: '使い捨てコンタクトレンズ', image: '/images/コンタクトレンズ.png', recommendedQuantity: '1人1か月分', unit: '', description: '衛生的な視力確保', importance: '災害時にはきれいな水が手に入らず、消毒ができない場合があります。そんな時、使い捨てのコンタクトレンズがあると便利です。予備として眼鏡の用意があるとなおよいでしょう。', simulated: false },
    { id: 'item_extra_hygiene_5', category: 'hygiene', name: 'ティッシュペーパー', image: '/images/ティッシュ.png', recommendedQuantity: '1', unit: '箱', description: '拭き取り作業に', importance: '水を使えないと拭き取る作業も多くなります。汚れたお皿をティッシュで拭けば、水の節約にもなります。ウェットティッシュと同様に必需品です。', simulated: false },
    { id: 'item_extra_hygiene_6', category: 'hygiene', name: '生理用品', image: '/images/生理用品.png', recommendedQuantity: '1', unit: 'セット',description: '女性用品',  importance: '災害時の避難生活で不足しがちなのが衛生用品。不足しているからといって長時間取り替えないでおくとかぶれの原因にもなります。普段使っているものを少し多めに買いそろえておきましょう。', simulated: false },
    
    // --- 生活用品 ---
    { id: 'item_7', category: 'lifeline', name: 'カセットコンロ', recommendedQuantity: '1', unit: '台', description: '温かい食事のために', importance: '電気やガスが止まってしまったときでも、カセットコンロがあれば安心です。停電の可能性も高いので、IHヒーターよりも役立ちます。お湯を沸かして温かい汁物などを作るためには、保温効果の高い鍋を用意することも重要です。', simulated: true },
    { id: 'item_23', category: 'lifeline', name: 'カセットボンベ', recommendedQuantity: '4', unit: '本', description: '多めに用意', importance: 'ボンベは多めに用意しましょう。使用期限は6～7年なので、少し多めに買いそろえ、使いながら買い足す、日常備蓄（ローリングストック）の一環として備えておきましょう。', simulated: true },
    { id: 'item_8', category: 'lifeline', name: '携帯電話 充電器・モバイルバッテリー', recommendedQuantity: '1', unit: '個', description: '情報収集の必需品', importance: '携帯電話の性能が上がり継続して利用できる時間も長くなっていますが、それでも手元に携帯電話の充電器があると安心です。電池式やソーラー式など停電しても使えるものを用意しておきましょう。', simulated: true },
    { id: 'item_24', category: 'lifeline', name: 'LEDランタン', recommendedQuantity: '3', unit: '台', description: '部屋全体を照らす照明', importance: '向けた方向しか照らせず片手がふさがってしまう懐中電灯よりも、部屋全体を明るくできるため室内照明として有効です。家族が同時に使うリビング・キッチン・トイレに1個ずつ用意しましょう。光量が弱い場合は、ヘッドライトなどと使い分けて活用しましょう。', simulated: true },
    { id: 'item_26', category: 'lifeline', name: 'ラップ', image: '/images/ラップ.png', recommendedQuantity: '1', unit: '本', description: '多用途に使える', importance: '断水時、食器に被せれば汚れを防ぎ、洗わずに済みます。また、三角巾や包帯代わりにも使え、体に巻けば保温効果も期待できます。', simulated: true },
    { id: 'item_27', category: 'lifeline', name: 'ポリ袋', image: '/images/ポリ袋.png', recommendedQuantity: '1', unit: '箱', description: '多用途に使える', importance: '手に被せると応急手当時の感染防止に役立ちます。断水時には食材を入れて調理すれば衛生的です。ジッパー付きの袋はニオイの防止になるので、トイレごみなどは黒いごみ袋に入れジッパー付きの袋に入れましょう。', simulated: true },
    { id: 'item_28', category: 'lifeline', name: 'ビニール手袋', image: '/images/ビニール手袋.png', recommendedQuantity: '1', unit: '箱', description: '衛生的な調理に', importance: '手がしっかり洗えない状態で調理をしなければならない時に、ラテックス製などの使い捨てができる手袋があると便利です。トイレ掃除など、不衛生な物を扱う時にも役立ちます。', simulated: true },
    { id: 'item_29', category: 'lifeline', name: '乾電池', image: '/images/乾電池.png', recommendedQuantity: '1', unit: 'セット', description: '単1～単4まで', importance: '懐中電灯などを用意しても電池がなければ使うことができません。また、電池は突然切れるおそれもあります。災害時は電池の使用頻度も高まるので、少し多めに買いそろえ、使いながら買い足す、日常備蓄（ローリングストック）の一環として備えておきましょう。', simulated: true },
    { id: 'item_30', category: 'lifeline', name: '布製ガムテープ', image: '/images/布製ガムテープ.png', recommendedQuantity: '1', unit: '個', description: '補修や固定に', importance: '物の補修、固定、メモ書き、応急手当など、万能なテープ。', simulated: true },
    { id: 'item_31', category: 'lifeline', name: '給水袋', image: '/images/給水袋.png', recommendedQuantity: '1', unit: '袋', description: '水の運搬に', importance: '水道が復旧しない状況で、給水車に水をもらいに行くときに活用します。', simulated: true },
    { id: 'item_32', category: 'lifeline', name: 'リュックサック', image: '/images/リュック.png', recommendedQuantity: '1', unit: '個', description: '水の運搬に', importance: '断水時には給水拠点などから水を運ぶ必要も出てきます。もし災害時にエレベーターが止まり、階段を使って運ばないといけないときは、リュックに大きめのポリ袋を被せ、その中に水を入れて運べば、ポリタンクよりも楽に運べます。', simulated: true },
    { id: 'item_33', category: 'lifeline', name: '使い捨てカイロ', image: '/images/カイロ.png', recommendedQuantity: '6', unit: '個', description: '冬の寒さ対策', importance: '寒いときの定番「カイロ」。冬の外出時、かばんの中に入れておくと、エレベーターに閉じ込められたときなどでも体を温めて生命維持につながります。カイロでレトルト食材を挟み、アルミブランケットやタオルで包めば、レトルト食品を温めることもできます。', simulated: true },

    // ▼▼▼ simulated: false のアイテム (id: 9 を復元) ▼▼▼
    { id: 'item_extra_lifeline_17', category: 'lifeline', name: 'ヘッドライト', image: '/images/ヘッドライト.png', recommendedQuantity: '1', unit: '個', description: '両手が空く照明', importance: '両手が空くヘッドライトは、料理や物を運ぶなど作業をする時に有効な照明です。家族各々が外出する時にも使うので、一人一個用意しましょう。', simulated: false },
    { id: 'item_9', category: 'lifeline', name: '手回し充電ラジオ', image: '/images/ラジオ.png', recommendedQuantity: '1', unit: '台', description: '貴重な情報源', importance: '停電時にはテレビが使えず、ラジオが貴重な情報源になります。ポケットラジオならコンパクトなのでポケットやかばんに入れて持ち運べるほか、枕元に置いてもじゃまになりません。省電力で電池の持ち時間も長いので災害時にも安心です。', simulated: false },
    { id: 'item_extra_lifeline_1', category: 'lifeline', name: '懐中電灯', image: '/images/懐中電灯.png', recommendedQuantity: '1', unit: '灯', description: '移動時の照明', importance: '夜間に災害が発生して停電した場合、家具やガラスが散乱した状態で部屋を歩くことは非常に危険です。誤ってけがをしてしまえば、自宅で生活ができなくなるおそれも。部屋の照明としては、ランタンも効果的です。', simulated: false },
    { id: 'item_extra_lifeline_2', category: 'lifeline', name: 'アルミホイル', image: '/images/アルミホイル.png', recommendedQuantity: '1', unit: '本', description: '調理や食器代わりに', importance: '断水時、調理器具にアルミホイルを敷くと汚さずに調理できます。また、お皿の形にすれば、使い捨ての食器としても使えます。ニオイを通さないので、防臭にも役立ちます。', simulated: false },
    { id: 'item_extra_lifeline_3', category: 'lifeline', name: 'トイレットペーパー', image: '/images/トイレットペーパー.png', recommendedQuantity: '1', unit: 'ロール', description: 'ティッシュの代わりにも', importance: '断水が起きなくても、トイレットペーパーがなければトイレが使えません。切らすと不便で、トイレへの不安がますます強くなってしまいます。ティッシュペーパーの代わりとしても使えます。', simulated: false },
    { id: 'item_extra_lifeline_4', category: 'lifeline', name: '点火棒', image: '/images/点火棒.png', recommendedQuantity: '1', unit: '本', description: '火をつける際に', importance: 'ろうそくや固形燃料に火をつける際など、火が必要な場合に重宝します。', simulated: false },
    { id: 'item_extra_lifeline_5', category: 'lifeline', name: 'ストーブ', image: '/images/ストーブ.png', recommendedQuantity: '1', unit: '台', description: '寒さ対策に', importance: '電気・ガスが止まると暖房器具が使えなくなるため、冬に災害が起こった時の防災グッズとして、持ち運び可能なポータブルストーブが便利です。灯油やカセットボンベが燃料のものは、使用の際に換気が必要なので注意しましょう。', simulated: false },
    { id: 'item_extra_lifeline_6', category: 'lifeline', name: 'クーラーボックス', image: '/images/クーラーボックス.png', recommendedQuantity: '1', unit: '個', description: '臨時の冷蔵庫', importance: '停電で冷蔵庫が使えなくなったとき、一部の食材をクーラーボックスに移し保冷剤を一緒に入れれば、臨時の冷蔵庫として活用できます。冷蔵庫とクーラーボックスの併用により食材を無駄にせず、効率よく食べるようにしましょう。', simulated: false },
    { id: 'item_extra_lifeline_7', category: 'lifeline', name: '軍手', image: '/images/軍手.png', recommendedQuantity: '3', unit: '組', description: '作業時や調理時に', importance: '防災用には、耐熱性、防刃性に優れた商品が適しており、がれきを取り扱う時や火を扱う調理時などに役立ちます。革手袋も有効です。', simulated: false },
];
// ▲▲▲ recommendedItems の更新ここまで ▲▲▲

const categoryNames = {
  food: '食料・水',
  hygiene: '衛生用品',
  lifeline: '生活用品',
};

const gaugeSettings = {
  satiety: { name: '満腹度', color: '#D97706' },
  hydration: { name: '水分', color: '#2563EB' },
  hygiene: { name: '衛生', color: '#16A34A' },
  morale: { name: '精神力', color: '#FBBF24' },
};
type GaugeKey = keyof typeof gaugeSettings;
export default function ResultPage() {
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedResult = sessionStorage.getItem('simulationResult');
    if (storedResult) {
      setResultData(JSON.parse(storedResult));
    }
    setIsLoading(false);
  }, []);

  if (isLoading) { return <div className="bg-slate-50 min-h-screen flex items-center justify-center text-2xl text-gray-700">結果を読み込んでいます...</div>; }
  if (!resultData) { return ( <div className="bg-slate-50 min-h-screen flex flex-col items-center justify-center text-2xl text-gray-700"> <p>シミュレーションデータが見つかりません。</p> <button onClick={() => router.push('/')} className="mt-4 bg-blue-600 text-white font-bold py-3 px-8 rounded-full hover:bg-blue-700 transition-colors duration-300 text-lg shadow-md">トップページに戻る</button> </div> ); }

  const { '不足したアイテム': lackingItems, gaugeHistory, selectedItems, turnCount, totalTurns } = resultData;
  const finalGauges = gaugeHistory[gaugeHistory.length - 1];
  const { satiety, hydration, morale, hygiene } = finalGauges;
  const gaugeAverage = (satiety + hydration + morale + hygiene) / 4;
  const survivalRate = totalTurns > 0 ? turnCount / totalTurns : 0;
  const score = Math.round(gaugeAverage * survivalRate);

  // ▼▼▼ 【ご要望の修正】 生存日数の表示ロジック ▼▼▼
  let survivalMessage = "";
  // ターンカウントが最大（9）以上なら成功
  if (turnCount >= totalTurns) {
      survivalMessage = "あなたは 3 日間、避難生活を送ることができました。";
  } else {
      // 失敗した場合、その時点の日付と時間帯を計算
      const day = Math.floor((turnCount - 1) / 3) + 1;
      const turnIndex = (turnCount - 1) % 3;
      const turnName: '朝' | '昼' | '夜' = (['朝', '昼', '夜'] as const)[turnIndex];
      survivalMessage = `あなたは ${day} 日目の ${turnName} まで避難生活を送ることができました。`;
  }
  // ▲▲▲ 修正ここまで ▲▲▲

  return (
    <div className="bg-slate-50 min-h-screen font-sans text-gray-800">
      <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">シミュレーション結果</h1>
          <p className="text-lg text-gray-600 mt-2">あなたの防災備蓄レベルを確認しましょう</p>
        </header>

        <section className="bg-white p-6 rounded-2xl shadow-lg mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-center">総合スコア</h2>
          <div className="text-7xl font-bold text-blue-600 text-center mb-2">{score} <span className="text-3xl text-gray-500">点</span></div>
          {/* ▼▼▼ 【ご要望の修正】 メッセージを表示 ▼▼▼ */}
          <p className="text-center font-semibold text-lg text-gray-700 mb-4">{survivalMessage}</p>
          <p className="text-center text-gray-600">
            {score > 80 ? '素晴らしい備えです！' : score > 50 ? '良い備えですが、さらに改善できます。' : '備えにいくつかの課題が見られます。'}
            下の結果を参考に、あなたの備蓄品を見直してみましょう。
          </p>
        </section>
        
        <section className="bg-white p-6 rounded-2xl shadow-lg mb-8">
            <h2 className="text-2xl font-semibold mb-6">最終的な状況</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               {Object.entries({ satiety, hydration, hygiene, morale }).map(([key, value]) => {
                    const gaugeKey = key as GaugeKey;
                    return (
                        <div key={gaugeKey} className="text-center">
                            <p className="capitalize font-medium mb-2">{gaugeSettings[gaugeKey].name}</p>
                            <div className="w-full bg-gray-200 rounded-full h-4">
                                <div className="h-4 rounded-full" style={{ width: `${value}%`, backgroundColor: gaugeSettings[gaugeKey].color }}></div>
                            </div>
                            <p className="font-bold text-lg mt-1">{value}%</p>
                        </div>
                    );
                })}
            </div>
        </section>

        <section className="bg-white p-6 rounded-2xl shadow-lg mb-8">
          <h2 className="text-2xl font-semibold mb-6">
            備蓄品の過不足チェック
            <span className="block text-sm font-normal text-gray-500 mt-1">※推奨量は東京都『東京備蓄ナビ』成人1人3日分を目安としています。</span>
          </h2>
          {Object.entries(categoryNames).map(([categoryId, categoryName]) => (
            <div key={categoryId} className="mb-8">
              <h3 className="text-xl font-bold text-gray-700 border-b-2 border-orange-400 pb-2 mb-4">{categoryName}</h3>
              <div className="space-y-3">
                {/* 1. シミュレーション対象のアイテムを表示 */}
                {recommendedItems
                  .filter(item => item.category === categoryId && item.simulated)
                  .map(recommended => {
                    let userQuantity = 0;
                    const itemId = parseInt(recommended.id.split('_')[1]);
                    if (!isNaN(itemId)) {
                      const details = allItems.find(item => item.id === itemId);
                      const selected = selectedItems.find(selItem => selItem.id === itemId);
                      if (details && selected) {
                        if (details.resourceType === 'water') {
                          let totalMl = 0;
                          selectedItems.forEach(sel => {
                            const itemDetails = allItems.find(i => i.id === sel.id);
                            if (itemDetails?.resourceType === 'water') {
                              totalMl += (itemDetails.resourceAmount || 0) * sel.quantity;
                            }
                          });
                          userQuantity = totalMl / 1000;
                        } else if (details.resourceType === 'rice') {
                          userQuantity = (details.resourceAmount || 0) * selected.quantity / 1000;
                        } else if (details.maxUses) {
                            if (itemId === 20) { // 口内洗浄液
                                userQuantity = (details.resourceAmount || 270) * selected.quantity;
                            } else if (itemId === 21) { // 歯みがき用ウェットティッシュ
                                userQuantity = (details.resourceAmount || 30) * selected.quantity; // 「枚数」でカウント
                            } else {
                                userQuantity = details.maxUses * selected.quantity; // それ以外は「回数」でカウント
                            }
                        } else {
                          if (itemId === 24) { // LEDランタン
                              userQuantity = (details.resourceAmount || 3) * selected.quantity; // 「台数」でカウント
                        } else if (itemId === 33) { // カイロ
                              userQuantity = (details.resourceAmount || 6) * selected.quantity; // 「個数」でカウント
                          } else {
                              userQuantity = selected.quantity; // それ以外は「個数」でカウント
                          }
                        }
                      }
                    }
                    const recommendedQuantityNum = parseFloat(recommended.recommendedQuantity);
                    const percentage = Math.min((userQuantity / recommendedQuantityNum) * 100, 100);
                    const isSufficient = percentage >= 100;
                    const itemDetails = allItems.find(item => item.id === parseInt(recommended.id.split('_')[1]));

                    return (
                      <div key={recommended.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <img src={itemDetails?.image} alt={itemDetails?.name} className="w-20 h-20 object-contain mr-4 bg-slate-100 rounded-md p-1" />
                          <div className="flex-grow">
                            <h3 className="font-bold text-lg text-gray-800">{recommended.name}</h3>
                            <div className="flex justify-between items-center mt-1">
                              <div className="w-full bg-gray-200 rounded-full h-4 mr-4">
                                <div className={`h-4 rounded-full transition-all duration-500 ${isSufficient ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${percentage}%` }}></div>
                              </div>
                              <p className="text-sm text-gray-700 font-medium whitespace-nowrap">
                                <span className={`font-bold text-lg ${isSufficient ? 'text-green-600' : 'text-red-600'}`}>{userQuantity.toFixed(1).replace('.0', '')}</span> / {recommended.recommendedQuantity} {recommended.unit}
                              </p>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{recommended.description}</p>
                            <div className="mt-3 pt-3 border-t border-gray-200">
                                <p className="text-sm text-gray-700">{recommended.importance}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                {/* 2. シミュレーション対象外のアイテムを表示 */}
                {/* ▼▼▼ 【追加】 説明文を追加 ▼▼▼ */}
                {recommendedItems.some(item => item.category === categoryId && !item.simulated) && (
                  <p className="text-sm text-gray-600 mb-3 bg-blue-50 p-3 rounded-md border-l-4 border-blue-400">
                    💡 以下の備蓄品は今回のシミュレーションでは使用していませんが、実際の災害時には必要とされる物資です。
                  </p>
                )}
                {/* ▲▲▲ 追加ここまで ▲▲▲ */}
                {recommendedItems
                  .filter(item => item.category === categoryId && !item.simulated)
                  .map(recommended => (
                    <div key={recommended.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <img src={recommended.image} alt={recommended.name} className="w-20 h-20 object-contain mr-4 bg-slate-100 rounded-md p-1" />
                        <div className="flex-grow">
                          <div className="flex justify-between items-start">
                            <h3 className="font-bold text-lg text-gray-800 mb-1">{recommended.name}</h3>
                            <p className="text-sm text-gray-700 font-medium whitespace-nowrap pl-4">
                              <span className="font-bold text-lg text-gray-800">{recommended.recommendedQuantity}</span> {recommended.unit}
                            </p>
                          </div>
                          <p className="text-xs text-gray-500">{recommended.description}</p>
                          <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-sm text-gray-700">{recommended.importance}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
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