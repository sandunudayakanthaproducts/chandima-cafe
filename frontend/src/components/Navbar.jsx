import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

const Sidebar = ({ open, onClose, user, onLogout }) => (
  <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white/10 backdrop-blur-md text-white transform ${open ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-200 ease-in-out`}>
    <div className="flex items-center justify-between px-4 py-3 border-b border-amber-400">
      <span className="font-bold text-lg">Bar Management</span>
      <button onClick={onClose} className="text-white text-2xl font-bold">&times;</button>
    </div>
    <nav className="flex flex-col pl-0">
      <Link to="/sales" className="hover:bg-white/20 py-3 px-4" onClick={onClose}>Sales</Link>
      {user.role === "admin" && <Link to="/dashboard" className=" hover:bg-white/20 py-3 px-4" onClick={onClose}>Dashboard</Link>}
      {user.role === "admin" && <Link to="/inventory" className=" hover:bg-white/20 py-3 px-4" onClick={onClose}>Inventory</Link>}
      {user.role === "admin" && <Link to="/bill-history" className=" hover:bg-white/20 py-3 px-4" onClick={onClose}>Bill History</Link>}
      {user.role === "admin" && <Link to="/monthly-report" className=" hover:bg-white/20 py-3 px-4" onClick={onClose}>Monthly Report</Link>}
      {user.role === "worker" && <Link to="/monthly-report" className=" hover:bg-white/20 py-3 px-4" onClick={onClose}>Monthly Report</Link>}
      {user.role === "admin" && <Link to="/user-management" className=" hover:bg-white/20 py-3 px-4" onClick={onClose}>User Management</Link>}
      {user.role === "admin" && <Link to="/food-management" className=" hover:bg-white/20 py-3 px-4" onClick={onClose}>Food Management</Link>}
      {user.role === "admin" && <Link to="/restaurant-details" className=" hover:bg-white/20 py-3 px-4" onClick={onClose}>Restaurant Details</Link>}
      {user.role === "admin" && <Link to="/cocktail-management" className=" hover:bg-white/20 py-3 px-4" onClick={onClose}>Cocktail Management</Link>}
      {user.role === "worker" && <Link to="/bill-history-worker" className=" hover:bg-white/20 py-3 px-4" onClick={onClose}>View Bills</Link>}
      <div className="mt-4 px-4">
        {user.role === "admin" && <span className="ml-2 px-2 py-1 bg-yellow-500 text-xs rounded-3xl border border-black ">Admin</span>}
        {user.role === "worker" && <span className="ml-2 px-2 py-1 bg-green-500 text-xs rounded">Worker</span>}
      </div>
      <button
        onClick={onLogout}
        className="mt-8 ml-4 mr-4 bg-red-500 text-white px-1 py-2 rounded-3xl"
      >
        Logout
      </button>
    </nav>
  </div>
);

const Navbar = () => {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!user) return null;

  return (
    <>
      {/* Hamburger button always visible */}
      <button
        className="fixed top-0 left-0 z-50 bg-black text-amber-400 p-2 rounded shadow-lg"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open navigation menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"></path>
        </svg>
      </button>
      {/* Sidebar for all screen sizes */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} onLogout={handleLogout} />
      {/* Overlay for sidebar */}
      {sidebarOpen && <div className="fixed inset-0 bg-transparent z-40" onClick={() => setSidebarOpen(false)}></div>}
    </>
  );
};

export default Navbar; 