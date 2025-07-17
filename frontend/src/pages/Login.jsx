import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";



const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, legacyLogin } = useUser();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        setError("Invalid username or password");
        return;
      }
      const data = await res.json();
      login(data.user.username, password, data.token, data.user.role);
      navigate("/dashboard");
    } catch (err) {
      // fallback to legacy mock login if backend fails
      const result = legacyLogin(username, password);
      if (result.success) {
        navigate("/dashboard");
      } else {
        setError("Login failed. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black bg-cover bg-no-repeat  bg-[60%]"
    style={{ backgroundImage: "url('/login.jpg')" }}>
      <div className="bg-white/10 backdrop-blur-md   shadow-lg p-8 rounded-3xl  w-full max-w-md border border-amber-400 bg-">
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block mb-1 font-medium">Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full px-3 py-2 border rounded-3xl focus:outline-amber-400 focus:ring-2 focus:ring-amber-400 hover:border-amber-300" />
          </div>
          <div>
            <label className="block mb-1 font-medium">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 border rounded-3xl focus:outline-amber-400 focus:ring-2 focus:ring-amber-400 hover:border-amber-300" />
          </div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <button type="submit" className="w-full text-white py-2 rounded-3xl transition  bg-white/10 backdrop-blur- border border-white hover:border-amber-300 hover:bg-white/20">Login</button>
        </form>
      </div>
    </div>
  );
};

export default Login; 