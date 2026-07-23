import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';

const AppContext = createContext(null);

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:5001' : '';

export const AppProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [settings, setSettings] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);

  const refreshData = () => {
    if (!isAuthenticated || !token) return;

    // Fetch Notifications
    fetch(`${API_BASE}/api/notifications`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setNotifications(data))
      .catch(console.error);

    // Fetch Settings
    fetch(`${API_BASE}/api/settings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(console.error);

    // Fetch Departments
    fetch(`${API_BASE}/api/departments`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setDepartments(data))
      .catch(console.error);

    // Fetch Employees
    fetch(`${API_BASE}/api/employees`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setEmployees(data))
      .catch(console.error);
  };

  useEffect(() => {
    refreshData();
  }, [isAuthenticated, token]);

  const value = {
    notifications,
    settings,
    employees,
    departments,
    refreshData
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => useContext(AppContext);
