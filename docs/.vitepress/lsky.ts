/** 图床域名，换域名只改这里，然后重新构建。 */
export const lskyBase = "https://img.liuq.work";

const abs = /^https?:\/\/[^/]+(\/i\/\d{4}\/\d{2}\/\d{2}\/[^)\s#?]+)$/;
const rel = /^\/i\/\d{4}\/\d{2}\/\d{2}\/[^)\s#?]+$/;

export function rewriteLskySrc(src: string): string {
  const m = src.match(abs);
  if (m) return `${lskyBase}${m[1]}`;
  if (rel.test(src)) return `${lskyBase}${src}`;
  return src;
}

// ponytail: 路径对不上时构建直接炸，避免静默拼错外链
{
  const path = "/i/2026/09/21/abc.png";
  const got = rewriteLskySrc(`https://old.example/i/2026/09/21/abc.png`);
  if (got !== `${lskyBase}${path}` || rewriteLskySrc(path) !== got) {
    throw new Error("lsky rewrite broken");
  }
}
