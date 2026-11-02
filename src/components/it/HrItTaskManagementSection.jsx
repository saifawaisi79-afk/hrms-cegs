'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { IC } from '@/components/hrms/HrmsLegacy';
import { IT_TASK_CATEGORIES, IT_TASK_PRIORITIES, IT_TASK_STATUSES } from '@/lib/it-tasks-constants';
import { toIsoDate } from '@/lib/auto-absent';

export function HrItTaskManagementSection({ user }) {
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filtering & View toggles
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' or 'team_performance'
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTaskModal, setEditTaskModal] = useState(null);
  const [reviewTaskModal, setReviewTaskModal] = useState(null);
  const [cancelTaskModal, setCancelTaskModal] = useState(null);
  const [detailTaskModal, setDetailTaskModal] = useState(null);

  // New task form state
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    category: 'Website Development',
    priority: 'Medium',
    assigned_to: [],
    start_date: toIsoDate(new Date()),
    due_date: toIsoDate(new Date()),
    additional_instructions: '',
    attachments: [],
  });
  const [attName, setAttName] = useState('');
  const [attUrl, setAttUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Review state
  const [reviewAction, setReviewAction] = useState('approved'); // 'approved' or 'changes_requested'
  const [reviewFeedback, setReviewFeedback] = useState('');

  // Cancel state
  const [cancellationReason, setCancellationReason] = useState('');

  const todayIso = toIsoDate(new Date());

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, teamRes] = await Promise.all([
        fetch('/api/it/tasks'),
        fetch('/api/it/team'),
      ]);

      if (!tasksRes.ok) throw new Error('Failed to load IT tasks');
      const tasksData = await tasksRes.json();
      setTasks(tasksData.tasks || []);
      if (tasksData.stats) setStats(tasksData.stats);

      if (teamRes.ok) {
        const teamData = await teamRes.json();
        setTeamMembers(teamData.members || []);
        setAllEmployees(teamData.allEmployees || []);
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== 'all') {
        if (statusFilter === 'overdue' && !t.is_overdue) return false;
        if (statusFilter === 'today' && t.due_date !== todayIso) return false;
        if (statusFilter !== 'overdue' && statusFilter !== 'today' && t.status !== statusFilter) return false;
      }
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (employeeFilter !== 'all') {
        const isAssigned = (t.assigned_to || []).some((a) => String(a.user_id) === String(employeeFilter));
        if (!isAssigned) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (t.title || '').toLowerCase().includes(q);
        const matchDesc = (t.description || '').toLowerCase().includes(q);
        const matchCat = (t.category || '').toLowerCase().includes(q);
        const matchAssignee = (t.assigned_to || []).some((a) => (a.name || '').toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchCat && !matchAssignee) return false;
      }
      return true;
    });
  }, [tasks, statusFilter, categoryFilter, priorityFilter, employeeFilter, searchQuery, todayIso]);

  // Create Task
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskForm.title.trim()) return setError('Task Title is required');
    if (!newTaskForm.description.trim()) return setError('Task Description is required');
    if (newTaskForm.assigned_to.length === 0) return setError('Please select at least one assigned IT Team member');
    if (!newTaskForm.due_date) return setError('Due date is required');

    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/it/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTaskForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign IT task');

      setSuccessMsg('IT Task successfully created and assigned!');
      setShowCreateModal(false);
      setNewTaskForm({
        title: '',
        description: '',
        category: 'Website Development',
        priority: 'Medium',
        assigned_to: [],
        start_date: todayIso,
        due_date: todayIso,
        additional_instructions: '',
        attachments: [],
      });
      await fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Review Task (Approve or Request Changes)
  const handleReviewTask = async (e) => {
    e.preventDefault();
    if (!reviewTaskModal) return;

    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/it/tasks/${reviewTaskModal.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: reviewAction,
          feedback: reviewFeedback.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit review');

      setSuccessMsg(reviewAction === 'approved' ? 'Task approved and completed!' : 'Changes requested, task reopened');
      setReviewTaskModal(null);
      setReviewFeedback('');
      await fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel Task
  const handleCancelTask = async (e) => {
    e.preventDefault();
    if (!cancelTaskModal) return;
    if (!cancellationReason.trim()) return setError('Cancellation reason is required');

    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/it/tasks/${cancelTaskModal.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancellation_reason: cancellationReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel task');

      setSuccessMsg(`Task "${cancelTaskModal.title}" cancelled`);
      setCancelTaskModal(null);
      setCancellationReason('');
      await fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add attachment to form
  const handleAddAttachment = () => {
    if (!attUrl.trim()) return;
    const name = attName.trim() || attUrl.trim();
    setNewTaskForm({
      ...newTaskForm,
      attachments: [...newTaskForm.attachments, { name, url: attUrl.trim() }],
    });
    setAttName('');
    setAttUrl('');
  };

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
      case 'Reopened': return 'b-error';
      case 'Cancelled': return 'b-gray';
      default: return 'b-pending';
    }
  };

  return (
    <div className="feature-page anim-fadeup" style={{ padding: '24px' }}>
      {/* HEADER */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 20,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>
              IT Team Task Management
            </h1>
            <span className="badge b-purple" style={{ fontSize: 12, padding: '4px 10px' }}>
              HR Administration
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#64748b' }}>
            Assign technical tasks, monitor development velocity, review deliverable submissions, and manage IT team productivity.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
            style={{
              background: '#0284c7',
              borderColor: '#0284c7',
              fontWeight: 700,
              padding: '10px 20px',
              borderRadius: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>+ Assign New IT Task</span>
          </button>
          <button
            onClick={fetchData}
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 10, padding: '8px 16px', fontWeight: 600 }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* FEEDBACK BANNERS */}
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecdd3',
          color: '#991b1b',
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {successMsg && (
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          color: '#166534',
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} style={{ background: 'none', border: 'none', color: '#166534', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* VIEW TABS: Tasks vs Team Monitoring */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid #e2e8f0', paddingBottom: 10 }}>
        <button
          onClick={() => setActiveTab('tasks')}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            background: activeTab === 'tasks' ? '#0f172a' : '#f1f5f9',
            color: activeTab === 'tasks' ? '#fff' : '#475569',
          }}
        >
          📋 Task Assignments ({tasks.length})
        </button>
        <button
          onClick={() => setActiveTab('team_performance')}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            background: activeTab === 'team_performance' ? '#0f172a' : '#f1f5f9',
            color: activeTab === 'team_performance' ? '#fff' : '#475569',
          }}
        >
          👥 IT Team Performance & Monitoring ({teamMembers.length})
        </button>
      </div>

      {/* ─── TAB 1: TASK ASSIGNMENTS ─── */}
      {activeTab === 'tasks' && (
        <>
          {/* STATS STRIP */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 12,
            marginBottom: 20,
          }}>
            <div style={{ background: '#fff', padding: '14px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Tasks</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{stats.total ?? tasks.length}</div>
            </div>
            <div style={{ background: '#fff', padding: '14px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>In Progress</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#2563eb', marginTop: 4 }}>{stats.in_progress ?? 0}</div>
            </div>
            <div style={{ background: '#fff', padding: '14px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>In Review</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#7c3aed', marginTop: 4 }}>{stats.review ?? 0}</div>
            </div>
            <div style={{ background: '#fff', padding: '14px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Completed</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>{stats.completed ?? 0}</div>
            </div>
            <div style={{ background: '#fff', padding: '14px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: stats.overdue > 0 ? '#e11d48' : '#64748b', textTransform: 'uppercase' }}>Overdue</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: stats.overdue > 0 ? '#e11d48' : '#0f172a', marginTop: 4 }}>{stats.overdue ?? 0}</div>
            </div>
          </div>

          {/* FILTER CONTROLS */}
          <div style={{
            background: '#fff',
            padding: '16px',
            borderRadius: 14,
            border: '1px solid #e2e8f0',
            marginBottom: 20,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ flex: '1 1 240px', minWidth: 200, position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search tasks or assignees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', borderRadius: 8, padding: '8px 12px 8px 34px' }}
              />
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                🔍
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Employee Filter */}
              <select
                className="form-input"
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                style={{ borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
              >
                <option value="all">All Assignees</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.designation})</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                className="form-input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
              >
                <option value="all">All Statuses</option>
                <option value="Submitted for Review">Submitted for Review (Action Required)</option>
                <option value="In Progress">In Progress</option>
                <option value="Assigned">Assigned</option>
                <option value="Acknowledged">Acknowledged</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
                <option value="Reopened">Reopened</option>
                <option value="Cancelled">Cancelled</option>
                <option value="overdue">Overdue Tasks</option>
              </select>

              {/* Category Filter */}
              <select
                className="form-input"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
              >
                <option value="all">All Categories</option>
                {IT_TASK_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {/* Priority Filter */}
              <select
                className="form-input"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                style={{ borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
              >
                <option value="all">All Priorities</option>
                {IT_TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* TASKS TABLE */}
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', background: '#fff', borderRadius: 14 }}>
              Loading tasks...
            </div>
          ) : filteredTasks.length === 0 ? (
            <div style={{
              padding: '60px 20px',
              textAlign: 'center',
              background: '#fff',
              borderRadius: 14,
              border: '1px dashed #cbd5e1',
            }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🛠️</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#334155', marginBottom: 4 }}>No IT tasks found</h3>
              <p style={{ fontSize: 14, color: '#64748b', maxWidth: 420, margin: '0 auto 16px auto' }}>
                No tasks match your selected filter criteria. Click below to assign a daily task.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary"
                style={{ borderRadius: 8, padding: '8px 18px', fontWeight: 700 }}
              >
                + Create IT Task
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    background: '#fff',
                    borderRadius: 14,
                    border: task.status === 'Submitted for Review' ? '2px solid #a855f7' : (task.is_overdue ? '1px solid #fecdd3' : '1px solid #e2e8f0'),
                    padding: '20px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                        <span className={`badge ${getPriorityBadgeClass(task.priority)}`} style={{ fontSize: 11, textTransform: 'uppercase' }}>
                          {task.priority}
                        </span>
                        <span className={`badge ${getStatusBadgeClass(task.status)}`} style={{ fontSize: 11 }}>
                          {task.status}
                        </span>
                        <span className="badge b-gray" style={{ fontSize: 11 }}>
                          {task.category}
                        </span>
                        {task.status === 'Submitted for Review' && (
                          <span className="badge b-purple" style={{ fontSize: 11, fontWeight: 800 }}>
                            ⭐ Ready for HR Review
                          </span>
                        )}
                        {task.is_overdue && (
                          <span className="badge b-error" style={{ fontSize: 11 }}>
                            ⚠️ Overdue
                          </span>
                        )}
                      </div>
                      <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
                        {task.title}
                      </h3>
                      <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap' }}>
                        {task.description}
                      </p>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Assigned To:</div>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 4 }}>
                        {(task.assigned_to || []).map((a, i) => (
                          <span key={i} className="badge b-info" style={{ fontSize: 12, fontWeight: 700 }}>
                            👤 {a.name}
                          </span>
                        ))}
                      </div>
                      <div style={{ fontSize: 12, color: task.is_overdue ? '#e11d48' : '#64748b', marginTop: 6 }}>
                        Due: <strong>{task.due_date}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Submission note if in review or submitted */}
                  {task.work_submissions?.length > 0 && (
                    <div style={{
                      marginTop: 14,
                      background: '#faf5ff',
                      borderRadius: 10,
                      border: '1px solid #e9d5ff',
                      padding: '12px 16px',
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', marginBottom: 4 }}>
                        Latest Work Submission by {task.work_submissions[task.work_submissions.length - 1].submitted_by_name}:
                      </div>
                      <div style={{ fontSize: 13, color: '#3b0764', fontStyle: 'italic', marginBottom: 6 }}>
                        &ldquo;{task.work_submissions[task.work_submissions.length - 1].comment || 'No comment'}&rdquo;
                      </div>
                      {task.work_submissions[task.work_submissions.length - 1].attachments?.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {task.work_submissions[task.work_submissions.length - 1].attachments.map((att, idx) => (
                            <a
                              key={idx}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                padding: '4px 10px',
                                background: '#fff',
                                borderRadius: 6,
                                border: '1px solid #d8b4fe',
                                fontSize: 12,
                                color: '#7c3aed',
                                textDecoration: 'none',
                                fontWeight: 600,
                              }}
                            >
                              🔗 {att.name}: {att.url}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ACTION FOOTER */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                    paddingTop: 14,
                    marginTop: 14,
                    borderTop: '1px solid #f1f5f9',
                  }}>
                    <button
                      onClick={() => setDetailTaskModal(task)}
                      className="btn btn-outline"
                      style={{ fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 8 }}
                    >
                      📜 View Full History
                    </button>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      {/* HR Review Action Button */}
                      {task.status === 'Submitted for Review' && (
                        <button
                          onClick={() => {
                            setReviewTaskModal(task);
                            setReviewAction('approved');
                            setReviewFeedback('');
                          }}
                          className="btn btn-primary"
                          style={{
                            background: '#7c3aed',
                            borderColor: '#7c3aed',
                            fontSize: 12,
                            fontWeight: 700,
                            padding: '6px 16px',
                            borderRadius: 8,
                          }}
                        >
                          ⭐ Review & Approve Work
                        </button>
                      )}

                      {/* Cancel Task Button */}
                      {task.status !== 'Completed' && task.status !== 'Cancelled' && (
                        <button
                          onClick={() => {
                            setCancelTaskModal(task);
                            setCancellationReason('');
                          }}
                          className="btn btn-outline"
                          style={{
                            color: '#e11d48',
                            borderColor: '#fecdd3',
                            fontSize: 12,
                            fontWeight: 700,
                            padding: '6px 14px',
                            borderRadius: 8,
                          }}
                        >
                          Cancel Task
                        </button>
                      )}

                      {task.status === 'Completed' && (
                        <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 700, background: '#f0fdf4', padding: '6px 12px', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                          ✓ Approved & Completed
                        </span>
                      )}

                      {task.status === 'Cancelled' && (
                        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700, background: '#f8fafc', padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                          Cancelled: {task.cancellation_reason}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── TAB 2: IT TEAM PERFORMANCE MONITORING TABLE ─── */}
      {activeTab === 'team_performance' && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                IT Team Performance Overview
              </h2>
              <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>
                Consolidated velocity, task distribution, and completion rates across all IT personnel.
              </p>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    IT Employee
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Assigned
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Pending
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    In Progress
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Completed
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Overdue
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Completion Rate
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((member) => (
                  <tr key={member.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 38,
                          height: 38,
                          borderRadius: '50%',
                          background: '#0284c7',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 14,
                        }}>
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>{member.name}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{member.designation} • {member.employee_id}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>
                      {member.stats.total}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 800, color: '#d97706' }}>
                      {member.stats.pending}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 800, color: '#2563eb' }}>
                      {member.stats.in_progress}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 800, color: '#16a34a' }}>
                      {member.stats.completed}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 800, color: member.stats.overdue > 0 ? '#e11d48' : '#64748b' }}>
                      {member.stats.overdue}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                        <div style={{ width: 80, height: 8, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ width: `${member.stats.completion_percentage}%`, height: '100%', background: '#16a34a' }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                          {member.stats.completion_percentage}%
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => {
                          setEmployeeFilter(member.id);
                          setActiveTab('tasks');
                        }}
                        className="btn btn-outline"
                        style={{ fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 8 }}
                      >
                        View Tasks →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODAL: ASSIGN NEW IT TASK ─── */}
      {showCreateModal && (
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
            maxWidth: 680,
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Assign Daily IT Task
                </h2>
                <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>
                  Create and assign technical task to IT Team members
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask}>
              {/* Title */}
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                  Task Title *
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Optimize Candidate Datasheet export queries"
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                  style={{ width: '100%', borderRadius: 8 }}
                  required
                />
              </div>

              {/* Description */}
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                  Task Description & Requirements *
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Detailed breakdown of the task, expected outcomes, and requirements..."
                  value={newTaskForm.description}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                  style={{ width: '100%', borderRadius: 8 }}
                  required
                />
              </div>

              {/* Category & Priority */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                    Category *
                  </label>
                  <select
                    className="form-input"
                    value={newTaskForm.category}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, category: e.target.value })}
                    style={{ width: '100%', borderRadius: 8 }}
                  >
                    {IT_TASK_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                    Priority *
                  </label>
                  <select
                    className="form-input"
                    value={newTaskForm.priority}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, priority: e.target.value })}
                    style={{ width: '100%', borderRadius: 8 }}
                  >
                    {IT_TASK_PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Assignee Multi-select */}
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                  Assigned Employee(s) * (Select one or multiple IT members)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, maxHeight: 160, overflowY: 'auto', padding: 10, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  {allEmployees.map((emp) => {
                    const isChecked = newTaskForm.assigned_to.includes(emp.id);
                    return (
                      <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewTaskForm({ ...newTaskForm, assigned_to: [...newTaskForm.assigned_to, emp.id] });
                            } else {
                              setNewTaskForm({ ...newTaskForm, assigned_to: newTaskForm.assigned_to.filter((id) => id !== emp.id) });
                            }
                          }}
                        />
                        <span>{emp.name} <span style={{ color: '#64748b', fontSize: 11 }}>({emp.designation})</span></span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Start Date & Due Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={newTaskForm.start_date}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, start_date: e.target.value })}
                    style={{ width: '100%', borderRadius: 8 }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                    Due Date (Deadline) *
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={newTaskForm.due_date}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, due_date: e.target.value })}
                    style={{ width: '100%', borderRadius: 8 }}
                    required
                  />
                </div>
              </div>

              {/* Additional instructions */}
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                  Additional Instructions (Optional)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Ensure backwards-compatible migrations, test on mobile viewport"
                  value={newTaskForm.additional_instructions}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, additional_instructions: e.target.value })}
                  style={{ width: '100%', borderRadius: 8 }}
                />
              </div>

              {/* Attachments */}
              <div style={{ marginBottom: 20, background: '#f8fafc', padding: '14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                  Reference Links / Attachments
                </label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Attachment Name / Label"
                    value={attName}
                    onChange={(e) => setAttName(e.target.value)}
                    style={{ flex: 1, borderRadius: 8 }}
                  />
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://..."
                    value={attUrl}
                    onChange={(e) => setAttUrl(e.target.value)}
                    style={{ flex: 1.5, borderRadius: 8 }}
                  />
                  <button
                    type="button"
                    onClick={handleAddAttachment}
                    className="btn btn-outline"
                    style={{ borderRadius: 8, fontSize: 12, fontWeight: 700 }}
                  >
                    + Add
                  </button>
                </div>

                {newTaskForm.attachments.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {newTaskForm.attachments.map((att, idx) => (
                      <div
                        key={idx}
                        style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', background: '#fff', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }}
                      >
                        <span style={{ color: '#0284c7', fontWeight: 600 }}>📎 {att.name}: {att.url}</span>
                        <button
                          type="button"
                          onClick={() => setNewTaskForm({ ...newTaskForm, attachments: newTaskForm.attachments.filter((_, i) => i !== idx) })}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-outline"
                  style={{ borderRadius: 8 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{ background: '#0284c7', borderColor: '#0284c7', borderRadius: 8, fontWeight: 700 }}
                >
                  {isSubmitting ? 'Assigning...' : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: REVIEW SUBMITTED TASK ─── */}
      {reviewTaskModal && (
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
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 19, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Review IT Task Submission
                </h2>
                <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>
                  Task: <strong>{reviewTaskModal.title}</strong>
                </p>
              </div>
              <button
                onClick={() => setReviewTaskModal(null)}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReviewTask}>
              {/* Review Decision */}
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                  Decision *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setReviewAction('approved')}
                    style={{
                      padding: '12px',
                      borderRadius: 10,
                      border: reviewAction === 'approved' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                      background: reviewAction === 'approved' ? '#f0fdf4' : '#fff',
                      color: reviewAction === 'approved' ? '#166534' : '#475569',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ✓ Approve & Complete
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewAction('changes_requested')}
                    style={{
                      padding: '12px',
                      borderRadius: 10,
                      border: reviewAction === 'changes_requested' ? '2px solid #e11d48' : '1px solid #e2e8f0',
                      background: reviewAction === 'changes_requested' ? '#fff1f2' : '#fff',
                      color: reviewAction === 'changes_requested' ? '#9f1239' : '#475569',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ⚠️ Request Changes (Reopen)
                  </button>
                </div>
              </div>

              {/* Feedback Note */}
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                  {reviewAction === 'approved' ? 'Approval Note (Optional)' : 'Feedback / Required Changes *'}
                </label>
                <textarea
                  className="form-input"
                  rows={4}
                  placeholder={
                    reviewAction === 'approved'
                      ? 'e.g. Verified and working properly. Excellent work!'
                      : 'Detail the issues found or adjustments requested before this task can be approved...'
                  }
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  style={{ width: '100%', borderRadius: 8 }}
                  required={reviewAction === 'changes_requested'}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setReviewTaskModal(null)}
                  className="btn btn-outline"
                  style={{ borderRadius: 8 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{
                    background: reviewAction === 'approved' ? '#16a34a' : '#e11d48',
                    borderColor: reviewAction === 'approved' ? '#16a34a' : '#e11d48',
                    borderRadius: 8,
                    fontWeight: 700,
                  }}
                >
                  {isSubmitting ? 'Saving...' : reviewAction === 'approved' ? 'Approve Task' : 'Send Feedback & Reopen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: CANCEL TASK ─── */}
      {cancelTaskModal && (
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
            maxWidth: 500,
            width: '100%',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          }}>
            <h2 style={{ fontSize: 19, fontWeight: 800, color: '#e11d48', margin: '0 0 6px 0' }}>
              Cancel Task
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px 0' }}>
              Are you sure you want to cancel <strong>{cancelTaskModal.title}</strong>? A reason must be recorded in the audit trail.
            </p>

            <form onSubmit={handleCancelTask}>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                  Cancellation Reason *
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Specify reason for cancelling this technical task..."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  style={{ width: '100%', borderRadius: 8 }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setCancelTaskModal(null)}
                  className="btn btn-outline"
                  style={{ borderRadius: 8 }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{ background: '#e11d48', borderColor: '#e11d48', borderRadius: 8, fontWeight: 700 }}
                >
                  {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: TASK DETAIL & AUDIT HISTORY ─── */}
      {detailTaskModal && (
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
            maxWidth: 700,
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <span className={`badge ${getPriorityBadgeClass(detailTaskModal.priority)}`}>
                    {detailTaskModal.priority}
                  </span>
                  <span className={`badge ${getStatusBadgeClass(detailTaskModal.status)}`}>
                    {detailTaskModal.status}
                  </span>
                  <span className="badge b-gray">{detailTaskModal.category}</span>
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {detailTaskModal.title}
                </h2>
              </div>
              <button
                onClick={() => setDetailTaskModal(null)}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                Description
              </div>
              <div style={{ fontSize: 14, color: '#334155', background: '#f8fafc', padding: '12px 14px', borderRadius: 8, whiteSpace: 'pre-wrap' }}>
                {detailTaskModal.description}
              </div>
            </div>

            {/* Audit Trail */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>
                Status History & Activity ({detailTaskModal.status_history?.length || 0})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(detailTaskModal.status_history || []).map((h, i) => (
                  <div key={i} style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 6, borderLeft: '3px solid #0284c7', fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong style={{ color: '#0f172a' }}>{h.to_status}</strong>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(h.changed_at).toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>By {h.changed_by_name} ({h.changed_by_role})</div>
                    {h.comment && <div style={{ fontSize: 12, color: '#334155', marginTop: 2, fontStyle: 'italic' }}>&ldquo;{h.comment}&rdquo;</div>}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDetailTaskModal(null)}
                className="btn btn-primary"
                style={{ borderRadius: 8, padding: '8px 18px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HrItTaskManagementSection;

