import Link from "next/link";

export default function NotFound() {
  return (
    <section className="planned-mode-page">
      <div className="planned-mode-card">
        <span className="home-eyebrow">404 / Lost in space</span>
        <h1>没有找到这个创作空间</h1>
        <p>入口可能尚未开放，或者路径已经调整。</p>
        <Link href="/" className="planned-mode-back">返回首页</Link>
      </div>
    </section>
  );
}
