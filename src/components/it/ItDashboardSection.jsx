'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { IC } from '@/components/hrms/HrmsLegacy';
import { toIsoDate } from '@/lib/auto-absent';
import { calcLeaveBalance } from '@/lib/leave-policy';

export function ItDashboardSection({ user, db, save, setView }) {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    overdue: 0,
    today: 0,
    review: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);

  const todayIso = toIsoDate(new Date());

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/it/tasks');
      if (!res.ok) throw new Error('Failed to load tasks');
      const data = await res.json();
      setTasks(data.tasks || []);
      if (data.stats) setStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch IT tasks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Filter tasks
  const todayTasks = tasks.filter((t) => t.due_date === todayIso && t.status !== 'Completed' && t.status !== 'Cancelled');
  const overdueTasks = tasks.filter((t) => t.is_overdue);
  const upcomingTasks = tasks.filter((t) => t.due_date > todayIso && t.status !== 'Completed' && t.status !== 'Cancelled').slice(0, 5);
  const completedTasks = tasks.filter((t) => t.status === 'Completed').slice(0, 5);

  // Priority count
  const criticalCount = tasks.filter((t) => t.priority === 'Critical' && t.status !== 'Completed' && t.status !== 'Cancelled').length;
  const highCount = tasks.filter((t) => t.priority === 'High' && t.status !== 'Completed' && t.status !== 'Cancelled').length;
  const mediumCount = tasks.filter((t) => t.priority === 'Medium' && t.status !== 'Completed' && t.status !== 'Cancelled').length;
  const lowCount = tasks.filter((t) => t.priority === 'Low' && t.status !== 'Completed' && t.status !== 'Cancelled').length;

  // Leave balance
  const userLeaves = (db?.leaves || []).filter((l) => l.user_id === user?.id || l.user_id === user?._id);
  const leaveSummary = calcLeaveBalance ? calcLeaveBalance(userLeaves, user?.joining_date) : { balance: 12, used: 0 };

  const getPriorityBadgeClass = (p) => {
    switch (p) {
      case 'Critical': return 'b-error';
      case 'High': return 'b-pending';
      case 'Medium': return 'b-info';
      default: return 'b-gray';
    }
  };

  const getStatusBadgeClass = (s) => {
    switch (s) {
      case 'Completed': return 'b-success';
      case 'In Progress': return 'b-info';
      case 'Submitted for Review': return 'b-purple';
      case 'Acknowledged': return 'b-info';
      case 'On Hold': return 'b-pending';
      case 'Cancelled': return 'b-gray';
      default: return 'b-pending';
    }
  };

  return (
    <div className="modern-dash-layout anim-fadeup" style={{ padding: '20px 24px' }}>
      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0369a1 100%)',
        borderRadius: 20,
        padding: '28px 32px',
        color: '#fff',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 20,
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 68,
            height: 68,
            borderRadius: 18,
            background: 'rgba(255,255,255,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
            border: '2px solid rgba(255,255,255,0.2)',
          }}>
            💻
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                IT Team Workspace
              </h1>
              <span style={{
                background: '#0284c7',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 999,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                IT_TEAM
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: '#94a3b8' }}>
              Welcome back, <strong style={{ color: '#fff' }}>{user?.name}</strong> • {user?.designation || 'Software Engineer & Systems'} • {user?.employee_id || 'EMP'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link
            href="/it/tasks"
            className="btn btn-primary"
            style={{
              background: '#0284c7',
              borderColor: '#0284c7',
              fontWeight: 700,
              padding: '10px 18px',
              borderRadius: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              textDecoration: 'none',
            }}
          >
            <IC n="activity" s={16} /> My Daily Tasks
          </Link>
          <Link
            href="/billing/attendance"
            className="btn"
            style={{
              background: 'rgba(255,255,255,0.12)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
              fontWeight: 600,
              padding: '10px 16px',
              borderRadius: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              textDecoration: 'none',
            }}
          >
            <IC n="clock" s={16} /> Attendance
          </Link>
          <Link
            href="/billing/leaves"
            className="btn"
            style={{
              background: 'rgba(255,255,255,0.12)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
              fontWeight: 600,
              padding: '10px 16px',
              borderRadius: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              textDecoration: 'none',
            }}
          >
            <IC n="calendar" s={16} /> Leave
          </Link>
        </div>
      </div>

      {/* TOP 5 STATISTICS CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 24,
      }}>
        {/* Total Assigned */}
        <div className="stat-card" style={{ background: '#fff', padding: '20px', borderRadius: 16, border: '1px solid #E5E7EB', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Assigned
            </span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0f9ff', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IC n="activity" s={18} />
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#0f172a' }}>{stats.total}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Cumulative technical tasks</div>
        </div>

        {/* Pending Tasks */}
        <div className="stat-card" style={{ background: '#fff', padding: '20px', borderRadius: 16, border: '1px solid #E5E7EB', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Pending Tasks
            </span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IC n="clock" s={18} />
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#d97706' }}>{stats.pending}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Assigned & Acknowledged</div>
        </div>

        {/* In Progress */}
        <div className="stat-card" style={{ background: '#fff', padding: '20px', borderRadius: 16, border: '1px solid #E5E7EB', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              In Progress
            </span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IC n="trending" s={18} />
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#2563eb' }}>{stats.in_progress}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Currently under development</div>
        </div>

        {/* Completed Tasks */}
        <div className="stat-card" style={{ background: '#fff', padding: '20px', borderRadius: 16, border: '1px solid #E5E7EB', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Completed
            </span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IC n="check" s={18} />
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#16a34a' }}>{stats.completed}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Reviewed & approved by HR</div>
        </div>

        {/* Overdue Tasks */}
        <div className="stat-card" style={{
          background: stats.overdue > 0 ? '#fff1f2' : '#fff',
          padding: '20px',
          borderRadius: 16,
          border: stats.overdue > 0 ? '1px solid #fecdd3' : '1px solid #E5E7EB',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: stats.overdue > 0 ? '#e11d48' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Overdue Tasks
            </span>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: stats.overdue > 0 ? '#ffe4e6' : '#f8fafc',
              color: stats.overdue > 0 ? '#e11d48' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <IC n="alert" s={18} />
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: stats.overdue > 0 ? '#e11d48' : '#0f172a' }}>{stats.overdue}</div>
          <div style={{ fontSize: 12, color: stats.overdue > 0 ? '#e11d48' : '#94a3b8', marginTop: 4 }}>Past assigned deadline</div>
        </div>
      </div>

      {/* DASHBOARD MAIN GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 24 }}>
        {/* LEFT COLUMN: Tasks sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Today's Assigned Tasks */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                  Today&apos;s Assigned Tasks ({todayTasks.length})
                </h2>
                <span style={{ fontSize: 13, color: '#64748b' }}>Technical items scheduled for {todayIso}</span>
              </div>
              <Link href="/it/tasks" style={{ fontSize: 13, fontWeight: 700, color: '#0284c7', textDecoration: 'none' }}>
                View All Tasks →
              </Link>
            </div>

            {loading ? (
              <div style={{ padding: '30px 0', textAlign: 'center', color: '#94a3b8' }}>Loading daily tasks...</div>
            ) : todayTasks.length === 0 ? (
              <div style={{
                padding: '32px 20px',
                textAlign: 'center',
                background: '#f8fafc',
                borderRadius: 12,
                border: '1px dashed #cbd5e1',
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#334155', marginBottom: 4 }}>No tasks due today</div>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>You are all caught up for today! Check upcoming tasks or work on ongoing items.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {todayTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTask(t)}
                    style={{
                      padding: '16px',
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16,
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span className={`badge ${getPriorityBadgeClass(t.priority)}`} style={{ fontSize: 10, textTransform: 'uppercase' }}>
                          {t.priority}
                        </span>
                        <span className={`badge ${getStatusBadgeClass(t.status)}`} style={{ fontSize: 10 }}>
                          {t.status}
                        </span>
                        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                          {t.category}
                        </span>
                      </div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.title}
                      </h3>
                      <p style={{ fontSize: 13, color: '#64748b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.description}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0284c7' }}>View Details →</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Deadlines */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
              Upcoming Deadlines
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px 0' }}>Future technical assignments requiring attention</p>

            {upcomingTasks.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: 10 }}>
                No upcoming deadlines on schedule
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {upcomingTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTask(t)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: '1px solid #f1f5f9',
                      background: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{t.title}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{t.category} • Priority: {t.priority}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="badge b-info" style={{ fontSize: 11 }}>Due {t.due_date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recently Completed Tasks */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
              Recently Completed Tasks
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px 0' }}>Verified and approved work</p>

            {completedTasks.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: 10 }}>
                No completed tasks yet. Completed work will be listed here once reviewed by HR.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {completedTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTask(t)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: '1px solid #f0fdf4',
                      background: '#fdfefe',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>✓</span> {t.title}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{t.category}</div>
                    </div>
                    <span className="badge b-success" style={{ fontSize: 11 }}>Approved</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Performance, Attendance, Leave */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Live Attendance Summary */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Attendance Summary
              </h2>
              <Link href="/billing/attendance" style={{ fontSize: 12, fontWeight: 700, color: '#0284c7', textDecoration: 'none' }}>
                Open Clock-In →
              </Link>
            </div>

            <div style={{
              background: '#f8fafc',
              padding: '16px',
              borderRadius: 12,
              marginBottom: 16,
              border: '1px solid #e2e8f0',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>Work Mode</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                  {user?.workMode || 'WFO'} ({user?.wfh_allowed ? 'WFH Enabled' : 'Office GPS Required'})
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>Shift Standard</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                  9 Hours Daily (Mon-Fri) / 6 Hours (Sat)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>Login Status</span>
                <span className="badge b-success" style={{ fontSize: 11 }}>Active Session</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Link
                href="/billing/attendance"
                className="btn btn-outline"
                style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, padding: '10px 12px' }}
              >
                Punches & Times
              </Link>
              <Link
                href="/billing/leaves"
                className="btn btn-primary"
                style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, padding: '10px 12px', background: '#0284c7', borderColor: '#0284c7' }}
              >
                Apply Leave
              </Link>
            </div>
          </div>

          {/* Leave Balance */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Leave Balance
              </h2>
              <Link href="/billing/leaves" style={{ fontSize: 12, fontWeight: 700, color: '#0284c7', textDecoration: 'none' }}>
                Manage →
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, textAlign: 'center' }}>
              <div style={{ background: '#f0fdf4', padding: '12px 8px', borderRadius: 10, border: '1px solid #dcfce7' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#16a34a' }}>
                  {leaveSummary.balance ?? 12}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#166534', marginTop: 2 }}>Days Available</div>
              </div>
              <div style={{ background: '#eff6ff', padding: '12px 8px', borderRadius: 10, border: '1px solid #dbeafe' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#2563eb' }}>
                  {leaveSummary.used ?? 0}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#1e40af', marginTop: 2 }}>Taken</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px 8px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#475569' }}>
                  {userLeaves.filter((l) => l.status === 'pending').length}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginTop: 2 }}>Pending HR</div>
              </div>
            </div>
          </div>

          {/* Task Priority Overview */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
              Task Priority Overview
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px 0' }}>Active items grouped by urgency</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#fff1f2', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e11d48' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#9f1239' }}>Critical Priority</span>
                </div>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#9f1239' }}>{criticalCount}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#fffbeb', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#d97706' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>High Priority</span>
                </div>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#92400e' }}>{highCount}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f0f9ff', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#0284c7' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#075985' }}>Medium Priority</span>
                </div>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#075985' }}>{mediumCount}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#64748b' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Low Priority</span>
                </div>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#334155' }}>{lowCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK TASK DETAILS MODAL */}
      {selectedTask && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 18,
            maxWidth: 600,
            width: '100%',
            maxHeight: '85vh',
            overflowY: 'auto',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <span className={`badge ${getPriorityBadgeClass(selectedTask.priority)}`}>
                    {selectedTask.priority}
                  </span>
                  <span className={`badge ${getStatusBadgeClass(selectedTask.status)}`}>
                    {selectedTask.status}
                  </span>
                  <span className="badge b-gray">{selectedTask.category}</span>
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {selectedTask.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 22,
                  cursor: 'pointer',
                  color: '#94a3b8',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                Description
              </div>
              <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                {selectedTask.description}
              </p>
            </div>

            {selectedTask.additional_instructions ? (
              <div style={{ marginBottom: 16, background: '#f8fafc', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                  Additional Instructions
                </div>
                <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>{selectedTask.additional_instructions}</p>
              </div>
            ) : null}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <span style={{ fontSize: 12, color: '#64748b' }}>Start Date:</span>{' '}
                <strong style={{ fontSize: 13, color: '#0f172a' }}>{selectedTask.start_date || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ fontSize: 12, color: '#64748b' }}>Due Date:</span>{' '}
                <strong style={{ fontSize: 13, color: selectedTask.is_overdue ? '#e11d48' : '#0f172a' }}>
                  {selectedTask.due_date} {selectedTask.is_overdue ? '(Overdue)' : ''}
                </strong>
              </div>
            </div>

            {selectedTask.attachments?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>
                  Reference Attachments
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectedTask.attachments.map((att, idx) => (
                    <a
                      key={idx}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '8px 12px',
                        background: '#f1f5f9',
                        borderRadius: 8,
                        fontSize: 13,
                        color: '#0284c7',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      📎 {att.name || att.url}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setSelectedTask(null)}
                className="btn btn-outline"
                style={{ borderRadius: 8, padding: '8px 16px' }}
              >
                Close
              </button>
              <Link
                href="/it/tasks"
                className="btn btn-primary"
                style={{ borderRadius: 8, padding: '8px 16px', background: '#0284c7', borderColor: '#0284c7', textDecoration: 'none' }}
              >
                Open in My Tasks →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default ItDashboardSection;

