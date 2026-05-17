import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, token, loading } = useAuth()

  if (loading) return <div style={{ color: "white", padding: "2rem" }}>Loading...</div>
  if (!token) return <Navigate to="/login" />
  if (adminOnly && !user?.is_admin) return <Navigate to="/dashboard" />

  return children
}