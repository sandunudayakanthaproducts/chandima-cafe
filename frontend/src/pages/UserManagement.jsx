import React, { useState } from "react";
import Navbar from "../components/Navbar";
import { useUser } from "../context/UserContext";

const UserManagement = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [adminUpdateSuccess, setAdminUpdateSuccess] = useState("");
  const [adminUpdateError, setAdminUpdateError] = useState("");
  const [adminNewUsername, setAdminNewUsername] = useState("");
  const [adminNewPassword, setAdminNewPassword] = useState("");

  const { user, login } = useUser();
  const [users, setUsers] = useState([]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/auth/users");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      // ignore
    }
  };

  React.useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess("");
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role: "worker" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Error creating user");
      } else {
        setSuccess("Worker user created successfully!");
        setUsername("");
        setPassword("");
      }
    } catch (err) {
      setError("Server error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (username) => {
    if (!window.confirm(`Delete user '${username}'?`)) return;
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/users/${username}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Error deleting user");
      } else {
        setSuccess("User deleted successfully!");
        fetchUsers();
      }
    } catch (err) {
      setError("Server error");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminUpdate = async (e) => {
    e.preventDefault();
    setAdminUpdateSuccess("");
    setAdminUpdateError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/admin-update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentUsername: user.username,
          username: adminNewUsername || undefined,
          password: adminNewPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAdminUpdateError(data.message || "Error updating admin");
      } else {
        setAdminUpdateSuccess("Admin credentials updated successfully!");
        // If username changed, update user context/localStorage
        if (adminNewUsername) {
          login(adminNewUsername, '', user.token, user.role);
        }
        setAdminNewUsername("");
        setAdminNewPassword("");
      }
    } catch (err) {
      setAdminUpdateError("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="p-8 max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-4">User Management</h1>
        {/* Admin update section */}
        <div className="mb-8 p-4 border rounded bg-gray-50">
          <h2 className="text-lg font-bold mb-2">Update Admin Credentials</h2>
          <form className="space-y-3" onSubmit={handleAdminUpdate}>
            <div>
              <label className="block mb-1 font-medium">Current Username</label>
              <input type="text" value={user.username} readOnly className="w-full px-3 py-2 border rounded bg-gray-200" />
            </div>
            <div>
              <label className="block mb-1 font-medium">New Username</label>
              <input type="text" value={adminNewUsername} onChange={e => setAdminNewUsername(e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="Leave blank to keep current" />
            </div>
            <div>
              <label className="block mb-1 font-medium">New Password</label>
              <input type="password" value={adminNewPassword} onChange={e => setAdminNewPassword(e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="Leave blank to keep current" />
            </div>
            {adminUpdateSuccess && <div className="text-green-600">{adminUpdateSuccess}</div>}
            {adminUpdateError && <div className="text-red-500">{adminUpdateError}</div>}
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>{loading ? "Updating..." : "Update Admin"}</button>
          </form>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block mb-1 font-medium">Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full px-3 py-2 border rounded" required />
          </div>
          <div>
            <label className="block mb-1 font-medium">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 border rounded" required />
          </div>
          {success && <div className="text-green-600">{success}</div>}
          {error && <div className="text-red-500">{error}</div>}
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>{loading ? "Creating..." : "Create Worker"}</button>
        </form>
        <hr className="my-8" />
        <h2 className="text-xl font-bold mb-2">All Users</h2>
        <table className="min-w-full bg-white border rounded shadow text-sm">
          <thead>
            <tr className="bg-blue-100">
              <th className="py-2 px-4 border">Username</th>
              <th className="py-2 px-4 border">Role</th>
              <th className="py-2 px-4 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.username} className="text-center">
                <td className="py-2 px-4 border">{u.username}</td>
                <td className="py-2 px-4 border">{u.role}</td>
                <td className="py-2 px-4 border">
                  {u.username !== user.username && (
                    <button
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                      onClick={() => handleDelete(u.username)}
                      disabled={loading}
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
    </>
  );
};

export default UserManagement; 