import type { EventContext } from "@cloudflare/workers-types";

interface Env {
  R2_BUCKET: R2Bucket;
}

const CACHE_CONTROL = [
  "public",
  `max-age=${7 * 24 * 60 * 60}`,
  `stale-while-revalidate=${24 * 60 * 60}`,
].join(", ");

function r2Headers(contentType: string | undefined): Record<string, string> {
  return {
    "Content-Type": contentType ?? "application/octet-stream",
    "Cache-Control": CACHE_CONTROL,
  };
}

export async function onRequestGet(
  context: EventContext<Env, "path", Record<string, unknown>>,
) {
  const { params, env, request } = context;

  const cached = await caches.default.match(request);
  if (cached) {
    return cached;
  }

  const key = (params.path as string[]).join("/");
  const object = await env.R2_BUCKET.get(key);

  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  const response = new Response(object.body, {
    headers: r2Headers(object.httpMetadata?.contentType),
  });

  context.waitUntil(caches.default.put(request, response.clone()));
  return response;
}

export async function onRequestHead(
  context: EventContext<Env, "path", Record<string, unknown>>,
) {
  const { params, env, request } = context;

  const cached = await caches.default.match(request);
  if (cached) {
    return cached;
  }

  const key = (params.path as string[]).join("/");
  const object = await env.R2_BUCKET.head(key);

  if (!object) {
    return new Response(null, { status: 404 });
  }

  return new Response(null, {
    headers: {
      ...r2Headers(object.httpMetadata?.contentType),
      "Content-Length": `${object.size}`,
    },
  });
}
