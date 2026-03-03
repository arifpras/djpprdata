import React, { useEffect, useState } from "react";
import { ArrowLeft, LogOut } from "lucide-react";
import { useNavigate } from "react-router";
import logoLight from "@/assets/logos/logo-light.png";
import logoDark from "@/assets/logos/logo-dark.png";
import { clearDashboardAuthenticated, isDashboardAuthenticated } from "@/utils/auth";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [authReady, setAuthReady] = useState(false);
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    if (!isDashboardAuthenticated()) {
      navigate("/login", { replace: true });
      return;
    }

    setAuthReady(true);
  }, [navigate]);

  useEffect(() => {
    const storedTheme = localStorage.getItem("dashboard-theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
      return;
    }

    setTheme("dark");
  }, []);

  if (!authReady) {
    return null;
  }

  const isDark = theme === "dark";
  const logo = isDark ? logoDark : logoLight;

  const handleLogout = () => {
    clearDashboardAuthenticated();
    navigate("/login", { replace: true });
  };

  return (
    <div className={`min-h-screen p-4 md:p-6 lg:p-8 ${isDark ? "bg-[#111216]" : "bg-[#F0F2F5]"}`}>
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className={`h-[36px] px-4 rounded-lg border text-[12px] font-medium flex items-center gap-2 ${
              isDark
                ? "border-[#3A3D47] bg-[#1B1D24] text-[#E8EAF0]"
                : "border-[#D0D3DA] bg-white text-[#4B4E59]"
            }`}
          >
            <ArrowLeft size={14} />
            Back to Dashboard
          </button>
          <h1 className={`text-[18px] md:text-[22px] font-semibold ${isDark ? "text-[#E8EAF0]" : "text-[#1A1A1A]"}`}>
            Profile
          </h1>
        </div>

        <div
          className={`rounded-lg border p-5 md:p-6 ${
            isDark ? "bg-[#181A20] border-[#2A2D36]" : "bg-white border-[#E8E9EF]"
          }`}
        >
          <div
            className={`rounded-lg border py-2.5 flex justify-center ${
              isDark ? "bg-[#1B1D24] border-[#3A3D47]" : "bg-[#F7F8FC] border-[#E4E6EB]"
            }`}
          >
            <img src={logo} alt="DJPPR" className="h-14 w-auto max-w-[220px] object-contain" />
          </div>

          <div className="mt-5 flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full p-[1px] ${
                isDark ? "bg-black" : "bg-[#D0D3DA]"
              }`}
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-white">
                <img
                  src="https://img.icons8.com/?size=100&id=CxsfjQ9qnPcX&format=png&color=000000"
                  alt="Profile avatar"
                  className="w-full h-full object-cover"
                  style={{ filter: "none" }}
                />
              </div>
            </div>
            <div>
              <div className={`text-[15px] font-semibold ${isDark ? "text-[#E8EAF0]" : "text-[#1A1A1A]"}`}>
                Economist
              </div>
              <div className={`text-[12px] ${isDark ? "text-[#AEB4C2]" : "text-[#8F93A1]"}`}>
                Macro Dashboard User
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div
              className={`rounded-lg border px-4 py-3 ${
                isDark ? "bg-[#1B1D24] border-[#343A46]" : "bg-[#FAFBFF] border-[#E4E6EB]"
              }`}
            >
              <div className={`text-[11px] uppercase tracking-wide ${isDark ? "text-[#98A1B3]" : "text-[#8F93A1]"}`}>
                Organization
              </div>
              <div className={`mt-1 text-[13px] font-medium ${isDark ? "text-[#E8EAF0]" : "text-[#1A1A1A]"}`}>
                DJPPR, Kemenkeu
              </div>
            </div>

            <div
              className={`rounded-lg border px-4 py-3 ${
                isDark ? "bg-[#1B1D24] border-[#343A46]" : "bg-[#FAFBFF] border-[#E4E6EB]"
              }`}
            >
              <div className={`text-[11px] uppercase tracking-wide ${isDark ? "text-[#98A1B3]" : "text-[#8F93A1]"}`}>
                Access
              </div>
              <div className={`mt-1 text-[13px] font-medium ${isDark ? "text-[#E8EAF0]" : "text-[#1A1A1A]"}`}>
                Dashboard Access Granted
              </div>
            </div>
          </div>

          <div className={`mt-5 pt-4 border-t ${isDark ? "border-[#3A3D47]" : "border-[#E4E6EB]"}`}>
            <button
              onClick={handleLogout}
              className={`h-[36px] px-4 rounded-lg border text-[12px] font-medium inline-flex items-center gap-2 ${
                isDark
                  ? "border-[#3A3D47] bg-[#1B1D24] text-[#E8EAF0]"
                  : "border-[#D0D3DA] bg-white text-[#4B4E59]"
              }`}
              aria-label="Logout"
              title="Logout"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
