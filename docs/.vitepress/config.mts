import { defineConfig } from "vitepress";

// 导入主题的配置
import { blogTheme } from "./blog-theme";

// 如果使用 GitHub/Gitee Pages 等公共平台部署
// 通常需要修改 base 路径，通常为“/仓库名/”
// 如果项目名已经为 name.github.io 域名，则不需要修改！
// const base = process.env.GITHUB_ACTIONS === 'true'
//   ? '/vitepress-blog-sugar-template/'
//   : '/'

// Vitepress 默认配置
// 详见文档：https://vitepress.dev/reference/site-config
const base = '/blog/';

export default defineConfig({
  base,
  // 继承随笔主题(@sugarat/theme)
  extends: blogTheme,
  lang: "zh-cn",
  title: "一念随笔",
  description: "一念的随笔",
  lastUpdated: true,
  // 详见：https://vitepress.dev/zh/reference/site-config#head
  head: [
    // 配置网站的图标（显示在浏览器的 tab 上）
    ["link", { rel: "icon", href: `${base}favicon.ico` }],
    [
      "meta",
      {
        name: "keywords",
        content: "LQ,随笔,前端,LQ的随笔",
      },
    ],
    [
      "meta",
      {
        name: "author",
        content: "LQ",
      },
    ],
    ["meta", { property: "og:site_name", content: "LQ的随笔" }],
  ],
  themeConfig: {
    // 展示 2,3 级标题在目录中
    outline: {
      level: [2, 3],
      label: "目录",
    },
    // 默认文案修改
    returnToTopLabel: "回到顶部",
    sidebarMenuLabel: "相关文章",
    lastUpdatedText: "上次更新于",

    // 设置logo
    logo: "/logo.jpg",
    // editLink: {
    //   pattern:
    //     'https://github.com/ATQQ/sugar-blog/tree/master/packages/blogpress/:path',
    //   text: '去 GitHub 上编辑内容'
    // },
    nav: [
      { text: "首页", link: "/" },
      // {
      //   text: "个人Demo",
      //   items: [{ text: "小念AI对话", link: "http://114.132.72.233/chat" }],
      // },
      {
        text: "前端开发",
        items: [
          { text: "Vue", link: "https://cn.vuejs.org/" },
          { text: "React", link: "/react/react学习" },
          { text: "Node", link: "https://nodejs.cn/" },
        ],
      },
      {
        text: "后端开发",
        items: [
          { text: "Nest.js", link: "https://docs.nestjs.com/" },
          { text: "Go", link: "/go/Go学习笔记" },
        ],
      },
      {
        text: "技术栈",
        items: [
          { text: "Flutter", link: "/flutter/Flutter安装流程" },
          { text: "ECharts", link: "/echarts/Echart图表优化" },
          { text: "Electron", link: "/electron/Electron如何播放rtsp流" },
          { text: "Docker", link: "/docker/Docker构建与推送(腾讯云CCR).md" },
          { text: "Agent", link: "/Agent/00-hello-agents-node" },
        ],
      },
      { text: "笔记", link: "/other/本地rtsp流搭建" },
      { text: "项目经历", link: "/projectExperience/项目经历" },
    ],
    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/yinian77",
      },
    ],
  },
});
