import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import api from "../api"

const STATUS_COLORS = { pending: "#f59e0b", running: "#6c63ff", completed: "#22c55e" }

export default function Admin() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [debates, setDebates] = useState([])
  const [hotTopic, setHotTopic] = useState("")
  const [currentHotTopic, setCurrentHotTopic] = useState(null)
  const [activeTab, setActiveTab] = useState("stats")
  const [hotTopicSuccess, setHotTopicSuccess] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      const [statsRes, usersRes, debatesRes, hotRes] = await Promise.all([
        api.get("/api/admin/stats"),
        api.get("/api/admin/users"),
        api.get("/api/admin/debates"),
        api.get("/api/admin/hot-topic")
      ])
      setStats(statsRes.data)
      setUsers(usersRes.data)
      setDebates(debatesRes.data)
      setCurrentHotTopic(hotRes.data.topic)
    } catch (err) {
      console.error(err)
    }
  }

  async function deleteUser(id) {
    try {
      await api.delete(`/api/admin/users/${id}`)
      setUsers(users.filter(u => u.id !== id))
      setDeleteConfirm(null)
    } catch (err) {
      console.error(err)
    }
  }

  async function setHotTopicHandler() {
    if (!hotTopic.trim()) return
    try {
      await api.post("/api/admin/hot-topic", { topic: hotTopic })
      setCurrentHotTopic(hotTopic)
      setHotTopic("")
      setHotTopicSuccess(true)
      setTimeout(() => setHotTopicSuccess(false), 3000)
    } catch (err) {
      console.error(err)
    }
  }

  const TABS = [
    { key: "stats", label: "Overview", icon: "📊" },
    { key: "users", label: "Users", icon: "👥" },
    { key: "debates", label: "Debates", icon: "⚔️" },
    { key: "hottopic", label: "Hot Topic", icon: "🔥" },
  ]

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #13101f 0%, #0f1629 100%)",
          border: "1px solid #6c63ff22",
          borderRadius: "16px",
          padding: "24px 28px",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <p style={{ color: "#6c63ff", fontSize: "11px", fontWeight: "700", letterSpacing: "1.5px", textTransform: "uppercase", margin: "0 0 6px" }}>
              Admin Panel
            </p>
            <h1 style={{ color: "white", fontSize: "22px", fontWeight: "700", margin: 0, letterSpacing: "-0.5px" }}>
              Debate Arena Control Center
            </h1>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              padding: "9px 18px", background: "transparent",
              border: "1px solid #2a2a2a", borderRadius: "9px",
              color: "#888", cursor: "pointer", fontSize: "13px"
            }}
          >
            ← Dashboard
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "9px 18px",
                background: activeTab === tab.key ? "linear-gradient(135deg, #6c63ff, #a855f7)" : "#111",
                border: `1px solid ${activeTab === tab.key ? "transparent" : "#1e1e1e"}`,
                borderRadius: "9px",
                color: activeTab === tab.key ? "white" : "#666",
                cursor: "pointer", fontSize: "13px",
                fontWeight: activeTab === tab.key ? "600" : "400",
                display: "flex", alignItems: "center", gap: "6px"
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Stats Tab */}
        {activeTab === "stats" && stats && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
              {[
                { label: "Total Users", value: stats.total_users, icon: "👥", color: "#6c63ff" },
                { label: "Total Debates", value: stats.total_debates, icon: "⚔️", color: "#a855f7" },
                { label: "Completed", value: stats.completed_debates, icon: "✅", color: "#22c55e" },
                { label: "Messages Sent", value: stats.total_messages, icon: "💬", color: "#38bdf8" },
              ].map((stat, i) => (
                <div key={i} style={{
                  background: "#111", border: "1px solid #1e1e1e",
                  borderRadius: "12px", padding: "20px 22px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                    <span style={{ fontSize: "18px" }}>{stat.icon}</span>
                    <span style={{ color: "#555", fontSize: "11px", fontWeight: "600", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                      {stat.label}
                    </span>
                  </div>
                  <p style={{ color: stat.color, fontSize: "32px", fontWeight: "700", margin: 0, letterSpacing: "-1px" }}>
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Completion rate */}
            <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: "22px" }}>
              <p style={{ color: "#555", fontSize: "11px", fontWeight: "600", letterSpacing: "1px", textTransform: "uppercase", margin: "0 0 14px" }}>
                Debate Completion Rate
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ flex: 1, background: "#1e1e1e", borderRadius: "6px", height: "8px", overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${stats.total_debates > 0 ? Math.round((stats.completed_debates / stats.total_debates) * 100) : 0}%`,
                    background: "linear-gradient(90deg, #6c63ff, #22c55e)",
                    borderRadius: "6px",
                    transition: "width 0.6s ease"
                  }} />
                </div>
                <span style={{ color: "white", fontSize: "15px", fontWeight: "600", minWidth: "40px" }}>
                  {stats.total_debates > 0 ? Math.round((stats.completed_debates / stats.total_debates) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e1e1e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ color: "white", fontSize: "14px", fontWeight: "600", margin: 0 }}>
                All Users <span style={{ color: "#555", fontWeight: "400" }}>{users.length}</span>
              </p>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1e1e1e" }}>
                  {["User", "Email", "Role", "Joined", "Actions"].map(h => (
                    <th key={h} style={{
                      color: "#555", fontSize: "11px", padding: "12px 20px",
                      textAlign: "left", fontWeight: "600", letterSpacing: "0.5px", textTransform: "uppercase"
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} style={{ borderBottom: "1px solid #141414" }}>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{
                          width: "32px", height: "32px", borderRadius: "50%",
                          background: "linear-gradient(135deg, #6c63ff33, #a855f733)",
                          border: "1px solid #6c63ff44",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "13px", color: "#a78bfa", fontWeight: "700"
                        }}>
                          {user.username[0].toUpperCase()}
                        </div>
                        <span style={{ color: "white", fontSize: "13px", fontWeight: "500" }}>{user.username}</span>
                      </div>
                    </td>
                    <td style={{ color: "#666", fontSize: "13px", padding: "14px 20px" }}>{user.email}</td>
                    <td style={{ padding: "14px 20px" }}>
                      <span style={{
                        fontSize: "11px", fontWeight: "600",
                        color: user.is_admin ? "#a78bfa" : "#555",
                        background: user.is_admin ? "#a78bfa18" : "#1e1e1e",
                        padding: "3px 9px", borderRadius: "6px"
                      }}>
                        {user.is_admin ? "Admin" : "User"}
                      </span>
                    </td>
                    <td style={{ color: "#555", fontSize: "12px", padding: "14px 20px" }}>
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      {!user.is_admin && (
                        deleteConfirm === user.id ? (
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              onClick={() => deleteUser(user.id)}
                              style={{
                                padding: "4px 12px", background: "#7f1d1d",
                                border: "1px solid #f8717133", borderRadius: "6px",
                                color: "#fca5a5", cursor: "pointer", fontSize: "12px", fontWeight: "600"
                              }}
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              style={{
                                padding: "4px 10px", background: "transparent",
                                border: "1px solid #2a2a2a", borderRadius: "6px",
                                color: "#555", cursor: "pointer", fontSize: "12px"
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(user.id)}
                            style={{
                              padding: "5px 12px", background: "transparent",
                              border: "1px solid #2a2a2a", borderRadius: "6px",
                              color: "#555", cursor: "pointer", fontSize: "12px"
                            }}
                          >
                            Delete
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Debates Tab */}
        {activeTab === "debates" && (
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e1e1e" }}>
              <p style={{ color: "white", fontSize: "14px", fontWeight: "600", margin: 0 }}>
                All Debates <span style={{ color: "#555", fontWeight: "400" }}>{debates.length}</span>
              </p>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1e1e1e" }}>
                  {["Topic", "Started by", "Rounds", "Status", "Date"].map(h => (
                    <th key={h} style={{
                      color: "#555", fontSize: "11px", padding: "12px 20px",
                      textAlign: "left", fontWeight: "600", letterSpacing: "0.5px", textTransform: "uppercase"
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {debates.map(debate => (
                  <tr key={debate.id} style={{ borderBottom: "1px solid #141414" }}>
                    <td style={{
                      color: "#e5e7eb", fontSize: "13px", padding: "14px 20px",
                      maxWidth: "320px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                    }}>
                      {debate.topic}
                    </td>
                    <td style={{ color: "#666", fontSize: "13px", padding: "14px 20px" }}>{debate.username}</td>
                    <td style={{ color: "#888", fontSize: "13px", padding: "14px 20px" }}>{debate.rounds}</td>
                    <td style={{ padding: "14px 20px" }}>
                      <span style={{
                        fontSize: "11px", fontWeight: "600",
                        color: STATUS_COLORS[debate.status] || "#888",
                        background: `${STATUS_COLORS[debate.status] || "#888"}18`,
                        padding: "3px 9px", borderRadius: "6px"
                      }}>
                        {debate.status}
                      </span>
                    </td>
                    <td style={{ color: "#555", fontSize: "12px", padding: "14px 20px" }}>
                      {new Date(debate.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Hot Topic Tab */}
        {activeTab === "hottopic" && (
          <div style={{ maxWidth: "560px" }}>
            {currentHotTopic && (
              <div style={{
                background: "#111", border: "1px solid #f59e0b33",
                borderRadius: "12px", padding: "18px 22px", marginBottom: "16px",
                display: "flex", alignItems: "center", gap: "12px"
              }}>
                <span style={{ fontSize: "20px" }}>🔥</span>
                <div>
                  <p style={{ color: "#f59e0b", fontSize: "10px", fontWeight: "700", letterSpacing: "1.5px", textTransform: "uppercase", margin: "0 0 3px" }}>
                    Current Hot Topic
                  </p>
                  <p style={{ color: "#e5e7eb", fontSize: "14px", margin: 0 }}>{currentHotTopic}</p>
                </div>
              </div>
            )}

            <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: "24px" }}>
              <h2 style={{ color: "white", fontSize: "15px", fontWeight: "600", margin: "0 0 6px" }}>
                Set Today's Hot Topic
              </h2>
              <p style={{ color: "#555", fontSize: "13px", margin: "0 0 20px" }}>
                This appears on every user's dashboard to spark debates.
              </p>
              <input
                placeholder="e.g. Should AI have legal rights?"
                value={hotTopic}
                onChange={e => setHotTopic(e.target.value)}
                onKeyDown={e => e.key === "Enter" && setHotTopicHandler()}
                style={{
                  width: "100%", padding: "11px 14px",
                  background: "#0f0f0f", border: "1px solid #2a2a2a",
                  borderRadius: "8px", color: "white", fontSize: "14px",
                  outline: "none", marginBottom: "12px", boxSizing: "border-box"
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  onClick={setHotTopicHandler}
                  disabled={!hotTopic.trim()}
                  style={{
                    padding: "10px 22px",
                    background: hotTopic.trim() ? "linear-gradient(135deg, #f59e0b, #f97316)" : "#1e1e1e",
                    border: "none", borderRadius: "8px",
                    color: hotTopic.trim() ? "white" : "#555",
                    cursor: hotTopic.trim() ? "pointer" : "not-allowed",
                    fontWeight: "600", fontSize: "13px"
                  }}
                >
                  Set Hot Topic
                </button>
                {hotTopicSuccess && (
                  <span style={{ color: "#22c55e", fontSize: "13px", display: "flex", alignItems: "center", gap: "4px" }}>
                    ✓ Updated successfully
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
