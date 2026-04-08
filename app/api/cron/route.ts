// app/api/cron/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import OpenAI from 'openai'; 

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try { 
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // 💡 핵심 업그레이드: 한국 시간 기준의 오늘 날짜를 구해서 AI에게 주입합니다!
    const today = new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });

    // 2. AI에게 시킬 프롬프트 (오늘 날짜 명시)
    const prompt = `
      오늘은 ${today}입니다. 너는 사주, 타로, 꿈해몽 전문가야. 
      오늘 날짜(${today})에 맞는 흥미로운 운세나 해몽 관련 블로그 글을 하나 작성해줘.
      형식은 JSON으로 주고, 키값은 title(제목에 오늘 날짜나 시기를 자연스럽게 포함), category(사주/운세, 꿈해몽, 로또/행운 중 택1), summary(20자 내외 요약), content(본문 3문단 정도)로 해줘.
    `;

    // 3. AI에게 글 쓰라고 명령!
    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: prompt }],
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
    });

    const resultString = completion.choices[0].message.content;
    if (!resultString) throw new Error("AI 응답이 없습니다.");
    
    const postData = JSON.parse(resultString);
    
    // 4. 주소창에 쓸 영어 slug 만들기
    const randomSlug = `post-${Math.random().toString(36).substring(2, 8)}`;

    // 5. 완성된 글을 수파베이스(DB)에 저장!
    const { error: dbError } = await supabase
      .from('blog_posts')
      .insert([
        {
          slug: randomSlug,
          title: postData.title,
          category: postData.category,
          summary: postData.summary,
          content: postData.content
        }
      ]);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, message: 'AI 자동 블로그 작성 완료!', title: postData.title });

  } catch (error: any) {
    console.error('크론 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}