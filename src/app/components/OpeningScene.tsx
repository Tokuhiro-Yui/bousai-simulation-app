import { useState, useEffect } from 'react';
import styles from './OpeningScene.module.css';

interface OpeningSceneProps {
  onComplete: () => void;
}

const storyLines = [
  "202X年、冬。ありふれた日常が、その日、音を立てて崩れ去ることを、まだ誰も知らなかった。",
  "平日の午後5時47分。\n大学のオンライン講義を終えたあなたは、イヤホンで好きなアーティストの新曲を聴きながら、ベッドに寝転がってスマートフォンを眺めていた。",
  "（カタ…）",
  "「ん、地震…？ またか…」",
  "最近、小さな地震が続いていた。慣れっこになったあなたは、特に気にも留めない。",
  "その瞬間だった。",
  "『【緊急地震速-】』",
  "スマートフォンの警報音が、鼓膜を直接殴りつけるような不協和音を響かせる。",
  "（ゴゴゴゴゴゴゴッ！！！）",
  "突き上げるような、暴力的な縦揺れ。あなたは床に叩きつけられる。\n本棚から教科書が雪崩のように降り注ぎ、キッチンから食器の割れる甲高い音が響く。",
  "「うわっ…！ な、なんだこれ！？」",
  "永遠に続くかと思われた揺れが、少しずつその勢いを弱めていく…。",
  "部屋は停電で完全な闇に包まれた。\n手探りで探したスマートフォンのライトを点けると、信じられない光景が広がる。",
  "画面には「圏外」の文字。家族や友人に連絡する術がない。",
  "棚の奥から、手回し充電ラジオを探し出し、必死にハンドルを回す。",
  "『…緊急情報…震源は東京湾北部…M7.3…都心で震度7を観測…』",
  "『…都内各所で大規模火災…交通網は完全に麻痺…』",
  "『…救助隊の到着には時間がかかります。建物に倒壊の危険がない場合は、その場で安全を確保してください…』",
  "外は危険、救助はいつ来るかわからない。\n幸い、この部屋はまだ安全そうだ。",
  "「……ここに、留まるしかない」",
  "あなたは決意する。\nこの部屋で生き抜くこと――在宅避難を。",
  "電気、水道、ガス、通信はすべて停止。\nこの孤立した空間で、あなたは3日間を生き延びることができるだろうか。",
  "その運命を分けるのは、ただ一つ。",
];


const OpeningScene: React.FC<OpeningSceneProps> = ({ onComplete }) => {
  // Stateを「完了した行の配列」と「現在タイピング中の行」に分割
  const [completedLines, setCompletedLines] = useState<string[]>([]);
  const [currentTypingText, setCurrentTypingText] = useState('');
  const [lineIndex, setLineIndex] = useState(0);
  const [showButton, setShowButton] = useState(false);
  const TYPING_SPEED = 50;
  const LINE_PAUSE = 800; // 行間のポーズを少し短縮

  useEffect(() => {
    if (lineIndex >= storyLines.length) {
      setShowButton(true);
      return; // 全ての行が完了したので処理を終了
    }

    let charIndex = 0;
    const currentLine = storyLines[lineIndex].trim();

    const typingInterval = setInterval(() => {
      if (charIndex < currentLine.length) {
        // 現在の行をタイピング中
        setCurrentTypingText(currentLine.substring(0, charIndex + 1));
        charIndex++;
      } else {
        // 行のタイピングが完了
        clearInterval(typingInterval);
        setCompletedLines(prev => [...prev, currentLine]); // 完了リストに追加
        setCurrentTypingText(''); // タイピング中の行をリセット

        // 少し待ってから次の行へ
        setTimeout(() => {
          setLineIndex(prev => prev + 1);
        }, LINE_PAUSE);
      }
    }, TYPING_SPEED);

    // コンポーネントが消える時にインターバルも消すクリーンアップ処理
    return () => {
      clearInterval(typingInterval);
    };
  }, [lineIndex]); // lineIndexが変わるたびにこのエフェクトが実行される

  return (
    <div className={styles.container}>
      <div className={styles.storyContainer}>
        {/* 完了した行をそれぞれ別のpタグで表示 */}
        {completedLines.map((line, index) => (
          <p key={index} className={styles.storyText}>{line}</p>
        ))}

        {/* 現在タイピング中の行を表示 */}
        {lineIndex < storyLines.length && (
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