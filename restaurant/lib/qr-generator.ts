export function generateQRCodeURL(tableId: string, restaurantId: string): string {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"
  const menuUrl = `${baseUrl}/scan/${restaurantId}/${tableId}`

  // Using QR Server API for QR code generation with better styling
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(menuUrl)}&color=000000&bgcolor=ffffff&margin=10&format=png`
}

export function generateSessionToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export function generateOrderNumber(): string {
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")
  return `ORD${timestamp}${random}`
}
