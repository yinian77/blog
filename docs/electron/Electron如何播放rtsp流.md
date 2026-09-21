---
title: Electron 如何播放rtsp 流
description: Electron 如何播放rtsp 流
category: Electron
tag:
  - Electron
---

# Electron 如何播放rtsp 流

## 1.前景

在前面学习了如何使用ffmpeg 搭建本地 rtsp 流播放，在业务需求记录下我如何在 electron 中播放 rtsp 流。

## 2.实现流程
1. 在主进程中加载ffmpeg 软件环境服务配置
2. electron 窗口主进程启动时,在生命周期中同时启动 WebSocket 服务
3. ui层发起 WebSocket 连接, WebSocket 服务中使用 ffmpeg 命令将 rtsp 流转换为 flv 流
4. ui层的播放组件使用 flv.js 播放 flv 流

![alt text](/i/2026/09/21/6ab099f7d38e4.png)

## 3.代码实现

### 3.1 主进程代码

```JavaScript
// WebSocket 服务 + ffmpeg 解析插件引用
const express = require("express");
const expressWebSocket = require("express-ws");
const ffmpeg = require("fluent-ffmpeg");
const webSocketStream = require("websocket-stream/stream");
```

```JavaScript
// 这里主要是为了解决ffmpeg软件在开发/生产时环境的加载问题,
// 配置ffmpeg 软件环境服务
function getFfmpegPath() {
  if (process.env.NODE_ENV === "development") {
    return "ffmpeg";
  }
  const platform = process.platform;
  const exeName = platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  const possiblePaths = [
    path.join(process.resourcesPath, "bin", exeName),
    path.join(__dirname, "resources", "bin", exeName),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return "ffmpeg";
}
ffmpeg.setFfmpegPath(getFfmpegPath());

//打包配置
// electron-builder.json5
{
  extraResources: [
    {
      from: "bin", // 这里是ffmpeg 软件的可执行文件目录
      to: "bin",
    },
  ],
}
```


```JavaScript
// 启动流服务器
function startStreamServer() {
  const app = express();
  // 配置跨域
  app.use((req: any, res: any, next: any) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods","GET, POST, OPTIONS, PUT, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers","X-Requested-With,content-type");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    next();
  });
  expressWebSocket(app, null, { perMessageDeflate: true });

  // HTTP 端点: 获取媒体信息
  app.get("/api/media-info", (req: any, res: any) => {
    const rtspUrl = req.query.url;
    const streamId = req.query.id;
    if (!rtspUrl) {
      return res.status(400).json({ error: "缺少 rtspUrl 参数" });
    }
    // 获取rtsp媒体信息
    ffmpeg.ffprobe(rtspUrl,{"-f": "rtsp",},(err: any, metadata: any) => {
        if (err) {
          console.error(`[${streamId}] get rtsp stream media info failed:`,err,);
          return res.status(500).json({ error: "获取媒体信息失败" });
        }
        // 解析视频信息
        const videoStream = metadata.streams.find(
          (s: any) => s.codec_type === "video",
        );
        const audioStream = metadata.streams.find(
          (s: any) => s.codec_type === "audio",
        );

        // 构建媒体信息对象
        const mediaInfo = {
          streamId: streamId,
          video: {
            codec: videoStream?.codec_name || "unknown",
            resolution: videoStream
              ? `${videoStream.width}x${videoStream.height}`
              : "unknown",
            framerate: videoStream?.r_frame_rate || "unknown",
            bitrate: metadata.format.bit_rate || "unknown",
          },
          audio: {
            codec: audioStream?.codec_name || "none",
            channels: audioStream?.channels || 0,
            sample_rate: audioStream?.sample_rate || 0,
          },
          format: metadata.format.format_name || "unknown",
        };
        res.json(mediaInfo);
      },
    );
  });

  // WebSocket 路由: ws://localhost:7777/rtsp/:id?url=RTSP_ADDRESS
  app.ws("/rtsp/:id", (ws: any, req: any) => {
    // 将 WebSocket 转换为一个可写流
    const stream = webSocketStream(ws, { binary: true });
    const rtspUrl = req.query.url;
    const streamId = req.params.id;
    console.log(`[Stream ${streamId}] WebSocket loading.....: ${rtspUrl}`);
    // 配置 FFmpeg 命令
    const command = ffmpeg(rtspUrl)
      // 输入优化参数：增大缓冲区, 减少延迟
      .addInputOption("-buffer_size", "102400")
      .addInputOption("-max_delay", "100")
      // 事件监听
      .on("start", (cmd: any) =>console.log(`[${streamId}] FFmpeg start: ${cmd}`))
      .on("codecData", () => console.log(`[${streamId}] codecData`)) // 可以在此通知前端摄像头在线
      .on("error", (err: any) =>console.error(`[${streamId}] error: ${err.message}`))
      .on("end", () => console.log(`[${streamId}] end`)) // 可以在此通知前端摄像头离线
      // 输出配置：直接封装为 FLV，视频流直接复制以降低 CPU 消耗，不处理音频
      .outputFormat("flv")
      .videoCodec("copy")
      .noAudio();

    // 将 FFmpeg 的输出通过管道连接到 WebSocket 流
    try {
      command.pipe(stream);
    } catch (error) {
      console.error(`[${streamId}] WebSocket pipe error:`, error);
    }
    // 当 WebSocket 关闭时，主动终止 FFmpeg 进程
    ws.on("close", () => {
      console.log(`[${streamId}] WebSocket closed, FFmpeg process terminated`);
      command.kill("SIGTERM");
    });
  });

  // 启动服务器，监听 7777 端口
  app.listen(7777, () => {
    console.log("WebSocket server started on port 7777");
  });
}


// 在应用准备就绪时启动流服务器
app.whenReady().then(async () => {
  startStreamServer(); // 先启动流媒体websoket服务
});
```


