// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Verificar en tiempo de ejecución
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials missing:', {
      url: supabaseUrl ? '✅' : '❌',
      key: supabaseKey ? '✅' : '❌'
    })
    
    // En desarrollo, mostrar error más claro
    if (process.env.NODE_ENV === 'development') {
      throw new Error(
        '⚠️ Supabase credentials are missing!\n' +
        'Make sure you have a .env.local file with:\n' +
        'NEXT_PUBLIC_SUPABASE_URL=your-url\n' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key'
      )
    }
    
    // En producción, retornar un cliente mock
    return {
      auth: {
        signUp: async () => ({ 
          data: { user: null, session: null }, 
          error: { message: 'Configuration error' } 
        }),
        // ... otros métodos mock
      }
    } as any
  }

  return createBrowserClient(supabaseUrl, supabaseKey)
}