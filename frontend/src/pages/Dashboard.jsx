import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import api from "../api"

const STATUS_COLORS = { pending: "#f59e0b", running: "#6c63ff", completed: "#22c55e" }
const STATUS_LABELS = { pending: "Pending", running: "Live", completed: "Done" }

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [debates, setDebates] = useState([])
  const [hotTopic, setHotTopic] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [topic, setTopic] = useState("")
  const [rounds, setRounds] = useState(3)
  const [loading, setLoading] = useState(false)
  const [personas, setPersonas] = useState([])
  const [includeDefaults, setIncludeDefaults] = useState(true)
  const [selectedPersonaIds, setSelectedPersonaIds] = useState([])

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      const [debatesRes, hotRes, personasRes] = await Promise.all([
        api.get("/api/debates/"),
        api.get("/api/admin/hot-topic"),
        api.get("/api/personas/")
      ])
      setDebates(debatesRes.data)
      setHotTopic(hotRes.data.topic)
      setPersonas(personasRes.data)
    } catch (err) {
      console.error(err)
    }
  }

  async function startDebate() {
    if (!topic) return
    setLoading(true)
    try {
      const payload = { topic, rounds, persona_ids: selectedPersonaIds, include_defaults: includeDefaults }
      const response = await api.post("/api/debates/", payload)
      navigate(`/debate/${response.data.debate_id}`)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function deleteDebate(id) {
    try {
      await api.delete(`/api/debates/${id}`)
      setDebates(debates.filter(d => d.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  function openModal(prefillTopic = "") {
    setTopic(prefillTopic)
    setRounds(3)
    setIncludeDefaults(true)
    setSelectedPersonaIds([])
    setShowModal(true)
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* Hero welcome */}
        <div style={{
          background: "linear-gradient(135deg, #13101f 0%, #0f1629 100%)",
          border: "1px solid #6c63ff22",
          borderRadius: "16px",
          padding: "28px 32px",
          marginBottom: "24px",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute", right: "-40px", top: "-40px",
            width: "200px", height: "200px",
            background: "radial-gradient(circle, #6c63ff18 0%, transparent 70%)",
            pointerEvents: "none"
          }} />
          <p style={{ color: "#6c63ff", fontSize: "12px", fontWeight: "600", letterSpacing: "1.5px", textTransform: "uppercase", margin: "0 0 8px" }}>
            Welcome back
          </p>
          <h1 style={{ color: "white", fontSize: "26px", fontWeight: "700", margin: "0 0 20px", letterSpacing: "-0.5px" }}>
            {user?.username}
          </h1>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={() => openModal()}
              style={{
                padding: "10px 22px",
                background: "linear-gradient(135deg, #6c63ff, #a855f7)",
                border: "none", borderRadius: "10px",
                color: "white", fontWeight: "600", fontSize: "14px",
                cursor: "pointer"
              }}
            >
              + New Debate
            </button>
            <button
              onClick={() => navigate("/personas")}
              style={{
                padding: "10px 22px",
                background: "transparent",
                border: "1px solid #6c63ff44",
                borderRadius: "10px",
                color: "#a78bfa", fontWeight: "500", fontSize: "14px",
                cursor: "pointer"
              }}
            >
              🎓 Browse Personas
            </button>
          </div>
        </div>

        {/* Hot Topic */}
        {hotTopic && (
          <div style={{
            background: "#111",
            border: "1px solid #f59e0b33",
            borderRadius: "12px",
            padding: "18px 22px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "10px",
                background: "#f59e0b22",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "18px", flexShrink: 0
              }}>🔥</div>
              <div>
                <p style={{ color: "#f59e0b", fontSize: "10px", fontWeight: "700", letterSpacing: "1.5px", textTransform: "uppercase", margin: "0 0 3px" }}>
                  Hot Topic of the Day
                </p>
                <p style={{ color: "#e5e7eb", fontSize: "14px", fontWeight: "500", margin: 0 }}>{hotTopic}</p>
              </div>
            </div>
            <button
              onClick={() => openModal(hotTopic)}
              style={{
                padding: "8px 18px", background: "#f59e0b22",
                border: "1px solid #f59e0b44",
                borderRadius: "8px", color: "#f59e0b",
                cursor: "pointer", fontWeight: "600", fontSize: "13px",
                whiteSpace: "nowrap"
              }}
            >
              Debate This
            </button>
          </div>
        )}

        {/* Debates */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <h2 style={{ color: "white", fontSize: "16px", fontWeight: "600", margin: 0 }}>
            Your Debates
            {debates.length > 0 && (
              <span style={{ color: "#555", fontWeight: "400", fontSize: "14px", marginLeft: "8px" }}>
                {debates.length}
              </span>
            )}
          </h2>
        </div>

        {debates.length === 0 ? (
          <div style={{
            background: "#111", border: "1px solid #1e1e1e",
            borderRadius: "12px", padding: "60px 20px", textAlign: "center"
          }}>
            <p style={{ fontSize: "36px", margin: "0 0 12px" }}>⚔️</p>
            <p style={{ color: "#666", fontSize: "14px", margin: "0 0 20px" }}>No debates yet. Pick a topic and let the AI argue.</p>
            <button
              onClick={() => openModal()}
              style={{
                padding: "10px 22px",
                background: "linear-gradient(135deg, #6c63ff, #a855f7)",
                border: "none", borderRadius: "10px",
                color: "white", fontWeight: "600", fontSize: "13px", cursor: "pointer"
              }}
            >
              Start Your First Debate
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {debates.map(debate => (
              <div key={debate.id} style={{
                background: "#111",
                border: "1px solid #1e1e1e",
                borderRadius: "12px",
                padding: "16px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "16px",
                transition: "border-color 0.15s",
                cursor: "pointer"
              }}
                onClick={() => navigate(`/debate/${debate.id}`)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: "#e5e7eb", fontSize: "14px", fontWeight: "500", margin: "0 0 5px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {debate.topic}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{
                      fontSize: "11px", fontWeight: "600",
                      color: STATUS_COLORS[debate.status] || "#888",
                      background: `${STATUS_COLORS[debate.status] || "#888"}18`,
                      padding: "2px 8px", borderRadius: "6px"
                    }}>
                      {STATUS_LABELS[debate.status] || debate.status}
                    </span>
                    <span style={{ color: "#555", fontSize: "12px" }}>
                      {debate.rounds} rounds · {new Date(debate.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); deleteDebate(debate.id) }}
                  style={{
                    padding: "6px 12px", background: "transparent",
                    border: "1px solid #2a2a2a",
                    borderRadius: "7px", color: "#555",
                    cursor: "pointer", fontSize: "12px",
                    flexShrink: 0
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Debate Modal */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 500, padding: "1rem"
        }}>
          <div style={{
            background: "#111", border: "1px solid #2a2a2a",
            borderRadius: "16px", padding: "28px",
            width: "100%", maxWidth: "500px",
            maxHeight: "90vh", overflowY: "auto"
          }}>
            <h2 style={{ color: "white", fontSize: "18px", fontWeight: "700", margin: "0 0 6px" }}>Start a Debate</h2>
            <p style={{ color: "#555", fontSize: "13px", margin: "0 0 24px" }}>Enter a topic and pick who debates.</p>

            <label style={labelStyle}>TOPIC</label>
            <input
              placeholder="e.g. Should AI replace teachers?"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === "Enter" && startDebate()}
              style={{ ...inputStyle, marginBottom: "20px" }}
            />

            <label style={labelStyle}>ROUNDS — <span style={{ color: "white" }}>{rounds}</span></label>
            <input
              type="range" min="1" max="5" value={rounds}
              onChange={e => setRounds(parseInt(e.target.value))}
              style={{ width: "100%", marginBottom: "6px", accentColor: "#6c63ff" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
              {[1,2,3,4,5].map(n => (
                <span key={n} style={{ color: n === rounds ? "#a78bfa" : "#444", fontSize: "11px", fontWeight: n === rounds ? "700" : "400" }}>{n}</span>
              ))}
            </div>

            <label style={labelStyle}>DEBATERS</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "24px", maxHeight: "200px", overflowY: "auto" }}>
              <CheckRow
                checked={includeDefaults}
                onChange={e => setIncludeDefaults(e.target.checked)}
                icon="🤖"
                label="Default agents"
                sublabel="Optimist · Skeptic · Ethicist · Fact-Checker"
              />
              {personas.map(p => {
                const checked = selectedPersonaIds.includes(p.id)
                return (
                  <CheckRow
                    key={p.id}
                    checked={checked}
                    onChange={e => setSelectedPersonaIds(prev =>
                      e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id)
                    )}
                    icon={p.avatar}
                    label={p.name}
                    sublabel={p.title}
                  />
                )
              })}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1, padding: "12px",
                  background: "transparent", border: "1px solid #2a2a2a",
                  borderRadius: "10px", color: "#888", cursor: "pointer", fontSize: "14px"
                }}
              >
                Cancel
              </button>
              <button
                onClick={startDebate}
                disabled={loading || !topic.trim()}
                style={{
                  flex: 1, padding: "12px",
                  background: loading || !topic.trim() ? "#222" : "linear-gradient(135deg, #6c63ff, #a855f7)",
                  border: "none", borderRadius: "10px",
                  color: loading || !topic.trim() ? "#555" : "white",
                  cursor: loading || !topic.trim() ? "not-allowed" : "pointer",
                  fontSize: "14px", fontWeight: "600"
                }}
              >
                {loading ? "Starting..." : "Start Debate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CheckRow({ checked, onChange, icon, label, sublabel }) {
  return (
    <label style={{
      display: "flex", alignItems: "center", gap: "12px",
      padding: "10px 12px",
      background: checked ? "#6c63ff12" : "#0f0f0f",
      border: `1px solid ${checked ? "#6c63ff44" : "#2a2a2a"}`,
      borderRadius: "8px", cursor: "pointer",
      transition: "all 0.15s"
    }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ accentColor: "#6c63ff", flexShrink: 0 }} />
      <span style={{ fontSize: "18px" }}>{icon}</span>
      <div style={{ minWidth: 0 }}>
        <p style={{ color: "white", fontSize: "13px", fontWeight: "500", margin: 0 }}>{label}</p>
        {sublabel && <p style={{ color: "#555", fontSize: "11px", margin: 0 }}>{sublabel}</p>}
      </div>
    </label>
  )
}

const labelStyle = {
  color: "#555", fontSize: "11px", fontWeight: "600",
  letterSpacing: "1px", textTransform: "uppercase",
  display: "block", marginBottom: "8px"
}

const inputStyle = {
  width: "100%", padding: "11px 14px",
  background: "#0f0f0f", border: "1px solid #2a2a2a",
  borderRadius: "8px", color: "white", fontSize: "14px"
}
