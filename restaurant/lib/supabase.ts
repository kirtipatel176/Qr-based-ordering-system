import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database-types"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check your .env.local file.\n" +
      "Required: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
  )
}

// Create optimized Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // We don't need user authentication for this app
    autoRefreshToken: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10, // Limit real-time events for better performance
    },
  },
  global: {
    headers: {
      "x-application-name": "qr-restaurant-system",
    },
  },
})

// Test connection function
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from("restaurants").select("id, name").limit(1)

    if (error) {
      console.error("❌ Supabase connection error:", error.message)
      return { success: false, error: error.message }
    }

    console.log("✅ Supabase connection successful!")
    return { success: true, data }
  } catch (error) {
    console.error("❌ Failed to connect to Supabase:", error)
    return { success: false, error: "Connection failed" }
  }
}

// Type-safe interfaces
export type Restaurant = Database["public"]["Tables"]["restaurants"]["Row"]
export type Table = Database["public"]["Tables"]["tables"]["Row"]
export type MenuCategory = Database["public"]["Tables"]["menu_categories"]["Row"]
export type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"]
export type TableSession = Database["public"]["Tables"]["table_sessions"]["Row"]
export type Order = Database["public"]["Tables"]["orders"]["Row"]
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"]

// Insert types
export type RestaurantInsert = Database["public"]["Tables"]["restaurants"]["Insert"]
export type TableInsert = Database["public"]["Tables"]["tables"]["Insert"]
export type MenuCategoryInsert = Database["public"]["Tables"]["menu_categories"]["Insert"]
export type MenuItemInsert = Database["public"]["Tables"]["menu_items"]["Insert"]
export type TableSessionInsert = Database["public"]["Tables"]["table_sessions"]["Insert"]
export type OrderInsert = Database["public"]["Tables"]["orders"]["Insert"]
export type OrderItemInsert = Database["public"]["Tables"]["order_items"]["Insert"]

// Update types
export type RestaurantUpdate = Database["public"]["Tables"]["restaurants"]["Update"]
export type TableUpdate = Database["public"]["Tables"]["tables"]["Update"]
export type MenuCategoryUpdate = Database["public"]["Tables"]["menu_categories"]["Update"]
export type MenuItemUpdate = Database["public"]["Tables"]["menu_items"]["Update"]
export type TableSessionUpdate = Database["public"]["Tables"]["table_sessions"]["Update"]
export type OrderUpdate = Database["public"]["Tables"]["orders"]["Update"]
export type OrderItemUpdate = Database["public"]["Tables"]["order_items"]["Update"]

// Helper functions for common operations
export const restaurantService = {
  async getAll() {
    const { data, error } = await supabase.from("restaurants").select("*").order("created_at", { ascending: false })

    if (error) throw error
    return data
  },

  async getById(id: string) {
    const { data, error } = await supabase.from("restaurants").select("*").eq("id", id).single()

    if (error) throw error
    return data
  },

  async create(restaurant: RestaurantInsert) {
    const { data, error } = await supabase.from("restaurants").insert(restaurant).select().single()

    if (error) throw error
    return data
  },

  async update(id: string, updates: RestaurantUpdate) {
    const { data, error } = await supabase.from("restaurants").update(updates).eq("id", id).select().single()

    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase.from("restaurants").delete().eq("id", id)

    if (error) throw error
  },
}

export const tableService = {
  async getByRestaurant(restaurantId: string) {
    const { data, error } = await supabase
      .from("tables")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .order("table_number")

    if (error) throw error
    return data
  },

  async getById(id: string) {
    const { data, error } = await supabase.from("tables").select("*").eq("id", id).single()

    if (error) throw error
    return data
  },

  async create(table: TableInsert) {
    const { data, error } = await supabase.from("tables").insert(table).select().single()

    if (error) throw error
    return data
  },
}

export const menuService = {
  async getCategories(restaurantId: string) {
    const { data, error } = await supabase
      .from("menu_categories")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .order("sort_order")

    if (error) throw error
    return data
  },

  async getItems(restaurantId: string) {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("is_available", true)
      .order("sort_order")

    if (error) throw error
    return data
  },

  async createCategory(category: MenuCategoryInsert) {
    const { data, error } = await supabase.from("menu_categories").insert(category).select().single()

    if (error) throw error
    return data
  },

  async createItem(item: MenuItemInsert) {
    const { data, error } = await supabase.from("menu_items").insert(item).select().single()

    if (error) throw error
    return data
  },
}

export const orderService = {
  async create(order: OrderInsert) {
    const { data, error } = await supabase.from("orders").insert(order).select().single()

    if (error) throw error
    return data
  },

  async getBySession(sessionId: string) {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })

    if (error) throw error
    return data
  },

  async updateStatus(orderId: string, status: string) {
    const { data, error } = await supabase
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getKitchenOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        table_sessions!inner(
          table_id,
          tables!inner(table_number)
        )
      `)
      .in("status", ["pending", "confirmed", "preparing"])
      .order("created_at", { ascending: true })

    if (error) throw error
    return data
  },
}

export const sessionService = {
  async create(session: TableSessionInsert) {
    const { data, error } = await supabase.from("table_sessions").insert(session).select().single()

    if (error) throw error
    return data
  },

  async getById(id: string) {
    const { data, error } = await supabase.from("table_sessions").select("*").eq("id", id).single()

    if (error) throw error
    return data
  },

  async getActiveByTable(tableId: string) {
    const { data, error } = await supabase
      .from("table_sessions")
      .select("*")
      .eq("table_id", tableId)
      .eq("status", "active")
      .single()

    if (error && error.code !== "PGRST116") throw error // PGRST116 is "not found"
    return data
  },

  async update(id: string, updates: TableSessionUpdate) {
    const { data, error } = await supabase.from("table_sessions").update(updates).eq("id", id).select().single()

    if (error) throw error
    return data
  },
}
