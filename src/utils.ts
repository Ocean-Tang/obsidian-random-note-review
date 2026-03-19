// utils.ts - 工具函数

/**
 * 将 glob 模式字符串转换为 RegExp。
 * 支持 * (匹配非斜杠任意字符) 和 ** (匹配任意字符包括斜杠)。
 */
export function globToRegex(pattern: string): RegExp {
  // 转义正则特殊字符，但保留 * 用于后续处理
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&") // 转义特殊字符
    .replace(/\*\*/g, "§§DOUBLE§§")         // 临时占位双星
    .replace(/\*/g, "[^/]*")                // 单星：匹配非斜杠
    .replace(/§§DOUBLE§§/g, ".*");          // 双星：匹配任意

  return new RegExp(`^${escaped}$`, "i");
}

/**
 * 判断路径是否匹配 glob 模式列表中的任一项。
 */
export function matchesAnyGlob(path: string, patterns: string[]): boolean {
  return patterns.some((p) => {
    // 支持简单前缀匹配（目录）：若 pattern 不含通配符，则按前缀匹配
    if (!p.includes("*")) {
      const normalized = p.replace(/\/$/, "");
      return path === normalized || path.startsWith(normalized + "/");
    }
    return globToRegex(p).test(path);
  });
}

/**
 * 获取今日 ISO 日期字符串，如 "2024-01-15"。
 */
export function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * 计算两个 ISO 日期字符串之间相差的天数（date2 - date1）。
 */
export function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1).getTime();
  const d2 = new Date(date2).getTime();
  return Math.floor((d2 - d1) / 86_400_000);
}

/**
 * 从笔记的 frontmatter 和 body 中提取所有标签（含 # 前缀）。
 * Obsidian 的 CachedMetadata 中标签已含 #，直接使用。
 */
export function extractTags(tags: string[] | undefined): Set<string> {
  if (!tags) return new Set();
  // 统一小写以便不区分大小写匹配
  return new Set(tags.map((t) => t.toLowerCase()));
}

/**
 * 加权随机抽样：给定 (item, weight) 列表，返回按权重概率随机选中的 item。
 */
export function weightedRandom<T>(items: Array<{ item: T; weight: number }>): T | null {
  if (items.length === 0) return null;
  const totalWeight = items.reduce((sum, x) => sum + x.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const x of items) {
    rand -= x.weight;
    if (rand <= 0) return x.item;
  }
  // 兜底（浮点误差）
  return items[items.length - 1].item;
}
