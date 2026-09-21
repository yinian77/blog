---
title: 屏迹 ScreenTrace：一次 Vibe Coding 的中期成果
description: 用 Vibe Coding 做 Windows 录屏客户端 ScreenTrace 的中期记录
category: Electron
tag:
  - Electron
---

# 屏迹 ScreenTrace：一次 Vibe Coding 的中期成果

项目地址：[yinian77/ScreenTrace](https://github.com/yinian77/ScreenTrace)

## 1. 前景

最近用 Vibe Coding 自己做了一个 Windows 录屏客户端：**屏迹 ScreenTrace**。一句话定位是「把屏幕上的每一步，留成轨迹」。

它不是想做成功能最多的录屏软件，而是把「能录、有声、能存、不丢」先做扎实。录屏和普通应用不太一样：按下开始之后，每一秒都是一次性事件流，崩溃了不能重录，磁盘写满了也不能撤销。所以工程重心从一开始就偏向 **出错后能保住多少**，而不是假装不会出错。

这篇文章记一下中期做到哪了、几个关键选型，以及 Vibe Coding 过程里真正踩过的坑。

## 2. 现在能做什么

当前版本已经能在 Windows 10 / 11 上独立使用：

1. 选整个屏幕或单个窗口，源列表带缩略图、分辨率和缩放比
2. 系统声音和麦克风可独立开关，再混进同一条音轨
3. 帧率、分辨率上限、码率、倒计时、保存目录都可以调
4. 全局快捷键 `Ctrl + Shift + R` 开始 / 停止，托盘常驻
5. 录制时右上角有悬浮控制条，开了窗口内容保护，**不会被录进画面**
6. 停录后自动无损转封装成可拖进度条的 MP4

关闭主窗口只会藏到托盘，应用还在跑。真正退出走托盘菜单。

## 3. 技术栈

| 层 | 选型 |
| --- | --- |
| 桌面壳 | Electron 44 |
| 界面 | React 19 + TypeScript + Vite 7 |
| 构建 | electron-vite 5 |
| 屏幕采集 | `getDisplayMedia`（Chromium 底层走 Windows Graphics Capture） |
| 系统音频 | Electron `setDisplayMediaRequestHandler` 的 `audio: 'loopback'` |
| 编码 | `MediaRecorder`（优先硬件编码） |
| 转封装 | FFmpeg `-c copy`（只改容器，不重新编码） |

为什么不用 FFmpeg 命令行直接采集：FFmpeg 到现在都没有原生 WASAPI loopback 输入。要录系统声音，通常得让用户装虚拟声卡。Electron 在 Windows 上原生支持 `audio: 'loopback'`，零驱动依赖，这个点直接决定了壳层选 Electron，而不是「包装一层 ffmpeg.exe」。

FFmpeg 在这个项目里只做收尾：重建 MP4 索引、webm 无损转 MP4、崩溃后修 `.part`。没有它也能录、也能存，只是进度条可能拖不动，或者只能留下 webm。

## 4. 架构上必须守住的约束

录制逻辑跑在**主窗口的渲染进程**里。

- `getDisplayMedia` 是 Web API，只能在渲染进程用
- 捕获源和系统音频必须由主进程的 `setDisplayMediaRequestHandler` 提供
- 悬浮控制条是另一个渲染进程，只收状态、不下发采集

所以录制期间主窗口**只能隐藏，不能销毁**。关窗口等于掐流。这也是「关闭窗口只是进托盘」的原因，不是产品口味，是技术约束。

采集源也不能由渲染进程用 `deviceId` 指定，W3C 规范不让这么干。界面上的选择会先缓存到主进程，再由 handler 回调拍板。

```text
系统屏幕 ──┐
           ├─→ getDisplayMedia ─→ video track ─┐
系统音频 ──┘   (audio:'loopback')              │
                                               ├─→ MediaStream ─→ MediaRecorder
麦克风 ────→ getUserMedia ─→ 混音 ─────────────┘
                                                       │
                                                       ▼
                                              ondataavailable（约 1s）
                                                       │
                                                       ▼
                                              IPC 分片 → 主进程顺序落盘
```

状态机放在 `engine.ts`，不放进 React state。计时、分片串行写、资源释放都靠实例字段，用 React 状态去表达只会让时序更脆。`useRecorder` 只负责订阅快照和驱动指示器窗口。

## 5. 中期真正做扎实的部分

P0 是「能用」，P1 是「出事还能救」。目前这两段都做完了。

### 5.1 分片落盘，而不是录完再写

`MediaRecorder` 大约每秒吐一个分片，到了就立刻写磁盘，渲染进程不留历史分片。异常退出最多丢最后一秒，而不是整段录像一起没。

全程写 `.part`，正常结束才 `fsync` 再改名成正式文件。崩溃后磁盘上只会留下 `.part`，不会出现「扩展名看起来对、内容其实被截断」的假成品。

启动时会扫遗留的 `.part`：

- 里面真有媒体数据：提示一键用 FFmpeg 重建容器
- 修不好也原样保留，不丢数据
- 第一个分片都没到就被杀掉的空壳，扫描时静默删掉，不拿去烦用户

### 5.2 取消、撞名、磁盘满

倒计时或采集中途点取消，不留残留文件，也不会出现「取消了却还在录」的鬼影会话。同一秒内连录两次，文件名会自动加 `(2)`，不会把前一段盖掉。

磁盘空间按码率换算还能录多久：不足 5 分钟提示，不足 60 秒自动停。写流失败按 errno 分成磁盘满 / 权限不足 / 路径失效，立刻停录，而不是录完才告诉你文件废了。

## 6. Vibe Coding 过程里踩过的坑

这次不是「丢一句提示词就出成品」。仓库里有 `docs/DESIGN.md` 和 `AGENTS.md`，先把约束写死，再让模型按约束改代码。助手默认只跑 `pnpm typecheck` 和 `pnpm build`，不擅自开一堆验证实验。

几个后来才暴露的问题，比选型本身更值得记。

**倒计时走完，界面却停在倒计时。** 早期测试大多走「不倒数」或「取消」，刚好绕开了最常用的「倒数结束 → 开始录制」。状态没推进到 `recording`，用户连停止入口都没有。覆盖率高不等于覆盖了对的路径，这条是按实际反馈补的。

**主窗口隐藏后，Chromium 把定时器节流了。** 界面看起来一切正常，分片却不再投递，最后录出空文件。单元断言覆盖不到「主进程 ↔ 渲染进程 ↔ 真实 MediaRecorder」。后来给主窗口加了 `backgroundThrottling: false`，并补了一次真机录制：只看文件系统和 `ffprobe`，不看应用自己报的状态。

**`video/webm;codecs=h264` 不是标准 WebM。** WebM 规范只允许 VP8 / VP9 / AV1，FFmpeg 用 `-f webm` 写 H.264 会直接拒绝。Chromium 这条 MIME 实际容器更接近 Matroska，所以才能被 `-c copy` 无损转成 MP4。

## 7. 还没做、先不做的

明确不做的：macOS / Linux、云端分享、时间轴编辑器、摄像头画中画、光标特效、AI 转录。这些都排在后面，P0 / P1 不碰。

目前已知限制：

- 只支持 Windows
- 部分系统窗口本身不可捕获，列表里会回退成占位图
- VP8 / VP9 没法无损转 MP4，会保留 webm
- 暂停 / 继续还是 `MediaRecorder.pause()`，长录制多次暂停可能有轻微音画漂移
- 没做代码签名，SmartScreen 会提示未知发布者

下一步更想做的是暂停改成分段拼接、4K 场景换成 `MessagePort` 直连，以及真正的跨平台。智能能力（转录、自动章节、步骤文档）要等「录得住、存得下」完全稳了再加，否则产品名里的「轨迹」只是一句空话。

## 8. 本地跑起来

```bash
git clone https://github.com/yinian77/ScreenTrace.git
cd ScreenTrace
pnpm install
pnpm dev
```

打包安装包：

```bash
pnpm typecheck
pnpm dist
```

环境是 Windows 10 2004+、Node.js 20+、pnpm 10+。FFmpeg 建议随包放到 `resources/ffmpeg.exe`，用户端就不用自己配。

## 9. 中期小结

Vibe Coding 能把 Electron + 录制管线这种「选型多、坑也多」的项目推到可安装、可恢复的中期形态，前提是先把约束写清楚：录制不能毁窗口、落盘必须原子、FFmpeg 只做转封装、渲染进程不直接碰文件系统。

模型适合把已经想清楚的决策落成代码；真机上的节流、状态机漏推进、容器细节，还是得自己盯文件和 `ffprobe`。中期成果不是「AI 写完了一个录屏软件」，而是一套已经能用、出事还能救的录制底座。
