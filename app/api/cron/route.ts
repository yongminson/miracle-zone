// app/api/cron/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { buildDailyPost } from '@/lib/blog/daily-post';

// 매일 블로그 글 — 2026-11-05 부터 AI 대신 그날 일진으로 계산한 12띠 운세 글을 올린다(비용 없음).
// 주소가 daily-YYYY-MM-DD 라 같은 날 두 번 불려도 글이 겹치지 않는다.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
    const post = buildDailyPost(today);

    const { data: existing, error: readError } = await supabase
      .from('blog_posts')
      .select('slug')
      .eq('slug', post.slug)
      .maybeSingle();
    if (readError) throw readError;
    if (existing) {
      return NextResponse.json({ success: true, message: '오늘 글이 이미 있습니다.', title: post.title });
    }

    const { error: dbError } = await supabase.from('blog_posts').insert([post]);
    if (dbError) throw dbError;

    return NextResponse.json({ success: true, message: '자동 블로그 작성 완료!', title: post.title });
  } catch (error) {
    console.error('크론 에러:', error);
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
