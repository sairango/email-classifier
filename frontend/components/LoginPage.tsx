"use client"

import { useEffect, useState } from "react"

export default function LoginPage() {

    function handleGoogleLogin() {
        window.location.href = "http://localhost:5000/auth/google";  
    };

  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // load existing API key from localStorage (if any)
    try {
      const k = localStorage.getItem("USER_API_KEY") || "";
      setApiKey(k);
    } catch (e) {
      // ignore in environments where localStorage is unavailable
    }
  }, []);

  function handleSaveKey() {
    try {
      localStorage.setItem("USER_API_KEY", apiKey);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      console.error(e);
    }
  }

    return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white p-6">
      <div className="w-full max-w-md p-8 rounded-2xl shadow-lg bg-white/80 backdrop-blur">
        <h1 className="text-2xl font-semibold text-center mb-6 text-black" >Welcome</h1>

        {/* Login with Google button */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-md border bg-white/90 hover:bg-white text-black font-medium hover:shadow-md transition"
        >
          <span className="font-medium text-black">Login with Google</span>
          </button>
          
        <div className="mt-6">
          <label className="block text-sm font-medium mb-2 text-black">LLM API Key</label>
          <div className="flex gap-2">
            <input
  type="password"
  value={apiKey}
  onChange={(e) => setApiKey(e.target.value)}
  placeholder="Enter your Gemini/OpenAI API key"
  className="flex-1 px-3 py-2 border rounded-md outline-none focus:ring-2 focus:ring-sky-300 bg-white text-black placeholder-gray-400"
/>
            <button
              onClick={handleSaveKey}
              className="px-4 py-2 rounded-md bg-sky-600 text-white hover:bg-sky-700 transition"
            >
              Save
            </button>
          </div>
          {saved && <p className="mt-2 text-sm text-green-600">API key saved in localStorage.</p>}
        </div>

        
        
      </div>
    </main>
  );

};