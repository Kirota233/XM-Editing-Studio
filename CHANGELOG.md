# XM剪辑台 1.6.1 更新日志

## 1. 彻底移除 Electron 浏览器内核：原生 C# + 系统 WebView2 宿主重构（安装包 486 KB）
- **零浏览器内核打包 (`XMStudioHost.cs`)**：废除原版 180 MB 的 Electron Chromium 打包运行时，主程序重构为仅 **82 KB** 的原生 C# 桌面宿主（`小马剪辑台.exe`），直接调用 Windows 10 / 11 系统底层内置的 `Edge WebView2 Runtime` 与原生 DWM 亚克力窗口 API。
- **安装包体积从 89.36 MB 降至 0.47 MB / 486 KB（缩减 99.4%）**：完整 `Setup.exe` 安装包体积仅 **486 KB（解压后总大小仅 1.8 MB）**，100% 保留空间毛玻璃（`backdrop-filter: blur(24px)`）、极光流动光斑、弹簧动效与内嵌 DeepSeek/豆包官方网页能力。
- **月薪喵融入 `DesktopPet-Miao` 可爱待机动画与气泡交互**：参考开源项目 `sprmorn/DesktopPet-Miao`，剔除繁琐数值与喂食系统，保留粉色圆角对话气泡、早/中/晚/深夜时间感知问候、双击开心弹跳（`jumpJoy`）以及闲暇时随机切换 4 种可爱待机神态（歪头蹭蹭冒爱心 `💕`、眯眼得意 `✨`、低头看片 `🎬`、打瞌睡吹泡泡 `💤`）。
- **CI 构建与构建环境优化**：升级 GitHub Actions 至 `@v7`（原生支持 Node 24，消除 Node 20 弃用警告），修复 Windows PowerShell 编码与原生 C# 组件预编译顺序。
