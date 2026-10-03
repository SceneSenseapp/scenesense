"use client";
import { useState } from "react";
import Loading from "../../components/Loading";

export default function Analyze() {
  const [scene, setScene] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function analyzeScene() {
    setLoading(true);

    const res = await fetch("/api/analyze", {
      method: "POST",
      body: JSON.stringify({ scene })
    });

    const data = await res.json();
    setResult(data.reply);

    setLoading(false);
  }

  return (
    <main className="p-6 max-w-xl mx-auto fade">
      <h1 className="text-3xl font-bold mb-6 text-violet neon">
        Scene Analyzer
      </h1>

      <textarea
        className="w-full p-4 rounded-xl bg-midnight border border-violet/40"
        rows="6"
        placeholder="Describe the scene..."
        value={scene}
        onChange={e => setScene(e.target.value)}
      />

      <button
        onClick={analyzeScene}
        className="mt-4 px-6 py-3 bg-violet rounded-xl font-semibold"
      >
        Analyze
      </button>

      {loading && <Loading />}

      {result && (
        <div className="mt-6 p-4 bg-cyanpulse/20 rounded-xl whitespace-pre-line fade">
          {result}
        </div>
      )}
    </main>
  );
}
