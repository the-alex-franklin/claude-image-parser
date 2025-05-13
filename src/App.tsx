import { useState } from "react";
import axios from "axios";
import type { APIResponse } from "../server.ts";

export default function App() {
  const [result, setResult] = useState<APIResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);

      const form = new FormData();
      form.append("file", file);

      const { data } = await axios.post<APIResponse>("http://localhost:8000/analyze", form);
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        maxHeight: "100%",
      }}
    >
      <h1>📄 Claude File Analyzer</h1>
      <input type="file" onChange={handleUpload} />
      {loading && <p>⏳ Processing...</p>}
      {result && !loading && (
        <pre style={{ whiteSpace: "pre-wrap", marginTop: "1rem" }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
