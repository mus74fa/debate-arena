import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import api from "../api"

export default function Admin() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [debates, setDebates] = useState([])
  const [hotTopic, setHotTopic] = useState("")
  const [activeTab, setActiveTab] = useState("stats")

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    try {
      const [statsRes, usersRes, debatesRes] = await Promise.all([
        api.get("/api/admin/stats"),
        api.get("/api/admin/users"),
        api.get("/api/admin/debates")
      ])
      setStats(statsRes.data)
      setUsers(usersRes.data)
      setDebates(debatesRes.data)
    } catch (err) {
      console.error(err)
    }
  }

  async function deleteUser(id) {
    try {
      await api.delete(`/api/admin/users/${id}`)
      setUsers(users.filter(u => u.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  async function setHotTopicHandler() {
    if (!hotTopic.trim()) return
    try {
      await api.post("/api/admin/hot-topic", { topic: hotTopic })
      setHotTopic("")
      alert("Hot topic set successfully!")
    } catch (err) {
      console.error(err)
    }
  }

  const tabStyle = (tab) => ({
    padding: "8px 16px",
    background: activeTab === tab ? "#6c63ff" : "transparent",
    border: activeTab === tab ? "none" : "1px solid #333",
    borderRadius: "6px",
    color: "white",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: activeTab === tab ? "600" : "400"
  })

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h1 style={{ color: "white", fontSize: "20px", margin: 0 }}>Admin Panel</h1>
          <button
            onClick={() => navigate("/dashboard")}
            style={{ background: "none", border: "1px solid #333", borderRadius: "6px", color: "#888", cursor: "pointer", padding: "6px 14px", fontSize: "13px" }}
          >
            Back to Dashboard
          </button>
        </div>

        <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
          <button style={tabStyle("stats")} onClick={() => setActiveTab("stats")}>Stats</button>
          <button style={tabStyle("users")} onClick={() => setActiveTab("users")}>Users</button>
          <button style={tabStyle("debates")} onClick={() => setActiveTab("debates")}>Debates</button>
          <button style={tabStyle("hottopic")} onClick={() => setActiveTab("hottopic")}>Hot Topic</button>
        </div>

        {activeTab === "stats" && stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
            {[
              { label: "Total Users", value: stats.total_users, icon: "👥" },
              { label: "Total Debates", value: stats.total_debates, icon: "⚔️" },
              { label: "Completed", value: stats.completed_debates, icon: "✅" },
              { label: "Total Messages", value: stats.total_messages, icon: "💬" }
            ].map((stat, i) => (
              <div key={i} style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", padding: "20px" }}>
                <p style={{ color: "#888", fontSize: "12px", margin: "0 0 8px" }}>{stat.icon} {stat.label}</p>
                <p style={{ color: "white", fontSize: "28px", fontWeight: "600", margin: 0 }}>{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "users" && (
          <div style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #222" }}>
                  {["Username", "Email", "Admin", "Actions"].map(h => (
                    <th key={h} style={{ color: "#888", fontSize: "12px", padding: "12px 16px", textAlign: "left", fontWeight: "500" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} style={{ borderBottom: "1px solid #1a1a1a" }}>
                    <td style={{ color: "white", fontSize: "13px", padding: "12px 16px" }}>{user.username}</td>
                    <td style={{ color: "#888", fontSize: "13px", padding: "12px 16px" }}>{user.email}</td>
                    <td style={{ color: user.is_admin ? "#4CAF50" : "#888", fontSize: "13px", padding: "12px 16px" }}>{user.is_admin ? "Yes" : "No"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      {!user.is_admin && (
                        <button
                          onClick={() => deleteUser(user.id)}
                          style={{ background: "#2a1010", border: "1px solid #ff444433", borderRadius: "4px", color: "#ff4444", padding: "4px 10px", cursor: "pointer", fontSize: "12px" }}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "debates" && (
          <div style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #222" }}>
                  {["Topic", "User", "Rounds", "Status", "Date"].map(h => (
                    <th key={h} style={{ color: "#888", fontSize: "12px", padding: "12px 16px", textAlign: "left", fontWeight: "500" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {debates.map(debate => (
                  <tr key={debate.id} style={{ borderBottom: "1px solid #1a1a1a" }}>
                    <td style={{ color: "white", fontSize: "13px", padding: "12px 16px", maxWidth: "300px" }}>{debate.topic}</td>
                    <td style={{ color: "#888", fontSize: "13px", padding: "12px 16px" }}>{debate.username}</td>
                    <td style={{ color: "white", fontSize: "13px", padding: "12px 16px" }}>{debate.rounds}</td>
                    <td style={{ color: debate.status === "completed" ? "#4CAF50" : "#FFD700", fontSize: "13px", padding: "12px 16px" }}>{debate.status}</td>
                    <td style={{ color: "#888", fontSize: "13px", padding: "12px 16px" }}>{new Date(debate.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "hottopic" && (
          <div style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", padding: "24px", maxWidth: "500px" }}>
            <h2 style={{ color: "white", fontSize: "16px", margin: "0 0 16px" }}>Set Today's Hot Topic</h2>
            <p style={{ color: "#888", fontSize: "13px", margin: "0 0 16px" }}>This topic will appear on the dashboard and give users +25 bonus XP.</p>
            <input
              placeholder="Enter hot topic..."
              value={hotTopic}
              onChange={e => setHotTopic(e.target.value)}
              style={{ width: "100%", padding: "12px", background: "#1a1a1a", border: "1px solid #333", borderRadius: "6px", color: "white", fontSize: "14px", marginBottom: "12px", boxSizing: "border-box" }}
            />
            <button
              onClick={setHotTopicHandler}
              disabled={!hotTopic.trim()}
              style={{ padding: "10px 24px", background: !hotTopic.trim() ? "#333" : "#6c63ff", border: "none", borderRadius: "6px", color: "white", cursor: !hotTopic.trim() ? "not-allowed" : "pointer", fontWeight: "600", fontSize: "13px" }}
            >
              Set Hot Topic
            </button>
          </div>
        )}
      </div>
    </div>
  )
}