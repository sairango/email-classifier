"use client";

import { useEffect, useState } from "react";


const apiKey = typeof window !== "undefined" ? localStorage.getItem("USER_API_KEY") : null;

type EmailItem = {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  date?: string;
};

export default function EmailsPage() {
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classifying, setClassifying] = useState(false);
  const [classifications, setClassifications] = useState<Record<string, string>>({});

  // Fetch emails when page loads
  useEffect(() => {
    async function fetchEmails() {
      setLoading(true);
      try {
        const res = await fetch("http://localhost:5000/api/emails", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch emails");
        const data = await res.json();
        setEmails(data.emails || []);
      } catch (err) {
        setError("Failed to fetch emails.");
      } finally {
        setLoading(false);
      }
    }
    fetchEmails();
  }, []);

  // Handle Classify click
  async function handleClassify() {
    setClassifying(true);
    setError(null);

    try {
      const res = await fetch("http://localhost:5000/api/classify", {
        method: "POST",
        credentials: "include", // send session cookie
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ emails , apiKey}),
      });

      if (!res.ok) {
        setError(`Classification failed (${res.status})`);
        setClassifying(false);
        return;
      }

      const json = await res.json();
      setClassifications(json.classifications || {});
    } catch (err) {
      setError("Network error during classification.");
    } finally {
      setClassifying(false);
    }
  }

  if (loading) return <div className="p-6 text-center">Loading emails...</div>;
  if (error) return <div className="p-6 text-center text-red-600">{error}</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-black">Latest Emails</h1>

          <div className="flex gap-2">
            <button
              onClick={handleClassify}
              disabled={classifying}
              className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {classifying ? "Classifying..." : "Classify"}
            </button>
            <a
              href="http://localhost:5000/auth/logout"
              className="px-3 py-1 text-sm border rounded-md hover:bg-gray-100 text-black"
            >
              Logout
            </a>
          </div>
        </div>

        <ul className="space-y-4">
          {emails.map((e) => {
            const category = classifications[e.id];
            return (
              <li key={e.id} className="relative p-4 bg-white rounded-lg shadow">
                {/* Category badge */}
                {category && (
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium bg-indigo-600 text-white">
                    {category}
                  </div>
                )}
                <div className="text-sm text-gray-500">{e.from}</div>
                <div className="font-medium">{e.subject || "(no subject)"}</div>
                <div className="text-xs text-gray-600 mt-2">{e.snippet}</div>
                {e.date && (
                  <div className="text-xs text-gray-400 mt-2">{e.date}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
