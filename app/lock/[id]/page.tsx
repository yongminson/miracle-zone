import type { Metadata } from "next";
import { LockWall } from "../LockWall";

/**
 * 공유 링크 전용 주소. `/lock/<자물쇠 id>`
 *
 * 카카오톡·메시지로 보내면 미리보기 카드가 뜨는데, 그 카드에 들어갈 문구를
 * 여기서 만든다. 소원 내용이 카드에 보여야 받는 사람이 눌러본다.
 */

export const dynamic = "force-dynamic";

type LockRow = {
  id: string;
  wish: string;
  display_name: string | null;
};

async function fetchLock(id: string): Promise<LockRow | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  try {
    const res = await fetch(
      `${url}/rest/v1/locks_public?select=id,wish,display_name&id=eq.${encodeURIComponent(id)}&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as LockRow[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const lock = await fetchLock(id);

  if (!lock) {
    return {
      title: "소원 자물쇠 | 명운",
      description: "소원을 적은 자물쇠를 난간에 겁니다. 한 번 걸면 영원히 남습니다.",
    };
  }

  const who = lock.display_name?.trim() ? `${lock.display_name.trim()} 님` : "누군가";
  const wish = lock.wish.length > 80 ? `${lock.wish.slice(0, 80)}…` : lock.wish;
  const title = `${who}의 소원 자물쇠`;
  const description = `"${wish}"`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: [{ url: "/og-lock.png", width: 1200, height: 630, alt: "소원 자물쇠" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-lock.png"],
    },
  };
}

export default async function SharedLockPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LockWall initialLockId={id} />;
}