### 3.1 视频播放组件
```vue
<!-- src/components/RtspPlayer.vue -->
<template>
  <div class="rtsp-player" :class="{ 'fullscreen': isFullscreen }">
    <!-- 视频容器 -->
    <div class="video-container" ref="videoContainer">
      <video ref="videoElement" class="video-element" :muted="muted" :controls="showControls" :autoplay="autoplay"
        @loadeddata="handleLoadedData" @error="handleVideoError"></video>

      <!-- 加载状态 overlay -->
      <div v-if="loading" class="overlay loading-overlay">
        <div class="spinner"></div>
        <span>{{ loadingText }}</span>
      </div>

      <!-- 错误状态 overlay -->
      <div v-if="error" class="overlay error-overlay">
        <span class="error-icon">⚠️</span>
        <span >视频播放失败,请播放重试!</span>
        <!-- <button v-if="showRetry" @click="retry" class="retry-btn">
          重试
        </button> -->
      </div>

      <!-- 播放状态指示器 -->
      <div v-if="!loading && !error && !isPlaying" class="overlay paused-overlay">
        <span>已暂停</span>
      </div>
    </div>

    <!-- 控制栏 -->
    <div class="controls" v-if="showControlsBar">
      <div class="controls-center">
        <span class="latency-info" v-if="latency">
          延迟：{{ latency }}ms
        </span>
        <button @click="refreshStream" class="control-btn" :disabled="refreshing" title="重新加载">
          ⟳
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue';
import flvjs from 'flv.js';

// Props 定义
const props = defineProps({
  // RTSP 流地址
  rtspUrl: {
    type: String,
    required: true
  },
  // 流 ID（用于 WebSocket 路径）
  streamId: {
    type: String,
    default: () => `stream_${Math.random().toString(36).substr(2, 9)}`
  },
  // WebSocket 服务器地址
  wsServerUrl: {
    type: String,
    default: 'ws://localhost:7777'
  },
  // 是否自动播放
  autoplay: {
    type: Boolean,
    default: true
  },
  // 是否静音
  muted: {
    type: Boolean,
    default: true
  },
  // 是否显示原生控制条
  showControls: {
    type: Boolean,
    default: false
  },
  // 是否显示自定义控制栏
  showControlsBar: {
    type: Boolean,
    default: true
  },
  // 是否显示重试按钮
  showRetry: {
    type: Boolean,
    default: true
  },
  // 延迟控制间隔（毫秒）
  latencyControlInterval: {
    type: Number,
    default: 30000
  },
  // 最大允许缓冲（秒）
  maxBuffered: {
    type: Number,
    default: 1.5
  }
});

// Emits 定义
const emit = defineEmits([
  'play',
  'pause',
  'error',
  'streamOnline',
  'streamOffline',
  'fullscreenChange',
  'mediaInfo'
]);

// --- 状态变量 ---
const videoElement = ref(null);
const videoContainer = ref(null);
const flvPlayer = ref(null);
const loading = ref(true);
const error = ref('');
const isPlaying = ref(false);
const isStreamOnline = ref(false);
const isFullscreen = ref(false);
const latency = ref(null);
const refreshing = ref(false);
const loadingText = ref('正在连接流媒体服务...');
const mediaInfo = ref(null);

// 定时器句柄
let latencyControlTimer = null;
let statusCheckTimer = null;

// --- 计算 WebSocket URL ---
const wsUrl = computed(() => {
  return `${props.wsServerUrl}/rtsp/${props.streamId}/?url=${encodeURIComponent(props.rtspUrl)}`;
});

// --- 获取媒体信息 ---
const fetchMediaInfo = async () => {
  try {
    const httpServerUrl = props.wsServerUrl.replace('ws://', 'http://');
    const response = await fetch(`${httpServerUrl}/api/media-info?url=${encodeURIComponent(props.rtspUrl)}&id=${props.streamId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    mediaInfo.value = data;
    emit('mediaInfo', data);
  } catch (err) {

  }
};

