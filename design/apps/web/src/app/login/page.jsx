import React, { useEffect, useState } from "react";
import { LogIn } from "lucide-react";
import { useNavigate } from "react-router";
import logoDark from "@/assets/logos/logo-dark.png";
import {
  DASHBOARD_PASSWORD,
  DASHBOARD_USERNAME,
  isDashboardAuthenticated,
  setDashboardAuthenticated,
} from "@/utils/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isDashboardAuthenticated()) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const loginLogo = logoDark;

  const handleSubmit = (event) => {
    event.preventDefault();

    const valid =
      username.trim() === DASHBOARD_USERNAME &&
      password === DASHBOARD_PASSWORD;

    if (!valid) {
      setError("Invalid username or password.");
      return;
    }

    setDashboardAuthenticated();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#111216] flex items-center justify-center p-4">
      <div className="w-full max-w-[380px] rounded-lg bg-[#181A20] border border-[#2A2D36] p-6 md:p-8">
        <div className="mb-4 rounded-lg border border-[#3A3D47] bg-[#1B1D24] py-2.5 flex justify-center">
          <img src={loginLogo} alt="DJPPR" className="h-14 w-auto max-w-[220px] object-contain" />
        </div>
        <h1 className="text-[20px] font-semibold text-[#E8EAF0]">Dashboard Login</h1>
        <p className="text-[12px] text-[#AEB4C2] mt-1">Sign in to access macro dashboard.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-[12px] text-[#AEB4C2] mb-2 block">Username</label>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full h-[40px] px-4 border border-[#3A3D47] rounded-lg text-[14px] text-[#E8EAF0] bg-[#1B1D24]"
              autoComplete="username"
              placeholder="Enter username"
            />
          </div>

          <div>
            <label className="text-[12px] text-[#AEB4C2] mb-2 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full h-[40px] px-4 border border-[#3A3D47] rounded-lg text-[14px] text-[#E8EAF0] bg-[#1B1D24]"
              autoComplete="current-password"
              placeholder="Enter password"
            />
          </div>

          {error && (
            <div className="text-[12px] text-[#C00] bg-[#FEE] border border-[#FCC] rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full h-[40px] rounded-lg bg-[#2962FF] text-white text-[13px] font-medium inline-flex items-center justify-center gap-2"
          >
            <LogIn size={14} />
            Login
          </button>
        </form>

        <div className="mt-5 flex flex-col items-center gap-2">
          <div className="h-px w-16 bg-[#3A3D47]" />
          <p className="text-[12px] leading-relaxed text-center text-[#9AA3B5]">
            © 2026 Tim Kerja Pembangunan Sistem Automasi Pengelolaan Data SBN, DJPPR, Kemenkeu. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
