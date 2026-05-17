import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [dropdown, setDropdown] = useState(false)

  function handleLogout() {
    logout()
    navigate("/login")
  }

  const isActive = (path) => location.pathname === path

  return (
    <nav style={{
      background: "rgba(10,10,10,0.85)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid #1e1e1e",
      padding: "0 2rem",
      height: "60px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <div
        onClick={() => navigate("/dashboard")}
        style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "10px" }}
      >
        <div style={{
          width: "32px", height: "32px", borderRadius: "8px",
          background: "linear-gradient(135deg, #6c63ff, #a855f7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "16px"
        }}>⚔️</div>
        <span style={{ color: "white", fontWeight: "700", fontSize: "16px", letterSpacing: "-0.3px" }}>
          Debate Arena
        </span>
      </div>

      {/* Nav links */}
      {user && (
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {[
            { label: "Dashboard", path: "/dashboard" },
            { label: "Personas", path: "/personas" },
          ].map(({ label, path }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{
                padding: "6px 14px",
                background: isActive(path) ? "#6c63ff22" : "none",
                border: isActive(path) ? "1px solid #6c63ff44" : "1px solid transparent",
                borderRadius: "8px",
                color: isActive(path) ? "#a78bfa" : "#888",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: isActive(path) ? "600" : "400",
                transition: "all 0.15s"
              }}
            >
              {label}
            </button>
          ))}

          {/* Avatar + dropdown */}
          <div style={{ position: "relative", marginLeft: "8px" }}>
            <button
              onClick={() => setDropdown(!dropdown)}
              style={{
                width: "34px", height: "34px", borderRadius: "50%",
                background: "linear-gradient(135deg, #6c63ff, #a855f7)",
                border: "none", cursor: "pointer",
                color: "white", fontWeight: "700", fontSize: "13px",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}
            >
              {user.username?.[0]?.toUpperCase()}
            </button>

            {dropdown && (
              <div style={{
                position: "absolute", right: 0, top: "42px",
                background: "#141414", border: "1px solid #2a2a2a",
                borderRadius: "10px", padding: "6px",
                minWidth: "180px", zIndex: 200,
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)"
              }}>
                <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid #222", marginBottom: "4px" }}>
                  <p style={{ color: "white", fontSize: "13px", fontWeight: "600", margin: "0 0 2px" }}>{user.username}</p>
                  <p style={{ color: "#555", fontSize: "11px", margin: 0 }}>{user.email}</p>
                </div>
                {user.is_admin && (
                  <DropdownItem label="⚙️ Admin Panel" onClick={() => { navigate("/admin"); setDropdown(false) }} />
                )}
                <DropdownItem label="🚪 Logout" onClick={handleLogout} danger />
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}

function DropdownItem({ label, onClick, danger }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "100%", padding: "8px 12px",
        background: hover ? "#1e1e1e" : "none",
        border: "none",
        color: danger ? "#f87171" : "#ccc",
        cursor: "pointer", textAlign: "left",
        fontSize: "13px", borderRadius: "6px",
        transition: "background 0.1s"
      }}
    >
      {label}
    </button>
  )
}
