/** Vercel Â· ?œë²„ ?€?„ì•„??5ë¶?(VIP ë¦¬í¬???¥ì‹œê°??ì„±) */
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
// ???ˆì „ ?„í„° ?´ì œë¥??„í•´ HarmCategory, HarmBlockThreshold ì¶”ê?
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import type { VipCalendarType, VipGender } from "@/lib/saju/vip-types";
import { extractVipSajuData } from "@/lib/saju/vip-saju-data";
import {
  resolveVipReportPublicUrlFromRequest,
  upsertVipOrderRow,
  VIP_ORDER_AMOUNT_WON,
} from "@/lib/payments/vip-order-supabase";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

// êµ¬ê? ?œë??˜ì´ ì´ˆê¸°??
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

type VipRequestBody = {
  name?: string;
  gender: VipGender;
  birthDate: string;
  birthTime?: string | null;
  mbti?: string | null;
  calendarType?: VipCalendarType;
  /** ê²°ì œ ê²€ì¦??„ë£Œ ???„ë‹¬ ???ˆì„ ?Œë§Œ `vip_orders`??ê¸°ë¡ */
  imp_uid?: string | null;
  phone_number?: string | null;
};

async function persistVipOrderRow(
  request: NextRequest,
  params: {
    imp_uid: string | null | undefined;
    user_name: string;
    phone_number: string | null | undefined;
  },
): Promise<void> {
  const imp = typeof params.imp_uid === "string" ? params.imp_uid.trim() : "";
  if (!imp) return;

  const supabaseAdmin = createSupabaseAdminClient();
  if (!supabaseAdmin) {
    console.error(
      "[vip_orders] ë¦¬í¬???„ë£Œ ?¨ê³„: Supabase Admin ?´ë¼?´ì–¸???†ìŒ(SUPABASE_SERVICE_ROLE_KEY) ??vip_orders upsert ?ëµ",
    );
    return;
  }

  const report_url = resolveVipReportPublicUrlFromRequest(request);
  const phone =
    typeof params.phone_number === "string" && params.phone_number.trim() !== ""
      ? params.phone_number.trim()
      : null;

  const row = {
    user_name: params.user_name,
    phone_number: phone,
    imp_uid: imp,
    amount: VIP_ORDER_AMOUNT_WON,
    report_url,
    status: "completed",
  };

  const res = await upsertVipOrderRow(supabaseAdmin, row);
  if (!res.ok) {
    console.error("[vip_orders] ë¦¬í¬???„ë£Œ ?¨ê³„ upsert ?¤íŒ¨:", {
      message: res.message,
      code: res.code,
      imp_uid: imp,
    });
  }
}

