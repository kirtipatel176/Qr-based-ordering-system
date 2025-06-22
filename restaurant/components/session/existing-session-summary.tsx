"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Clock, ShoppingBag, IndianRupee, ChefHat, CheckCircle, AlertCircle } from "lucide-react"
import { sessionManager } from "@/lib/session-manager"
import type { Order } from "@/lib/supabase"

interface ExistingSessionSummaryProps {
  sessionId: string
  onContinue: () => void
  onStartNew: () => void
}

interface SessionSummary {
  session: any
  orders: Order[]
  totalOrders: number
  totalAmount: number
}

export function ExistingSessionSummary({ sessionId, onContinue, onStartNew }: ExistingSessionSummaryProps) {
  const [summary, setSummary] = useState<SessionSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSessionSummary()
  }, [sessionId])

  const fetchSessionSummary = async () => {
    try {
      setLoading(true)
      const data = await sessionManager.getSessionSummary(sessionId)
      setSummary(data)
    } catch (error) {
      console.error("Error fetching session summary:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700 border-green-200"
      case "preparing":
        return "bg-yellow-100 text-yellow-700 border-yellow-200"
      case "confirmed":
        return "bg-blue-100 text-blue-700 border-blue-200"
      default:
        return "bg-slate-100 text-slate-700 border-slate-200"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4" />
      case "preparing":
        return <ChefHat className="h-4 w-4" />
      case "confirmed":
        return <Clock className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
        <p className="text-slate-600">Loading session details...</p>
      </div>
    )
  }

  if (!summary) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="text-center p-6">
          <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
          <p className="text-red-700">Unable to load session details</p>
          <Button onClick={onStartNew} className="mt-4">
            Start New Session
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Session Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500 p-2 rounded-full">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-blue-800">Active Session</h3>
                <p className="text-sm text-blue-600">Started {new Date(summary.session.created_at).toLocaleString()}</p>
              </div>
            </div>
            <Badge className="bg-blue-500 text-white">Table {summary.session.tables?.table_number}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-blue-700">
                <ShoppingBag className="h-5 w-5" />
                <span className="text-2xl font-bold">{summary.totalOrders}</span>
              </div>
              <p className="text-sm text-blue-600">Total Orders</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-blue-700">
                <IndianRupee className="h-5 w-5" />
                <span className="text-2xl font-bold">{summary.totalAmount}</span>
              </div>
              <p className="text-sm text-blue-600">Total Amount</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {summary.orders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-800">Previous Orders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {summary.orders.map((order, index) => (
              <div key={order.id}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      #{order.order_number}
                    </Badge>
                    <Badge className={getStatusColor(order.status)}>
                      {getStatusIcon(order.status)}
                      <span className="ml-1 capitalize">{order.status}</span>
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">₹{order.total_amount}</div>
                    <div className="text-xs text-slate-500">{new Date(order.created_at).toLocaleTimeString()}</div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="ml-4 space-y-1">
                  {order.items?.map((item: any, itemIndex: number) => (
                    <div key={itemIndex} className="flex justify-between text-sm text-slate-600">
                      <span>
                        {item.quantity}x {item.name}
                      </span>
                      <span>₹{item.total}</span>
                    </div>
                  ))}
                </div>

                {index < summary.orders.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 gap-3">
        <Button
          onClick={onContinue}
          className="h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
        >
          <Clock className="h-5 w-5 mr-2" />
          Continue This Session
        </Button>
        <Button
          onClick={onStartNew}
          variant="outline"
          className="h-12 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        >
          <ShoppingBag className="h-5 w-5 mr-2" />
          Start Fresh Session
        </Button>
      </div>
    </div>
  )
}
