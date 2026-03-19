// main.ts - 插件主入口

import { Plugin, Notice, TFile, WorkspaceLeaf } from "obsidian";
import { PluginSettings, DrawRecord, PluginData } from "./src/types";
import { DEFAULT_SETTINGS } from "./src/defaults";
import { NotePicker } from "./src/picker";
import { RandomNoteReviewSettingTab } from "./src/settings";
import { todayStr, daysBetween } from "./src/utils";

export default class RandomNoteReviewPlugin extends Plugin {
  settings: PluginSettings = { ...DEFAULT_SETTINGS };
  drawHistory: DrawRecord[] = [];

  // 状态栏按钮元素
  private statusBarItem: HTMLElement | null = null;

  async onload() {
    console.log("Random Note Review: 插件加载中...");

    // 1. 加载持久化数据
    await this.loadSettings();

    // 2. 注册命令（命令面板）
    this.addCommand({
      id: "draw-random-note",
      name: "🎲 随机抽取一篇笔记复习",
      callback: () => this.drawAndOpen(),
    });

    // 3. 在状态栏添加按钮
    this.statusBarItem = this.addStatusBarItem();
    this.statusBarItem.setText("🎲 随机复习");
    this.statusBarItem.addClass("rnr-status-btn");
    this.statusBarItem.setAttr("title", "点击随机抽取一篇笔记复习");
    this.statusBarItem.addEventListener("click", () => this.drawAndOpen());

    // 4. 在左侧功能区添加图标按钮
    this.addRibbonIcon("dice", "随机复习笔记", () => this.drawAndOpen());

    // 5. 注册设置界面
    this.addSettingTab(new RandomNoteReviewSettingTab(this.app, this));

    // 6. 定期清理过期历史（启动时执行一次）
    this.pruneHistory();

    console.log("Random Note Review: 插件加载完成");
  }

  onunload() {
    console.log("Random Note Review: 插件已卸载");
  }

  // ─── 核心抽取逻辑 ────────────────────────────────────────────────────────────

  /**
   * 执行抽取并打开笔记。
   */
  async drawAndOpen(): Promise<void> {
    const picker = new NotePicker(
      this.app.vault,
      this.app.metadataCache,
      this.settings,
      this.drawHistory
    );

    const result = picker.pick();

    if (!result) {
      new Notice(
        "😅 没有可抽取的笔记！\n可能原因：所有笔记都在今日已抽取、排除规则过严，或均在冷却期内。\n你可以在插件设置中清除抽取历史。",
        6000
      );
      return;
    }

    const { file, reason } = result;

    // 记录本次抽取
    await this.recordDraw(file.path);

    // 打开笔记（在新标签页中）
    await this.openNote(file);

    // 提示通知
    new Notice(`🎲 已抽取笔记\n📄 ${file.basename}\n🏷 ${reason}`, 4000);
  }

  /**
   * 在新标签页中打开笔记。
   */
  private async openNote(file: TFile): Promise<void> {
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.openFile(file, { active: true });
  }

  // ─── 历史记录管理 ────────────────────────────────────────────────────────────

  /**
   * 记录一次抽取。
   */
  private async recordDraw(path: string): Promise<void> {
    const today = todayStr();
    this.drawHistory.push({
      path,
      date: today,
      timestamp: Date.now(),
    });
    // 写入前先清理过期记录
    this.pruneHistory();
    await this.saveSettings();
  }

  /**
   * 清理超出冷却窗口的历史记录，减少存储体积。
   */
  private pruneHistory(): void {
    const today = todayStr();
    // 保留 cooldownDays + 1 天内的记录（多保留1天以保证准确）
    const maxDays = this.settings.cooldownDays + 1;
    this.drawHistory = this.drawHistory.filter((r) => {
      return daysBetween(r.date, today) <= maxDays;
    });
  }

  // ─── 数据持久化 ──────────────────────────────────────────────────────────────

  async loadSettings(): Promise<void> {
    const saved = (await this.loadData()) as Partial<PluginData> | null;
    if (saved) {
      this.settings = Object.assign({}, DEFAULT_SETTINGS, saved.settings ?? {});
      this.drawHistory = saved.drawHistory ?? [];
    } else {
      this.settings = { ...DEFAULT_SETTINGS };
      this.drawHistory = [];
    }
  }

  async saveSettings(): Promise<void> {
    const data: PluginData = {
      settings: this.settings,
      drawHistory: this.drawHistory,
    };
    await this.saveData(data);
  }
}
