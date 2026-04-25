"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

export default function LoginTest() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    setResult(null)
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    setResult({ 
      success: !error, 
      error: error?.message || null,
      user: data?.user?.email || null 
    })
    setLoading(false)
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Login Test</h1>
        
        <div className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </div>
        
        {result && (
          <div className={`mt-4 p-3 rounded text-sm ${result.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {result.success ? `✅ Success! Logged in as ${result.user}` : `❌ Error: ${result.error}`}
          </div>
        )}
      </div>
    </div>
  )
}
