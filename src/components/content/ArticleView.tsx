import type { WpPost } from "@/lib/types";
import { useI18n } from "@/context/I18nContext";

interface ArticleViewProps { post: WpPost; onBack: () => void; }

function getPostImage(post: WpPost): string | null {
  if (post.source_url && post.media_type === "image") return post.source_url;
  return post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null;
}

export function ArticleView({ post, onBack }: ArticleViewProps) {
  const { lang, t } = useI18n();
  const title = post.title || post.name || `#${post.id}`;
  const content = post.content || post.description || post.caption || post.excerpt || "";
  const date = post.date ? new Date(post.date).toLocaleDateString(lang === "zh" ? "zh-TW" : "en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : null;
  const author = post._embedded?.author?.[0]?.name;
  const img = getPostImage(post);
  const categories: string[] = [];
  if (post._embedded?.["wp:term"]) { for (const group of post._embedded["wp:term"]) { for (const term of group) { categories.push(term.name); } } }

  return (
    <div className="animate-fade-in mx-auto flex max-w-[72ch] flex-col">
      <button onClick={onBack} className="mb-8 inline-flex w-fit items-center gap-1.5 rounded-md bg-surface-sunken px-3.5 py-2 text-sm font-medium text-secondary transition-colors hover:bg-border-default">← {t("back_to_list")}</button>
      <article>
        <h1 className="mb-4 font-serif text-[clamp(1.8rem,3.5vw,2.6rem)] font-semibold leading-tight text-balance">{title}</h1>
        <div className="mb-3 flex flex-wrap gap-4 text-sm text-tertiary">
          {author && <span>✍️ {author}</span>}
          {date && <span>📅 {date}</span>}
        </div>
        {categories.length > 0 && (<div className="mb-8 flex flex-wrap gap-1.5">{categories.map((cat) => (<span key={cat} className="rounded bg-accent-subtle px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-accent uppercase">{cat}</span>))}</div>)}
        {img && <img src={img} alt="" className="mb-9 aspect-video w-full rounded-xl object-cover" loading="lazy" decoding="async" />}
        {content && <div className="article-body font-serif text-[1.1em] leading-relaxed" dangerouslySetInnerHTML={{ __html: content }} />}
      </article>
    </div>
  );
}
