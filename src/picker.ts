// picker.ts - 核心笔记抽取逻辑

import { TFile, Vault, MetadataCache } from "obsidian";
import { PluginSettings, DrawRecord } from "./types";
import { matchesAnyGlob, todayStr, daysBetween, extractTags, weightedRandom } from "./utils";

export interface PickResult {
  file: TFile;
  reason: string; // 调试用：说明为何选中
}

export class NotePicker {
  constructor(
    private vault: Vault,
    private metadataCache: MetadataCache,
    private settings: PluginSettings,
    private drawHistory: DrawRecord[]
  ) {}

  /**
   * 主入口：从 Vault 中抽取一篇笔记。
   * 返回 null 表示没有可抽取的笔记。
   */
  pick(): PickResult | null {
    const today = todayStr();

    // 1. 获取今天已抽取的路径集合（同一天不重复）
    const drawnToday = new Set(
      this.drawHistory
        .filter((r) => r.date === today)
        .map((r) => r.path)
    );

    // 2. 构建冷却期内的路径 → 最近抽取日期 Map
    const recentDrawMap = new Map<string, string>(); // path → latestDrawDate
    for (const r of this.drawHistory) {
      const existing = recentDrawMap.get(r.path);
      if (!existing || r.date > existing) {
        recentDrawMap.set(r.path, r.date);
      }
    }

    // 3. 遍历所有 markdown 文件，过滤 + 计算权重
    const allFiles = this.vault.getMarkdownFiles();
    const weighted: Array<{ item: TFile; weight: number }> = [];

    for (const file of allFiles) {
      const weight = this.computeWeight(file, today, drawnToday, recentDrawMap);
      if (weight > 0) {
        weighted.push({ item: file, weight });
      }
    }

    if (weighted.length === 0) return null;

    const chosen = weightedRandom(weighted);
    if (!chosen) return null;

    // 判断原因（高优先级？）
    const reason = this.describeReason(chosen);
    return { file: chosen, reason };
  }

  /**
   * 计算单个文件的抽取权重。
   * 返回 0 表示该文件被排除。
   */
  private computeWeight(
    file: TFile,
    today: string,
    drawnToday: Set<string>,
    recentDrawMap: Map<string, string>
  ): number {
    const { settings } = this;
    const path = file.path;

    // === 硬性排除 ===

    // 同一天已抽过
    if (drawnToday.has(path)) return 0;

    // 排除文件路径
    if (settings.excludedFiles.length > 0 && matchesAnyGlob(path, settings.excludedFiles)) {
      return 0;
    }

    // 排除目录
    if (settings.excludedFolders.length > 0 && matchesAnyGlob(path, settings.excludedFolders)) {
      return 0;
    }

    // 排除标签
    if (settings.excludedTags.length > 0) {
      const fileTags = this.getFileTags(file);
      const excludedLower = settings.excludedTags.map((t) => t.toLowerCase());
      if (excludedLower.some((t) => fileTags.has(t))) return 0;
    }

    // 冷却期排除（hard 模式）
    const lastDrawDate = recentDrawMap.get(path);
    if (lastDrawDate) {
      const daysAgo = daysBetween(lastDrawDate, today);
      if (daysAgo === 0) return 0; // 同天（理论上已被 drawnToday 拦截，双重保险）

      if (settings.cooldownMode === "hard") {
        // hard 模式：在冷却期内完全排除
        if (daysAgo < settings.cooldownDays) return 0;
      }
    }

    // === 计算基础权重 ===
    let weight = 1.0;

    // 高优先级目录加权
    if (
      settings.priorityFolders.length > 0 &&
      matchesAnyGlob(path, settings.priorityFolders)
    ) {
      weight = Math.max(weight, settings.priorityWeight);
    }

    // 高优先级标签加权
    if (settings.priorityTags.length > 0) {
      const fileTags = this.getFileTags(file);
      const priorityLower = settings.priorityTags.map((t) => t.toLowerCase());
      if (priorityLower.some((t) => fileTags.has(t))) {
        weight = Math.max(weight, settings.priorityWeight);
      }
    }

    // decay 模式：按冷却天数线性衰减权重
    if (settings.cooldownMode === "decay" && lastDrawDate) {
      const daysAgo = daysBetween(lastDrawDate, today);
      if (daysAgo < settings.cooldownDays) {
        // daysAgo=1 → 权重×0, daysAgo=cooldownDays-1 → 权重接近×1
        const decayFactor = daysAgo / settings.cooldownDays;
        weight *= decayFactor;
      }
    }

    return weight;
  }

  /** 获取文件所有标签（小写），缓存友好 */
  private getFileTags(file: TFile): Set<string> {
    const meta = this.metadataCache.getFileCache(file);
    const tagObjects = meta?.tags ?? [];
    const frontmatterTags: string[] = meta?.frontmatter?.tags ?? [];
    const allTags = [
      ...tagObjects.map((t) => t.tag),
      ...frontmatterTags.map((t) => (t.startsWith("#") ? t : "#" + t)),
    ];
    return extractTags(allTags);
  }

  /** 描述选中原因（用于通知提示） */
  private describeReason(file: TFile): string {
    const path = file.path;
    if (
      this.settings.priorityFolders.length > 0 &&
      matchesAnyGlob(path, this.settings.priorityFolders)
    ) {
      return "高优先级目录";
    }
    const fileTags = this.getFileTags(file);
    const priorityLower = this.settings.priorityTags.map((t) => t.toLowerCase());
    if (priorityLower.some((t) => fileTags.has(t))) {
      return "高优先级标签";
    }
    return "普通";
  }
}
