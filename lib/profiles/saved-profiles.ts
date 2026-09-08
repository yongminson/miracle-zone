/**
 * 가족 프로필 저장 — 본인·배우자·자녀·연인의 생년월일을 브라우저에 보관한다.
 *
 * 1단계는 로그인 없이 localStorage만 쓴다. 로그인을 요구하면 그 지점에서 이탈하기 때문에,
 * 저장 기능을 실제로 쓰는지부터 확인하는 것이 목적이다.
 * 나중에 계정이 생기면 이 구조 그대로 서버로 옮길 수 있도록 버전(v) 필드를 둔다.
 */

const STORAGE_KEY = "myeongun_profiles_v1";

/** 한 브라우저에 보관할 최대 프로필 수 */
export const MAX_PROFILES = 5;

export type ProfileRelation = "self" | "spouse" | "child" | "partner" | "family" | "other";

export type SavedProfile = {
  id: string;
  relation: ProfileRelation;
  name: string;
  gender: "male" | "female";
  /** YYYY-MM-DD */
  birthDate: string;
  /** BIRTH_TIME_OPTIONS 의 value. 모르면 "unknown" */
  birthTime: string;
  calendar: "solar" | "lunar" | "lunar-leap";
  mbti?: string;
  updatedAt: string;
};

export type SavedProfileInput = Omit<SavedProfile, "id" | "updatedAt"> & { id?: string };

type ProfileEnvelopeV1 = {
  v: 1;
  profiles: SavedProfile[];
};

export const RELATION_OPTIONS: { value: ProfileRelation; label: string; emoji: string }[] = [
  { value: "self", label: "본인", emoji: "🙂" },
  { value: "spouse", label: "배우자", emoji: "💍" },
  { value: "child", label: "자녀", emoji: "🧒" },
  { value: "partner", label: "연인", emoji: "💗" },
  { value: "family", label: "가족", emoji: "👨‍👩‍👧" },
  { value: "other", label: "기타", emoji: "👤" },
];

export function getRelationMeta(relation: ProfileRelation) {
  return RELATION_OPTIONS.find((option) => option.value === relation) ?? RELATION_OPTIONS[5];
}

/** YYYY-MM-DD 형식인지 확인 (다른 탭들이 이 형식으로 입력을 정규화한다) */
export function isValidBirthDate(value: string | undefined | null): boolean {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

function createId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // 구형 브라우저·비보안 컨텍스트 — 아래 폴백 사용
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitize(raw: unknown): SavedProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const name = typeof item.name === "string" ? item.name.trim() : "";
  const birthDate = typeof item.birthDate === "string" ? item.birthDate.trim() : "";
  if (!name || !isValidBirthDate(birthDate)) return null;

  const relation = RELATION_OPTIONS.some((option) => option.value === item.relation)
    ? (item.relation as ProfileRelation)
    : "other";
  const calendar =
    item.calendar === "lunar" || item.calendar === "lunar-leap" ? item.calendar : "solar";

  return {
    id: typeof item.id === "string" && item.id ? item.id : createId(),
    relation,
    name: name.slice(0, 20),
    gender: item.gender === "female" ? "female" : "male",
    birthDate,
    birthTime: typeof item.birthTime === "string" && item.birthTime ? item.birthTime : "unknown",
    calendar,
    mbti: typeof item.mbti === "string" && item.mbti.trim() ? item.mbti.trim().toUpperCase().slice(0, 4) : undefined,
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : new Date().toISOString(),
  };
}

/** 저장된 프로필 목록. 최근 수정 순. 브라우저가 아니거나 값이 깨졌으면 빈 배열 */
export function readProfiles(): SavedProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ProfileEnvelopeV1 | null;
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.profiles)) return [];
    return parsed.profiles
      .map(sanitize)
      .filter((profile): profile is SavedProfile => profile !== null)
      .slice(0, MAX_PROFILES);
  } catch {
    return [];
  }
}

function writeProfiles(profiles: SavedProfile[]): SavedProfile[] {
  const trimmed = profiles.slice(0, MAX_PROFILES);
  if (typeof window === "undefined") return trimmed;
  try {
    const envelope: ProfileEnvelopeV1 = { v: 1, profiles: trimmed };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // 저장 공간이 없거나 차단된 경우 — 화면 동작은 그대로 두고 무시한다
  }
  return trimmed;
}

/**
 * 프로필 추가·갱신. 이름+생년월일이 같으면 같은 사람으로 보고 덮어쓴다.
 * 가장 최근 것이 앞으로 오고, MAX_PROFILES를 넘으면 오래된 것부터 밀려난다.
 */
export function upsertProfile(input: SavedProfileInput): SavedProfile[] {
  const next = sanitize({ ...input, updatedAt: new Date().toISOString() });
  if (!next) return readProfiles();

  const rest = readProfiles().filter((profile) => {
    if (input.id && profile.id === input.id) return false;
    return !(profile.name === next.name && profile.birthDate === next.birthDate);
  });

  return writeProfiles([next, ...rest]);
}

export function removeProfile(id: string): SavedProfile[] {
  return writeProfiles(readProfiles().filter((profile) => profile.id !== id));
}
