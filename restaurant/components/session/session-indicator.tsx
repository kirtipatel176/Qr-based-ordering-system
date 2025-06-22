"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Clock, MapPin } from "lucide-react"
import { useSessionPersistence } from "@/hooks/use-session-persistence"

export function SessionIndicator() {
  const { currentSession } = useSessionPersistence()
  const [timeAgo, setTimeAgo] = useState("")

  useEffect(() => {
    if (!currentSession) return

    const updateTimeAgo = () => {
      const lastAccessed = new Date(currentSession.lastAccessed)
      const now = new Date()
      const diffInMinutes = Math.floor((now.getTime() - lastAccessed.getTime()) / (1000 * 60))

      if (diffInMinutes < 1) {
        setTimeAgo("Just now")
      } else if (diffInMinutes < 60) {
        setTimeAgo(`${diffInMinutes}m ago`)
      } else if (diffInMinutes < 1440) {
        setTimeAgo(`${Math.floor(diffInMinutes / 60)}h ago`)
      } else {
        setTimeAgo(`${Math.floor(diffInMinutes / 1440)}d ago`)
      }
    }

    updateTimeAgo()
    const interval = setInterval(updateTimeAgo, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [currentSession])

  if (!currentSession) return null

  return (
    <div className="fixed top-4 right-4 z-50">
      <Badge variant="secondary" className="bg-blue-100 text-blue-700 px-3 py-2 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span className="text-xs">Table {currentSession.tableId}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span className="text-xs">{timeAgo}</span>
          </div>
        </div>
      </Badge>
    </div>
  )
}
