import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./components/Login";
import Register from "./components/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import AdminDashboard from "./pages/AdminDashboard";

function Header() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-orange-600 text-white font-bold flex items-center justify-center text-lg">
              F
            </span>
            <span className="font-bold text-slate-900 text-lg">FoodOrder</span>
          </Link>

          <nav className="flex items-center gap-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? "bg-orange-50 text-orange-700"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`
              }
            >
              Menu
            </NavLink>

            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? "bg-orange-50 text-orange-700"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`
                }
              >
                Admin Dashboard
              </NavLink>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <>
              <span className="hidden sm:inline-flex items-center gap-2 text-sm text-slate-700">
                <span>{user.email}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                  {user.role}
                </span>
              </span>
              <button
                onClick={logout}
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium transition"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-slate-50 text-slate-900">
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
