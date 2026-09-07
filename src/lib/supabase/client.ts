// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import { type SupabaseClient } from '@supabase/supabase-js'

// Define un tipo para las funciones mock
type MockSupabaseClient = {
  auth: {
    signUp: (params: any) => Promise<{ data: any; error: any }>
    signIn: (params: any) => Promise<{ data: any; error: any }>
    getUser: () => Promise<{ data: { user: null }; error: null }>
    getSession: () => Promise<{ data: { session: null }; error: null }>
  }
  from: (table: string) => any
  storage: {
    from: (bucket: string) => any
  }
}

export const createClient = (): SupabaseClient | MockSupabaseClient => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase credentials missing, using mock client')
    
    // Retornar un mock con tipos adecuados
    return {
      auth: {
        signUp: async () => ({ 
          data: { user: null, session: null }, 
          error: { message: 'Configuration error' } 
        }),
        signIn: async () => ({ 
          data: { user: null, session: null }, 
          error: { message: 'Configuration error' } 
        }),
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null })
          })
        }),
        insert: async () => ({ error: null }),
        update: () => ({
          eq: () => ({ error: null })
        }),
        delete: () => ({
          eq: () => ({ error: null })
        })
      }),
      storage: {
        from: () => ({
          upload: async () => ({ error: null }),
          getPublicUrl: () => ({ data: { publicUrl: '' } })
        })
      }
    } as MockSupabaseClient
  }

  return createBrowserClient(supabaseUrl, supabaseKey)
}