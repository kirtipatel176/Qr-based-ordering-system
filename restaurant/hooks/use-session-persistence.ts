"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { sessionPersistence, type PersistedSession } from "@/lib/session-persistence"

export function useSessionPersistence() {
  const router = useRouter()
  const [currentSession, setCurrentSession] = useState<PersistedSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadSession()
  }, [])

  const loadSession = () => {
    try {
      const session = sessionPersistence.getStoredSession()
      setCurrentSession(session)
    } catch (error) {
      console.error("Error loading session:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const storeSession = (session: PersistedSession) => {
    sessionPersistence.storeSession(session)
    setCurrentSession(session)
  }

  const clearSession = () => {
    sessionPersistence.clearSession()
    setCurrentSession(null)
  }

  const validateAndRedirect = async (tableId: string, restaurantId: string) => {
    const validation = await sessionPersistence.validateSession(tableId, restaurantId)

    if (validation.isValid && validation.session) {
      router.push(`/menu/${restaurantId}/${tableId}?session=${validation.session.sessionId}`)
      return true
    }

    return false
  }

  const updateLastAccessed = () => {
    if (currentSession) {
      sessionPersistence.updateLastAccessed(currentSession)
      loadSession() // Refresh current session
    }
  }

  return {
    currentSession,
    isLoading,
    storeSession,
    clearSession,
    validateAndRedirect,
    updateLastAccessed,
    loadSession,
  }
}
