import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import api from "../api"

const EMOJI_OPTIONS = ["🎓", "🧑‍🏫", "👨‍🔬", "👩‍🔬", "🧑‍⚖️", "👨‍💼", "👩‍💼", "🧠", "📚", "🔬", "⚗️", "🏛️", "✍️", "🎤", "🗣️"]

export default function Personas() {
  const navigate = useNavigate()
  const [personas, setPersonas] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDebateModal, setShowDebateModal] = useState(false)
  const [selectedPersona, setSelectedPersona] = useState(null)
  const [loading, setLoading] = useState(false)
  const [debateTopic, setDebateTopic] = useState("")
  const [debateRounds, setDebateRounds] = useState(3)
  const [startingDebate, setStartingDebate] = useState(false)
  const [includeDefaults, setIncludeDefaults] = useState(false)
  const [extraPersonaIds, setExtraPersonaIds] = useState([])
  const [form, setForm] = useState({ name: "", title: "", personality: "", debating_style: "", expertise: "", avatar: "🎓" })
  const [formError, setFormError] = useState("")

  useEffect(() => { fetchPersonas() }, [])

  async function fetchPersonas() {
    try {
      const res = await api.get("/api/personas/")
      setPersonas(res.data)
    } catch (err) { console.error(err) }
  }

  function openDebateWith(persona) {
    setSelectedPersona(persona)
    setDebateTopic(""); setDebateRounds(3)
    setIncludeDefaults(false); setExtraPersonaIds([])
    setShowDebateModal(true)
  }

  async function startDebate() {
    if (!debateTopic.trim()) return
    setStartingDebate(true)
    const allPersonaIds = [selectedPersona.id, ...extraPersonaIds.filter(id => id !== selectedPersona.id)]
    try {
      const res = await api.post("/api/debates/", {
        topic: debateTopic, rounds: debateRounds,
        persona_ids: allPersonaIds, include_defaults: includeDefaults
      })
      navigate(`/debate/${res.data.debate_id}`)
    } catch (err) { console.error(err) } finally { setStartingDebate(false) }
  }

  async function submitCreate() {
    setFormError("")
    if (!form.name.trim() || !form.personality.trim() || !form.debating_style.trim() || !form.expertise.trim()) {
      setFormError("Please fill in all required fields."); return
    }
    setLoading(true)
    try {
      await api.post("/api/personas/", form)
      setShowCreateModal(false)
      setForm({ name: "", title: "", personality: "", debating_style: "", expertise: "", avatar: "🎓" })
      fetchPersonas()
    } catch (err) {
      setFormError(err.response?.data?.detail || "Failed to create persona.")
    } finally { setLoading(false) }
  }

  async function deletePersona(id) {
    try {
      await api.delete(`/api/personas/${id}`)
      setPersonas(personas.filter(p => p.id !== id))
    } catch (err) { console.error(err) }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #13101f 0%, #0f1629 100%)",
          border: "1px solid #6c63ff22", borderRadius: "16px",
          padding: "28px 32px", marginBottom: "28px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: "20px", flexWrap: "wrap"
        }}>
          <div>
            <p style={{ color: "#6c63ff", fontSize: "11px", fontWeight: "700", letterSpacing: "1.5px", textTransform: "uppercase", margin: "0 0 6px" }}>
              AI Personas
            </p>
            <h1 style={{ color: "white", fontSize: "24px", fontWeight: "700", margin: "0 0 6px", letterSpacing: "-0.5px" }}>
              Custom Debaters
            </h1>
            <p style={{ color: "#555", fontSize: "14px", margin: 0 }}>
              Build an AI that argues exactly like a real person.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: "11px 22px",
              background: "linear-gradient(135deg, #6c63ff, #a855f7)",
              border: "none", borderRadius: "10px",
              color: "white", fontWeight: "600", fontSize: "14px",
              cursor: "pointer", whiteSpace: "nowrap"
            }}
          >
            + Create Persona
          </button>
        </div>

        {personas.length === 0 ? (
          <div style={{
            background: "#111", border: "1px solid #1e1e1e",
            borderRadius: "16px", padding: "80px 20px", textAlign: "center"
          }}>
            <p style={{ fontSize: "48px", margin: "0 0 16px" }}>🎓</p>
            <p style={{ color: "#e5e7eb", fontSize: "17px", fontWeight: "600", margin: "0 0 8px" }}>No personas yet</p>
            <p style={{ color: "#555", fontSize: "14px", margin: "0 0 24px" }}>
              Create the first one — describe any professor, expert, or thinker.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: "10px 22px",
                background: "linear-gradient(135deg, #6c63ff, #a855f7)",
                border: "none", borderRadius: "10px",
                color: "white", fontWeight: "600", fontSize: "13px", cursor: "pointer"
              }}
            >
              Create Persona
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
            {personas.map(persona => (
              <PersonaCard
                key={persona.id}
                persona={persona}
                onDebate={() => openDebateWith(persona)}
                onDelete={() => deletePersona(persona.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <Modal onClose={() => { setShowCreateModal(false); setFormError("") }}>
          <h2 style={{ color: "white", fontSize: "18px", fontWeight: "700", margin: "0 0 4px" }}>Create Persona</h2>
          <p style={{ color: "#555", fontSize: "13px", margin: "0 0 24px" }}>
            Describe a person's style and the AI will debate exactly like them.
          </p>

          <p style={labelStyle}>Avatar</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "20px" }}>
            {EMOJI_OPTIONS.map(emoji => (
              <button key={emoji} onClick={() => setForm({ ...form, avatar: emoji })} style={{
                fontSize: "20px", padding: "6px 9px", borderRadius: "8px", cursor: "pointer",
                border: form.avatar === emoji ? "2px solid #6c63ff" : "2px solid #2a2a2a",
                background: form.avatar === emoji ? "#6c63ff18" : "#141414"
              }}>
                {emoji}
              </button>
            ))}
          </div>

          <FormField label="Name *" placeholder="e.g. Professor Smith" value={form.name} onChange={v => setForm({ ...form, name: v })} />
          <FormField label="Title / Role" placeholder="e.g. Professor of Behavioral Economics" value={form.title} onChange={v => setForm({ ...form, title: v })} />
          <FormField label="Personality *" placeholder="e.g. Socratic, patient, loves asking questions before making points" value={form.personality} onChange={v => setForm({ ...form, personality: v })} multiline />
          <FormField label="Debating Style *" placeholder="e.g. Data-driven, uses historical cases, steelmans opposing views before rebutting" value={form.debating_style} onChange={v => setForm({ ...form, debating_style: v })} multiline />
          <FormField label="Field of Expertise *" placeholder="e.g. Behavioral economics, cognitive biases, and public policy" value={form.expertise} onChange={v => setForm({ ...form, expertise: v })} multiline />

          {formError && <p style={{ color: "#f87171", fontSize: "13px", margin: "-8px 0 16px" }}>{formError}</p>}

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => { setShowCreateModal(false); setFormError("") }}
              style={{ flex: 1, padding: "12px", background: "transparent", border: "1px solid #2a2a2a", borderRadius: "10px", color: "#888", cursor: "pointer", fontSize: "14px" }}
            >
              Cancel
            </button>
            <button
              onClick={submitCreate} disabled={loading}
              style={{
                flex: 1, padding: "12px",
                background: loading ? "#222" : "linear-gradient(135deg, #6c63ff, #a855f7)",
                border: "none", borderRadius: "10px",
                color: loading ? "#555" : "white",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "14px", fontWeight: "600"
              }}
            >
              {loading ? "Creating..." : "Create Persona"}
            </button>
          </div>
        </Modal>
      )}

      {/* Debate Modal */}
      {showDebateModal && selectedPersona && (
        <Modal onClose={() => setShowDebateModal(false)}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
            <div style={{
              width: "52px", height: "52px", borderRadius: "14px",
              background: "#6c63ff18", border: "1px solid #6c63ff33",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px"
            }}>
              {selectedPersona.avatar}
            </div>
            <div>
              <p style={{ color: "white", fontSize: "16px", fontWeight: "700", margin: "0 0 2px" }}>{selectedPersona.name}</p>
              {selectedPersona.title && <p style={{ color: "#6c63ff", fontSize: "12px", margin: 0 }}>{selectedPersona.title}</p>}
            </div>
          </div>

          <FormField label="Debate Topic" placeholder="e.g. Should universities be free?" value={debateTopic} onChange={setDebateTopic} />

          <p style={labelStyle}>Rounds — <span style={{ color: "white" }}>{debateRounds}</span></p>
          <input type="range" min="1" max="5" value={debateRounds}
            onChange={e => setDebateRounds(parseInt(e.target.value))}
            style={{ width: "100%", marginBottom: "20px", accentColor: "#6c63ff" }} />

          {(personas.length > 1) && (
            <div style={{ marginBottom: "20px" }}>
              <p style={labelStyle}>Also add to this debate</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "160px", overflowY: "auto" }}>
                <CheckRow checked={includeDefaults} onChange={e => setIncludeDefaults(e.target.checked)} icon="🤖" label="Default agents" sublabel="Optimist · Skeptic · Ethicist · Fact-Checker" />
                {personas.filter(p => p.id !== selectedPersona.id).map(p => {
                  const checked = extraPersonaIds.includes(p.id)
                  return (
                    <CheckRow key={p.id} checked={checked}
                      onChange={e => setExtraPersonaIds(prev => e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id))}
                      icon={p.avatar} label={p.name} sublabel={p.title} />
                  )
                })}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => setShowDebateModal(false)}
              style={{ flex: 1, padding: "12px", background: "transparent", border: "1px solid #2a2a2a", borderRadius: "10px", color: "#888", cursor: "pointer", fontSize: "14px" }}>
              Cancel
            </button>
            <button onClick={startDebate} disabled={startingDebate || !debateTopic.trim()}
              style={{
                flex: 1, padding: "12px",
                background: startingDebate || !debateTopic.trim() ? "#222" : "linear-gradient(135deg, #6c63ff, #a855f7)",
                border: "none", borderRadius: "10px",
                color: startingDebate || !debateTopic.trim() ? "#555" : "white",
                cursor: startingDebate || !debateTopic.trim() ? "not-allowed" : "pointer",
                fontSize: "14px", fontWeight: "600"
              }}>
              {startingDebate ? "Starting..." : "Start Debate"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function PersonaCard({ persona, onDebate, onDelete }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{
      background: "#111", border: "1px solid #1e1e1e",
      borderRadius: "14px", padding: "20px",
      display: "flex", flexDirection: "column", gap: "14px",
      transition: "border-color 0.15s"
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        <div style={{
          width: "46px", height: "46px", borderRadius: "12px",
          background: "#6c63ff15", border: "1px solid #6c63ff25",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "22px", flexShrink: 0
        }}>
          {persona.avatar}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: "white", fontSize: "15px", fontWeight: "700", margin: "0 0 2px" }}>{persona.name}</p>
          {persona.title && <p style={{ color: "#6c63ff", fontSize: "12px", margin: "0 0 3px" }}>{persona.title}</p>}
          <p style={{ color: "#444", fontSize: "11px", margin: 0 }}>by {persona.creator_name || "unknown"}</p>
        </div>
      </div>

      <div style={{ background: "#0d0d0d", borderRadius: "8px", padding: "12px" }}>
        <p style={{ color: "#555", fontSize: "10px", fontWeight: "700", letterSpacing: "1px", textTransform: "uppercase", margin: "0 0 4px" }}>Expertise</p>
        <p style={{ color: "#aaa", fontSize: "13px", margin: 0, lineHeight: "1.5" }}>{persona.expertise}</p>
      </div>

      {expanded && (
        <>
          <div style={{ background: "#0d0d0d", borderRadius: "8px", padding: "12px" }}>
            <p style={{ color: "#555", fontSize: "10px", fontWeight: "700", letterSpacing: "1px", textTransform: "uppercase", margin: "0 0 4px" }}>Personality</p>
            <p style={{ color: "#aaa", fontSize: "13px", margin: 0, lineHeight: "1.5" }}>{persona.personality}</p>
          </div>
          <div style={{ background: "#0d0d0d", borderRadius: "8px", padding: "12px" }}>
            <p style={{ color: "#555", fontSize: "10px", fontWeight: "700", letterSpacing: "1px", textTransform: "uppercase", margin: "0 0 4px" }}>Debating Style</p>
            <p style={{ color: "#aaa", fontSize: "13px", margin: 0, lineHeight: "1.5" }}>{persona.debating_style}</p>
          </div>
        </>
      )}

      <button onClick={() => setExpanded(!expanded)}
        style={{ background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: "12px", textAlign: "left", padding: 0 }}>
        {expanded ? "▲ Less" : "▼ More details"}
      </button>

      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={onDebate}
          style={{
            flex: 1, padding: "10px",
            background: "linear-gradient(135deg, #6c63ff22, #a855f722)",
            border: "1px solid #6c63ff44",
            borderRadius: "8px", color: "#a78bfa",
            cursor: "pointer", fontWeight: "600", fontSize: "13px"
          }}>
          Debate with {persona.name.split(" ")[0]}
        </button>
        <button onClick={onDelete}
          style={{
            padding: "10px 14px", background: "transparent",
            border: "1px solid #2a2a2a",
            borderRadius: "8px", color: "#555", cursor: "pointer", fontSize: "12px"
          }}>
          ✕
        </button>
      </div>
    </div>
  )
}

