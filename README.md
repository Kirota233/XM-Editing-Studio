# XM剪辑台 (v1.5.1)

**把剧本、字幕、音乐、样片水印与剪映自动化放进同一个轻量工作台。**

[下载最新安装包](https://github.com/Kirota233/XM-Editing-Studio/releases/latest) · [更新日志](CHANGELOG.md) · [参与开发](CONTRIBUTING.md)

---

## 核心功能

- **多语种台词提纯**：识别 `[EN]` 英文、`[ES]` 西语及中文角色台词，过滤角色名与动作提示；内置 C# 剪贴板标点保护助手（`PeriodKeeper.exe`），一键复制到剪映文稿匹配不吞句号。
- **AI 剧本分析与配乐**：支持 Gemini / 兼容 API 与内置 **DeepSeek / 豆包官方网页版**（免 API Key 登录即用），支持整篇或按剧情分段匹配本地曲库、生成 Suno 音乐提示词。
- **本地音乐库与 Suno 创作**：递归扫描本地音频目录，支持相关度/随机检索、最近 10 首防重复排除，以及直接拖拽音频进入剪映轨道。
- **样片批量水印**：内置 WebAV (WebCodecs) 硬件加速与 FFmpeg WASM 双引擎本地批量压制。
- **剪映自动化中心 (`JianYing-Ai-Pro`)**：基于 **47 KB 原生 C# 引擎 (`JianYingEngine.exe`)**，毫秒级启动，支持 `F8` 坐标录制、`F9` 跳过步骤、`F10` 紧急中断、AI 扫描草稿批量导出、SRT 字幕提取与文件批量重命名。
- **沉浸式一体化标题栏与自动更新**：无边框融合式标题栏随 11 款全局主题自适应配色，支持后台检测 GitHub Release 新版本并一键校验 SHA-256 下载安装。

---

## 本地最小化开发与运行

本项目已全面去除了 Python / PyInstaller / OpenCV 等重型依赖，所有原生辅助组件均使用 Windows 内置 `.NET Framework 4.x (csc.exe)` 编译：

```powershell
# 1. 安装依赖
npm install

# 2. 构建前端与 C# 原生组件 (PeriodKeeper.exe & JianYingEngine.exe)
npm run build
npm run build:native

# 3. 运行单元测试与集成测试
npm test

# 4. 启动本地开发环境
npm start
```

> **自动化构建与发版**：安装包（`XM-Editing-Studio-<version>-Windows-x64-Setup.exe`）统一由 GitHub Actions (`.github/workflows/release.yml`) 自动编译、打包并发布至 GitHub Releases，本地开发无需保留打包产物。
