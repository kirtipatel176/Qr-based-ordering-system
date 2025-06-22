import { createClient } from "@supabase/supabase-js"

// Server-side Supabase client (for admin operations)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase server environment variables")
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Admin functions for server-side operations
export async function createRestaurantData() {
  try {
    // This function can be used for initial setup or admin operations
    const { data, error } = await supabaseAdmin.from("restaurants").select("*").limit(1)

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error("Admin operation failed:", error)
    return { success: false, error }
  }
}
