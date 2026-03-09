import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { ChevronDown } from "lucide-react";
import { setAuthTokenInterceptor } from "../api/client";
import { getMe, type CurrentUser } from "../api/organizations";

export function NavBar() {
  const { isAuthenticated, loginWithRedirect, logout, isLoading, getAccessTokenSilently } = useAuth0();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    // NavBar effects run before AppContent's effects, so set up the interceptor here first.
    setAuthTokenInterceptor(() =>
      getAccessTokenSilently({
        authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE },
      })
    );
    getMe().then(setCurrentUser).catch(() => {});
  }, [isAuthenticated, getAccessTokenSilently]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setUserMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <nav style={{ backgroundColor: "#003b63" }} className="flex items-center justify-between px-6 py-3 shadow-md">
      {/* Left: logo + nav links */}
      <div className="flex items-center gap-6">
        <Link to="/" className="font-bold text-xl text-white tracking-tight">
          ROKR
        </Link>

        {isAuthenticated && (
          <Link
            to="/programs"
            className="text-sm font-medium transition-colors"
            style={{ color: "rgba(255,255,255,0.85)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.85)")}
          >
            Programs
          </Link>
        )}
      </div>

      {/* Right: user menu or login */}
      <div>
        {isLoading ? null : isAuthenticated && currentUser ? (
          <div className="flex items-center gap-4">
            {currentUser.is_admin && (
              <Link
                to="/admin"
                className="text-sm font-semibold transition-colors"
                style={{ color: "#45cfcc" }}
              >
                Admin
              </Link>
            )}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((o) => !o)}
                className="flex items-center gap-1.5 text-sm text-white transition-colors hover:text-white/80"
              >
                {currentUser.name ?? currentUser.email ?? "Account"}
                <ChevronDown className="w-4 h-4" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 rounded-xl bg-white shadow-lg border border-gray-100 z-50 overflow-hidden">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout({ logoutParams: { returnTo: window.location.origin } });
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : !isLoading && !isAuthenticated ? (
          <button
            onClick={() => loginWithRedirect()}
            className="btn-teal"
          >
            Login / Sign up
          </button>
        ) : null}
      </div>
    </nav>
  );
}
