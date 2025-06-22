import { createClient } from "@supabase/supabase-js"

// Client-side Supabase client (singleton pattern)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables. Please check your .env.local file.")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // We don't need user authentication for this app
  },
  realtime: {
    params: {
      eventsPerSecond: 10, // Limit real-time events for better performance
    },
  },
})

// Test connection function
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from("restaurants").select("count").limit(1)

    if (error) {
      console.error("Supabase connection error:", error)
      return { success: false, error: error.message }
    }

    console.log("✅ Supabase connection successful!")
    return { success: true, data }
  } catch (error) {
    console.error("Failed to connect to Supabase:", error)
    return { success: false, error: "Connection failed" }
  }
}
