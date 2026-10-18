/** A cacheable plain-text answer for the AI routes. */
export function textResponse(body: string, type: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": `${type}; charset=utf-8`,
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "X-Robots-Tag": "noindex",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
