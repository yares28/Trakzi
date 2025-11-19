"use client"

import React, { createContext, useContext, useState } from "react"

interface User {
  email: string
  name: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, password: string, name: string) => Promise<boolean>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  const login = async (email: string, password: string) => {
    // Basic mock authentication - no actual storage
    // In a real app, you'd validate against a backend
    if (email && password.length >= 6) {
      setUser({ email, name: email.split("@")[0] })
      return true
    }
    return false
  }

  const register = async (email: string, password: string, name: string) => {
    // Basic mock registration - no actual storage
    if (email && password.length >= 6 && name) {
      setUser({ email, name })
      return true
    }
    return false
  }

  const logout = () => {
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}





