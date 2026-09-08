"use client";

import { useCallback, useEffect, useState } from "react";
import { logEvent } from "@/lib/analytics";
import {
  MAX_PROFILES,
  RELATION_OPTIONS,
  getRelationMeta,
  isValidBirthDate,
  readProfiles,
  removeProfile,
  upsertProfile,
  type ProfileRelation,
  type SavedProfile,
} from "@/lib/profiles/saved-profiles";

type Accent = "amber" | "rose" | "orange";

/** Tailwind는 문자열을 조합하면 클래스를 못 찾으므로 색상별 전체 클래스를 그대로 적어둔다 */
const ACCENT_STYLE: Record<Accent, { label: string; chip: string; action: string; relation: string }> = {
  amber: {
    label: "text-amber-500/80",
    chip: "border-amber-500/30 bg-amber-500/10 text-amber-100 hover:border-amber-400/60 hover:bg-amber-500/20",
    action: "border-amber-500/30 text-amber-200/90 hover:border-amber-400/60 hover:bg-amber-500/10",
    relation: "border-amber-500/40 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25",
  },
  rose: {
    label: "text-rose-300/80",
    chip: "border-rose-400/30 bg-rose-500/10 text-rose-100 hover:border-rose-400/60 hover:bg-rose-500/20",
    action: "border-rose-400/30 text-rose-200/90 hover:border-rose-400/60 hover:bg-rose-500/10",
    relation: "border-rose-400/40 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25",
  },
  orange: {
    label: "text-orange-300/80",
    chip: "border-orange-400/30 bg-orange-500/10 text-orange-100 hover:border-orange-400/60 hover:bg-orange-500/20",
    action: "border-orange-400/30 text-orange-200/90 hover:border-orange-400/60 hover:bg-orange-500/10",
    relation: "border-orange-400/40 bg-orange-500/15 text-orange-100 hover:bg-orange-500/25",
  },
};

/** 지금 화면의 입력값. 저장 버튼을 눌렀을 때 이 값이 프로필이 된다 */
export type ProfileDraft = {
  name?: string;
  gender?: string;
  birthDate?: string;
  birthTime?: string;
  calendar?: string;
  mbti?: string;
};

type Props = {
  /** 현재 입력값 — 이름과 생년월일(YYYY-MM-DD)이 있어야 저장 버튼이 활성화된다 */
  draft: ProfileDraft;
  /** 칩을 눌렀을 때 각 화면의 입력값을 채우는 콜백 */
  onApply: (profile: SavedProfile) => void;
  /** 어느 화면에서 쓰는지 — 계측 이벤트에 담긴다 */
  source: string;
  accent?: Accent;
  className?: string;
};

/**
 * 저장해 둔 가족 프로필을 칩으로 보여주고, 누르면 입력값을 채운다.
 * 매번 생년월일을 다시 입력하는 마찰을 없애는 것이 목적이다.
 */
export function ProfileQuickPicker({ draft, onApply, source, accent = "amber", className }: Props) {
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);
  const [isPickingRelation, setIsPickingRelation] = useState(false);
  const style = ACCENT_STYLE[accent];

  // localStorage는 클라이언트에서만 읽는다(서버 렌더 결과와 어긋나지 않게)
  useEffect(() => {
    setProfiles(readProfiles());
  }, []);

  const draftName = (draft.name ?? "").trim();
  const draftBirthDate = (draft.birthDate ?? "").trim();
  const canSave = !!draftName && isValidBirthDate(draftBirthDate);

  const handleApply = useCallback(
    (profile: SavedProfile) => {
      onApply(profile);
      void logEvent("profile_apply", { source, relation: profile.relation });
    },
    [onApply, source],
  );

  const handleSave = useCallback(
    (relation: ProfileRelation) => {
      const next = upsertProfile({
        relation,
        name: draftName,
        gender: draft.gender === "female" ? "female" : "male",
        birthDate: draftBirthDate,
        birthTime: draft.birthTime || "unknown",
        calendar:
          draft.calendar === "lunar" || draft.calendar === "lunar-leap" ? draft.calendar : "solar",
        mbti: draft.mbti,
      });
      setProfiles(next);
      setIsPickingRelation(false);
      void logEvent("profile_save", { source, relation, count: next.length });
    },
    [draft.calendar, draft.gender, draft.mbti, draft.birthTime, draftBirthDate, draftName, source],
  );

  const handleRemove = useCallback((id: string) => {
    setProfiles(removeProfile(id));
  }, []);

  // 저장된 것도 없고 저장할 것도 없으면 자리만 차지하므로 아예 숨긴다
  if (profiles.length === 0 && !canSave) return null;

  return (
    <div className={`rounded-2xl border border-white/10 bg-black/25 p-3 ${className ?? ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-[11px] font-medium uppercase tracking-wider ${style.label}`}>
          저장된 프로필
        </span>

        {profiles.map((profile) => {
          const meta = getRelationMeta(profile.relation);
          return (
            <span
              key={profile.id}
              className={`inline-flex items-center overflow-hidden rounded-full border text-xs transition ${style.chip}`}
            >
              <button
                type="button"
                onClick={() => handleApply(profile)}
                className="py-1.5 pl-3 pr-2"
                title={`${profile.birthDate} 정보 불러오기`}
              >
                <span aria-hidden>{meta.emoji}</span> {profile.name}
              </button>
              <button
                type="button"
                onClick={() => handleRemove(profile.id)}
                className="py-1.5 pr-2.5 pl-0.5 text-white/35 transition hover:text-white/80"
                aria-label={`${profile.name} 프로필 삭제`}
              >
                ✕
              </button>
            </span>
          );
        })}

        {canSave && !isPickingRelation ? (
          <button
            type="button"
            onClick={() => setIsPickingRelation(true)}
            className={`rounded-full border border-dashed px-3 py-1.5 text-xs transition ${style.action}`}
          >
            ＋ 지금 입력한 정보 저장
          </button>
        ) : null}
      </div>

      {isPickingRelation ? (
        <div className="mt-3 border-t border-white/10 pt-3">
          <p className="mb-2 text-[11px] text-slate-400">
            <strong className="text-slate-200">{draftName}</strong> 님은 누구신가요?
          </p>
          <div className="flex flex-wrap gap-2">
            {RELATION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSave(option.value)}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${style.relation}`}
              >
                <span aria-hidden>{option.emoji}</span> {option.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIsPickingRelation(false)}
              className="rounded-full px-3 py-1.5 text-xs text-slate-500 transition hover:text-slate-300"
            >
              취소
            </button>
          </div>
        </div>
      ) : null}

      {profiles.length === 0 ? (
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
          저장해 두면 다음부터 생년월일을 다시 입력하지 않아도 됩니다. 이 기기에만 저장되며 최대 {MAX_PROFILES}명까지 보관합니다.
        </p>
      ) : null}
    </div>
  );
}
