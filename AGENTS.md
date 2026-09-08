# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Overview

**명운(命運) / Miracle Zone** — an AI-powered Korean fortune-telling (사주/명리학) web service. Free tools (daily fortune, zodiac, compatibility, MBTI, dream interpretation, lotto, wish altar) plus paid products (physiognomy/palmistry/name analysis at ₩4,900, and a ₩9,900 "명운 사주 인사이트 리포트" PDF). Production domain: `saju.ymstudio.co.kr`. The UI and nearly all code comments are in Korean.

## Commands

```bash
npm run dev      # next dev — local dev server on :3000
npm run build    # next build — production build (also the type-check gate; there is no separate tsc script)
npm run start    # next start — serve the production build
npm run lint     # eslint (flat config, next core-web-vitals + typescript)
```

There is **no test suite**. Verification is done via `npm run build` (type errors surface here) and manual/browser testing. The top-level `테스트/` folder is a scratch/reference dump of old `.txt` snapshots and images — not part of the build.

## Repository relationship

Two sibling GitHub repos share this codebase and the same internal package name `miracle-zone`:
- **`G:\miracle-zone`** → `github.com/yongminson/miracle-zone` — the **primary, current** repo (adds `@apps-in-toss/web-framework`, `googleapis`, `@anthropic-ai/sdk`).
- **`G:\myeongun-app`** → `github.com/yongminson/myeongun-app` — an **older sibling/mirror** with a reduced dependency set. Treat `miracle-zone` as canonical; changes generally originate here.

## Architecture

Next.js 16 (App Router) + React 19 + Tailwind CSS v4 (PostCSS plugin) + TypeScript strict. Deployed on Vercel. Path alias: `@/*` maps to the repo root (e.g. `@/lib/...`, `@/components/...`). Persistence is **Supabase** (Postgres). No ORM — the Supabase JS client is used directly.

### Route layout
- `app/page.tsx` — marketing landing page. Most interactive tools live in `app/tools/page.tsx` (a large `"use client"` hub selected via `?tab=` query param: fortune, zodiac, saju, palmistry, match, mbti, dream, altar, lotto).
- `app/vip/` — the paid VIP report flow (client). `app/yongmincucu/` — password-gated internal CS/admin dashboard. `app/blog/` — auto-generated content. Legal pages: `terms`, `refund`, `privacy`, `policy`, `about`, plus `terms-toss` (Apps-in-Toss variant).
- `app/api/**/route.ts` — all backend logic (Route Handlers).

### AI provider routing (important)
Different features call different LLMs; there is no single wrapper. Check the specific route before assuming a provider.
- **OpenAI** (`gpt-4o-mini`) is the default for most generation: `physiognomy`, `palmistry`, `name`, `match`, `dream`, `mbti`, `fortune` (premium text), and the `cron` blog generator.
- **Gemini** (`@google/generative-ai`) is primary for the **VIP saju report** (`app/api/saju/vip/route.ts`), with an **OpenAI fallback** in `lib/saju/vip-ai.ts`. The VIP route sets `HarmBlockThreshold`/`HarmCategory` to disable safety filters and `export const maxDuration = 300` (5-min Vercel limit).
- `@anthropic-ai/sdk` is a dependency but verify usage per-route.

### Fortune engine — deterministic, not AI
`app/api/fortune/fortune-engine.ts` computes the 사주 (Four Pillars / 사주팔자) **deterministically** from birth date/time/calendar using heavenly-stem / earthly-branch / five-element (오행) tables and `korean-lunar-calendar` for solar↔lunar conversion. It produces a seeded profile (element counts, day-master, scores). The AI layer only writes prose *on top of* this computed profile — keep the two concerns separate. Lunar dates support a leap-month variant (`lunar-leap`).

### VIP report pipeline
`lib/saju/vip-mingpa.ts` builds a 명식(命式) JSON skeleton from birth input → `lib/saju/vip-ai.ts` fills a 14-page report via Gemini/OpenAI → `components/vip/VipPdfTemplate.tsx` renders it → `hooks/usePdfDownload.ts` rasterizes to PDF client-side (`html-to-image`/`html2canvas` + `jspdf`). On completion the order is upserted to the `vip_orders` Supabase table (`lib/payments/vip-order-supabase.ts`, amount `VIP_ORDER_AMOUNT_WON`).

