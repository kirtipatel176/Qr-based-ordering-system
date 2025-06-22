"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { QrCode, Utensils, Users, Settings, BarChart3, Smartphone, ArrowRight } from "lucide-react"
import { QRCodeDisplay } from "@/components/qr-code-display"
import { ConnectionStatus } from "@/components/connection-status"
import { useSupabase } from "@/components/supabase-provider"
import Link from "next/link"

export default function HomePage() {
  const { supabaseClient, isConnected } = useSupabase()
  const [stats, setStats] = useState({
    totalTables: 0,
    activeSessions: 0,
    totalOrders: 0,
    totalRevenue: 0,
  })
  const [tables, setTables] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isConnected) {
      fetchData()
    }
  }, [isConnected])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch tables
      const { data: tablesData } = await supabaseClient
        .from("tables")
        .select(`
          *,
          restaurants(name)
        `)
        .eq("is_active", true)
        .order("table_number")

      setTables(tablesData || [])

      // Fetch stats
      const [sessionsResult, ordersResult] = await Promise.all([
        supabaseClient.from("table_sessions").select("id, total_amount").eq("status", "active"),
        supabaseClient.from("orders").select("id, total_amount"),
      ])

      setStats({
        totalTables: tablesData?.length || 0,
        activeSessions: sessionsResult.data?.length || 0,
        totalOrders: ordersResult.data?.length || 0,
        totalRevenue: ordersResult.data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0,
      })
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!isConnected) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50">
      <ConnectionStatus />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-full flex items-center justify-center mb-6 shadow-xl">
            <QrCode className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent mb-4">
            QR Restaurant System
          </h1>
          <p className="text-xl text-slate-600 mb-6">Complete QR-based restaurant ordering and management system</p>
          <Badge variant="outline" className="bg-white/80 border-emerald-200 text-emerald-700 px-4 py-2">
            <Utensils className="h-4 w-4 mr-2" />
            Delicious Bites Restaurant
          </Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
            <CardContent className="flex items-center p-6">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-700">Total Tables</h3>
                <p className="text-2xl font-bold text-slate-800">{stats.totalTables}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
            <CardContent className="flex items-center p-6">
              <div className="bg-green-100 p-3 rounded-full mr-4">
                <Smartphone className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-700">Active Sessions</h3>
                <p className="text-2xl font-bold text-slate-800">{stats.activeSessions}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
            <CardContent className="flex items-center p-6">
              <div className="bg-purple-100 p-3 rounded-full mr-4">
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-700">Total Orders</h3>
                <p className="text-2xl font-bold text-slate-800">{stats.totalOrders}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
            <CardContent className="flex items-center p-6">
              <div className="bg-orange-100 p-3 rounded-full mr-4">
                <Settings className="h-8 w-8 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-700">Revenue</h3>
                <p className="text-2xl font-bold text-slate-800">${stats.totalRevenue.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Link href="/admin">
            <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm hover:shadow-2xl transition-all duration-200 cursor-pointer group">
              <CardContent className="p-6 text-center">
                <div className="bg-emerald-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 group-hover:bg-emerald-200 transition-colors">
                  <Settings className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Admin Dashboard</h3>
                <p className="text-slate-600 mb-4">Manage menu, tables, and orders</p>
                <div className="flex items-center justify-center text-emerald-600 group-hover:text-emerald-700">
                  <span className="mr-2">Access Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/kitchen">
            <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm hover:shadow-2xl transition-all duration-200 cursor-pointer group">
              <CardContent className="p-6 text-center">
                <div className="bg-blue-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
                  <Utensils className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Kitchen Display</h3>
                <p className="text-slate-600 mb-4">View and manage incoming orders</p>
                <div className="flex items-center justify-center text-blue-600 group-hover:text-blue-700">
                  <span className="mr-2">Open Kitchen</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/counter">
            <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm hover:shadow-2xl transition-all duration-200 cursor-pointer group">
              <CardContent className="p-6 text-center">
                <div className="bg-purple-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 group-hover:bg-purple-200 transition-colors">
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Counter Display</h3>
                <p className="text-slate-600 mb-4">Manage payments and sessions</p>
                <div className="flex items-center justify-center text-purple-600 group-hover:text-purple-700">
                  <span className="mr-2">Open Counter</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* QR Codes Section */}
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm mb-8">
          <CardHeader>
            <CardTitle className="text-2xl text-center bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
              Table QR Codes
            </CardTitle>
            <p className="text-center text-slate-600">Scan these QR codes to test the customer experience</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                <p className="text-slate-600">Loading tables...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {tables.map((table) => (
                  <Card key={table.id} className="border border-slate-200">
                    <CardContent className="p-4 text-center">
                      <h3 className="font-semibold mb-2">Table {table.table_number}</h3>
                      <QRCodeDisplay
                        tableId={table.id}
                        restaurantId={table.restaurant_id}
                        tableNumber={table.table_number.toString()}
                      />
                      <div className="mt-4">
                        <Link
                          href={`/scan/${table.restaurant_id}/${table.id}`}
                          className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                        >
                          Test Customer Experience →
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Status */}
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg mb-2">System Status</h3>
                <p className="text-slate-600">All systems operational</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-600 font-medium">Online</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
