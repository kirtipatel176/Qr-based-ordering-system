"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { QrCode, Wifi, WifiOff, AlertCircle, RefreshCw, Utensils } from "lucide-react"
import { CustomerInfoForm } from "@/components/customer/customer-info-form"
import { SessionSelector } from "@/components/session/session-selector"
import { ExistingSessionSummary } from "@/components/session/existing-session-summary"
import { SessionConflictDialog } from "@/components/session/session-conflict-dialog"
import { ConnectionStatus } from "@/components/connection-status"
import { useSupabase } from "@/components/supabase-provider"
import { sessionManager } from "@/lib/session-manager"
import { sessionPersistence } from "@/lib/session-persistence"

interface Restaurant {
  id: string
  name: string
  description?: string
  logo_url?: string
}

interface Table {
  id: string
  table_number: number
  restaurant_id: string
}

export default function QRScanPage() {
  const params = useParams()
  const restaurantId = params.restaurantId as string
  const tableId = params.tableId as string

  const { supabaseClient, isConnected, isLoading: connectionLoading } = useSupabase()

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [table, setTable] = useState<Table | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<"loading" | "options" | "customer-form" | "existing-session" | "conflict">("loading")
  const [tableStatus, setTableStatus] = useState<any>(null)
  const [selectedOption, setSelectedOption] = useState<any>(null)
  const [conflictSession, setConflictSession] = useState<any>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (restaurantId && tableId && isConnected && !connectionLoading) {
      initializePage()
    }
  }, [restaurantId, tableId, isConnected, connectionLoading])

  useEffect(() => {
    // Monitor online status
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const initializePage = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🚀 Initializing QR scan page:", { restaurantId, tableId })

      // Wait for connection if still loading
      if (connectionLoading || !isConnected) {
        console.log("⏳ Waiting for database connection...")
        return
      }

      // First, handle QR scan logic
      const scanResult = await sessionPersistence.handleQRScan(tableId, restaurantId)
      console.log("📱 QR scan result:", scanResult)

      if (scanResult.action === "redirect" && scanResult.sessionId) {
        console.log("🔄 Redirecting to existing session")
        window.location.href = `/menu/${restaurantId}/${tableId}?session=${scanResult.sessionId}`
        return
      }

      if (scanResult.action === "show-conflict" && scanResult.conflictSession) {
        console.log("⚠️ Showing session conflict")
        setConflictSession(scanResult.conflictSession)
        setStep("conflict")
        setLoading(false)
        return
      }

      // Fetch restaurant and table data
      await fetchRestaurantAndTable()

      // Check table status
      const status = await sessionManager.checkTableStatus(tableId)
      console.log("📊 Table status:", status)
      setTableStatus(status)

      setStep("options")
    } catch (err) {
      console.error("❌ Error initializing page:", err)
      setError(err instanceof Error ? err.message : "Failed to load page")
    } finally {
      setLoading(false)
    }
  }

  const fetchRestaurantAndTable = async () => {
    try {
      console.log("🔍 Fetching restaurant and table data")

      const [restaurantResult, tableResult] = await Promise.all([
        supabaseClient.from("restaurants").select("*").eq("id", restaurantId).single(),
        supabaseClient.from("tables").select("*").eq("id", tableId).single(),
      ])

      if (restaurantResult.error) {
        throw new Error("Restaurant not found: " + restaurantResult.error.message)
      }

      if (tableResult.error) {
        throw new Error("Table not found: " + tableResult.error.message)
      }

      console.log("✅ Restaurant and table data loaded")
      setRestaurant(restaurantResult.data)
      setTable(tableResult.data)
    } catch (error) {
      console.error("❌ Error fetching restaurant/table:", error)
      throw error
    }
  }

  const handleOptionSelect = async (option: any) => {
    try {
      console.log("🎯 Option selected:", option)
      setSelectedOption(option)
      setError(null)

      if (option.type === "new") {
        console.log("➡️ Navigating to customer form")
        setStep("customer-form")
      } else if (option.type === "existing") {
        console.log("➡️ Navigating to existing session summary")
        setStep("existing-session")
      }
    } catch (error) {
      console.error("❌ Error handling option selection:", error)
      setError("Failed to process your selection. Please try again.")
    }
  }

  const handleCustomerSubmit = async (customerData: any) => {
    try {
      console.log("👤 Creating new session with customer data:", customerData)
      setLoading(true)
      setError(null)

      const result = await sessionManager.createNewSession(
        tableId,
        customerData.name,
        customerData.phone,
        customerData.email,
      )

      if (!result.success) {
        console.error("❌ Session creation failed:", result)
        setError(result.error || "Failed to create session")
        return
      }

      console.log("✅ Session created successfully:", result.sessionId)

      // Store in persistence
      const persistedSession = {
        sessionId: result.sessionId!,
        tableId: tableId,
        restaurantId: restaurantId,
        customerName: customerData.name,
        customerPhone: customerData.phone,
        customerEmail: customerData.email,
        sessionToken: result.sessionToken!,
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }

      const stored = sessionPersistence.storeSession(persistedSession)
      console.log("💾 Session stored in persistence:", stored)

      console.log("🔄 Redirecting to menu")
      window.location.href = `/menu/${restaurantId}/${tableId}?session=${result.sessionId}`
    } catch (error) {
      console.error("❌ Error creating session:", error)
      setError(error instanceof Error ? error.message : "Failed to create session")
    } finally {
      setLoading(false)
    }
  }

  const handleContinueSession = async () => {
    try {
      if (!selectedOption?.session?.session_id) {
        setError("Session ID not found")
        return
      }

      console.log("🔄 Continuing existing session")
      setLoading(true)

      const result = await sessionManager.continueExistingSession(selectedOption.session.session_id)

      if (!result.success) {
        console.error("❌ Failed to continue session:", result)
        setError(result.error || "Failed to continue session")
        return
      }

      console.log("✅ Session continued, redirecting")
      window.location.href = `/menu/${restaurantId}/${tableId}?session=${selectedOption.session.session_id}`
    } catch (error) {
      console.error("❌ Error continuing session:", error)
      setError(error instanceof Error ? error.message : "Failed to continue session")
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1)
    setError(null)
    initializePage()
  }

  const handleBackToOptions = () => {
    console.log("⬅️ Going back to options")
    setStep("options")
    setSelectedOption(null)
    setError(null)
  }

  const handleConflictResolution = (action: string) => {
    if (action === "continue-current") {
      // Continue with conflicted session
      const sessionInfo = sessionPersistence.getSessionInfo()
      if (sessionInfo) {
        window.location.href = `/menu/${sessionInfo.restaurantId}/${sessionInfo.tableId}?session=${sessionInfo.sessionId}`
      }
    } else if (action === "start-new") {
      // Clear conflict and start new
      sessionPersistence.clearSession()
      setConflictSession(null)
      setStep("options")
    }
  }

  // Wait for connection
  if (connectionLoading || !isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50">
        <Card className="w-full max-w-md mx-4 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="text-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2 text-slate-800">Connecting...</h2>
            <p className="text-slate-600">Establishing database connection</p>
            <ConnectionStatus />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Loading state
  if (loading && step === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50">
        <Card className="w-full max-w-md mx-4 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="text-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2 text-slate-800">Loading...</h2>
            <p className="text-slate-600">Setting up your dining experience</p>
            {retryCount > 0 && <p className="text-sm text-slate-500 mt-2">Retry attempt: {retryCount}</p>}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error && step !== "customer-form") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 p-4">
        <Card className="w-full max-w-md shadow-xl border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-red-800">Connection Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>

            <div className="flex items-center justify-center gap-2 text-sm">
              {isOnline ? (
                <>
                  <Wifi className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-600" />
                  <span className="text-red-600">Offline</span>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Button onClick={handleRetry} className="w-full" disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Try Again
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
                Refresh Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main content based on step
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50">
      <ConnectionStatus />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
              <QrCode className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent mb-2">
              {restaurant?.name || "Restaurant"}
            </h1>
            {restaurant?.description && <p className="text-slate-600 mb-4">{restaurant.description}</p>}
            <div className="flex items-center justify-center gap-2 text-slate-600">
              <Utensils className="h-4 w-4" />
              <span>Table {table?.table_number}</span>
            </div>
          </div>

          {/* Error Alert for customer form */}
          {error && step === "customer-form" && (
            <div className="mb-6">
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* Content based on step */}
          {step === "options" && tableStatus && (
            <SessionSelector
              options={tableStatus.options}
              onOptionSelect={handleOptionSelect}
              isOccupied={tableStatus.isOccupied}
              loading={loading}
            />
          )}

          {step === "customer-form" && (
            <CustomerInfoForm
              onSubmit={handleCustomerSubmit}
              onBack={handleBackToOptions}
              loading={loading}
              restaurantName={restaurant?.name || "Restaurant"}
              tableNumber={table?.table_number.toString() || "Unknown"}
            />
          )}

          {step === "existing-session" && selectedOption?.session && (
            <ExistingSessionSummary
              sessionId={selectedOption.session.session_id}
              onContinue={handleContinueSession}
              onStartNew={() => setStep("customer-form")}
            />
          )}

          {step === "conflict" && conflictSession && (
            <SessionConflictDialog
              isOpen={true}
              onOpenChange={() => {}}
              conflictSession={conflictSession}
              currentTableId={tableId}
              currentRestaurantId={restaurantId}
              onResolution={handleConflictResolution}
            />
          )}
        </div>
      </div>
    </div>
  )
}