// --- 初始化播放器 ---
const initPlayer = async () => {
  if (!flvjs.isSupported()) {
    error.value = '当前浏览器不支持 flv.js';
    loading.value = false;
    emit('error', error.value);
    return;
  }

  try {
    // 确保 video 元素已渲染
    await nextTick();

    if (!videoElement.value) {
      throw new Error('视频元素未找到');
    }

    // 清理旧的播放器
    destroyPlayer();

    loading.value = true;
    error.value = '';
    loadingText.value = '正在获取媒体信息...';

    // 先获取媒体信息
    await fetchMediaInfo();

    loadingText.value = '正在连接流媒体服务...';

    // 创建 flv.js 播放器
    flvPlayer.value = flvjs.createPlayer({
      type: 'flv',
      isLive: true,
      url: wsUrl.value
    }, {
      enableStashBuffer: false,      // 禁用缓存，降低延迟
      stashInitialSize: 0,            // 初始缓存大小为0
      isLive: true,
      lazyLoad: false,                // 禁用懒加载
      autoCleanupSourceBuffer: true,  // 自动清理 SourceBuffer
      fixAudioTimestampGap: false,    // 不修复音频时间戳间隙
    });

    // 绑定事件
    flvPlayer.value.attachMediaElement(videoElement.value);

    // 加载并播放
    flvPlayer.value.load();

    if (props.autoplay) {
      await flvPlayer.value.play();
      isPlaying.value = true;
      emit('play');
    }

    // 监听 flv.js 事件
    flvPlayer.value.on(flvjs.Events.ERROR, handleFlvError);
    flvPlayer.value.on(flvjs.Events.RECOVERED_EARLY_EOF, handleRecovered);
    flvPlayer.value.on(flvjs.Events.LOADING_COMPLETE, () => {
      //流信息断开
      console.log('流信息断开');
    });


    loading.value = false;
    isStreamOnline.value = true;
    emit('streamOnline');

    // 启动延迟控制
    startLatencyControl();

  } catch (err) {
    console.error('播放器初始化失败:', err);
    error.value = `播放失败: ${err.message}`;
    loading.value = false;
    isStreamOnline.value = false;
    emit('error', err.message);
    emit('streamOffline');
  }
};



