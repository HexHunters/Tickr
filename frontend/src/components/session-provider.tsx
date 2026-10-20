'use client'

import { createContext, useContext } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { userSchema } from '@/lib/api/contracts'
import { parseResponse } from '@/lib/api/request'

import type { User } from '@/lib/api/contracts'

interface SessionContextValue {
  user: User | null
  isPending: boolean
  isError: boolean
  logout: () => Promise<void>
}
const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const session = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const result = await parseResponse(
        await fetch('/api/auth/session', { cache: 'no-store' }),
        z.object({ user: userSchema.nullable() }),
      )
      return result.user
    },
    retry: false,
    staleTime: 60000,
  })
  async function logout() {
    const response = await fetch('/api/auth/logout', { method: 'POST' })
    if (!response.ok) throw new Error('Déconnexion indisponible')
    queryClient.clear()
    queryClient.setQueryData(['session'], null)
  }
  return (
    <SessionContext.Provider
      value={{
        user: session.data ?? null,
        isPending: session.isPending,
        isError: session.isError,
        logout,
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const session = useContext(SessionContext)
  if (!session) throw new Error('SessionProvider is required')
  return session
}