function Modal({ children, onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
      backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 500, padding: "1rem"
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "#111", border: "1px solid #2a2a2a",
        borderRadius: "16px", padding: "28px",
        width: "100%", maxWidth: "540px",
        maxHeight: "90vh", overflowY: "auto"
      }}>
        {children}
      </div>
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
      borderRadius: "8px", cursor: "pointer"
    }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ accentColor: "#6c63ff" }} />
      <span style={{ fontSize: "18px" }}>{icon}</span>
      <div>
        <p style={{ color: "white", fontSize: "13px", fontWeight: "500", margin: 0 }}>{label}</p>
        {sublabel && <p style={{ color: "#555", fontSize: "11px", margin: 0 }}>{sublabel}</p>}
      </div>
    </label>
  )
}

function FormField({ label, placeholder, value, onChange, multiline }) {
  const style = {
    width: "100%", padding: "10px 14px",
    background: "#0f0f0f", border: "1px solid #2a2a2a",
    borderRadius: "8px", color: "white", fontSize: "13px",
    marginBottom: "16px", resize: "vertical", fontFamily: "inherit", outline: "none"
  }
  return (
    <div>
      <p style={labelStyle}>{label}</p>
      {multiline
        ? <textarea placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} rows={3} style={style} />
        : <input placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} style={style} />
      }
    </div>
  )
}

const labelStyle = {
  color: "#555", fontSize: "11px", fontWeight: "600",
  letterSpacing: "1px", textTransform: "uppercase",
  margin: "0 0 8px", display: "block"
}
