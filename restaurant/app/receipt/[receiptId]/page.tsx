"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Download, Phone } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { supabase } from "@/lib/supabase"
import { paymentService } from "@/lib/payment"

export default function ReceiptPage() {
  const params = useParams()
  const receiptId = params.receiptId as string
  const [receipt, setReceipt] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReceipt()
  }, [receiptId])

  const fetchReceipt = async () => {
    try {
      const { data } = await supabase.from("receipts").select("*").eq("id", receiptId).single()

      setReceipt(data)
    } catch (error) {
      console.error("Error fetching receipt:", error)
    } finally {
      setLoading(false)
    }
  }

  const downloadReceipt = () => {
    window.print()
  }

  const sendSMS = async () => {
    const result = await paymentService.sendReceiptSMS(receiptId)
    if (result.success) {
      alert("Receipt sent to your phone!")
    } else {
      alert(result.error || "Failed to send SMS")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading receipt...</p>
        </div>
      </div>
    )
  }

  if (!receipt) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="text-center p-8">
            <div className="text-6xl mb-4">📄</div>
            <h2 className="text-xl font-semibold mb-2">Receipt Not Found</h2>
            <p className="text-muted-foreground">The requested receipt could not be found.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header Actions */}
          <div className="flex items-center justify-between mb-6 print:hidden">
            <h1 className="text-2xl font-bold">Receipt</h1>
            <div className="flex gap-2">
              {receipt.customer_phone && (
                <Button variant="outline" onClick={sendSMS}>
                  <Phone className="h-4 w-4 mr-2" />
                  Send SMS
                </Button>
              )}
              <Button variant="outline" onClick={downloadReceipt}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>

          {/* Receipt Card */}
          <Card className="print:shadow-none print:border-none">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{receipt.receipt_data?.restaurant_name}</CardTitle>
              <div className="text-sm text-muted-foreground">
                <p>Receipt #{receipt.receipt_number}</p>
                <p>{new Date(receipt.created_at).toLocaleString()}</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Customer:</strong> {receipt.receipt_data?.customer_name || "Guest"}
                </div>
                <div>
                  <strong>Table:</strong> {receipt.receipt_data?.table_number}
                </div>
                {receipt.customer_phone && (
                  <div className="col-span-2">
                    <strong>Phone:</strong> {receipt.customer_phone}
                  </div>
                )}
              </div>

              <Separator />

              {/* Items */}
              <div className="space-y-3">
                <h3 className="font-semibold">Order Items</h3>
                {receipt.items.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Qty: {item.quantity} × ${item.price.toFixed(2)}
                      </div>
                      {Object.keys(item.customizations || {}).length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {Object.entries(item.customizations)
                            .filter(([_, selected]) => selected)
                            .map(([name]) => name)
                            .join(", ")}
                        </div>
                      )}
                      {item.instructions && <div className="text-xs text-blue-600">Note: {item.instructions}</div>}
                    </div>
                    <div className="font-medium">${(item.price * item.quantity).toFixed(2)}</div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Payment Summary */}
              <div className="space-y-2">
                {receipt.payment_details?.orders?.map((order: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>
                      Order #{order.order_number} ({order.items} items)
                    </span>
                    <span>${order.amount.toFixed(2)}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total Paid</span>
                  <span>${receipt.total_amount.toFixed(2)}</span>
                </div>
              </div>

              <Separator />

              {/* Footer */}
              <div className="text-center text-sm text-muted-foreground">
                <p>Thank you for dining with us!</p>
                <p>Visit us again soon</p>
                <div className="mt-4">
                  <Badge variant="outline">Paid</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
