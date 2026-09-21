---
title: Lsky Pro 自建图床部署
description: 开源 Lsky Pro 2.x Docker 部署、域名、相册和迁移
category: 笔记
---

# Lsky Pro 自建图床部署

个人博客图床，开源 **Lsky Pro 2.x**，Docker 跑在本机，域名 `img.liuq.work`。

官方现在主推的是付费 **Lsky Pro+**（镜像 `0xxb/lsky-pro`）。这套用的是社区镜像打的开源 2.x，已经停更，个人用够了。

## 一. 现在这套怎么跑

| 项 | 值 |
| --- | --- |
| 镜像 | `halcyonazure/lsky-pro-docker` |
| 容器 | `lsky-pro` |
| 编排 | `/opt/lsky-pro/docker-compose.yml` |
| 程序 + 数据 | `/opt/lsky-pro/web`（挂到容器 `/var/www/html`） |
| 本机端口 | `8000`（容器内 `8089`） |
| 访问 | `https://img.liuq.work`（宝塔反代到 `127.0.0.1:8000`） |
| 数据库 | SQLite |

```yml
services:
  lsky-pro:
    image: halcyonazure/lsky-pro-docker:latest
    container_name: lsky-pro
    environment:
      - WEB_PORT=8089
    ports:
      - "8000:8089"
    volumes:
      - /opt/lsky-pro/web:/var/www/html
    restart: unless-stopped
```

安装时数据库选 **SQLite 3.8.8+**，库路径填：

```text
/var/www/html/database/database.sqlite
```

不要填 `lskypro` 这种名字，程序会把它当文件路径，装不上。

反代「发送域名」用 `$host` 或 `img.liuq.work`，不要填 `127.0.0.1`，并带上 `X-Forwarded-Proto`。否则页面会跳到 `http://127.0.0.1/login`，HTTPS 下 CSS 也会被拦。

## 二. 域名改哪

图床域名现在有两处，都得对上：

| 位置 | 干什么 | 现在的值 |
| --- | --- | --- |
| `/opt/lsky-pro/web/.env` 的 `APP_URL` | 站点本身：登录页、后台、跳转 | `https://img.liuq.work` |
| 后台「储存策略」的 URL（存在 SQLite 里） | 图片外链前缀 | `https://img.liuq.work/i` |

改完清一下缓存：

```bash
docker exec lsky-pro php /var/www/html/artisan cache:clear
```

**换机器、域名不变**：DNS 的 `img` A 记录改新 IP，上面两处都不用动，文章也不用改。这是迁移成本最低的做法。

**连域名一起换**（三处，文章不用逐张改）：

1. `.env` 的 `APP_URL`
2. 后台储存策略 URL
3. 博客构建前缀：`docs/.vitepress/lsky.ts` 的 `lskyBase`，然后重新构建

文章里只写路径，例如 `/i/2026/09/21/xxx.png`。构建时拼上 `lskyBase`。从图床复制完整外链贴进来也能识别，换域名后不用改 md。

博客站点自己的域名（`/blog/` 那套）和图床无关，各改各的。

## 三. 迁移带哪些文件

只拷 SQLite **不行**。库里是账号、相册、图片记录，原图在另一个目录。只搬库、不搬图，后台看得到记录，外链全 404。

最少这三样一起走：

```text
/opt/lsky-pro/web/database/database.sqlite   # 库
/opt/lsky-pro/web/storage/app/uploads        # 原图
/opt/lsky-pro/web/.env                       # APP_KEY、APP_URL，必须同一份
```

`.env` 里的 `APP_KEY` 丢了，旧会话/加密对不上，等于重装。

偷懒就整目录拷：

```text
/opt/lsky-pro/
```

里面还有 `docker-compose.yml`。`/opt/lsky-pro/data` 是当初付费版残留，开源这套用不上，可以不带。

新机器：

1. 目录放到同样路径（或改 compose 的 volume）
2. `docker compose up -d`
3. 反代到本机 `8000`
4. 域名不变只改 DNS；换域名再改第二节那两处

## 四. 相册和文章图

开源版分组是**相册**，不是 URL 路径。图床上的外链仍是：

```text
https://img.liuq.work/i/年/月/日/xxx.png
```

文章里写成 `/i/年/月/日/xxx.png` 即可，域名由 `docs/.vitepress/lsky.ts` 拼。

| 相册 | 用途 |
| --- | --- |
| `blog` | 普通文章图（Electron、本地 RTSP 等） |
| `flutter` | Flutter 相关截图 |
| `test` | 试传，空的 |

只存自己文章里的图。站点壳子不进图床，继续放仓库：

- `docs/public/favicon.ico`
- `docs/public/logo.jpg`
- `docs/public/bg.jpg`
- 主题里的 `bg.webp`

开源版 API 上传**不能指定相册**。网页上传进对应相册即可。PicGo 传上去会进未分组，再到后台挪。

新文章：图床上传 → 复制链接 → 贴进 md（完整外链或只留 `/i/...` 都行）。
