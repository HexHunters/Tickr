/** Preserve empty successful responses and never forward upstream auth headers. */
export async function forwardApiResponse(
  upstream: Response,
): Promise<Response> {
  const hasNoBody = [204, 205, 304].includes(upstream.status)
  return new Response(hasNoBody ? null : await upstream.text(), {
    status: upstream.status,
    headers: {
      'Cache-Control': 'no-store',
      ...(!hasNoBody ? { 'Content-Type': 'application/json' } : {}),
    },
  })
}
