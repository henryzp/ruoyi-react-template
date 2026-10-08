export type AuthRouterMode = "hash" | "browser";

export function getSafeRedirectPath(
  value?: string | null,
  fallback = "/home",
): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  const pathname = value.split(/[?#]/, 1)[0];
  return pathname === "/login" ? fallback : value;
}

function getRouteHref(mode: AuthRouterMode, href: string): string {
  if (mode === "hash") {
    if (href.startsWith("#/")) return href.slice(1);
    if (!href.startsWith("/")) {
      try {
        const parsed = new URL(href, window.location.href);
        if (parsed.hash.startsWith("#/")) return parsed.hash.slice(1);
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
      } catch {
        return href;
      }
    }
    return href;
  }

  try {
    const parsed = new URL(href, window.location.href);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return href;
  }
}

export function createLoginRedirectUrl(
  mode: AuthRouterMode,
  href: string,
): string {
  const redirectUrl = getSafeRedirectPath(getRouteHref(mode, href));
  const query = new URLSearchParams({ redirectUrl }).toString();
  const loginRoute = `/login?${query}`;
  const target = new URL(
    import.meta.env.BASE_URL || "/",
    window.location.origin,
  );

  if (mode === "hash") {
    target.hash = loginRoute;
  } else {
    const [pathname, search] = loginRoute.split("?");
    target.pathname = `${target.pathname}${pathname.replace(/^\//, "")}`;
    target.search = search ? `?${search}` : "";
  }

  return target.toString();
}
