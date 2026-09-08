const VIP_SYMBOLIC_AMULET_URLS = [
  "/images/amulet-wood.jpg",
  "/images/amulet-fire.jpg",
  "/images/amulet-earth.jpg",
  "/images/amulet-metal.jpg",
  "/images/amulet-water.jpg",
] as const;

export function selectVipSymbolicAmuletUrl(seed: string): string {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return VIP_SYMBOLIC_AMULET_URLS[(hash >>> 0) % VIP_SYMBOLIC_AMULET_URLS.length];
}

export function appendVipSymbolicAmulet(markdown: string, seed: string): {
  markdown: string;
  url: string;
} {
  const url = selectVipSymbolicAmuletUrl(seed);
  if (markdown.includes("# 부록 참고용 상징 부적")) return { markdown, url };

  return {
    url,
    markdown: `${markdown.trim()}\n\n# 부록 참고용 상징 부적\n\n![참고용 상징 부적](${url})\n\n이 이미지는 입력 정보를 바탕으로 일관되게 선택한 개인 참고용 상징물입니다. 용신 계산 결과나 효능을 의미하지 않으며 미래의 결과를 보장하지 않습니다.`,
  };
}
