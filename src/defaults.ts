// defaults.ts - 默认配置

import { PluginSettings } from "./types";

export const DEFAULT_SETTINGS: PluginSettings = {
  // 排除规则（默认排除常见的日记和模板目录）
  excludedFiles: [],
  excludedFolders: ["Templates", "Attachments", "Archive"],
  excludedTags: ["#exclude", "#template", "#draft"],

  // 优先级规则
  priorityFolders: [],
  priorityTags: ["#review", "#important"],
  priorityWeight: 3,

  // 冷却机制
  cooldownDays: 7,
  cooldownMode: "hard",
};
