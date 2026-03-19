# 🎲 Random Note Review — Obsidian 插件

随机抽取笔记进行复习，支持排除规则、优先级配置和智能去重冷却机制。

---

## 功能特性

| 功能 | 说明 |
|------|------|
| 🎲 随机抽取 | 点击按钮/命令/状态栏，随机打开一篇笔记 |
| ⛔ 排除规则 | 按文件路径、目录、标签排除不想复习的笔记 |
| ⭐ 优先级加权 | 指定高优先级目录/标签，让重要笔记更容易被抽到 |
| 📅 同日去重 | 同一天内不会重复抽取同一篇笔记 |
| ❄️ 冷却机制 | 最近抽取过的笔记在冷却期内不会（或以降低权重）再次被抽到 |
| 💾 持久化 | 抽取历史自动保存，重启 Obsidian 后仍然有效 |

---

## 安装方式

### 方法一：手动安装（推荐开发者使用）

1. 克隆或下载本仓库
2. 安装依赖：`npm install`
3. 构建插件：`npm run build`
4. 将以下文件复制到你的 Vault 的 `.obsidian/plugins/random-note-review/` 目录：
   - `main.js`
   - `manifest.json`
   - `styles.css`
5. 在 Obsidian 设置 → 第三方插件 中启用 "Random Note Review"

### 方法二：开发模式

```bash
npm install
npm run dev   # 启动 esbuild watch 模式，修改代码后自动重新构建
```

---

## 使用方式

启用插件后，有三种方式触发随机抽取：

1. **命令面板**：`Ctrl/Cmd + P` → 搜索「随机抽取一篇笔记复习」
2. **左侧 Ribbon 按钮**：点击骰子图标 🎲
3. **状态栏按钮**：点击底部状态栏的「🎲 随机复习」

抽取后，笔记会在**新标签页**中打开，并显示通知提示。

---

## 配置说明

在 **设置 → Random Note Review** 中配置以下选项：

### 排除规则

#### 排除文件路径
每行一个路径，支持 glob 通配符：

```
daily/*.md          # 排除 daily 目录下所有 md 文件
**/private/**       # 排除任意层级的 private 目录
Readme.md           # 排除特定文件
```

#### 排除目录
每行一个目录路径（相对于 Vault 根目录）：

```
Templates
Attachments
Archive/2020
```

#### 排除标签
每行一个标签（含 `#` 前缀）：

```
#template
#draft
#exclude
```

### 优先级规则

#### 高优先级目录
```
Projects
Knowledge/Core
```

#### 高优先级标签
```
#review
#important
#starred
```

#### 优先级权重倍数
默认 `3`，即高优先级笔记被选中的概率约为普通笔记的 3 倍。

### 冷却机制

- **冷却窗口（天）**：最近 N 天内抽取过的笔记进入冷却（默认 7 天）
- **冷却模式**：
  - **Hard（推荐）**：冷却期内完全排除该笔记
  - **Decay**：按天数线性衰减权重（越近期越低，到冷却期末恢复正常）

---

## 权重计算逻辑

```
基础权重 = 1

if 笔记在高优先级目录 or 含高优先级标签:
    weight = priorityWeight（如 3）

if cooldownMode == "decay" and 笔记在冷却期内:
    weight *= (daysAgo / cooldownDays)  # 线性衰减

if cooldownMode == "hard" and daysAgo < cooldownDays:
    weight = 0  # 完全排除

if 今天已抽取:
    weight = 0  # 同日去重
```

---

## 项目结构

```
obsidian-random-note-review/
├── main.ts              # 插件主入口（Plugin 类）
├── src/
│   ├── types.ts         # 共享类型定义
│   ├── defaults.ts      # 默认配置
│   ├── utils.ts         # 工具函数（glob、日期、加权随机）
│   ├── picker.ts        # 核心抽取逻辑（NotePicker 类）
│   └── settings.ts      # 设置界面（SettingTab）
├── styles.css           # 插件样式
├── manifest.json        # 插件元数据
├── package.json
├── tsconfig.json
└── esbuild.config.mjs
```

---

## 数据存储

插件使用 Obsidian 的 `loadData` / `saveData` API 将数据存储于：

```
.obsidian/plugins/random-note-review/data.json
```

存储内容：
- 插件配置（settings）
- 最近抽取历史（drawHistory，自动清理超出冷却窗口的记录）

---

## 常见问题

**Q: 点击后提示「没有可抽取的笔记」？**  
A: 可能原因：①排除规则过严 ②所有笔记都在冷却期内 ③今天已抽取过所有笔记。可在设置中点击「清除历史」重置。

**Q: 笔记库很大（数千篇），会卡顿吗？**  
A: 不会。插件利用 Obsidian 的 `MetadataCache` 读取标签，避免逐文件 I/O，抽取逻辑为纯内存计算，毫秒级完成。

**Q: 冷却期内能强制重新抽取吗？**  
A: 可以，在设置中点击「清除历史」即可。

---

## License

MIT