const handleFlvError = (errType, errDetail) => {
  console.error('flv.js 错误:', errType, errDetail);
  // 根据错误类型更新状态
  if (errType === flvjs.ErrorTypes.NETWORK_ERROR) {
    isStreamOnline.value = false;
    emit('streamOffline');
    error.value = '网络连接断开';
  } else if (errType === flvjs.ErrorTypes.MEDIA_ERROR) {
    error.value = '媒体解码错误';
  }

  emit('error', { type: errType, detail: errDetail });
};

const handleRecovered = () => {
  isStreamOnline.value = true;
  error.value = '';
  emit('streamOnline');
};

const handleLoadedData = () => {
  // console.log('视频数据已加载');
  
};

const handleVideoError = (event) => {
  error.value = '视频播放错误';
  isStreamOnline.value = false;
  emit('streamOffline');
};

// --- 播放控制 ---
const togglePlay = async () => {
  if (!flvPlayer.value) return;
  try {
    if (isPlaying.value) {
      flvPlayer.value.pause();
      isPlaying.value = false;
      emit('pause');
    } else {
      await flvPlayer.value.play();
      isPlaying.value = true;
      emit('play');
    }
  } catch (err) {
    console.error('播放控制失败:', err);
    error.value = `操作失败: ${err.message}`;
  }
};

const toggleMute = () => {
  if (videoElement.value) {
    videoElement.value.muted = !videoElement.value.muted;
  }
};

// --- 全屏控制 ---
const toggleFullscreen = () => {
  if (!videoContainer.value) return;

  if (!isFullscreen.value) {
    if (videoContainer.value.requestFullscreen) {
      videoContainer.value.requestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
};

// 监听全屏变化
const handleFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement;
  emit('fullscreenChange', isFullscreen.value);
};

// --- 刷新流 ---
const refreshStream = async () => {
  refreshing.value = true;
  error.value = '';

  try {
    await initPlayer();
  } finally {
    refreshing.value = false;
  }
};

// --- 延迟控制 ---
const startLatencyControl = () => {
  if (latencyControlTimer) {
    clearInterval(latencyControlTimer);
  }

  latencyControlTimer = setInterval(() => {
    if (!flvPlayer.value || !flvPlayer.value.buffered.length) return;

    try {
      const buffered = flvPlayer.value.buffered;
      const bufferedEnd = buffered.end(buffered.length - 1);
      const currentTime = flvPlayer.value.currentTime;
      const diff = bufferedEnd - currentTime;

      // 计算延迟（假设是直播，currentTime 应该接近 bufferedEnd）
      if (diff > 0) {
        latency.value = Math.round(diff * 1000); // 转换为毫秒

        // 如果缓冲过多，跳转到缓冲区末尾附近
        if (diff >= props.maxBuffered) {
          flvPlayer.value.currentTime = bufferedEnd - 0.1;
          // console.log(`延迟控制：缓冲 ${diff.toFixed(2)}s，跳转同步`);
        }
      }
    } catch (err) {
      console.warn('延迟控制计算错误:', err);
    }
  }, 5000);
};

// --- 状态检查 ---
const startStatusCheck = () => {
  if (statusCheckTimer) {
    clearInterval(statusCheckTimer);
  }

  statusCheckTimer = setInterval(() => {
    if (flvPlayer.value) {
      // 检查播放器状态
      const isBufferEmpty = flvPlayer.value.buffered.length === 0;

      if (isBufferEmpty && !loading.value && !error.value) {
        // 可能断流了
        console.warn('检测到缓冲区为空，可能断流');
        isStreamOnline.value = false;
        emit('streamOffline');
      }
    }
  }, 10000);
};

// --- 销毁播放器 ---
const destroyPlayer = () => {
  if (flvPlayer.value && typeof flvPlayer.value === 'object') {
    try {
      if (typeof flvPlayer.value.pause === 'function') {
        flvPlayer.value.pause();
      }
      if (typeof flvPlayer.value.unload === 'function') {
        flvPlayer.value.unload();
      }
      if (typeof flvPlayer.value.detachMediaElement === 'function') {
        flvPlayer.value.detachMediaElement();
      }
      if (typeof flvPlayer.value.destroy === 'function') {
        flvPlayer.value.destroy();
      }
    } catch (err) {
      console.warn('销毁播放器时出错:', err);
    } finally {
      flvPlayer.value = null;
    }
  }
};

// --- 截图功能 ---
const captureScreenshot = () => {
  return new Promise((resolve, reject) => {
    if (!videoElement.value || !isPlaying.value) {
      const errorMsg = '无法截图：视频未播放';
      console.warn(errorMsg);
      reject(new Error(errorMsg));
      return;
    }

    try {
      const video = videoElement.value;
      const canvas = document.createElement('canvas');

      // 设置画布尺寸与视频一致
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        const errorMsg = '无法获取 canvas 上下文';
        reject(new Error(errorMsg));
        return;
      }

      // 绘制当前视频帧到 canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // 转换为 Base64
      const base64 = canvas.toDataURL('image/png', 1.0);

      // 返回 Base64 字符串
      resolve(base64);

    } catch (err) {
      console.error('截图失败:', err);
      error.value = `截图失败：${err.message}`;
      reject(err);
    }
  });
};

