import type { WpPost } from "@/lib/types";
import { PostCard } from "./PostCard";

interface PostGridProps { posts: WpPost[]; onSelectPost: (index: number) => void; }

export function PostGrid({ posts, onSelectPost }: PostGridProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
      {posts.map((post, i) => (<PostCard key={post.id} post={post} onClick={() => onSelectPost(i)} />))}
    </div>
  );
}
