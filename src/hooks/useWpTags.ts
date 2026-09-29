import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { fetchWithProxy, wpApiUrl, wpBuildUrl, parseJsonResponse } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { WP_MAX_PER_PAGE } from "@/lib/constants";
import { useSettingsStore } from "@/stores/settingsStore";

export const wpTagSchema = z.object({ id: z.number(), name: z.string(), count: z.number().optional() });
export type WpTag = z.infer<typeof wpTagSchema>;
export const wpTagArraySchema = z.array(wpTagSchema);
const MAX_TAG_PAGES = 10;

export async function fetchAllWpTags(apiBase: string, useProxy: boolean, signal: AbortSignal): Promise<WpTag[]> {
  const allRaw: unknown[] = [];
  const buildTagUrl = (page: number) => wpBuildUrl(apiBase, "tags", { per_page: String(WP_MAX_PER_PAGE), page: String(page), _fields: "id,name,count" });
  const firstResponse = await fetchWithProxy(buildTagUrl(1), useProxy, { signal });
  if (!firstResponse.ok) throw new AppError("error_api_http", `HTTP ${firstResponse.status}`, { status: String(firstResponse.status) });
  const firstRaw = await parseJsonResponse(firstResponse);
  if (!Array.isArray(firstRaw)) { const parsed = wpTagArraySchema.safeParse(firstRaw); return parsed.success ? parsed.data : []; }
  allRaw.push(...firstRaw);
  const hasPageHeader = firstResponse.headers.has("X-WP-TotalPages") || firstResponse.headers.has("x-wp-totalpages");
  let totalPages = hasPageHeader ? parseInt(firstResponse.headers.get("X-WP-TotalPages") ?? firstResponse.headers.get("x-wp-totalpages") ?? "1", 10) : firstRaw.length >= WP_MAX_PER_PAGE ? 2 : 1;
  totalPages = Math.min(totalPages, MAX_TAG_PAGES);
  for (let page = 2; page <= totalPages; page++) {
    const response = await fetchWithProxy(buildTagUrl(page), useProxy, { signal });
    if (!response.ok) throw new AppError("error_api_http", `HTTP ${response.status}`, { status: String(response.status) });
    const raw = await parseJsonResponse(response);
    if (!Array.isArray(raw)) break;
    allRaw.push(...raw);
    if (!hasPageHeader) { if (raw.length < WP_MAX_PER_PAGE) break; totalPages = Math.min(page + 1, MAX_TAG_PAGES); }
  }
  const parsed = wpTagArraySchema.safeParse(allRaw);
  if (parsed.success) return parsed.data;
  console.warn("[WP] Tags Zod parse warning:", parsed.error);
  return (allRaw as Record<string, unknown>[]).filter((t) => typeof t.id === "number" && typeof t.name === "string").map((t) => ({ id: t.id as number, name: t.name as string, count: typeof t.count === "number" ? t.count : undefined }));
}

export function useWpTags() {
  const wpUrl = useSettingsStore((s) => s.wpUrl), contentType = useSettingsStore((s) => s.contentType), useProxy = useSettingsStore((s) => s.useProxy);
  return useQuery<WpTag[]>({ queryKey: ["wp-tags", wpUrl, useProxy], queryFn: ({ signal }) => fetchAllWpTags(wpApiUrl(wpUrl), useProxy, signal), enabled: !!wpUrl && contentType === "posts", staleTime: 5 * 60 * 1000 });
}
