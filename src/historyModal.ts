// src/historyModal.ts - 最近抽取历史弹窗

import { App, Modal, Notice, TFile } from "obsidian";
import { DrawRecord } from "./types";

/** 单条去重后的历史展示条目 */
interface HistoryEntry {
  path: string;
  basename: string; // 不含扩展名的文件名（即笔记标题）
  date: string;     // 最近一次抽取日期
  count: number;    // 在历史记录中出现次数
}

export class RecentHistoryModal extends Modal {
  private drawHistory: DrawRecord[];
  /** 点击打开笔记的回调 */
  private onOpenNote: (path: string) => void;

  constructor(
    app: App,
    drawHistory: DrawRecord[],
    onOpen: (path: string) => void
  ) {
    super(app);
    this.drawHistory = drawHistory;
    this.onOpenNote = onOpen;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("rnr-history-modal");

    // ── 标题区 ──────────────────────────────────────────────
    const header = contentEl.createDiv({ cls: "rnr-modal-header" });
    header.createEl("h2", { text: "📋 最近抽取记录" });
    header.createEl("p", {
      text: "点击笔记标题可打开，点击复制按钮可复制标题。",
      cls: "rnr-modal-subtitle",
    });

    // ── 构建去重条目列表（按最近日期降序） ───────────────────
    const entries = this.buildEntries();

    if (entries.length === 0) {
      contentEl.createEl("p", {
        text: "暂无抽取记录。点击骰子按钮开始随机复习吧！",
        cls: "rnr-modal-empty",
      });
      return;
    }

    // ── 搜索框 ───────────────────────────────────────────────
    const searchWrap = contentEl.createDiv({ cls: "rnr-modal-search-wrap" });
    const searchInput = searchWrap.createEl("input", {
      type: "text",
      placeholder: "搜索笔记标题…",
      cls: "rnr-modal-search",
    });

    // ── 列表容器 ─────────────────────────────────────────────
    const listEl = contentEl.createDiv({ cls: "rnr-history-list" });
    this.renderList(listEl, entries);

    // 搜索过滤
    searchInput.addEventListener("input", () => {
      const q = searchInput.value.trim().toLowerCase();
      const filtered = q
        ? entries.filter((e) => e.basename.toLowerCase().includes(q))
        : entries;
      this.renderList(listEl, filtered);
    });

    // 自动聚焦搜索框
    setTimeout(() => searchInput.focus(), 50);
  }

  onClose() {
    this.contentEl.empty();
  }

  // ── 私有方法 ─────────────────────────────────────────────────────────────

  /** 将原始历史记录合并为去重条目，按最近日期降序排列 */
  private buildEntries(): HistoryEntry[] {
    // path → { latestDate, count }
    const map = new Map<string, { date: string; count: number }>();

    for (const r of this.drawHistory) {
      const existing = map.get(r.path);
      if (!existing) {
        map.set(r.path, { date: r.date, count: 1 });
      } else {
        map.set(r.path, {
          date: r.date > existing.date ? r.date : existing.date,
          count: existing.count + 1,
        });
      }
    }

    return Array.from(map.entries())
      .map(([path, { date, count }]) => ({
        path,
        basename: this.pathToBasename(path),
        date,
        count,
      }))
      .sort((a, b) => (a.date < b.date ? 1 : -1)); // 最近的在前
  }

  /** 渲染列表（支持重新渲染用于搜索过滤） */
  private renderList(listEl: HTMLElement, entries: HistoryEntry[]): void {
    listEl.empty();

    if (entries.length === 0) {
      listEl.createEl("p", {
        text: "没有匹配的笔记。",
        cls: "rnr-modal-empty",
      });
      return;
    }

    for (const entry of entries) {
      const row = listEl.createDiv({ cls: "rnr-history-row" });

      // 左侧：日期标签
      const dateTag = row.createDiv({ cls: "rnr-history-date" });
      dateTag.setText(this.formatDate(entry.date));
      if (entry.count > 1) {
        dateTag.createEl("span", {
          text: ` ×${entry.count}`,
          cls: "rnr-history-count",
        });
      }

      // 中间：笔记标题（可点击打开）
      const titleEl = row.createDiv({ cls: "rnr-history-title" });
      titleEl.setText(entry.basename);
      titleEl.setAttr("title", entry.path);
      titleEl.addEventListener("click", () => {
        this.onOpenNote(entry.path);
        this.close();
      });

      // 右侧：复制按钮
      const copyBtn = row.createEl("button", {
        cls: "rnr-copy-btn",
        text: "复制标题",
        attr: { "aria-label": `复制「${entry.basename}」` },
      });
      copyBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        await navigator.clipboard.writeText(entry.basename);
        copyBtn.setText("✅ 已复制");
        copyBtn.addClass("rnr-copy-btn--done");
        setTimeout(() => {
          copyBtn.setText("复制标题");
          copyBtn.removeClass("rnr-copy-btn--done");
        }, 1500);
      });
    }
  }

  /** 从路径提取不含扩展名的文件名 */
  private pathToBasename(path: string): string {
    const name = path.split("/").pop() ?? path;
    return name.endsWith(".md") ? name.slice(0, -3) : name;
  }

  /** 将 ISO 日期格式化为更友好的展示 */
  private formatDate(isoDate: string): string {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86_400_000)
      .toISOString()
      .split("T")[0];
    if (isoDate === today) return "今天";
    if (isoDate === yesterday) return "昨天";
    // 同年则省略年份
    const [year, month, day] = isoDate.split("-");
    const thisYear = new Date().getFullYear().toString();
    return year === thisYear ? `${month}/${day}` : `${year}/${month}/${day}`;
  }
}
