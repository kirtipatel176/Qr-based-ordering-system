"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, MapPin, Clock, Users, ArrowRight } from "lucide-react"
import { sessionPersistence, type PersistedSession } from "@/lib/session-persistence"

interface SessionConflictDialogProps {
  currentTable: { id: string; number: string; restaurantName: string }
  conflictSession: PersistedSession
  onResolve: () => void
}

export function SessionConflictDialog({ currentTable, conflictSession, onResolve }: SessionConflictDialogProps) {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleContinueExisting = async () => {
    setIsProcessing(true)
    try {
      // Update last accessed time
      sessionPersistence.updateLastAccessed(conflictSession)

      // Redirect to existing session
      router.push(
        `/menu/${conflictSession.restaurantId}/${conflictSession.tableId}?session=${conflictSession.sessionId}`,
      )
    } catch (error) {
      console.error("Error continuing existing session:", error)
      setIsProcessing(false)
    }
  }

  const handleStartNewSession = () => {
    // Clear existing session and start new one
    sessionPersistence.clearSession()
    onResolve()
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)} hours ago`
    } else {
      return `${Math.floor(diffInMinutes / 1440)} days ago`
    }
  }

  return (
    <div className="space-y-6">
      {/* Warning Header */}
      <div className="text-center">
        <div className="bg-amber-100 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
          <AlertTriangle className="h-10 w-10 text-amber-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Active Session Detected</h2>
        <p className="text-slate-600">You have an active dining session at another table</p>
      </div>

      {/* Current vs Existing Session */}
      <div className="space-y-4">
        {/* Existing Session Card */}
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-blue-800">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Your Active Session
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                Active
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-blue-600 font-medium">Customer:</span>
                <div className="text-blue-800">{conflictSession.customerName}</div>
              </div>
              <div>
                <span className="text-blue-600 font-medium">Table:</span>
                <div className="text-blue-800">Table {conflictSession.tableId}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Clock className="h-4 w-4" />
              Last accessed {formatTimeAgo(conflictSession.lastAccessed)}
            </div>
          </CardContent>
        </Card>

        {/* Current Table Card */}
        <Card className="border-2 border-emerald-200 bg-emerald-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-emerald-800">
              <Users className="h-5 w-5" />
              Current QR Scan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-emerald-600 font-medium">Restaurant:</span>
                <div className="text-emerald-800">{currentTable.restaurantName}</div>
              </div>
              <div>
                <span className="text-emerald-600 font-medium">Table:</span>
                <div className="text-emerald-800">Table {currentTable.number}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button
          onClick={handleContinueExisting}
          disabled={isProcessing}
          className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
              Redirecting...
            </>
          ) : (
            <>
              <ArrowRight className="h-5 w-5 mr-2" />
              Continue Existing Session
            </>
          )}
        </Button>

        <Button
          onClick={handleStartNewSession}
          variant="outline"
          className="w-full h-12 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
        >
          Start New Session Here
        </Button>
      </div>

      {/* Info Note */}
      <div className="bg-slate-50 p-4 rounded-lg text-center">
        <p className="text-sm text-slate-600">
          💡 <strong>Tip:</strong> You can only have one active dining session at a time. Choose to continue your
          existing session or start fresh at this table.
        </p>
      </div>
    </div>
  )
}
