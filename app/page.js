
"use client";
import { supabase } from "../lib/supabase";
import { useState, useRef, useEffect } from "react";
import "./globals.css";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    loadMessages();
  }, []);

  async function loadMessages() {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  }

  const messagesEndRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  async function sendMessage() {
    if (!message.trim()) return;

    const userMessage = {
      role: "user",
      content: message,
    };

    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setLoading(true);

    setMessage("");

    await supabase.from("messages").insert([
      {
        role: "user",
        content: message,
      },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages,
        }),
      });

      const data = await res.json();

      const aiMessage = {
        role: "assistant",
        content: data.reply,
      };

      await supabase.from("messages").insert([
        aiMessage,
      ]);

      setMessages([
        ...updatedMessages,

        aiMessage,

      ]);


    } catch (error) {
      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: "An error occurred while contacting ChatAAI.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // Press Enter to send
  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function clearChat() {
    await supabase
      .from("messages")
      .delete()
      .neq("id", 0);

    setMessages([]);
  }

  return (
    <main className="container">
      <div className="chat-box">
         <div className="header">
  <h1 className="title">ChatAAI</h1>

  <button onClick={clearChat} className="clear-btn">
    Clear Chat
  </button>
</div>
        <div className="messages">
          {messages.length === 0 && (
            <div className="welcome-message">
              <h2>Welcome to ChatAAI 👋</h2>
              <p>
                Ask me anything — research questions, business ideas,
                coding help, writing assistance, and more.
              </p>
            </div>
          )}

          {messages.map((msg, index) => (
            <div
              key={index}
              className={
                msg.role === "user"
                  ? "user-message"
                  : "ai-message"
              }
            >
              {msg.content.split("\n").map((line, i) => {
                if (line.startsWith("* ")) {
                  return (
                    <ul key={i}>
                      <li>{line.replace("* ", "")}</li>
                    </ul>
                  );
                }

                return <p key={i}>{line}</p>;
              })}

            </div>
          ))}

          {loading && (
            <div className="ai-message typing">
              <span></span>
              <span></span>
              <span></span>
            </div>
          )}

          <div ref={messagesEndRef}></div>
        </div>

        <div className="input-area">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask ChatAAI anything..."
            className="textarea"
          />

          <button
            onClick={sendMessage}
            className="button"
            disabled={loading}
          >
            {loading ? "Thinking..." : "Send"}
          </button>
        </div>
      </div>
    </main>
  );
}