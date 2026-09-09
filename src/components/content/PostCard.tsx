import type { WpPost } from "@/lib/types";
import { useI18n } from "@/context/I18nContext";

interface PostCardProps { post: WpPost; onClick: () => void; }

function getPostImage(post: WpPost): string | null {
  if (post.source_url && post.media_type === "image") return post.source_url;
  return post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null;
}

function decodeHtml(html: string): string {
  const el = document.createElement("textarea");
  el.innerHTML = html;
  return el.value;
}

export function PostCard({ post, onClick }: PostCardProps) {
  const { lang } = useI18n();
  const title = post.title || post.name || `#${post.id}`;
  const img = getPostImage(post);
  const author = post._embedded?.author?.[0]?.name;
  const date = post.date ? new Date(post.date).toLocaleDateString(lang === "zh" ? "zh-TW" : "en-US", { month: "short", day: "numeric", year: "numeric" }) : null;

  return (
    <article className="cursor-pointer overflow-hidden rounded-xl border border-border-subtle bg-surface-raised transition-all hover:border-border-default hover:shadow-md" onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }} aria-label={decodeHtml(title)}>
      {img ? <img src={img} alt="" className="aspect-video w-full bg-surface-sunken object-cover" loading="lazy" decoding="async" /> : <div className="aspect-video w-full bg-surface-sunken" />}
      <div className="px-4 py-4">
        <h3 className="mb-1.5 line-clamp-2 text-[0.925rem] font-semibold leading-snug">{decodeHtml(title)}</h3>
        <div className="flex flex-wrap gap-3 text-[0.725rem] text-tertiary">
          {author && <span>{author}</span>}
          {date && <span>{date}</span>}
        </div>
      </div>
    </article>
  );
}
