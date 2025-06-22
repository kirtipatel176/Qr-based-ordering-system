"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

interface SupabaseContextType {
  isConnected: boolean
  isLoading: boolean
  error: string | null
  retryConnection: () => void
  supabaseClient: typeof supabase
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const testConnection = async () => {
    try {
      console.log("🔍 Testing Supabase connection...")
      setIsLoading(true)
      setError(null)

      // Test basic connection
      const { data, error: testError } = await supabase.from("restaurants").select("id").limit(1)

      if (testError) {
        console.error("❌ Supabase connection failed:", testError)
        setIsConnected(false)
        setError(testError.message)
      } else {
        console.log("✅ Supabase connection successful")
        setIsConnected(true)
        setError(null)
      }
    } catch (err) {
      console.error("❌ Connection test error:", err)
      setIsConnected(false)
      setError(err instanceof Error ? err.message : "Connection failed")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    testConnection()
  }, [])

  const retryConnection = () => {
    console.log("🔄 Retrying Supabase connection...")
    testConnection()
  }

  const contextValue: SupabaseContextType = {
    isConnected,
    isLoading,
    error,
    retryConnection,
    supabaseClient: supabase,
  }

  return <SupabaseContext.Provider value={contextValue}>{children}</SupabaseContext.Provider>
}

export function useSupabase() {
  const context = useContext(SupabaseContext)
  if (context === undefined) {
    throw new Error("useSupabase must be used within a SupabaseProvider")
  }
  return context
}

// Export a safe version that doesn't throw
export function useSupabaseSafe() {
  const context = useContext(SupabaseContext)
  return context || null
}
