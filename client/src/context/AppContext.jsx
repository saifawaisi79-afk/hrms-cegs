import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [settings, setSettings] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);

  const refreshData = () => {
    if (!isAuthenticated || !token) return;

    // Fetch Notifications
    fetch('http://localhost:5001/api/notifications', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setNotifications(data))
      .catch(console.error);

    // Fetch Settings
    fetch('http://localhost:5001/api/settings', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(console.error);

    // Fetch Departments
    fetch('http://localhost:5001/api/departments', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setDepartments(data))
      .catch(console.error);

    // Fetch Employees
    fetch('http://localhost:5001/api/employees', {
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
