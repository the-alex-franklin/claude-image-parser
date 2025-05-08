import { useState } from "react";

export default function App() {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        body: form,
      });

      const text = await res.text();
      setResult(text);
    } catch (err) {
      setResult("Failed to analyze file.");
      console.error(err);
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>📄 Claude File Analyzer</h1>
      <input type="file" onChange={handleUpload} />
      {loading && <p>⏳ Processing...</p>}
      <pre style={{ whiteSpace: "pre-wrap", marginTop: "1rem" }}>{result}</pre>
    </div>
  );
}
