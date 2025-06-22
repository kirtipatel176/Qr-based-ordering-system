import { supabase } from "@/lib/supabase"

export interface Customer {
  id: string
  name: string
  phone?: string
  email?: string
  loyalty_points: number
  total_visits: number
  total_spent: number
  created_at: string
}

export interface SessionInfo {
  customer?: Customer
  isReturning: boolean
  loyaltyPoints: number
  totalVisits: number
  recommendations?: string[]
}

class CustomerService {
  async checkCustomerStatus(phone: string, name: string): Promise<SessionInfo> {
    try {
      // Check if customer exists by phone
      const { data: existingCustomer, error } = await supabase.from("customers").select("*").eq("phone", phone).single()

      if (existingCustomer && !error) {
        // Update customer name if different
        if (existingCustomer.name !== name) {
          await supabase
            .from("customers")
            .update({ name, updated_at: new Date().toISOString() })
            .eq("id", existingCustomer.id)
        }

        return {
          customer: existingCustomer,
          isReturning: true,
          loyaltyPoints: existingCustomer.loyalty_points || 0,
          totalVisits: existingCustomer.total_visits || 0,
        }
      }

      // Create new customer
      const { data: newCustomer, error: createError } = await supabase
        .from("customers")
        .insert({
          name,
          phone,
          loyalty_points: 0,
          total_visits: 0,
          total_spent: 0,
        })
        .select()
        .single()

      if (createError) {
        console.error("Error creating customer:", createError)
        return {
          isReturning: false,
          loyaltyPoints: 0,
          totalVisits: 0,
        }
      }

      return {
        customer: newCustomer,
        isReturning: false,
        loyaltyPoints: 0,
        totalVisits: 0,
      }
    } catch (error) {
      console.error("Error checking customer status:", error)
      return {
        isReturning: false,
        loyaltyPoints: 0,
        totalVisits: 0,
      }
    }
  }

  async updateCustomerVisit(customerId: string, orderAmount: number): Promise<void> {
    try {
      // Calculate loyalty points (1 point per ₹10 spent)
      const loyaltyPointsEarned = Math.floor(orderAmount / 10)

      await supabase
        .from("customers")
        .update({
          total_visits: supabase.raw("total_visits + 1"),
          total_spent: supabase.raw(`total_spent + ${orderAmount}`),
          loyalty_points: supabase.raw(`loyalty_points + ${loyaltyPointsEarned}`),
          updated_at: new Date().toISOString(),
        })
        .eq("id", customerId)
    } catch (error) {
      console.error("Error updating customer visit:", error)
    }
  }

  async getCustomerRecommendations(customerId: string): Promise<string[]> {
    try {
      // Get customer's order history
      const { data: orders, error } = await supabase
        .from("orders")
        .select(`
          order_items (
            menu_items (name, category)
          )
        `)
        .eq("customer_id", customerId)
        .limit(10)

      if (error || !orders) return []

      // Extract frequently ordered categories
      const categoryCount: { [key: string]: number } = {}
      orders.forEach((order: any) => {
        order.order_items?.forEach((item: any) => {
          const category = item.menu_items?.category
          if (category) {
            categoryCount[category] = (categoryCount[category] || 0) + 1
          }
        })
      })

      // Return top categories as recommendations
      return Object.entries(categoryCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([category]) => category)
    } catch (error) {
      console.error("Error getting recommendations:", error)
      return []
    }
  }
}

export const customerService = new CustomerService()