### Payments
Two providers, both server-verified — **never trust the client's success signal alone**:
- **PortOne / Iamport** (Korean cards, web) — `lib/payments/portone-rest.ts`, verified in `app/api/payments/verify/route.ts`. `/api/payment/verify` delegates here (see `lib/payments/verify-endpoint.ts`). Client-side pending-payment state and PortOne return-param parsing live across `lib/payments/*` (`imp-uid.ts`, `return-params.ts`, `pending-payment-*.ts`, `portone-response-guards.ts`).
- **Google Play IAP** — `app/api/payment/verify-google/route.ts` (via `googleapis` androidpublisher), for the Apps-in-Toss / Android wrapper.

### Supabase clients — two, with different privileges
- `app/lib/supabase.ts` — **anon** client (`NEXT_PUBLIC_*` keys), subject to RLS. Used for public reads/writes (e.g. anonymous `wishes` inserts).
- `lib/supabase/admin-client.ts` — **service-role** client via `createSupabaseAdminClient()`. Server-only; **bypasses RLS**. All privileged DB writes (orders, CS data) must use this — it returns `null` if keys are missing rather than falling back to anon. Admin CS reads live in `lib/admin/*`.

### Wish Altar + Cron
The "기적의 제단" (wish altar) stores anonymous wishes in the Supabase `wishes` table (schema in `supabase-wishes-schema.sql`, Realtime-enabled, RLS open for anon read/insert). Scheduled jobs are declared in `vercel.json`:
- `/api/altar-cron?type={free|paid_1d|paid_10d}` → fans out to `/api/altar-auto-wish` (auto-posts wishes on tier schedules; adds a random 0–3 min delay to dodge function timeouts).
- `/api/cron` → daily AI blog-post generation.
- `/api/push/send` → daily web-push broadcast.

All cron endpoints authenticate with `Bearer ${CRON_SECRET}` (Vercel sends this; internal fan-out uses an `x-cron-secret` header).

