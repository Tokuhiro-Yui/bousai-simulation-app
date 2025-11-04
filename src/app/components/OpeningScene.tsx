import { useState, useEffect, useRef } from 'react';
import styles from './OpeningScene.module.css';

interface OpeningSceneProps {
  onComplete: () => void;
}

// ストーリーテキスト (変更なし)
const storyLines = [
  "202X年、冬。",
  "ありふれた日常が、その日、音を立てて崩れ去ることを、まだ誰も知らなかった。",
  "平日の午後11時14分。",
  "マンションの一人暮らしの部屋で、あなたはベッドに横たわり、スマートフォンでSNSを眺めていた。",
  "窓の外は静かで、ヒーターの音だけが部屋に響く。",
  "（カタ…）",
  "「ん、地震…？\u3000またか…」",
  "最近、小さな地震が続いていた。",
  "慣れっこになったあなたは、特に気にも留めない。",
  "――その瞬間だった。",
  "『【緊急地震速報】』",
  "スマートフォンが、鼓膜を突き刺すような警報音を鳴らした。",
  "次の瞬間――",
  "（ゴゴゴゴゴゴゴッ！！！）",
  "床が突き上げられ、体が宙に浮く。",
  "暴力的な縦揺れ。",
  "（ガシャーン！\u3000バラバラッ！）",
  "本棚から本が雪崩のように落ち、机の上の物が次々と床に叩きつけられる。",
  "「うわっ…！\u3000な、なんだこれ！？」",
  "永遠にも思える揺れが、ようやく静まる。",
  "（シーン…）",
  "暗闇。停電だ。",
  "部屋は完全な闇に包まれている。",
  "手探りでスマートフォンを拾い、ライトを点ける。",
  "「…繋がらない…？」",
  "アンテナは立っているのに、家族への電話は「プー、プー」と鳴るだけ。",
  "ライトで部屋を照らす。",
  "物は散乱しているが、幸いドアは開く。",
  "玄関から共用廊下を覗くと、建物はなんとか無事のようだ。",
  "「この部屋は…まだ安全かもしれない」",
  "棚から手回し充電ラジオを取り出し、必死にハンドルを回す。",
  "ザザッ…とノイズの合間に、アナウンサーの緊迫した声が聞こえてくる。",
  "『…震源は東京湾北部、マグニチュード7.3。都心で震度7を観測…』",
  "『…大規模火災が多数発生、交通網は完全に麻痺…』",
  "『…救助や支援には数日を要する見込み。建物が安全な場合は、むやみに移動せず、その場で待機を…』",
  "救助はいつ来るかわからない。だが、幸いこの部屋は安全そうだ。",
  "「……ここに、留まるしかない」",
  "あなたは決意する。",
  "この部屋で生き抜くこと――在宅避難を。",
  "電気、水道、ガス、通信。すべてが止まったこの孤立した空間で、",
  "あなたは3日間、生き延びることができるだろうか。",
  "その運命を分けるのは、ただ一つ。",
  "――あなたの「備え」だ。",
];


const OpeningScene: React.FC<OpeningSceneProps> = ({ onComplete }) => {
  const [completedLines, setCompletedLines] = useState<string[]>([]);
  const [currentTypingText, setCurrentTypingText] = useState('');
  const [lineIndex, setLineIndex] = useState(0);
  const [showButton, setShowButton] = useState(false);
  const storyContainerRef = useRef<HTMLDivElement>(null);
  
  // ▼▼▼ ハイドレーションエラー対策 ▼▼▼
  // 1. マウント状態を管理するStateを追加
  const [isMounted, setIsMounted] = useState(false);

  // 2. このuseEffectはクライアント側でのみ（ハイドレーション後に）実行される
  useEffect(() => {
    // コンポーネントがマウントされたことを示す
    setIsMounted(true);
  }, []); // 空の依存配列で、マウント時に一度だけ実行
  // ▲▲▲ ここまで ▲▲▲

  const TYPING_SPEED = 50;
  const LINE_PAUSE = 800; // 行間のポーズ

  useEffect(() => {
    // ▼▼▼ isMountedがtrueになるまで（＝ハイドレーション完了まで）待機 ▼▼▼
    if (!isMounted || lineIndex >= storyLines.length) {
      if (isMounted && lineIndex >= storyLines.length) {
        setShowButton(true);
      }
      return; // マウント前か、全行完了なら処理を終了
    }
    // ▲▲▲ ここまで ▲▲▲

    let charIndex = 0;
    const currentLine = storyLines[lineIndex].trim();
    
    // ▼▼▼ タイムアウトIDを保持する変数を追加 (前回の修正) ▼▼▼
    let linePauseTimeout: NodeJS.Timeout | null = null;

    const typingInterval = setInterval(() => {
      if (charIndex < currentLine.length) {
        setCurrentTypingText(currentLine.substring(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typingInterval);
        setCompletedLines(prev => [...prev, currentLine]);
        setCurrentTypingText('');

        // ▼▼▼ タイムアウトIDを代入 (前回の修正) ▼▼▼
        linePauseTimeout = setTimeout(() => {
          setLineIndex(prev => prev + 1);
        }, LINE_PAUSE);
      }
    }, TYPING_SPEED);

    return () => {
      clearInterval(typingInterval);
      // ▼▼▼ setTimeoutもクリア (前回の修正) ▼▼▼
      if (linePauseTimeout) {
        clearTimeout(linePauseTimeout);
      }
    };
  
  // ▼▼▼ 依存配列に isMounted を追加 ▼▼▼
  }, [lineIndex, isMounted]); // lineIndex または isMounted が変わるたびに実行
  // ▲▲▲ ここまで ▲▲▲


  useEffect(() => {
    if (storyContainerRef.current) {
      const container = storyContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [completedLines, currentTypingText]);

  return (
    <div className={styles.container}>
      <div className={styles.storyContainer} ref={storyContainerRef}>
        {completedLines.map((line, index) => (
          <p key={index} className={styles.storyText}>{line}</p>
        ))}

        {/* ▼▼▼ isMounted が true になるまでカーソルも非表示にする ▼▼▼ */}
        {isMounted && lineIndex < storyLines.length && (
          <p className={styles.storyText}>
            {currentTypingText}
            {!showButton && <span className={styles.cursor}></span>}
          </p>
        )}
      </div>

      {showButton && (
        <button onClick={onComplete} className={styles.startButton}>
          さあ、あなたの備えを確認しよう
        </button>
      )}
    </div>
  );
};

export default OpeningScene;