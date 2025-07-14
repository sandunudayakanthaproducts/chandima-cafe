import React, { createContext, useState, useContext, useEffect } from "react";

const UserContext = createContext();

const USER_KEY = "bar_user";

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });

  const login = (username, password, token, role) => {
    const userData = { username, role, token };
    setUser(userData);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(USER_KEY);
  };

  // For backward compatibility with mock login
  const legacyLogin = (username, password) => {
    if (username === "admin" && password === "admin123") {
      login(username, password, "mock-jwt-admin", "admin");
      return { success: true, role: "admin" };
    } else if (username === "worker" && password === "worker123") {
      login(username, password, "mock-jwt-worker", "worker");
      return { success: true, role: "worker" };
    }
    return { success: false };
  };

  return (
    <UserContext.Provider value={{ user, login, logout, legacyLogin }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext); 