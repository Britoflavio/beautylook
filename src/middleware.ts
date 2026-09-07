/* eslint-disable @typescript-eslint/no-explicit-any */
// middleware.ts

import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  try {
    // Verificar variables de entorno
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('Missing Supabase env variables in middleware')
      return response
    }

    // Crear cliente de Supabase para manejar sesiones
    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            // Actualizar request cookies
            request.cookies.set(name, value)
            
            // Crear nueva respuesta con las cookies actualizadas
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            
            // Establecer cookie en la respuesta
            if (options) {
              response.cookies.set({
                name,
                value,
                ...options,
              })
            } else {
              response.cookies.set(name, value)
            }
          },
          remove(name: string, options: CookieOptions) {
            // Eliminar cookie de la respuesta
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value: '',
              ...options,
              maxAge: 0,
            })
          },
        },
      }
    )

    // Obtener sesión
    const { data: { session } } = await supabase.auth.getSession()

    // Rutas protegidas
    const protectedRoutes = ['/dashboard', '/profile', '/settings']
    const isProtectedRoute = protectedRoutes.some(route => 
      request.nextUrl.pathname.startsWith(route)
    )

    // Rutas de autenticación (públicas)
    const authRoutes = ['/signin', '/signup', '/forgot-password']
    const isAuthRoute = authRoutes.some(route => 
      request.nextUrl.pathname.startsWith(route)
    )

    // Redireccionar si está autenticado y va a login
    if (session && isAuthRoute) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Redireccionar si no está autenticado y va a ruta protegida
    if (!session && isProtectedRoute) {
      return NextResponse.redirect(new URL('/signin', request.url))
    }

    return response
  } catch (error) {
    console.error('Middleware error:', error)
    // Continuar sin autenticación en caso de error
    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}