function parseBirthParts(birthDate: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function normalizeMbti(raw: string | null | undefined): string | null {
  if (raw == null || String(raw).trim() === "") return null;
  const s = String(raw).trim().toUpperCase();
  if (!/^[EI][NS][FT][JP]$/.test(s)) return raw.trim();
  return s;
}

// ???œë??˜ì´ Flash (ê³µì‹ ?„ë¦¬ë·? ë¦¬í¬???ì„±ê¸?
async function generateVipMarkdownReport(
  sajuData: ReturnType<typeof extractVipSajuData>,
  opts: { clientName: string; currentYear: number; mbti: string | null }
): Promise<string> {
  
  // ?š¨ ?¬ì£¼/?´ì„¸ ?©ì–´ë¡??¸í•œ êµ¬ê? AI??ê°•ì œ ì°¨ë‹¨??ë§‰ê¸° ?„í•´ ?ˆì „ ?„í„° ìµœí•˜??ì¡°ì •
  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  ];

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    safetySettings,
  });

  const mbtiInstruction = opts.mbti 
    ? `?´ë‹´?ì˜ MBTI??${opts.mbti}?…ë‹ˆ?? ?œì–‘ ?¬ë¦¬?™ê³¼ ?™ì–‘ ëª…ë¦¬?™ì„ ê²°í•©?˜ì—¬ ë¶„ì„?˜ì„¸??` 
    : `ì£¼ì˜: ?´ë‹´?ì˜ MBTI ?•ë³´ê°€ ?†ìŠµ?ˆë‹¤. ì¶œë ¥ ê²°ê³¼ë¬¼ì— 'MBTI'??'?œì–‘ ?¬ë¦¬???´ë¼???¨ì–´ë¥?1%???¸ê¸‰?˜ì? ë§ê³  ?œìˆ˜ ëª…ë¦¬?™ì  ê´€?ìœ¼ë¡œë§Œ ?œìˆ ?˜ì„¸??`;

  const prompt = `
?¹ì‹ ?€ ?¬ì£¼Â·?€??ë¶„ì„ ?„ë¬¸ê°€?…ë‹ˆ??
?„ë˜ ?œê³µ???´ë‹´?ì˜ ?¬ì£¼ ëª…ì‹ ?°ì´?°ë§Œ??ê·¼ê±°ë¡? ê·¹ë„ë¡??ì„¸?˜ê³  ?¼ë¦¬?ìœ¼ë¡??•í™•??'VIP ?€??ì¢…í•© ë¶„ì„ ë¦¬í¬??ë¥?ë§ˆí¬?¤ìš´(Markdown)?¼ë¡œ ?‘ì„±?˜ì„¸??

[?´ë‹´???•ë³´]
- ?´ë¦„: ${opts.clientName}
- ?„ì¬ ê¸°ì? ?°ë„: ${opts.currentYear}??
- ${mbtiInstruction}
- ?¬ì£¼ ?êµ­ ?°ì´?? ${JSON.stringify(sajuData, null, 2)}

[?š¨ ?ˆë? ?„ìˆ˜ ê·œì¹™]
1. ë¶„ëŸ‰ ê°•ì œ: ê°?ì±•í„°??ìµœì†Œ 500???´ìƒ, 3~4ê°œì˜ ë¬¸ë‹¨?¼ë¡œ ê½?ì±„ìš°?¸ìš”. "${opts.clientName} ?˜ì˜ ?¬ì£¼ë¥?ë³´ë©´..." ?˜ë©° ì§€?ì ?¼ë¡œ ?´ë¦„???¸ëª…?˜ê³ , ë¼ˆë? ?Œë¦¬???©íŠ¸?€ ?°ëœ»??ì¡°ì–¸??ê²°í•©?˜ì„¸??
2. ?œê°????ê·¸ë¦¬ê¸?: ???¥ê³¼ ???¥ì—??ë°˜ë“œ??ë§ˆí¬?¤ìš´ ??Markdown Table, \`|---|---| \` ?•ì‹)ë¥??¬ìš©?˜ì—¬ ?¬ì£¼ 8ê¸€???êµ­ê³??€???ë¦„??ê·¸ë ¤ ?£ìœ¼?¸ìš”.
3. ê³¼ê±° ?œìˆ  ?ˆë? ê¸ˆì?: ???¥ì—???œìˆ ???? ${opts.currentYear}???´ì „??ê³¼ê±°???ˆë? ?¸ê¸‰?˜ì? ë§ˆì„¸?? ?¤ì§ ${opts.currentYear}?„ë???2035?„ê¹Œì§€ 10??ì¹?ë¯¸ë˜ë§??œìˆ ?˜ì„¸??
4. ?°ë„ë³??•ë? ?€ê²? ?????¸ìš´ ë¶„ì„ ?? ?„ë˜ ?¬ë§·??ë¬´ì¡°ê±?10ë²?ë°˜ë³µ?˜ì„¸??
  ### 2026??(ë³‘ì˜¤??
  - ?ë¦„ ë°??¬ë¬¼: (ìµœì†Œ 100???´ìƒ ?ì„¸ ?œìˆ )
  - ì§ì¥ ë°??€?¸ê?ê³? (ìµœì†Œ 100???´ìƒ ?ì„¸ ?œìˆ )
  ### 2027??(?•ë??? ... (2035?„ê¹Œì§€ ê°??°ë„ë³„ë¡œ ?…ë¦½???¹ì…˜ ?‘ì„±)
5. ?ˆë? ê¸ˆì?: ë¦¬í¬??ë³¸ë¬¸??'39,900??, 'VVIP', 'ëª…ë¦¬?™ì?…ë‹ˆ?? ê°™ì? ?¤ê?ê±°ë¦¬???¸ì‚¬ë§? ê°€ê²? ?œìŠ¤???„ë¡¬?„íŠ¸ ?´ìš©??1%???¸ì¶œ?˜ì? ë§ˆì„¸?? ?¸ì‚¬ë§??†ì´ ê³§ë°”ë¡??„ë¬¸?ì´ê³??´ë°±??ë¶„ì„ ë³¸ë¡ ?¼ë¡œ ?œì‘?˜ì„¸??
6. ??Table) ë§ˆí¬?¤ìš´ ê°•ì œ: ë§ˆí¬?¤ìš´ ?œë? ê·¸ë¦´ ?ŒëŠ” ë°˜ë“œ????ë¸”ë¡ ?„ì•„?˜ë¡œ ë¹?ì¤?Enter)???£ê³ , ?¤ë” ?‰Â·êµ¬ë¶???\`|---|\`), ê°??°ì´???‰ë§ˆ??ë°˜ë“œ??ì¤„ë°”ê¿?Enter)?¼ë¡œ ??ì¤„ì”©ë§??°ì„¸?? ?ˆë? ??ì¤„ì— ?Œì´??|)ë¡??‰ì„ ?´ì–´ ë¶™ì—¬ ?°ë‹¬???°ì? ë§ˆì„¸??
7. ?©ì‹ (?„ìš”??ê¸°ìš´) ?ë³„???¼ê??? ?¬ì£¼???©ì‹ ???ë³„?????´ë¬?¤ì??¬ë‹¤ ?˜ì? ë§ˆì‹­?œì˜¤. ?¬ì£¼ ?êµ­?ì„œ 'ê°€??ê°?ˆ˜ê°€ ?ê±°???„ì˜ˆ ?†ëŠ” ?¤í–‰(?¤í–‰??ë¶ˆê· ?•ì„ ì±„ì›Œì£¼ëŠ” ê¸°ìš´)'??1?œìœ„ ?©ì‹ ?¼ë¡œ ê³ ì •?˜ì—¬ ë¶€?ì„ ì²˜ë°©?˜ì„¸?? ?™ì¼??ëª…ì‹?ëŠ” ??ƒ ?™ì¼??ë¶€?ì„ ì²˜ë°©?´ì•¼ ?©ë‹ˆ??
?????êµ­ ?œëŠ” ?„ë˜ ??êµ¬ì¡°ë¥??°ë¥´?¸ìš”. (?¤ì œ ?œìÂ·??„±?€ ?¬ì£¼ ?°ì´?°ë¡œ ì±„ìš¸ ê²?

| êµ¬ë¶„ | ?„ì£¼ | ?”ì£¼ | ?¼ì£¼ | ?œì£¼ |
| --- | --- | --- | --- | --- |
| ì²œê°„ | O(O) | O(O) | O(O) | O(O) |
| ì§€ì§€ | O(O) | O(O) | O(O) | O(O) |

?„ì? ?™ì¼???•ë³´ë¥??¼í‘œë¡œë§Œ ?ì? ??ì¤??•íƒœ(?? êµ¬ë¶„,?„ì£¼,?”ì£¼,...)???¬ìš©?˜ì? ë§ê³ , ë°˜ë“œ???Œì´????ë§ˆí¬?¤ìš´?¼ë¡œë§?ì¶œë ¥?˜ì„¸??

[ëª©ì°¨ ?ì„± ?„ìˆ˜] ??1??ë³¸ë¡ ???œì‘?˜ê¸° ?„ì—, ë°˜ë“œ??\`## ëª©ì°¨\`?¼ëŠ” ?œëª© ?˜ì— ?„ì²´ ì±•í„° ë¦¬ìŠ¤?¸ë? ?‘ì„±?˜ì„¸??
?š¨ ?ˆë? ì£¼ì˜: ëª©ì°¨ ?´ë?????ª©???˜ì—´???ŒëŠ” ?ˆë?ë¡?'#' ê¸°í˜¸(Heading)ë¥??¬ìš©?˜ì? ë§ˆì„¸?? ?˜ì´ì§€ ?Œë”ë§??¤ë¥˜ê°€ ë°œìƒ?©ë‹ˆ?? ëª©ì°¨ ??ª©?€ ë°˜ë“œ??'1. ??1??..', '2. ??2??..'ê³?ê°™ì´ ?œìˆ˜???«ì ë¦¬ìŠ¤??Numbered list) ?•ì‹?¼ë¡œë§??´ë°±?˜ê²Œ ?‘ì„±?´ì•¼ ?©ë‹ˆ??

[10?€ ëª©ì°¨] (ê°?ì±•í„° ?œëª©?€ ë°˜ë“œ??'#' 1ê°œë§Œ ?¬ìš©)
# ??1???€ê³ ë‚œ ?´ëª…??ê·¸ë¦‡ê³??¬ì£¼ ?êµ­ 
# ??2??10???€?´ê³¼ ${opts.currentYear}~2035???¸ìš´ ?•ë? ?´ë?
# ??3??ì²œì§ê³?ì§ì—…??
# ??4???¬ë¬¼???ë¦„
# ??5???¸ì—°ë²•ê³¼ ? ì •??
# ??6??ê±´ê°•??
# ??7??ê·€?¸ê³¼ ?…ì—°
# ??8??ê¸¸ìš´??ë¶€ë¥´ëŠ” ?‰ë™ì§€ì¹?
# ??9???¸ìƒ??ì£?ê³ ë?ê±°ë¦¬?€ ê°•ë ¥??ë°©ì–´ ê¸°ì œ
# ??10??ì¢…í•© ê²°ë¡  ë°?1:1 ë§ì¶¤ ë¶€??ì²˜ë°©
(??ì±•í„°??ë°˜ë“œ??'ë¶€???¨ê³¼ ë°??œìš©ë²???ëª…í™•???œì‹œ?´ì•¼ ?©ë‹ˆ??
1. ë¨¼ì? ë¶€???´ë?ì§€ë¥??½ì…?˜ì„¸??
2. ?´ë?ì§€ ë°”ë¡œ ?„ë˜??[ë¶€?ì˜ ?¨ê³¼ ?¤ëª…]?´ë¼???Œì œëª©ì„ ?¬ê³ , ????ë¶€?ì´ ?„ìš”?œì? ?œìˆ ?˜ì„¸??
3. ê·??„ë˜??ë°˜ë“œ??1. ?¬íšŒ??? ë¶„ ?ìŠ¹, 2. ?¬ë¬¼??ê²°ì‹¤, 3. ?¸ê°„ê´€ê³?ê°œì„  ?´ë¼??3ê°€ì§€ ?˜ë²„ë§?ë¦¬ìŠ¤?¸ë? ?¬ìš©?˜ì—¬ ?´ì „ì²˜ëŸ¼ ê¹”ë”?˜ê³  ?„íŒ©???ˆê²Œ ë¶€?ì˜ ?¨ê³¼ë¥??‘ì„±?˜ì„¸??)
?©ì‹  ?ë³„ ê·œì¹™(ê·œì¹™ 7)???°ë¼ ?„ë˜ 5ê°?ì¤??•í™•??1ê°œì˜ ë§ˆí¬?¤ìš´ ?´ë?ì§€ ì½”ë“œë§?? íƒ?˜ì—¬ ?½ì…?˜ì„¸??
- ?˜ë¬´(?? ?©ì‹ : ![ë§ì¶¤ ë¶€??(/images/amulet-wood.jpg)
- ë¶??? ?©ì‹ : ![ë§ì¶¤ ë¶€??(/images/amulet-fire.jpg)
- ???? ?©ì‹ : ![ë§ì¶¤ ë¶€??(/images/amulet-earth.jpg)
- ???? ?©ì‹ : ![ë§ì¶¤ ë¶€??(/images/amulet-metal.jpg)
- ë¬?æ°? ?©ì‹ : ![ë§ì¶¤ ë¶€??(/images/amulet-water.jpg)
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  
  if (!text) {
    throw new Error("GEMINI_EMPTY_RESPONSE");
  }
  return text;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as VipRequestBody;
    const { gender, birthDate, birthTime } = body;
    const currentYear = 2026;
    const clientName = typeof body.name === "string" && body.name.trim() !== "" ? body.name.trim() : "?´ë‹´??;
    const mbti = normalizeMbti(body.mbti);

    if (!birthDate) return NextResponse.json({ success: false, error: "?ë…„?”ì¼?€ ?„ìˆ˜?…ë‹ˆ??" }, { status: 400 });
    if (!process.env.GEMINI_API_KEY) return NextResponse.json({ success: false, error: "Gemini API ?¤ê? ?†ìŠµ?ˆë‹¤." }, { status: 500 });

    const parts = parseBirthParts(birthDate);
    if (!parts) return NextResponse.json({ success: false, error: "?˜ëª»??? ì§œ ?•ì‹?…ë‹ˆ??" }, { status: 400 });

    const calendarType = body.calendarType === "lunar" || body.calendarType === "lunar-leap" ? body.calendarType : "solar";

    let sajuData;
    try {
      sajuData = extractVipSajuData({
        ...parts,
        calendarType,
        gender,
        birthTimeRaw: birthTime ?? null,
        birthDateIso: birthDate.trim(),
        mbti,
      });
    } catch (e) {
      return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "ëª…ì‹ ê³„ì‚° ?¤íŒ¨" }, { status: 400 });
    }

    let markdown: string;
    try {
      markdown = await generateVipMarkdownReport(sajuData, { clientName, currentYear, mbti });
    } catch (err: any) {
      console.error("Gemini API ì²˜ë¦¬ ?ëŸ¬ ?ë¬¸:", err);
      // ?ëŸ¬ ë©”ì‹œì§€ë¥?ë­‰ëš±ê·¸ë¦¬ì§€ ?Šê³  ?”ë©´??ê·¸ë?ë¡??´ì¤?ˆë‹¤!
      return NextResponse.json(
        { success: false, error: `?œë??˜ì´ ?œë²„ ?ëŸ¬: ${err.message || "?????†ëŠ” ?¤ë¥˜"}` },
        { status: 500 },
      );
    }

    await persistVipOrderRow(request, {
      imp_uid: body.imp_uid,
      user_name: clientName,
      phone_number: body.phone_number,
    });

    return NextResponse.json({ success: true, markdown });
  } catch (error: any) {
    console.error("?œë²„ ?„ì²´ ?ëŸ¬:", error);
    return NextResponse.json(
      { success: false, error: `?œë²„ ?µì‹  ?ëŸ¬: ${error.message || "?????†ëŠ” ?¤ë¥˜"}` },
      { status: 500 },
    );
  }
}
