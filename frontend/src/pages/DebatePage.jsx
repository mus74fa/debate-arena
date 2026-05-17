import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import api from "../api"

const AGENT_COLORS = {
  "Optimist": "#fbbf24",
  "Skeptic": "#f87171",
  "Ethicist": "#c084fc",
  "Fact-Checker": "#60a5fa",
  "You": "#34d399"
}

function getSpeakerColor(speaker) {
  if (AGENT_COLORS[speaker]) return AGENT_COLORS[speaker]
  const palette = ["#fb923c", "#4ade80", "#38bdf8", "#e879f9", "#facc15", "#a3e635"]
  let hash = 0
  for (let i = 0; i < speaker.length; i++) hash = speaker.charCodeAt(i) + ((hash << 5) - hash)
  return palette[Math.abs(hash) % palette.length]
}

function getAvatar(speaker) {
  const avatars = { "Optimist": "🌟", "Skeptic": "🔍", "Ethicist": "⚖️", "Fact-Checker": "📊", "You": "💬" }
  return avatars[speaker] || "🎓"
}

export default function DebatePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const token = localStorage.getItem("token")
  const [topic, setTopic] = useState("")
  const [status, setStatus] = useState("loading")
  const [currentSpeaker, setCurrentSpeaker] = useState("")
  const [userInput, setUserInput] = useState("")
  const [participating, setParticipating] = useState(false)
  const [displayedMessages, setDisplayedMessages] = useState([])
  const [awaitingInput, setAwaitingInput] = useState(false)
  const [questionReply, setQuestionReply] = useState("")
  const [debaters, setDebaters] = useState([])
  const bottomRef = useRef(null)
  const wsRef = useRef(null)
  const animationQueue = useRef([])
  const isAnimating = useRef(false)

  useEffect(() => {
    loadDebate()
    return () => {
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null }
    }
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [displayedMessages])

  async function loadDebate() {
    try {
      const response = await api.get(`/api/debates/${id}`)
      const debate = response.data
      setTopic(debate.topic)
      const uniqueSpeakers = [...new Set((debate.messages || []).map(m => m.speaker).filter(s => s !== "You"))]
      setDebaters(uniqueSpeakers)
      if (debate.status === "completed") {
        setStatus("completed")
        setDisplayedMessages(debate.messages.map(m => ({
          speaker: m.speaker, content: m.content,
          avatar: getAvatar(m.speaker), displayed: m.content
        })))
      } else {
        setStatus("running")
        startWebSocket(debate.topic)
      }
    } catch (err) { console.error(err) }
  }

  function startWebSocket(debateTopic) {
    if (wsRef.current) wsRef.current.close()
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8002"
    const wsUrl = API_URL.replace("https://", "wss://").replace("http://", "ws://")
    const ws = new WebSocket(`${wsUrl}/api/debates/ws/${id}?token=${token}`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === "message") {
        setCurrentSpeaker(data.speaker)
        if (data.speaker !== "You") setDebaters(prev => prev.includes(data.speaker) ? prev : [...prev, data.speaker])
        animationQueue.current.push(data)
        if (!isAnimating.current) animateNext()
      } else if (data.type === "question") {
        setCurrentSpeaker(data.speaker)
        animationQueue.current.push({ ...data, isQuestion: true })
        if (!isAnimating.current) animateNext()
        setAwaitingInput(true)
      } else if (data.type === "done") {
        setStatus("completed"); setCurrentSpeaker(""); setAwaitingInput(false)
      } else if (data.type === "error") {
        setStatus("error")
      }
    }
    ws.onerror = () => setStatus("error")
    ws.onclose = () => { if (status !== "completed") setStatus("completed") }
  }

  function animateNext() {
    if (animationQueue.current.length === 0) { isAnimating.current = false; return }
    isAnimating.current = true
    const message = animationQueue.current.shift()
    const words = message.content.split(" ")
    let wordIndex = 0
    const msgId = Date.now() + Math.random()

    setDisplayedMessages(prev => [...prev, {
      id: msgId, speaker: message.speaker, avatar: message.avatar || getAvatar(message.speaker),
      content: message.content, displayed: "", isQuestion: message.isQuestion
    }])

    const interval = setInterval(() => {
      wordIndex++
      setDisplayedMessages(prev => prev.map(m =>
        m.id === msgId ? { ...m, displayed: words.slice(0, wordIndex).join(" ") } : m
      ))
      if (wordIndex >= words.length) { clearInterval(interval); setTimeout(animateNext, 250) }
    }, 30)
  }

  function sendQuestionReply() {
    if (!questionReply.trim() || !wsRef.current) return
    wsRef.current.send(JSON.stringify({ content: questionReply }))
    setQuestionReply(""); setAwaitingInput(false)
  }

  async function sendUserMessage() {
    if (!userInput.trim()) return
    setParticipating(true); setStatus("running")
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8002"
    const wsUrl = API_URL.replace("https://", "wss://").replace("http://", "ws://")
    const ws = new WebSocket(`${wsUrl}/api/debates/ws/${id}/continue?token=${token}`)
    ws.onopen = () => { ws.send(JSON.stringify({ content: userInput })); setUserInput("") }
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === "message") {
        setCurrentSpeaker(data.speaker)
        animationQueue.current.push(data)
        if (!isAnimating.current) animateNext()
      } else if (data.type === "done") {
        setStatus("completed"); setCurrentSpeaker(""); setParticipating(false)
      }
    }
    ws.onerror = () => { setStatus("completed"); setParticipating(false) }
  }

  const color = getSpeakerColor(currentSpeaker)

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a" }}>
      {/* Header */}
      <div style={{
        background: "#0f0f0f",
        borderBottom: "1px solid #1e1e1e",
        padding: "16px 24px",
        position: "sticky", top: "60px", zIndex: 50
      }}>
        <div style={{ maxWidth: "780px", margin: "0 auto" }}>
          <button
            onClick={() => navigate("/dashboard")}
            style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "13px", padding: 0, marginBottom: "8px", display: "flex", alignItems: "center", gap: "4px" }}
          >
            ← Back
          </button>
          <h1 style={{ color: "white", fontSize: "17px", fontWeight: "600", margin: "0 0 8px", lineHeight: "1.4" }}>
            {topic}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {status === "running" && currentSpeaker && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{
                  width: "7px", height: "7px", borderRadius: "50%",
                  background: color, display: "inline-block",
                  animation: "pulse-dot 1.2s ease-in-out infinite"
                }} />
                <span style={{ fontSize: "13px", color: "#888" }}>
                  <span style={{ color }}>{currentSpeaker}</span> is speaking
                </span>
              </div>
            )}
            {status === "running" && !currentSpeaker && (
              <span style={{ fontSize: "13px", color: "#555" }}>Starting debate...</span>
            )}
            {status === "completed" && (
              <span style={{ fontSize: "13px", color: "#22c55e" }}>✓ Debate complete</span>
            )}
            {status === "error" && (
              <span style={{ fontSize: "13px", color: "#f87171" }}>Something went wrong</span>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ maxWidth: "780px", margin: "0 auto", padding: "24px 24px 120px" }}>
        {displayedMessages.length === 0 && status === "running" && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>⚔️</div>
            <p style={{ color: "#555", fontSize: "14px" }}>The debate is starting...</p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {displayedMessages.map((msg, index) => {
            const msgColor = msg.isQuestion ? "#a78bfa" : getSpeakerColor(msg.speaker)
            const isUser = msg.speaker === "You"
            return (
              <div
                key={index}
                style={{
                  animation: "fade-in 0.2s ease-out",
                  display: "flex",
                  flexDirection: isUser ? "row-reverse" : "row",
                  gap: "10px",
                  alignItems: "flex-start"
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: "34px", height: "34px", borderRadius: "50%",
                  background: `${msgColor}22`,
                  border: `1.5px solid ${msgColor}55`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "16px", flexShrink: 0, marginTop: "2px"
                }}>
                  {msg.avatar}
                </div>

                {/* Bubble */}
                <div style={{ maxWidth: "82%", minWidth: 0 }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    marginBottom: "5px",
                    flexDirection: isUser ? "row-reverse" : "row"
                  }}>
                    <span style={{ color: msgColor, fontWeight: "600", fontSize: "12px" }}>
                      {msg.speaker}
                    </span>
                    {msg.isQuestion && (
                      <span style={{
                        fontSize: "10px", color: "#a78bfa",
                        background: "#a78bfa22", padding: "1px 7px",
                        borderRadius: "8px", fontWeight: "600"
                      }}>
                        asking you
                      </span>
                    )}
                  </div>
                  <div style={{
                    background: isUser ? "#6c63ff18" : msg.isQuestion ? "#a78bfa0f" : "#141414",
                    border: `1px solid ${isUser ? "#6c63ff33" : msg.isQuestion ? "#a78bfa33" : "#1e1e1e"}`,
                    borderRadius: isUser ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
                    padding: "12px 16px"
                  }}>
                    <p style={{ color: "#d1d5db", fontSize: "14px", lineHeight: "1.65", margin: 0 }}>
                      {msg.displayed}
                      {msg.displayed !== msg.content && (
                        <span style={{ opacity: 0.4, marginLeft: "2px" }}>▋</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div ref={bottomRef} />
      </div>

      {/* Bottom input area — fixed */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "rgba(10,10,10,0.95)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid #1e1e1e",
        padding: "16px 24px 20px",
        zIndex: 50
      }}>
        <div style={{ maxWidth: "780px", margin: "0 auto" }}>

          {/* Mid-debate question reply */}
          {awaitingInput && status === "running" ? (
            <div>
              <p style={{ color: "#a78bfa", fontSize: "11px", fontWeight: "600", letterSpacing: "1px", textTransform: "uppercase", margin: "0 0 8px" }}>
                💬 Your turn — reply or skip
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  placeholder="Type your response..."
                  value={questionReply}
                  onChange={e => setQuestionReply(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendQuestionReply()}
                  autoFocus
                  style={{
                    flex: 1, padding: "10px 14px",
                    background: "#141414", border: "1px solid #a78bfa44",
                    borderRadius: "8px", color: "white", fontSize: "14px", outline: "none"
                  }}
                />
                <button
                  onClick={sendQuestionReply}
                  disabled={!questionReply.trim()}
                  style={{
                    padding: "10px 18px",
                    background: questionReply.trim() ? "linear-gradient(135deg, #6c63ff, #a855f7)" : "#1e1e1e",
                    border: "none", borderRadius: "8px", color: questionReply.trim() ? "white" : "#555",
                    cursor: questionReply.trim() ? "pointer" : "not-allowed", fontWeight: "600", fontSize: "13px"
                  }}
                >
                  Reply
                </button>
                <button
                  onClick={() => { setAwaitingInput(false); wsRef.current?.send(JSON.stringify({ content: "" })) }}
                  style={{
                    padding: "10px 14px", background: "transparent",
                    border: "1px solid #2a2a2a", borderRadius: "8px",
                    color: "#555", cursor: "pointer", fontSize: "13px"
                  }}
                >
                  Skip
                </button>
              </div>
            </div>
          ) : status === "completed" && !participating ? (
            <div>
              {debaters.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                  {debaters.map(name => (
                    <button
                      key={name}
                      onClick={() => setUserInput(v => v.startsWith(`@${name}`) ? v : `@${name} `)}
                      style={{
                        padding: "3px 10px", background: "#141414",
                        border: `1px solid ${getSpeakerColor(name)}44`,
                        borderRadius: "12px", color: getSpeakerColor(name),
                        cursor: "pointer", fontSize: "11px", fontWeight: "500"
                      }}
                    >
                      @{name}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: "8px" }}>
                <textarea
                  placeholder="Join the debate... or @Name to address someone directly"
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  rows={2}
                  style={{
                    flex: 1, padding: "10px 14px",
                    background: "#141414", border: "1px solid #2a2a2a",
                    borderRadius: "8px", color: "white", fontSize: "14px",
                    resize: "none", outline: "none", fontFamily: "inherit"
                  }}
                />
                <button
                  onClick={sendUserMessage}
                  disabled={!userInput.trim()}
                  style={{
                    padding: "10px 20px",
                    background: userInput.trim() ? "linear-gradient(135deg, #6c63ff, #a855f7)" : "#1e1e1e",
                    border: "none", borderRadius: "8px",
                    color: userInput.trim() ? "white" : "#555",
                    cursor: userInput.trim() ? "pointer" : "not-allowed",
                    fontWeight: "600", fontSize: "13px", alignSelf: "flex-end"
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          ) : status === "running" ? (
            <p style={{ color: "#555", fontSize: "13px", textAlign: "center" }}>
              Debate in progress — the agents are thinking...
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
