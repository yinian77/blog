FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
# 与 base: "/" 对齐，站点直接挂在根路径
COPY docs/.vitepress/dist /usr/share/nginx/html

EXPOSE 7777

CMD ["nginx", "-g", "daemon off;"]
