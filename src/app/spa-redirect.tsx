"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Handles SPA-style redirects from GitHub Pages 404.html.
 * When a user navigates to a dynamic route (e.g. /formulas/some-id),
 * GitHub Pages serves 404.html which encodes the path as a query parameter
 * and redirects to the root. This component reads that query parameter
 * and performs client-side navigation to the correct route.
 */
export function SpaRedirectHandler() {
  const router = useRouter();

  useEffect(() => {
    const { search, hash } = window.location;
    if (search.startsWith("?/")) {
      const decoded = search
        .slice(2) // remove "?/"
        .split("&")
        .map((s) => s.replace(/~and~/g, "&"))
        .join("?");
      let path = "/" + decoded + hash;

      // Convert /trials/[id]/run to /trials?id=[id]&mode=run
      const runMatch = path.match(
        /^\/(trials)\/([^/?#]+)\/run\/?(?:\?([^#]*))?(#.*)?$/,
      );
      if (runMatch) {
        const [, , id, query = "", pathHash = ""] = runMatch;
        const params = new URLSearchParams();
        params.set("id", id);
        params.set("mode", "run");
        new URLSearchParams(query).forEach((value, key) => {
          if (key !== "id" && key !== "mode") {
            params.append(key, value);
          }
        });
        path = `/trials?${params.toString()}${pathHash}`;
      }

      // Convert /formulas/[id], /protocols/[id], /trials/[id] to query-param format
      const dynamicMatch = path.match(
        /^\/(formulas|protocols|trials)\/([^/?#]+)\/?(?:\?([^#]*))?(#.*)?$/,
      );
      if (dynamicMatch) {
        const [, resource, id, query = "", pathHash = ""] = dynamicMatch;
        const params = new URLSearchParams();
        params.set("id", id);
        new URLSearchParams(query).forEach((value, key) => {
          if (key !== "id") {
            params.append(key, value);
          }
        });
        path = `/${resource}?${params.toString()}${pathHash}`;
      }

      // Clean up the URL
      window.history.replaceState(null, "", path);
      router.replace(path);
    }
  }, [router]);

  return null;
}
