import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

const Navbar = () => {
  const { user, logout } = useUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!user) return null;

  return (
    <nav className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <span className="font-bold text-lg">Bar Management</span>
        <Link to="/dashboard" className="hover:underline">Dashboard</Link>
        <Link to="/inventory" className="hover:underline">Inventory</Link>
        
        <Link to="/sales" className="hover:underline">Sales</Link>
        
        {user.role === "admin" && (
          <Link to="/bill-history" className="hover:underline">Bill History</Link>
        )}
        {user.role === "admin" && (
          <Link to="/monthly-report" className="hover:underline">Monthly Report</Link>
        )}
       
        {user.role === "admin" && (
          <Link to="/user-management" className="hover:underline">User Management</Link>
        )}
        {user.role === "admin" && (
          <Link to="/restaurant-details" className="hover:underline">Restaurant Details</Link>
        )}
        {user.role === "admin" && (
          <span className="ml-2 px-2 py-1 bg-yellow-500 text-xs rounded">Admin</span>
        )}
        {user.role === "worker" && (
          <span className="ml-2 px-2 py-1 bg-green-500 text-xs rounded">Worker</span>
        )}
      </div>
      <button onClick={handleLogout} className="bg-red-500 px-3 py-1 rounded hover:bg-red-600">Logout</button>
    </nav>
  );
};

export default Navbar; 