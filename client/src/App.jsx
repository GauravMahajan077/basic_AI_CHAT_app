import React, { useState, useRef, useEffect } from "react";
import "./App.css"; // see styles below

export default function App() {
  const [messages, setMessages] = useState([
    // example initial user messages you showed
    // { role: "user", text: "hi" }, { role: "user", text: "hello" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    // auto scroll to bottom when messages change
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function extractAIText(data) {
    // universal extractor for variation in server response
    if (!data) return "";
    if (typeof data.text === "string" && data.text.trim()) return data.text;
    if (typeof data.response === "string" && data.response.trim()) return data.response;

    // Try common SDK shapes:
    const raw = data.raw || data;
    try {
      // modern google genai shape
      if (raw?.output?.[0]?.content?.[0]?.text) {
        return raw.output[0].content[0].text;
      }
      // candidate-based
      if (Array.isArray(raw?.candidates) && raw.candidates.length) {
        return raw.candidates.map(c => (c.output || c.text)).join("\n");
      }
      // fallback to stringified small portion
      const s = JSON.stringify(data);
      return s.length > 0 ? s.slice(0, 1000) : "";
    } catch (e) {
      return JSON.stringify(data).slice(0, 1000);
    }
  }

  async function sendMessage(userMessage) {
    if (!userMessage) return;
    // push user message immediately
    setMessages(prev => [...prev, { role: "user", text: userMessage }]);
    setInput("");
    setLoading(true);

    try {
      // Use full absolute URL to avoid proxy issues; adjust if you prefer proxy config
      const res = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!res.ok) {
        const errTxt = await res.text();
        console.error("Server error:", res.status, errTxt);
        setMessages(prev => [...prev, { role: "assistant", text: `Server error: ${res.status}` }]);
        setLoading(false);
        return;
      }

      const data = await res.json();
      console.log("server returned:", data); // open the console to see the raw shape
      const aiText = extractAIText(data);
      setMessages(prev => [...prev, { role: "assistant", text: aiText }]);
    } catch (err) {
      console.error("Fetch failed:", err);
      setMessages(prev => [...prev, { role: "assistant", text: "Network error — check server." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input.trim());
  }

  return (
    <div className="chat-root">
      <header className="chat-header">AI Chat Assistant BY GAURAV MAHAJAN</header>
      <div className="chat-window">
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role === "assistant" ? "left" : "right"}`}>
            {m.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          {loading ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}
