"use client"

import { QrCode, Smartphone, Wifi } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { generateQRCodeURL } from "@/lib/qr-generator"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"

interface QRCodeDisplayProps {
  tableId: string
  restaurantId: string
  tableNumber: string
  restaurantName?: string
}

export function QRCodeDisplay({ tableId, restaurantId, tableNumber, restaurantName }: QRCodeDisplayProps) {
  const qrCodeUrl = generateQRCodeURL(tableId, restaurantId)

  return (
    <Card className="w-full max-w-sm mx-auto shadow-lg">
      <CardHeader className="text-center pb-4">
        <CardTitle className="flex items-center justify-center gap-2 text-xl">
          <QrCode className="h-6 w-6 text-primary" />
          Table {tableNumber}
        </CardTitle>
        {restaurantName && <p className="text-sm text-muted-foreground font-medium">{restaurantName}</p>}
      </CardHeader>
      <CardContent className="text-center space-y-6">
        <div className="flex justify-center p-4 bg-white rounded-lg border-2 border-dashed border-gray-200">
          <Image
            src={qrCodeUrl || "/placeholder.svg"}
            alt={`QR Code for Table ${tableNumber}`}
            width={300}
            height={300}
            className="rounded-lg"
            priority
            unoptimized
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Smartphone className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Scan with your phone camera</span>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            <Badge variant="secondary" className="text-xs">
              <Wifi className="h-3 w-3 mr-1" />
              No App Required
            </Badge>
            <Badge variant="secondary" className="text-xs">
              📱 Mobile Friendly
            </Badge>
            <Badge variant="secondary" className="text-xs">
              🍽️ Order Directly
            </Badge>
          </div>

          <div className="text-xs text-muted-foreground bg-gray-50 p-3 rounded-lg">
            <p className="font-medium mb-1">How to order:</p>
            <ol className="text-left space-y-1">
              <li>1. Scan QR code with camera</li>
              <li>2. Enter your name</li>
              <li>3. Browse our digital menu</li>
              <li>4. Add items and place order</li>
            </ol>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
