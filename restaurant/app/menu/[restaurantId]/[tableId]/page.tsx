"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Search, ArrowLeft, User, Clock, LogOut } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { MenuItemCard } from "@/components/menu-item-card"
import { CartSidebar } from "@/components/cart-sidebar"
import { OrderTracker } from "@/components/order-tracker"
import { SessionClosureDialog } from "@/components/session/session-closure-dialog"
import {
  supabase,
  type MenuItem,
  type MenuCategory,
  type Restaurant,
  type Table,
  type TableSession,
  type Order,
} from "@/lib/supabase"
import { generateOrderNumber } from "@/lib/qr-generator"
import { EnhancedPaymentDialog } from "@/components/payment/enhanced-payment-dialog"
import { NotificationCenter } from "@/components/notifications/notification-center"
import { notificationService } from "@/lib/notifications"
import { sessionPersistence } from "@/lib/session-persistence"

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  customizations: any
  instructions: string
  total: number
  menuItemId: string
}

export default function MenuPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const restaurantId = params.restaurantId as string
  const tableId = params.tableId as string
  const sessionId = searchParams.get("session")

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [table, setTable] = useState<Table | null>(null)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([])
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [dietaryFilter, setDietaryFilter] = useState<string>("all")
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [session, setSession] = useState<TableSession | null>(null)
  const [paymentMode, setPaymentMode] = useState<"per_order" | "counter" | "final_bill">("final_bill")
  const [loading, setLoading] = useState(true)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<string | null>(null)
  const [showOrderTracker, setShowOrderTracker] = useState(false)
  const [showSessionClosure, setShowSessionClosure] = useState(false)

  useEffect(() => {
    if (restaurantId && tableId) {
      fetchData()
      if (sessionId) {
        fetchSession(sessionId)
      } else {
        window.location.href = `/scan/${restaurantId}/${tableId}`
      }
    }
  }, [restaurantId, tableId, sessionId])

  useEffect(() => {
    filterItems()
  }, [menuItems, searchQuery, selectedCategory, dietaryFilter])

  useEffect(() => {
    if (session) {
      fetchOrders()

      const orderSubscription = supabase
        .channel(`orders-${session.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `session_id=eq.${session.id}`,
          },
          () => {
            fetchOrders()
          },
        )
        .subscribe()

      return () => {
        orderSubscription.unsubscribe()
      }
    }
  }, [session])

  const fetchSession = async (sessionId: string) => {
    try {
      const { data: sessionData } = await supabase.from("table_sessions").select("*").eq("id", sessionId).single()

      if (sessionData) {
        setSession(sessionData)
        setPaymentMode(sessionData.payment_mode as any)
      }
    } catch (error) {
      console.error("Error fetching session:", error)
    }
  }

  const fetchOrders = async () => {
    if (!session) return

    try {
      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .eq("session_id", session.id)
        .order("created_at", { ascending: false })

      setOrders(ordersData || [])
    } catch (error) {
      console.error("Error fetching orders:", error)
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)

      const [restaurantResult, tableResult, categoriesResult, itemsResult] = await Promise.all([
        supabase.from("restaurants").select("*").eq("id", restaurantId).single(),
        supabase.from("tables").select("*").eq("id", tableId).single(),
        supabase
          .from("menu_categories")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("menu_items")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .eq("is_available", true)
          .order("sort_order"),
      ])

      if (restaurantResult.error) {
        console.error("Error fetching restaurant:", restaurantResult.error.message)
      } else {
        setRestaurant(restaurantResult.data)
      }

      if (tableResult.error) {
        console.error("Error fetching table:", tableResult.error.message)
      } else {
        setTable(tableResult.data)
      }

      if (categoriesResult.error) {
        console.error("Error fetching categories:", categoriesResult.error.message)
      } else {
        setCategories(categoriesResult.data || [])
      }

      if (itemsResult.error) {
        console.error("Error fetching menu items:", itemsResult.error.message)
      } else {
        setMenuItems(itemsResult.data || [])
      }
    } catch (error) {
      console.error("Unexpected error fetching menu data:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterItems = () => {
    let filtered = menuItems

    if (searchQuery) {
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter((item) => item.category_id === selectedCategory)
    }

    if (dietaryFilter !== "all") {
      switch (dietaryFilter) {
        case "vegetarian":
          filtered = filtered.filter((item) => item.is_vegetarian)
          break
        case "vegan":
          filtered = filtered.filter((item) => item.is_vegan)
          break
        case "gluten_free":
          filtered = filtered.filter((item) => item.is_gluten_free)
          break
      }
    }

    setFilteredItems(filtered)
  }

  const addToCart = (item: MenuItem, quantity: number, customizations: any, instructions: string) => {
    const cartItemId = `${item.id}-${Date.now()}`
    let itemPrice = item.price

    if (item.customization_options) {
      item.customization_options.forEach((option: any) => {
        if (customizations[option.name]) {
          itemPrice += option.price || 0
        }
      })
    }

    const cartItem: CartItem = {
      id: cartItemId,
      name: item.name,
      price: itemPrice,
      quantity,
      customizations,
      instructions,
      total: itemPrice * quantity,
      menuItemId: item.id,
    }

    setCartItems((prev) => [...prev, cartItem])
  }

  const updateCartQuantity = (id: string, quantity: number) => {
    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity, total: item.price * quantity } : item)),
    )
  }

  const removeFromCart = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id))
  }

  const placeOrder = async () => {
    if (!session || cartItems.length === 0) return

    try {
      const orderNumber = generateOrderNumber()
      const subtotal = cartItems.reduce((sum, item) => sum + item.total, 0)
      const taxAmount = subtotal * 0.1
      const serviceCharge = subtotal * 0.05
      const totalAmount = subtotal + taxAmount + serviceCharge

      const { data: order } = await supabase
        .from("orders")
        .insert({
          session_id: session.id,
          order_number: orderNumber,
          customer_name: session.customer_name,
          items: cartItems,
          subtotal,
          tax_amount: taxAmount,
          service_charge: serviceCharge,
          total_amount: totalAmount,
          status: "pending",
          payment_status: paymentMode === "per_order" ? "unpaid" : "unpaid",
        })
        .select()
        .single()

      if (order) {
        const orderItems = cartItems.map((item) => ({
          order_id: order.id,
          menu_item_id: item.menuItemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          customizations: item.customizations,
          special_instructions: item.instructions,
        }))

        await supabase.from("order_items").insert(orderItems)

        await notificationService.sendOrderNotification(session.id, order.id, "order_placed", orderNumber)

        await supabase
          .from("table_sessions")
          .update({
            total_amount: session.total_amount + totalAmount,
          })
          .eq("id", session.id)

        // Update session persistence
        sessionPersistence.updateLastAccessed({
          sessionId: session.id,
          tableId: tableId,
          restaurantId: restaurantId,
          customerName: session.customer_name || "Guest",
          customerPhone: session.customer_phone,
          sessionToken: session.session_token,
          createdAt: session.created_at,
          lastAccessed: new Date().toISOString(),
        })

        setCartItems([])
        setIsCartOpen(false)

        if (paymentMode === "per_order") {
          setSelectedOrderForPayment(order.id)
          setShowPaymentDialog(true)
        } else {
          alert(`Order #${orderNumber} placed successfully!`)
        }

        fetchOrders()
      }
    } catch (error) {
      console.error("Error placing order:", error)
      alert("Error placing order. Please try again.")
    }
  }

  const handlePaymentSuccess = (transactionId: string) => {
    alert(`Payment successful! Transaction ID: ${transactionId}`)
    setSelectedOrderForPayment(null)
    fetchOrders()
  }

  const handleSessionClose = () => {
    window.location.href = `/scan/${restaurantId}/${tableId}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading menu...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50">
        <Card className="w-full max-w-md mx-4 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="text-center p-8">
            <div className="text-6xl mb-4">🔄</div>
            <h2 className="text-xl font-semibold mb-2 text-slate-800">Redirecting...</h2>
            <p className="text-slate-600">Setting up your dining session...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const unpaidOrders = orders.filter((order) => order.payment_status === "unpaid")

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-emerald-100 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                  {restaurant?.name}
                </h1>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span>Table {table?.table_number}</span>
                  {session.customer_name && (
                    <>
                      <span>•</span>
                      <User className="h-3 w-3" />
                      <span>{session.customer_name}</span>
                    </>
                  )}
                  {session.session_type === "returning_customer" && (
                    <>
                      <span>•</span>
                      <span className="text-blue-600 font-medium">⭐ Returning Customer</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationCenter sessionId={session?.id} />
              {orders.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setShowOrderTracker(true)}>
                  <Clock className="h-4 w-4 mr-1" />
                  Orders ({orders.length})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSessionClosure(true)}
                className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Complete Bill
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search delicious food..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              <Button
                variant={dietaryFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setDietaryFilter("all")}
                className={dietaryFilter === "all" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
              >
                All
              </Button>
              <Button
                variant={dietaryFilter === "vegetarian" ? "default" : "outline"}
                size="sm"
                onClick={() => setDietaryFilter("vegetarian")}
                className={dietaryFilter === "vegetarian" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
              >
                🌱 Vegetarian
              </Button>
              <Button
                variant={dietaryFilter === "vegan" ? "default" : "outline"}
                size="sm"
                onClick={() => setDietaryFilter("vegan")}
                className={dietaryFilter === "vegan" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
              >
                🌿 Vegan
              </Button>
              <Button
                variant={dietaryFilter === "gluten_free" ? "default" : "outline"}
                size="sm"
                onClick={() => setDietaryFilter("gluten_free")}
                className={dietaryFilter === "gluten_free" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
              >
                🌾 Gluten Free
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Content */}
      <div className="container mx-auto px-4 py-6 pb-24">
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="grid w-full grid-cols-1 mb-6 h-auto bg-white/80 backdrop-blur-sm">
            <div className="flex overflow-x-auto gap-2 p-1">
              <TabsTrigger
                value="all"
                className="whitespace-nowrap data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
              >
                All Items
              </TabsTrigger>
              {categories.map((category) => (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="whitespace-nowrap data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
                >
                  {category.name}
                </TabsTrigger>
              ))}
            </div>
          </TabsList>

          <TabsContent value="all">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <MenuItemCard key={item.id} item={item} onAddToCart={addToCart} />
              ))}
            </div>
          </TabsContent>

          {categories.map((category) => (
            <TabsContent key={category.id} value={category.id}>
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-slate-800">{category.name}</h2>
                {category.description && <p className="text-slate-600">{category.description}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems
                  .filter((item) => item.category_id === category.id)
                  .map((item) => (
                    <MenuItemCard key={item.id} item={item} onAddToCart={addToCart} />
                  ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Cart Sidebar */}
      <CartSidebar
        items={cartItems}
        onUpdateQuantity={updateCartQuantity}
        onRemoveItem={removeFromCart}
        onPlaceOrder={placeOrder}
        isOpen={isCartOpen}
        onOpenChange={setIsCartOpen}
      />

      {/* Order Tracker */}
      <OrderTracker orders={orders} isOpen={showOrderTracker} onOpenChange={setShowOrderTracker} />

      {/* Enhanced Payment Dialog */}
      <EnhancedPaymentDialog
        isOpen={showPaymentDialog && !!selectedOrderForPayment}
        onOpenChange={(open) => {
          setShowPaymentDialog(open)
          if (!open) setSelectedOrderForPayment(null)
        }}
        orderId={selectedOrderForPayment || ""}
        sessionId={session?.id || ""}
        amount={orders.find((o) => o.id === selectedOrderForPayment)?.total_amount || 0}
        customerPhone={session?.customer_phone}
        restaurantId={restaurantId}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Session Closure Dialog */}
      <SessionClosureDialog
        isOpen={showSessionClosure}
        onOpenChange={setShowSessionClosure}
        sessionId={session.id}
        sessionData={{
          customer_name: session.customer_name || "Guest",
          total_amount: session.total_amount,
          table_number: table?.table_number || "",
          unpaid_orders: unpaidOrders.length,
          orders: orders,
        }}
        onSessionClosed={handleSessionClose}
      />
    </div>
  )
}
