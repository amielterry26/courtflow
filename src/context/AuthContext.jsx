import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = loading

  useEffect(() => {
    // 6s timeout — if Supabase is blocked by the network, don't hang on white screen
    let resolved = false
    const timeout = setTimeout(() => {
      if (!resolved) setUser(null)
    }, 6000)

    supabase.auth.getSession().then(({ data }) => {
      resolved = true
      clearTimeout(timeout)
      setUser(data.session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => { clearTimeout(timeout); subscription.unsubscribe() }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading: user === undefined }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
