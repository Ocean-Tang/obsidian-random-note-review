// settings.ts - 插件设置界面（SettingTab）

import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import { DrawRecord } from "./types";
import RandomNoteReviewPlugin from "../main";

export class RandomNoteReviewSettingTab extends PluginSettingTab {
  plugin: RandomNoteReviewPlugin;

  constructor(app: App, plugin: RandomNoteReviewPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h1", { text: "🎲 Random Note Review" });
    containerEl.createEl("p", {
      text: "配置随机复习笔记的行为。支持排除规则、优先级加权和冷却去重。",
      cls: "rnr-desc",
    });

    // ─── 排除规则 ─────────────────────────────────────────────────────────────
    containerEl.createEl("h2", { text: "排除规则" });
    containerEl.createEl("p", {
      text: "以下规则中的笔记将永远不会被抽取到。",
      cls: "rnr-section-desc",
    });

    new Setting(containerEl)
      .setName("排除文件路径")
      .setDesc(
        "每行一个路径，支持 glob 通配符（如 daily/*.md、**/private/**）。匹配的笔记不会被抽取。"
      )
      .addTextArea((ta) => {
        ta.setPlaceholder("daily/*.md\n**/private/**\nReadme.md")
          .setValue(this.plugin.settings.excludedFiles.join("\n"))
          .onChange(async (v) => {
            this.plugin.settings.excludedFiles = this.parseLines(v);
            await this.plugin.saveSettings();
          });
        ta.inputEl.rows = 5;
        ta.inputEl.addClass("rnr-textarea");
      });

    new Setting(containerEl)
      .setName("排除目录")
      .setDesc("每行一个目录路径（相对于 Vault 根目录）。该目录及其所有子目录中的笔记不会被抽取。")
      .addTextArea((ta) => {
        ta.setPlaceholder("Templates\nAttachments\nArchive/2020")
          .setValue(this.plugin.settings.excludedFolders.join("\n"))
          .onChange(async (v) => {
            this.plugin.settings.excludedFolders = this.parseLines(v);
            await this.plugin.saveSettings();
          });
        ta.inputEl.rows = 4;
        ta.inputEl.addClass("rnr-textarea");
      });

    new Setting(containerEl)
      .setName("排除标签")
      .setDesc(
        "每行一个标签（含 # 前缀，如 #template）。笔记只要含任一排除标签，就不会被抽取。"
      )
      .addTextArea((ta) => {
        ta.setPlaceholder("#template\n#draft\n#exclude")
          .setValue(this.plugin.settings.excludedTags.join("\n"))
          .onChange(async (v) => {
            this.plugin.settings.excludedTags = this.parseLines(v);
            await this.plugin.saveSettings();
          });
        ta.inputEl.rows = 4;
        ta.inputEl.addClass("rnr-textarea");
      });

    // ─── 优先级规则 ────────────────────────────────────────────────────────────
    containerEl.createEl("h2", { text: "优先级规则" });
    containerEl.createEl("p", {
      text: "高优先级笔记在抽取时权重更高，更容易被选中。",
      cls: "rnr-section-desc",
    });

    new Setting(containerEl)
      .setName("高优先级目录")
      .setDesc("每行一个目录路径。来自这些目录的笔记具有更高的抽取权重。")
      .addTextArea((ta) => {
        ta.setPlaceholder("Projects\nKnowledge/Core")
          .setValue(this.plugin.settings.priorityFolders.join("\n"))
          .onChange(async (v) => {
            this.plugin.settings.priorityFolders = this.parseLines(v);
            await this.plugin.saveSettings();
          });
        ta.inputEl.rows = 4;
        ta.inputEl.addClass("rnr-textarea");
      });

    new Setting(containerEl)
      .setName("高优先级标签")
      .setDesc("每行一个标签（含 # 前缀）。含这些标签的笔记具有更高的抽取权重。")
      .addTextArea((ta) => {
        ta.setPlaceholder("#review\n#important\n#starred")
          .setValue(this.plugin.settings.priorityTags.join("\n"))
          .onChange(async (v) => {
            this.plugin.settings.priorityTags = this.parseLines(v);
            await this.plugin.saveSettings();
          });
        ta.inputEl.rows = 4;
        ta.inputEl.addClass("rnr-textarea");
      });

    new Setting(containerEl)
      .setName("优先级权重倍数")
      .setDesc(
        "高优先级笔记的权重是普通笔记的几倍？默认 3，即高优先级笔记被选中的概率约为普通笔记的 3 倍。"
      )
      .addSlider((sl) => {
        sl.setLimits(2, 10, 1)
          .setValue(this.plugin.settings.priorityWeight)
          .setDynamicTooltip()
          .onChange(async (v) => {
            this.plugin.settings.priorityWeight = v;
            await this.plugin.saveSettings();
          });
      })
      .addExtraButton((btn) => {
        btn.setIcon("reset").setTooltip("恢复默认值 (3)").onClick(async () => {
          this.plugin.settings.priorityWeight = 3;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    // ─── 冷却机制 ──────────────────────────────────────────────────────────────
    containerEl.createEl("h2", { text: "冷却与去重机制" });
    containerEl.createEl("p", {
      text: "控制近期已复习笔记的冷却行为。同一天内无论如何都不会重复抽取。",
      cls: "rnr-section-desc",
    });

    new Setting(containerEl)
      .setName("冷却窗口（天）")
      .setDesc("在此天数内抽取过的笔记，根据冷却模式降低或禁止再次被抽到。")
      .addSlider((sl) => {
        sl.setLimits(1, 30, 1)
          .setValue(this.plugin.settings.cooldownDays)
          .setDynamicTooltip()
          .onChange(async (v) => {
            this.plugin.settings.cooldownDays = v;
            await this.plugin.saveSettings();
          });
      })
      .addExtraButton((btn) => {
        btn.setIcon("reset").setTooltip("恢复默认值 (7)").onClick(async () => {
          this.plugin.settings.cooldownDays = 7;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    new Setting(containerEl)
      .setName("冷却模式")
      .setDesc(
        "hard：冷却期内完全排除该笔记（推荐）。decay：按天数线性衰减权重，冷却期越近权重越低。"
      )
      .addDropdown((dd) => {
        dd.addOption("hard", "⛔ Hard — 冷却期内完全排除")
          .addOption("decay", "📉 Decay — 线性衰减权重")
          .setValue(this.plugin.settings.cooldownMode)
          .onChange(async (v) => {
            this.plugin.settings.cooldownMode = v as "hard" | "decay";
            await this.plugin.saveSettings();
          });
      });

    // ─── 数据管理 ──────────────────────────────────────────────────────────────
    containerEl.createEl("h2", { text: "数据管理" });

    new Setting(containerEl)
      .setName("清除抽取历史")
      .setDesc("清除所有抽取记录（包括今日去重记录和冷却历史），下次抽取将从全库范围重新开始。")
      .addButton((btn) => {
        btn
          .setButtonText("清除历史")
          .setWarning()
          .onClick(async () => {
            this.plugin.drawHistory = [];
            await this.plugin.saveSettings();
            new Notice("✅ 抽取历史已清除");
          });
      });

    // ─── 使用统计 ──────────────────────────────────────────────────────────────
    const histCount = this.plugin.drawHistory.length;
    const todayCount = this.plugin.drawHistory.filter(
      (r: DrawRecord) => r.date === new Date().toISOString().split("T")[0]
    ).length;

    containerEl.createEl("h2", { text: "使用统计" });
    const statsEl = containerEl.createEl("div", { cls: "rnr-stats" });
    statsEl.createEl("p", { text: `📚 冷却期内记录总数：${histCount} 条` });
    statsEl.createEl("p", { text: `📅 今日已抽取：${todayCount} 篇` });
  }

  /** 解析多行文本为非空字符串数组，并去重 */
  private parseLines(text: string): string[] {
    return [
      ...new Set(
        text
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 0)
      ),
    ];
  }
}