// --- 重试 ---
const retry = () => {
  refreshStream();
};

// --- 生命周期钩子 ---
onMounted(() => {
  // initPlayer();

  // 监听全屏变化
  document.addEventListener('fullscreenchange', handleFullscreenChange);

  // 启动状态检查
  startStatusCheck();
});

onBeforeUnmount(() => {
  // 清理定时器
  if (latencyControlTimer) {
    clearInterval(latencyControlTimer);
    latencyControlTimer = null;
  }

  if (statusCheckTimer) {
    clearInterval(statusCheckTimer);
    statusCheckTimer = null;
  }

  // 移除事件监听
  document.removeEventListener('fullscreenchange', handleFullscreenChange);

  // 销毁播放器
  destroyPlayer();
});

// 监听 rtspUrl 变化
watch(() => props.rtspUrl, () => {
  refreshStream();
});

// 监听自动播放变化
watch(() => props.autoplay, (newVal) => {
  if (newVal && flvPlayer.value && !isPlaying.value) {
    flvPlayer.value.play();
  }
});

// 暴露方法给父组件
defineExpose({
  play: () => flvPlayer.value?.play(),
  pause: () => flvPlayer.value?.pause(),
  refresh: refreshStream,
  togglePlay,
  toggleMute,
  captureScreenshot,
  destroyPlayer
});
</script>

<style scoped>
.rtsp-player {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  font-family: system-ui, -apple-system, sans-serif;
}

.video-container {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000;
}

.video-element {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* Overlay 样式 */
.overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  z-index: 10;
}

.loading-overlay {
  gap: 16px;
}

.error-overlay {
  gap: 12px;
}

.error-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.paused-overlay {
  background: rgba(0, 0, 0, 0.3);
  font-size: 14px;
}

/* 加载动画 */
.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 重试按钮 */
.retry-btn {
  padding: 8px 16px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  margin-top: 8px;
  transition: background 0.2s;
}

.retry-btn:hover {
  background: #45a049;
}

.retry-btn:disabled {
  background: #cccccc;
  cursor: not-allowed;
}

/* 控制栏 */
.controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  z-index: 20;
}

.controls-center {
  display: flex;
  align-items: center;
  gap: 16px;
}

.control-btn {
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 流状态指示器 */
.stream-status {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.5);
}

.stream-status.online {
  color: #4CAF50;
}

.stream-status.offline {
  color: #f44336;
}

/* 延迟信息 */
.latency-info {
  font-size: 12px;
  background: rgba(0, 0, 0, 0.5);
  padding: 4px 8px;
  border-radius: 12px;
}

/* 全屏模式 */
.rtsp-player.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  border-radius: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .controls {
    padding: 8px;
  }

  .control-btn {
    font-size: 16px;
    padding: 4px;
  }

  .stream-status,
  .latency-info {
    font-size: 11px;
    padding: 2px 6px;
  }
}
</style>
```