// types.ts - 共享类型定义

export interface PluginSettings {
  // === 排除规则 ===
  /** 不被抽取的文件路径，支持 glob 通配符（如 "daily/*.md"） */
  excludedFiles: string[];
  /** 不被抽取的目录路径列表（递归排除） */
  excludedFolders: string[];
  /** 不被抽取的标签列表（笔记含任一标签即排除） */
  excludedTags: string[];

  // === 优先级规则 ===
  /** 高优先级目录列表，来自这些目录的笔记权重更高 */
  priorityFolders: string[];
  /** 高优先级标签列表，包含这些标签的笔记权重更高 */
  priorityTags: string[];
  /** 高优先级笔记的权重倍数（默认 3，普通笔记权重为 1） */
  priorityWeight: number;

  // === 冷却机制 ===
  /** 冷却窗口天数：在此期间内抽取过的笔记会降权 */
  cooldownDays: number;
  /**
   * 冷却衰减策略：
   * - "hard": 昨天抽过 → 今天完全排除，cooldownDays天前恢复正常
   * - "decay": 按天数线性衰减权重
   */
  cooldownMode: "hard" | "decay";
}

/** 单条抽取历史记录 */
export interface DrawRecord {
  /** 笔记文件路径（相对于 vault 根目录） */
  path: string;
  /** 抽取时的 ISO 日期字符串，如 "2024-01-15" */
  date: string;
  /** 抽取时的时间戳（ms），用于精确排序 */
  timestamp: number;
}

/** 插件持久化数据结构 */
export interface PluginData {
  settings: PluginSettings;
  /** 抽取历史，按时间降序排列，只保留 cooldownDays 内的记录 */
  drawHistory: DrawRecord[];
}

/** 候选笔记及其抽取权重 */
export interface WeightedFile {
  path: string;
  weight: number;
}
