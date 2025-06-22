export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string
          name: string
          description: string | null
          logo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tables: {
        Row: {
          id: string
          restaurant_id: string
          table_number: string
          qr_code: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          table_number: string
          qr_code: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          table_number?: string
          qr_code?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      menu_categories: {
        Row: {
          id: string
          restaurant_id: string
          name: string
          description: string | null
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          name: string
          description?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          name?: string
          description?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      menu_items: {
        Row: {
          id: string
          restaurant_id: string
          category_id: string
          name: string
          description: string | null
          price: number
          image_url: string | null
          is_vegetarian: boolean
          is_vegan: boolean
          is_gluten_free: boolean
          spice_level: number
          customization_options: any[]
          is_available: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          category_id: string
          name: string
          description?: string | null
          price: number
          image_url?: string | null
          is_vegetarian?: boolean
          is_vegan?: boolean
          is_gluten_free?: boolean
          spice_level?: number
          customization_options?: any[]
          is_available?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          category_id?: string
          name?: string
          description?: string | null
          price?: number
          image_url?: string | null
          is_vegetarian?: boolean
          is_vegan?: boolean
          is_gluten_free?: boolean
          spice_level?: number
          customization_options?: any[]
          is_available?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      table_sessions: {
        Row: {
          id: string
          table_id: string
          session_token: string
          customer_name: string | null
          customer_phone: string | null
          payment_mode: string
          status: string
          total_amount: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          table_id: string
          session_token: string
          customer_name?: string | null
          customer_phone?: string | null
          payment_mode?: string
          status?: string
          total_amount?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          table_id?: string
          session_token?: string
          customer_name?: string | null
          customer_phone?: string | null
          payment_mode?: string
          status?: string
          total_amount?: number
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          session_id: string
          order_number: string
          customer_name: string | null
          items: any[]
          subtotal: number
          tax_amount: number
          service_charge: number
          total_amount: number
          status: string
          payment_status: string
          special_instructions: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          order_number: string
          customer_name?: string | null
          items: any[]
          subtotal: number
          tax_amount?: number
          service_charge?: number
          total_amount: number
          status?: string
          payment_status?: string
          special_instructions?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          order_number?: string
          customer_name?: string | null
          items?: any[]
          subtotal?: number
          tax_amount?: number
          service_charge?: number
          total_amount?: number
          status?: string
          payment_status?: string
          special_instructions?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          menu_item_id: string | null
          name: string
          price: number
          quantity: number
          customizations: any
          special_instructions: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          menu_item_id?: string | null
          name: string
          price: number
          quantity?: number
          customizations?: any
          special_instructions?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          menu_item_id?: string | null
          name?: string
          price?: number
          quantity?: number
          customizations?: any
          special_instructions?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
