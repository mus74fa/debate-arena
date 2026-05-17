import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import api from "../api"

export default function Register() {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleRegister() {
    if (!username || !email || !password) return
    setLoading(true)
    setError("")
    try {
      const response = await api.post("/api/users/register", { username, email, password })
      const data = response.data
      const userResponse = await api.get("/api/users/me", {
        headers: { Authorization: `Bearer ${data.token}` }
      })
      login(userResponse.data, data.token)
      navigate("/dashboard")
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0a",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1rem", position: "relative", overflow: "hidden"
    }}>
      <div style={{
        position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)",
        width: "600px", height: "600px",
        background: "radial-gradient(circle, #6c63ff0a 0%, transparent 70%)",
        pointerEvents: "none"
      }} />

      <div style={{
        width: "100%", maxWidth: "400px",
        background: "#111", border: "1px solid #1e1e1e",
        borderRadius: "16px", padding: "40px", position: "relative"
      }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            width: "52px", height: "52px", borderRadius: "14px",
            background: "linear-gradient(135deg, #6c63ff, #a855f7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "24px", margin: "0 auto 16px"
          }}>⚔️</div>
          <h1 style={{ color: "white", fontSize: "22px", fontWeight: "700", margin: "0 0 6px", letterSpacing: "-0.5px" }}>
            Create account
          </h1>
          <p style={{ color: "#555", fontSize: "14px", margin: 0 }}>Join Debate Arena</p>
        </div>

        {error && (
          <div style={{
            background: "#2a1010", border: "1px solid #7f1d1d",
            borderRadius: "8px", padding: "10px 14px",
            color: "#fca5a5", fontSize: "13px", marginBottom: "20px"
          }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
          {[
            { label: "USERNAME", value: username, set: setUsername, type: "text", placeholder: "debater42" },
            { label: "EMAIL", value: email, set: setEmail, type: "email", placeholder: "you@example.com" },
            { label: "PASSWORD", value: password, set: setPassword, type: "password", placeholder: "••••••••" },
          ].map(({ label, value, set, type, placeholder }) => (
            <div key={label}>
              <label style={{ color: "#666", fontSize: "12px", fontWeight: "500", display: "block", marginBottom: "6px" }}>{label}</label>
              <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={e => set(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleRegister()}
                style={inputStyle}
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleRegister}
          disabled={loading || !username || !email || !password}
          style={{
            width: "100%", padding: "12px",
            background: loading || !username || !email || !password
              ? "#222"
              : "linear-gradient(135deg, #6c63ff, #a855f7)",
            border: "none", borderRadius: "10px",
            color: loading || !username || !email || !password ? "#555" : "white",
            fontSize: "14px", fontWeight: "600",
            cursor: loading || !username || !email || !password ? "not-allowed" : "pointer",
            marginBottom: "20px"
          }}
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>

        <p style={{ color: "#555", fontSize: "13px", textAlign: "center", margin: 0 }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#a78bfa", textDecoration: "none", fontWeight: "500" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

const inputStyle = {
  width: "100%", padding: "11px 14px",
  background: "#0f0f0f", border: "1px solid #2a2a2a",
  borderRadius: "8px", color: "white", fontSize: "14px",
  outline: "none"
}
