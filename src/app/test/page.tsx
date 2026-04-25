import { supabase } from "@/lib/supabase"

export default async function TestPage() {
  const { data, error } = await supabase.from("projects").select("*").limit(1)
  
  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
        {error ? (
          <div className="bg-red-100 p-4 rounded-lg text-red-700 border border-red-200">
            <p className="font-bold">❌ Connection Failed</p>
            <p>{error.message}</p>
          </div>
        ) : (
          <div className="bg-green-100 p-4 rounded-lg text-green-700 border border-green-200">
            <p className="font-bold">✅ Connected Successfully!</p>
            <p>Found {data?.length || 0} projects in database.</p>
          </div>
        )}
      </div>
    </div>
  )
}
