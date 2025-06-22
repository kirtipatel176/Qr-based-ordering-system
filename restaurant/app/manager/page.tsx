"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CounterPaymentManager } from "@/components/manager/counter-payment-manager"
import { DollarSign, Users, Receipt, Settings } from "lucide-react"

export default function ManagerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Manager Dashboard
          </h1>
          <p className="text-slate-600 mt-2">Manage payments, sessions, and restaurant operations</p>
        </div>

        <Tabs defaultValue="counter-payments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white/80 backdrop-blur-sm">
            <TabsTrigger
              value="counter-payments"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Counter Payments
            </TabsTrigger>
            <TabsTrigger
              value="active-sessions"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              <Users className="h-4 w-4 mr-2" />
              Active Sessions
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Receipt className="h-4 w-4 mr-2" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="counter-payments">
            <CounterPaymentManager />
          </TabsContent>

          <TabsContent value="active-sessions">
            <Card>
              <CardHeader>
                <CardTitle>Active Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Active sessions management coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Payment Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Payment reports and analytics coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Restaurant Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Restaurant configuration settings coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
