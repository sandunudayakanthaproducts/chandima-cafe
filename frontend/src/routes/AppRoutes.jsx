import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Inventory from "../pages/Inventory";
import Transfer from "../pages/Transfer";
import Sales from "../pages/Sales";
import Reports from "../pages/Reports";
import LiquorAdd from "../pages/LiquorAdd";
import UserManagement from "../pages/UserManagement";
import BillHistory from "../pages/BillHistory";
import MonthlyReport from "../pages/MonthlyReport";
import BillHistoryWorker from "../pages/BillHistoryWorker";
import { UserProvider, useUser } from "../context/UserContext";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useUser();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If worker tries to access anything but /sales, redirect to /sales
    if (user.role === "worker") return <Navigate to="/sales" replace />;
    // For other roles, redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

const AppRoutes = () => (
  <UserProvider>
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><Dashboard /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute allowedRoles={['admin']}><Inventory /></ProtectedRoute>} />
        <Route path="/transfer" element={<ProtectedRoute allowedRoles={['admin']}><Transfer /></ProtectedRoute>} />
        <Route path="/sales" element={<ProtectedRoute allowedRoles={['admin','worker']}><Sales /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin']}><Reports /></ProtectedRoute>} />
        <Route path="/liquor-add" element={<ProtectedRoute allowedRoles={['admin']}><LiquorAdd /></ProtectedRoute>} />
        <Route path="/user-management" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
        <Route path="/bill-history" element={<ProtectedRoute allowedRoles={['admin']}><BillHistory /></ProtectedRoute>} />
        <Route path="/monthly-report" element={<ProtectedRoute allowedRoles={['admin']}><MonthlyReport /></ProtectedRoute>} />
        <Route path="/bill-history-worker" element={<ProtectedRoute allowedRoles={['admin','worker']}><BillHistoryWorker /></ProtectedRoute>} />
        <Route path="*" element={<Login />} />
      </Routes>
    </Router>
  </UserProvider>
);

export default AppRoutes; 