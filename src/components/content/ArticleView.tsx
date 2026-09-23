import { useRef, useEffect } from "react";
import DOMPurify from "dompurify";
import { getPostTitle, getPostImage } from "@/lib/types";
import type { WpPost } from "@/lib/types";
import { useI18n } from "@/context/I18nContext";
import { decodeHtml } from "@/lib/utils";
import { ShareButtons } from "@/components/content/ShareButtons";

const PURIFY_CONFIG = {
  FORBID_TAGS: ["style", "form", "input", "button", "select", "textarea", "fieldset"],
  FORBID_ATTR: ["style"],
};

interface ArticleViewProps { post: WpPost; onBack: () => void; }

export function ArticleView({ post, onBack }: ArticleViewProps) {
  const { lang, t } = useI18n();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const title = decodeHtml(getPostTitle(post));
  const content = post.content || post.description || post.caption || post.excerpt || "";
  const originalLink = (() => {
    if (!post.link) return null;
    try {
      const url = new URL(post.link);
      return url.protocol === "http:" || url.protocol === "https:" ? post.link : null;
    } catch {
      return null;
    }
  })();
  const date = post.date ? new Date(post.date).toLocaleDateString(lang === "zh" ? "zh-TW" : "en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : null;
  const author = post._embedded?.author?.[0]?.name;
  const imgData = getPostImage(post);
  const categories: string[] = [];
  if (post._embedded?.["wp:term"]) { for (const group of post._embedded["wp:term"]) { for (const term of group) { categories.push(term.name); } } }

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <div className="animate-fade-in mx-auto flex max-w-[72ch] flex-col">
      <button onClick={onBack} className="mb-8 inline-flex w-fit items-center gap-1.5 rounded-md bg-surface-sunken px-3.5 py-2 text-sm font-medium text-secondary transition-colors hover:bg-border-default">← {t("back_to_list")}</button>
      <article>
        <h1 ref={titleRef} tabIndex={-1} className="mb-4 font-serif text-[clamp(1.8rem,3.5vw,2.6rem)] font-semibold leading-tight text-balance outline-none">{title}</h1>
        <div className="mb-3 flex flex-wrap gap-4 text-sm text-tertiary">
          {author && <span>✍️ {author}</span>}
          {date && <span>📅 {date}</span>}
        </div>
        {categories.length > 0 && (<div className="mb-8 flex flex-wrap gap-1.5">{categories.map((cat) => (<span key={cat} className="rounded bg-accent-subtle px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-accent uppercase">{cat}</span>))}</div>)}
        {imgData && <img src={imgData.url} alt={imgData.alt} className="mb-9 aspect-video w-full rounded-xl object-cover" loading="eager" decoding="async" fetchPriority="high" />}
        {content && <div className="article-body font-serif text-[1.1em] leading-relaxed" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content, PURIFY_CONFIG) }} />}
        {originalLink && (
          <a
            href={originalLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-6 inline-flex items-center gap-1 text-sm text-tertiary hover:text-accent"
          >
            🔗 {t("article_original_link")}
          </a>
        )}
        <ShareButtons url={typeof window !== "undefined" ? window.location.href : ""} title={title} />
      </article>
    </div>
  );
}
