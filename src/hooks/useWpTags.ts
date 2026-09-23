import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { fetchWithProxy, wpApiUrl, parseJsonResponse } from "@/lib/api";
import { useSettingsStore } from "@/stores/settingsStore";

export const wpTagSchema = z.object({
  id: z.number(),
  name: z.string(),
  count: z.number().optional(),
});

export type WpTag = z.infer<typeof wpTagSchema>;

export const wpTagArraySchema = z.array(wpTagSchema);

/**
 * Fetch all WordPress tags for use in tag filtering.
 *
 * Only enabled when contentType is "posts" (pages/media/categories
 * do not support tag filtering in the WordPress REST API).
 *
 * Uses `_fields=id,name,count` to minimize response payload.
 */
export function useWpTags() {
  const wpUrl = useSettingsStore((s) => s.wpUrl);
  const contentType = useSettingsStore((s) => s.contentType);
  const useProxy = useSettingsStore((s) => s.useProxy);

  return useQuery<WpTag[]>({
    queryKey: ["wp-tags", wpUrl, useProxy],
    queryFn: async ({ signal }) => {
      const api = wpApiUrl(wpUrl);
      const url = `${api}/tags?per_page=100&_fields=id,name,count`;

      const response = await fetchWithProxy(url, useProxy, { signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const raw = await parseJsonResponse(response);
      const parsed = wpTagArraySchema.safeParse(raw);

      if (!parsed.success) {
        console.warn("[WP] Tags Zod parse warning:", parsed.error);
        if (!Array.isArray(raw)) return [];
        return (raw as Record<string, unknown>[])
          .filter((t) => typeof t.id === "number" && typeof t.name === "string")
          .map((t) => ({
            id: t.id as number,
            name: t.name as string,
            count: typeof t.count === "number" ? t.count : undefined,
          }));
      }

      return parsed.data;
    },
    enabled: !!wpUrl && contentType === "posts",
    staleTime: 5 * 60 * 1000, // Tags rarely change; cache 5 min
  });
}
