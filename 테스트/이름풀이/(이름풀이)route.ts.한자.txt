import { NextRequest, NextResponse } from "next/server";
import { tableData } from "@seyoungsong/hanjadict";

type HanjaEntry = { hanja: string; meaning: string };

const TWO_SOUND_RULE: Record<string, string[]> = {
  용: ["룡"], 이: ["리"], 여: ["녀"], 유: ["류"], 연: ["련"],
  열: ["렬"], 예: ["례"], 율: ["률"], 낙: ["락"], 노: ["로"],
};

function getHanjaScore(hanja: string, originalMeaningFull: string, bestMeaning: string): number {
  let score = 0;

  const meaningCount = originalMeaningFull.split(/[,;]/).length;
  score += meaningCount * 100;

  const goodKeywords = ["아름다울", "빛날", "어질", "지혜", "뛰어날", "굳셀", "착할", "슬기", "길할", "덕", "현명할", "백성", "맑을", "밝을", "은혜", "옥돌", "보배"];
  for (const kw of goodKeywords) {
    if (bestMeaning.includes(kw)) {
      score += 300;
      break;
    }
  }

  const badKeywords = [
    "땅 이름", "산 이름", "강 이름", "물 이름", "나라 이름", "고을 이름", "별 이름", "벌레 이름", "짐승 이름", "새 이름",
    "벌레", "짐승", "새", "병", "죽을", "나쁠", "어리석을", "모양", "단위", "제사", "귀신", "악할", "흉할",
    "원망할", "근심할", "미워할", "어두울", "더러울", "속일", "벌줄", "죽일", "망할", "괴로울", "슬플", "가난할", "도둑"
  ];
  for (const bad of badKeywords) {
    if (originalMeaningFull.includes(bad)) {
      score -= 3000; 
      break;
    }
  }

  const coreNames = "美未微迷尾敏旻珉民閔秀洙守水壽修受首俊準遵駿浚智志地知芝枝賢玄炫顯英永榮泳映迎眞珍振辰進鎭瑞序舒書徐龍容用勇庸溶熔成星聖誠城姸延燕緣淵河夏荷東童同大大多正政廷停熙喜嬉載在才勳訓赫圭奎相尙基起機泰太源元原明命善宣恩銀敬景海光廣建宇佑祐碩錫哲喆浩鎬晧煥奐植亨鍾宗昇勝";
  if (coreNames.includes(hanja)) {
    score += 2000;
  }

  return score;
}

function getQueriesToMatch(query: string): string[] {
  return [query, ...(TWO_SOUND_RULE[query] || [])];
}

function searchByPronunciation(query: string): HanjaEntry[] {
  const queriesToMatch = getQueriesToMatch(query);
  const hanjaMap = new Map<string, { meaning: string, score: number }>(); 

  for (const [hanja, meaning] of Object.entries(tableData)) {
    if (!meaning || typeof meaning !== "string") continue;

    const readings = meaning.split(/[,;]/);
    let matchedMeaning = "";

    for (const reading of readings) {
      const clean = reading.replace(/\([^)]+\)/g, "").trim();
      for (const q of queriesToMatch) {
        if (clean.endsWith(q)) {
          matchedMeaning = clean; 
          break;
        }
      }
      if (matchedMeaning) break;
    }

    if (matchedMeaning) {
      if (matchedMeaning === query || matchedMeaning.length === 1) {
        matchedMeaning = `${query} (이름·지명)`;
      }
      
      const score = getHanjaScore(hanja, meaning, matchedMeaning);

      if (!hanjaMap.has(hanja)) {
        hanjaMap.set(hanja, { meaning: matchedMeaning, score });
      } else {
         if(score > hanjaMap.get(hanja)!.score){
             hanjaMap.set(hanja, { meaning: matchedMeaning, score });
         }
      }
    }
  }

  let results: (HanjaEntry & { score: number })[] = [];
  for (const [hanja, data] of hanjaMap.entries()) {
    results.push({ hanja, meaning: data.meaning, score: data.score });
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.meaning.localeCompare(b.meaning, 'ko-KR');
  });

  return results.map(r => ({ hanja: r.hanja, meaning: r.meaning }));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { char } = body;
    if (!char || typeof char !== "string") return NextResponse.json({ error: "입력 오류" }, { status: 400 });

    const singleChar = char.trim().slice(0, 1);
    if (!singleChar) return NextResponse.json({ error: "입력 오류" }, { status: 400 });

    const results = searchByPronunciation(singleChar);
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}