### Web Push
VAPID-based web push. Service worker at `public/sw.js`; subscribe via `app/api/push/subscribe`, send via `app/api/push/send` (`web-push` lib, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`).

## Conventions & gotchas

- **Korean-first**: identifiers are English but prompts, comments, and all UI copy are Korean. Match the surrounding Korean-comment style when editing.
- **`app/tools/page.tsx` opts out of type/lint checks** with `/* eslint-disable */` + `// @ts-nocheck` at the top. It's a very large client component — edits here won't be caught by the type-checker, so be careful.
- **`app/api/saju/vip/route.ts` begins with a UTF-8 BOM** (`﻿`) before its first statement. Preserve it; don't "clean up" the leading bytes.
- **Env vars** (in `.env.local`, git-ignored): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`, `IAMPORT_REST_API_KEY`, `IAMPORT_REST_API_SECRET`, `PORTONE_API_SECRET`, `NEXT_PUBLIC_SITE_URL`. Optional: `VIP_REPORT_OPENAI_MODEL`.
- **KST everywhere**: date logic uses `Asia/Seoul` explicitly (`Intl.DateTimeFormat` with `timeZone`), not server-local time. Follow this for any new date-keyed feature.
- **SEO matters**: `app/layout.tsx` carries extensive Korean metadata/OG tags and search-console verification; `robots.ts` and `sitemap.ts` (force-dynamic) are maintained. Keep them in sync when adding public routes.

## 절대 규칙 (가드레일)
- 결제 코드(포트원 연동, 카카오페이·토스페이 결제 로직)는 수정 전에 변경 내용을 설명하고 승인받는다.
- 비용 발생 작업(OpenAI API 대량 호출 등)은 실행 전 예상 비용을 보고하고 승인받는다.
- DB 스키마 변경, 데이터 삭제(DROP/DELETE/TRUNCATE), 마이그레이션은 실행 전 승인 필수.
- API 키·시크릿은 클라이언트 코드에 넣지 않는다. 값은 어디에도 기록하지 않는다.
- main 푸시 = 즉시 배포. 푸시 전 로컬 빌드 통과를 먼저 확인한다.
- [중요] 이 서버의 /api 라우트는 miracle-toss(앱인토스 미니앱, 별도 저장소)가 직접 호출한다. API 경로·요청/응답 형식을 바꾸면 토스 미니앱이 깨진다. 기존 API는 변경 금지, 필요하면 새 라우트를 추가하는 방식으로만.
- 명운-rn(Expo 앱)이 이 웹을 WebView로 감싼다. isAppEnv() 분기 코드를 깨지 않게 주의하고, UI 변경 시 앱 환경 영향도 확인한다.
- miracle-toss는 이 저장소의 복사본이지만 완전히 별도 저장소다. 여기 수정이 자동 반영되지 않는다 — 코드를 섞지 않는다.

## 작업 방식
- 사용자는 비전공 1인 개발자. 설명은 짧게, 에러는 원인 한 줄 + 해결책 한 가지만.
- 큰 작업은 단계로 쪼개고, 한 단계 끝날 때마다 확인받고 진행한다.
- 새 파일을 만들기 전에 같은 역할의 기존 파일이 있는지 먼저 검색한다. 중복 생성 금지.
- 작업이 끝나면: 변경 파일 목록 + 한 줄 요약 + 배포 필요 여부를 알려준다.
- 셸 명령은 Windows(PowerShell)에서 동작하는 형태로 실행한다.

## 프로젝트 구조 핵심

- **Supabase 클라이언트 정본**
  - 익명(anon, RLS 적용) — [`app/lib/supabase.ts`](app/lib/supabase.ts) 의 `supabase`. 공개 읽기/쓰기(예: 익명 소원 등록)에만 사용.
  - 관리자(service role, RLS 우회, **서버 전용**) — [`lib/supabase/admin-client.ts`](lib/supabase/admin-client.ts) 의 `createSupabaseAdminClient()`. 주문/CS 등 권한 필요한 DB 쓰기는 반드시 이걸로. 키 없으면 `null` 반환(anon으로 폴백 안 함).
  - 참고: [`app/tools/page.tsx`](app/tools/page.tsx)는 상단에서 자체 anon 클라이언트를 `createClient`로 별도 생성한다(정본 아님).

- **라우팅 구조**: Next.js **App Router** 단일 방식(`pages/` 없음). 페이지는 `app/**/page.tsx`, 백엔드는 `app/api/**/route.ts` Route Handler. 경로 별칭 `@/*` = 저장소 루트.

- **결제(포트원) 코드 위치**
  - 로직 라이브러리: [`lib/payments/`](lib/payments/) — `portone-rest.ts`(REST 연동), `imp-uid.ts`, `return-params.ts`, `portone-response-guards.ts`, `pending-payment-data.ts` / `pending-payment-state.ts`(클라 대기상태), `verify-endpoint.ts`(검증 URL 상수), `vip-order-supabase.ts`(주문 upsert).
  - 서버 검증: [`app/api/payments/verify/route.ts`](app/api/payments/verify/route.ts)(포트원/아임포트 정본), [`app/api/payment/verify/route.ts`](app/api/payment/verify/route.ts)(위 경로로 위임), [`app/api/payment/verify-google/route.ts`](app/api/payment/verify-google/route.ts)(구글 플레이 IAP).
  - 클라이언트 결제 흐름: [`app/tools/page.tsx`](app/tools/page.tsx), [`app/vip/page.tsx`](app/vip/page.tsx). **클라 성공 신호만 믿지 말 것 — 서버 검증 필수.**

- **OpenAI 호출 위치**: `app/api/` 하위 — `fortune`, `physiognomy`, `palmistry`, `name`, `match`, `dream`, `mbti`, `cron` 라우트. 그리고 [`lib/saju/vip-ai.ts`](lib/saju/vip-ai.ts)(사주 인사이트 리포트, Gemini 실패 시 폴백). 기본 모델 `gpt-4o-mini`. Gemini는 [`app/api/saju/vip/route.ts`](app/api/saju/vip/route.ts) + `vip-ai.ts`에서 사용.

- **API 라우트 목록 — 외부(miracle-toss·명운-rn)가 호출하므로 변경 금지 대상** (경로·요청/응답 형식 유지, 필요 시 새 라우트만 추가)

  | 경로 | 메서드 | 역할 |
  | --- | --- | --- |
  | `/api/fortune` | POST | 오늘의 운세(사주 엔진 + AI 프리미엄 텍스트) |
  | `/api/saju/vip` | POST | 결제 지급권 검증 후 사주 인사이트 리포트 생성(`maxDuration=300`) |
  | `/api/physiognomy` | POST | 관상 분석(이미지 → OpenAI 비전) |
  | `/api/palmistry` | POST | 손금 분석(OpenAI) |
  | `/api/name` | POST | 성명학 이름풀이(OpenAI) |
  | `/api/hanja` | POST | 한자 사전 조회 (로컬 `@seyoungsong/hanjadict` 테이블 + 점수 휴리스틱, **AI 없음**) |
  | `/api/match` | POST | 궁합 분석(OpenAI) |
  | `/api/mbti` | POST | MBTI × 사주 분석(OpenAI) |
  | `/api/dream` | POST | 꿈 해몽(OpenAI) |
  | `/api/lotto` | POST | 행운 로또 번호 추출 (알고리즘, **AI 없음** — 랜딩의 "AI 통계 기반"은 마케팅 문구) |
  | `/api/lotto-winning` | GET | 로또 당첨 번호 조회(`force-dynamic`) |
  | `/api/altar-auto-wish` | POST | 제단 자동 소원 등록(크론 내부 호출, `x-cron-secret`) |
  | `/api/altar-cron` | GET | 제단 크론 진입점(`?type=free\|paid_1d\|paid_10d`, `Bearer CRON_SECRET`) |
  | `/api/cron` | GET | 일일 AI 블로그 글 생성(`Bearer CRON_SECRET`) |
  | `/api/cron/push` | GET·POST | 푸시 관련 크론 (`web-push` + Supabase, **AI 없음**) |
  | `/api/push/subscribe` | POST | 웹푸시 구독 등록 |
  | `/api/push/send` | POST | 웹푸시 발송(일일 크론) |
  | `/api/payments/verify` | POST | 포트원/아임포트 결제 서버 검증(정본) |
  | `/api/payment/verify` | (위임) | `/api/payments/verify`로 위임 |
  | `/api/payment/verify-google` | POST | 구글 플레이 IAP 검증 |
  | `/api/yongmincucu/data` | POST | 내부 CS 대시보드 데이터(비밀번호 게이트) |

- **VIP PDF 생성 관련 파일과 주의점** (과거 페이지 누락 버그가 있었던 민감 영역)
  - 렌더: [`components/vip/VipPdfTemplate.tsx`](components/vip/VipPdfTemplate.tsx) — 각 페이지를 `[data-pdf-page]` 노드로 렌더.
  - 캡처→PDF: [`hooks/usePdfDownload.ts`](hooks/usePdfDownload.ts) — `[data-pdf-page]` 자식을 하나씩 `html2canvas`로 캡처해 `jspdf`로 합침.
  - **주의**: "이어보기" 직후엔 페이지 분할이 아직 끝나지 않아 노드 수가 늘어나는 중일 수 있다. 그래서 노드 개수가 안정될 때까지(약 0.2초 연속 동일, 최대 8초) 기다린 뒤 캡처한다. 이 대기 로직을 건드리면 **뒷 페이지 누락(과거 3장 누락 버그)** 이 재발한다. `scale`은 선명도↔메모리 트레이드오프(과거 2→1로 낮춰 메모리 최적화) — 함부로 올리지 말 것.

- **앱 분기 위치와 규칙** (가드레일의 `isAppEnv()`에 해당 — 실제 구현명은 `useIsAppMode()`)
  - 정의·사용 모두 [`app/tools/page.tsx`](app/tools/page.tsx). `useIsAppMode()`는 `navigator.userAgent`에 문자열 **`"MyeongunApp"`** 포함 여부로 WebView(명운-rn) 여부를 판별해 `isApp` 반환.
  - `isApp`은 각 탭 컴포넌트(`SajuTab`, `AltarTab`, `PalmistryTab` 등)에 prop으로 전달된다.
  - **규칙**: 앱 환경이면 결제 대신 `window.ReactNativeWebView.postMessage(JSON.stringify({ type: "SHOW_REWARDED_AD", feature }))` 로 리워드 광고를 요청한다(웹은 포트원 결제). 이 분기와 버튼 문구(`isApp ? "광고 보고…" : "…원"`)를 깨지 않도록 주의.

- **환경변수 목록과 역할** (이름만 — 값은 절대 기록 금지, `.env.local`은 git-ignore)
  - `NEXT_PUBLIC_SUPABASE_URL` — Supabase 프로젝트 URL(클라 노출).
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon 키(클라 노출, RLS 적용).
  - `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role 키(**서버 전용, RLS 우회**).
  - `OPENAI_API_KEY` — OpenAI(대부분 라우트, `gpt-4o-mini`).
  - `GEMINI_API_KEY` — Google Gemini(사주 인사이트 리포트 주력).
  - `ANTHROPIC_API_KEY` — Anthropic SDK 키(사용처는 라우트별 확인).
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — 웹푸시 VAPID 공개키(클라 노출).
  - `VAPID_PRIVATE_KEY` — 웹푸시 VAPID 비밀키(서버).
  - `CRON_SECRET` — 크론 엔드포인트 인증(`Bearer` / `x-cron-secret`).
  - `IAMPORT_REST_API_KEY` / `IAMPORT_REST_API_SECRET` — 아임포트(포트원) REST 인증.
  - `PORTONE_API_SECRET` — 포트원 API 시크릿.
  - `NEXT_PUBLIC_SITE_URL` — 사이트 기준 URL(크론 내부 fetch·리포트 URL 산출).
  - `VIP_REPORT_OPENAI_MODEL` — (선택) 사주 인사이트 리포트 OpenAI 모델 오버라이드.
