import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Inventory from "../pages/Inventory";
import Transfer from "../pages/Transfer";
import Sales from "../pages/Sales";
import Reports from "../pages/Reports";
import LiquorAdd from "../pages/LiquorAdd";
import { UserProvider, useUser } from "../context/UserContext";

const ProtectedRoute = ({ children }) => {
  const { user } = useUser();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const AppRoutes = () => (
  <UserProvider>
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
        <Route path="/transfer" element={<ProtectedRoute><Transfer /></ProtectedRoute>} />
        <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/liquor-add" element={<ProtectedRoute><LiquorAdd /></ProtectedRoute>} />
        <Route path="*" element={<Login />} />
      </Routes>
    </Router>
  </UserProvider>
);

export default AppRoutes; 