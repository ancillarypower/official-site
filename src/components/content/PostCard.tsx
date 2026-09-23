import { getPostTitle, getPostImage } from "@/lib/types";
import type { WpPost } from "@/lib/types";
import { useI18n } from "@/context/I18nContext";
import { decodeHtml } from "@/lib/utils";

interface PostCardProps { post: WpPost; onClick: () => void; }

export function PostCard({ post, onClick }: PostCardProps) {
  const { lang } = useI18n();
  const title = getPostTitle(post);
  const imgData = getPostImage(post);
  const author = post._embedded?.author?.[0]?.name;
  const date = post.date ? new Date(post.date).toLocaleDateString(lang === "zh" ? "zh-TW" : "en-US", { month: "short", day: "numeric", year: "numeric" }) : null;

  // Extract tags from _embedded["wp:term"][1] (WordPress convention: [0]=categories, [1]=tags)
  const tags = post._embedded?.["wp:term"]?.[1]?.map((t) => t.name).filter(Boolean) ?? [];
  const visibleTags = tags.slice(0, 3);
  const overflowCount = tags.length - visibleTags.length;

  return (
    <article className="overflow-hidden rounded-xl border border-border-subtle bg-surface-raised transition-all hover:border-border-default hover:shadow-md">
      <button
        type="button"
        onClick={onClick}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
        className="w-full cursor-pointer text-left"
        aria-label={decodeHtml(title)}
      >
        {imgData ? <img src={imgData.url} alt={imgData.alt} className="aspect-video w-full bg-surface-sunken object-cover" loading="lazy" decoding="async" /> : <div className="aspect-video w-full bg-surface-sunken" />}
        <div className="px-4 py-4">
          <h3 className="mb-1.5 line-clamp-2 text-[0.925rem] font-semibold leading-snug">{decodeHtml(title)}</h3>
          <div className="flex flex-wrap gap-3 text-[0.725rem] text-tertiary">
            {author && <span>{author}</span>}
            {date && <span>{date}</span>}
          </div>
          {visibleTags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {visibleTags.map((tag) => (
                <span key={tag} className="rounded-full bg-accent-subtle px-2 py-0.5 text-[0.65rem] text-accent">
                  {tag}
                </span>
              ))}
              {overflowCount > 0 && (
                <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[0.65rem] text-tertiary">
                  +{overflowCount}
                </span>
              )}
            </div>
          )}
        </div>
      </button>
    </article>
  );
}
