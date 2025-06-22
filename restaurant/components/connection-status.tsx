"use client"

import { useSupabaseSafe } from "./supabase-provider"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle, Loader2, RefreshCw, Wifi, WifiOff } from "lucide-react"
import { useState, useEffect } from "react"

export function ConnectionStatus() {
  const supabaseContext = useSupabaseSafe()
  const [isOnline, setIsOnline] = useState(true)
  const [showStatus, setShowStatus] = useState(false)

  useEffect(() => {
    // Check online status
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    setIsOnline(navigator.onLine)

    // Show status for a few seconds on load
    setShowStatus(true)
    const timer = setTimeout(() => setShowStatus(false), 5000)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      clearTimeout(timer)
    }
  }, [])

  // Don't show if no supabase context (shouldn't happen with provider)
  if (!supabaseContext) {
    return null
  }

  const { isConnected, isLoading, error, retryConnection } = supabaseContext

  // Show permanently if there's an error or loading
  const shouldShow = showStatus || isLoading || error || !isConnected

  if (!shouldShow) {
    return null
  }

  if (isLoading) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <Card className="border-blue-200 bg-blue-50 shadow-lg">
          <CardContent className="flex items-center gap-3 p-3">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <div className="text-sm">
              <div className="font-medium text-blue-900">Connecting...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isConnected || error) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <Card className="border-red-200 bg-red-50 shadow-lg">
          <CardContent className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <div className="text-sm">
                <div className="font-medium text-red-900">Connection Failed</div>
                <div className="text-red-700">{error || "Database offline"}</div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={retryConnection}
              className="border-red-300 text-red-700 hover:bg-red-100 ml-3"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <Card className="border-green-200 bg-green-50 shadow-lg">
        <CardContent className="flex items-center gap-3 p-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            {isOnline ? <Wifi className="h-3 w-3 text-green-600" /> : <WifiOff className="h-3 w-3 text-orange-600" />}
          </div>
          <div className="text-sm">
            <div className="font-medium text-green-900">Connected</div>
            <div className="text-green-700">{isOnline ? "Online" : "Offline"}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
