import { z } from 'zod'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}
const errorSchema = z.object({
  code: z.string().optional(),
  message: z.union([z.string(), z.array(z.string())]).optional(),
})

export async function parseResponse<T>(
  response: Response,
  schema: z.ZodType<T>,
): Promise<T> {
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const error = errorSchema.safeParse(body)
    throw new ApiError(
      response.status,
      error.success ? (error.data.code ?? '') : '',
      error.success && typeof error.data.message === 'string'
        ? error.data.message
        : 'Le service ne peut pas répondre pour le moment.',
    )
  }
  const result = schema.safeParse(body)
  if (!result.success)
    throw new ApiError(
      502,
      'INVALID_RESPONSE',
      'Les informations reçues sont incomplètes. Réessayez dans un instant.',
    )
  return result.data
}

export async function requestApi<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api/backend/${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      cache: 'no-store',
    })
  } catch {
    throw new ApiError(
      503,
      'UNAVAILABLE',
      'Le service est momentanément indisponible. Réessayez dans un instant.',
    )
  }
  return parseResponse(response, schema)
}

export function friendlyError(error: unknown): string {
  if (!(error instanceof ApiError))
    return 'Le service est momentanément indisponible. Réessayez.'
  if (error.status === 401)
    return 'Votre session a expiré. Connectez-vous pour continuer.'
  if (error.status === 403)
    return 'Cette action n’est pas disponible pour votre compte.'
  if (error.status === 400)
    return 'Vérifiez les informations saisies, puis réessayez.'
  if (error.status === 404) return 'Ces informations ne sont plus disponibles.'
  if (error.status === 429)
    return 'Vous avez effectué plusieurs demandes. Patientez avant de réessayer.'
  return error.status >= 500
    ? 'Le service est momentanément indisponible. Réessayez dans un instant.'
    : error.message
}
