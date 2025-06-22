"use client"

import { useState, useEffect } from "react"
import { Download, Eye } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"

interface Payment {
  id: string
  transaction_id: string
  payment_method: string
  payment_provider: string
  amount: number
  payment_fee: number
  net_amount: number
  status: string
  created_at: string
  payment_data: any
  orders?: any
  table_sessions?: any
}

export function PaymentHistory() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)

  useEffect(() => {
    fetchPayments()
  }, [filter])

  const fetchPayments = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from("payments")
        .select(`
          *,
          orders(order_number, items),
          table_sessions(customer_name, tables(table_number))
        `)
        .order("created_at", { ascending: false })
        .limit(50)

      if (filter !== "all") {
        query = query.eq("payment_method", filter)
      }

      const { data, error } = await query

      if (error) {
        console.error("Error fetching payments:", error)
        return
      }

      setPayments(data || [])
    } catch (error) {
      console.error("Unexpected error fetching payments:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "failed":
        return "bg-red-100 text-red-800"
      case "refunded":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case "card":
        return "bg-blue-100 text-blue-800"
      case "upi":
        return "bg-purple-100 text-purple-800"
      case "wallet":
        return "bg-green-100 text-green-800"
      case "cash":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const exportPayments = () => {
    const csvContent = [
      ["Transaction ID", "Method", "Amount", "Fee", "Net Amount", "Status", "Date", "Customer", "Table"].join(","),
      ...payments.map((payment) =>
        [
          payment.transaction_id,
          payment.payment_method,
          payment.amount,
          payment.payment_fee,
          payment.net_amount,
          payment.status,
          new Date(payment.created_at).toLocaleDateString(),
          payment.table_sessions?.customer_name || "N/A",
          payment.table_sessions?.tables?.table_number || "N/A",
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `payments-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Payment History</h2>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="upi">UPI</SelectItem>
              <SelectItem value="wallet">Wallet</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportPayments}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Net Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-mono text-sm">{payment.transaction_id}</TableCell>
                  <TableCell>{payment.table_sessions?.customer_name || "Guest"}</TableCell>
                  <TableCell>{payment.table_sessions?.tables?.table_number || "N/A"}</TableCell>
                  <TableCell>
                    <Badge className={getMethodColor(payment.payment_method)}>
                      {payment.payment_method.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">${payment.amount.toFixed(2)}</TableCell>
                  <TableCell className="text-red-600">${payment.payment_fee.toFixed(2)}</TableCell>
                  <TableCell className="font-medium">${payment.net_amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(payment.status)}>{payment.status.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell>{new Date(payment.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setSelectedPayment(payment)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Payment Details</DialogTitle>
                        </DialogHeader>
                        {selectedPayment && <PaymentDetails payment={selectedPayment} />}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function PaymentDetails({ payment }: { payment: Payment }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold mb-2">Transaction Information</h4>
          <div className="space-y-1 text-sm">
            <p>
              <strong>Transaction ID:</strong> {payment.transaction_id}
            </p>
            <p>
              <strong>Payment Method:</strong> {payment.payment_method}
            </p>
            <p>
              <strong>Provider:</strong> {payment.payment_provider}
            </p>
            <p>
              <strong>Status:</strong> {payment.status}
            </p>
            <p>
              <strong>Date:</strong> {new Date(payment.created_at).toLocaleString()}
            </p>
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Amount Breakdown</h4>
          <div className="space-y-1 text-sm">
            <p>
              <strong>Gross Amount:</strong> ${payment.amount.toFixed(2)}
            </p>
            <p>
              <strong>Processing Fee:</strong> ${payment.payment_fee.toFixed(2)}
            </p>
            <p>
              <strong>Net Amount:</strong> ${payment.net_amount.toFixed(2)}
            </p>
            {payment.payment_data?.tip_amount && (
              <p>
                <strong>Tip:</strong> ${payment.payment_data.tip_amount.toFixed(2)}
              </p>
            )}
          </div>
        </div>
      </div>

      {payment.orders && (
        <div>
          <h4 className="font-semibold mb-2">Order Details</h4>
          <Card>
            <CardContent className="p-3">
              <p>
                <strong>Order:</strong> {payment.orders.order_number}
              </p>
              <p>
                <strong>Items:</strong> {payment.orders.items?.length || 0} items
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {payment.payment_data && (
        <div>
          <h4 className="font-semibold mb-2">Additional Details</h4>
          <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto">
            {JSON.stringify(payment.payment_data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
