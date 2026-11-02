'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { IC } from '@/components/hrms/HrmsLegacy';
import { IT_TASK_CATEGORIES, IT_TASK_PRIORITIES } from '@/lib/it-tasks-constants';
import { toIsoDate } from '@/lib/auto-absent';

export function ItMyTasksSection({ user }) {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filtering & Search
  const [activeTab, setActiveTab] = useState('all'); // all, today, in_progress, pending, review, completed, overdue
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Modals
  const [activeTaskModal, setActiveTaskModal] = useState(null);
  const [submitModalTask, setSubmitModalTask] = useState(null);
  const [submissionComment, setSubmissionComment] = useState('');
  const [submissionLink, setSubmissionLink] = useState('');
  const [submissionFileName, setSubmissionFileName] = useState('');
  const [submissionAttachments, setSubmissionAttachments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Status quick update state
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [quickComment, setQuickComment] = useState('');

  const todayIso = toIsoDate(new Date());

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/it/tasks');
      if (!res.ok) throw new Error('Failed to load your IT tasks');
      const data = await res.json();
      setTasks(data.tasks || []);
      if (data.stats) setStats(data.stats);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Filtered task list
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Tab filter
      if (activeTab === 'today' && t.due_date !== todayIso) return false;
      if (activeTab === 'in_progress' && t.status !== 'In Progress') return false;
      if (activeTab === 'pending' && !['Assigned', 'Acknowledged'].includes(t.status)) return false;
      if (activeTab === 'review' && t.status !== 'Submitted for Review') return false;
      if (activeTab === 'completed' && t.status !== 'Completed') return false;
      if (activeTab === 'overdue' && !t.is_overdue) return false;

      // Category filter
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;

      // Priority filter
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (t.title || '').toLowerCase().includes(q);
        const matchDesc = (t.description || '').toLowerCase().includes(q);
        const matchCat = (t.category || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchCat) return false;
      }

      return true;
    });
  }, [tasks, activeTab, categoryFilter, priorityFilter, searchQuery, todayIso]);

  // Handle Quick Status Update
  const handleUpdateStatus = async (taskId, newStatus, comment = '') => {
    setUpdatingTaskId(taskId);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/it/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, comment: comment || quickComment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update task status');

      setSuccessMsg(`Status updated to ${newStatus}`);
      setQuickComment('');
      await fetchTasks();
      if (activeTaskModal && activeTaskModal.id === taskId) {
        setActiveTaskModal(data.task);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Add Attachment to Work Submission
  const handleAddSubmissionAttachment = () => {
    if (!submissionLink.trim()) return;
    const name = submissionFileName.trim() || submissionLink.trim();
    setSubmissionAttachments([...submissionAttachments, { name, url: submissionLink.trim() }]);
    setSubmissionLink('');
    setSubmissionFileName('');
  };

  // Submit Work for Review
  const handleSubmitForReview = async (e) => {
    e.preventDefault();
    if (!submitModalTask) return;
    if (!submissionComment.trim() && submissionAttachments.length === 0) {
      setError('Please add a completion comment or attach deliverable links/files');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/it/tasks/${submitModalTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Submitted for Review',
          comment: submissionComment.trim(),
          attachments: submissionAttachments,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit task for review');

      setSuccessMsg(`Task "${submitModalTask.title}" submitted to HR for review!`);
      setSubmitModalTask(null);
      setSubmissionComment('');
      setSubmissionAttachments([]);
      await fetchTasks();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
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
              My Daily Tasks
            </h1>
            <span className="badge b-info" style={{ fontSize: 12, padding: '4px 10px' }}>
              IT Team Tasks
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#64748b' }}>
            Daily technical tasks, bug fixes, server maintenance, and operational development assigned by HR Administration.
          </p>
        </div>

        <button
          onClick={fetchTasks}
          className="btn btn-outline"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 10, padding: '8px 16px', fontWeight: 600 }}
        >
          🔄 Refresh
        </button>
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

      {/* STATS STRIP */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 12,
        marginBottom: 20,
      }}>
        <div
          onClick={() => setActiveTab('all')}
          style={{
            background: activeTab === 'all' ? '#0f172a' : '#fff',
            color: activeTab === 'all' ? '#fff' : '#0f172a',
            padding: '14px 16px',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', opacity: 0.8 }}>All Tasks</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{stats.total ?? tasks.length}</div>
        </div>

        <div
          onClick={() => setActiveTab('today')}
          style={{
            background: activeTab === 'today' ? '#0284c7' : '#fff',
            color: activeTab === 'today' ? '#fff' : '#0f172a',
            padding: '14px 16px',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', opacity: 0.8 }}>Today&apos;s Due</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{stats.today ?? 0}</div>
        </div>

        <div
          onClick={() => setActiveTab('in_progress')}
          style={{
            background: activeTab === 'in_progress' ? '#2563eb' : '#fff',
            color: activeTab === 'in_progress' ? '#fff' : '#0f172a',
            padding: '14px 16px',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', opacity: 0.8 }}>In Progress</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{stats.in_progress ?? 0}</div>
        </div>

        <div
          onClick={() => setActiveTab('pending')}
          style={{
            background: activeTab === 'pending' ? '#d97706' : '#fff',
            color: activeTab === 'pending' ? '#fff' : '#0f172a',
            padding: '14px 16px',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', opacity: 0.8 }}>Pending / New</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{stats.pending ?? 0}</div>
        </div>

        <div
          onClick={() => setActiveTab('review')}
          style={{
            background: activeTab === 'review' ? '#7c3aed' : '#fff',
            color: activeTab === 'review' ? '#fff' : '#0f172a',
            padding: '14px 16px',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', opacity: 0.8 }}>In Review</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{stats.review ?? 0}</div>
        </div>

        <div
          onClick={() => setActiveTab('completed')}
          style={{
            background: activeTab === 'completed' ? '#16a34a' : '#fff',
            color: activeTab === 'completed' ? '#fff' : '#0f172a',
            padding: '14px 16px',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', opacity: 0.8 }}>Completed</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{stats.completed ?? 0}</div>
        </div>

        <div
          onClick={() => setActiveTab('overdue')}
          style={{
            background: activeTab === 'overdue' ? '#e11d48' : '#fff',
            color: activeTab === 'overdue' ? '#fff' : (stats.overdue > 0 ? '#e11d48' : '#0f172a'),
            padding: '14px 16px',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', opacity: 0.8 }}>Overdue</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{stats.overdue ?? 0}</div>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
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
        {/* Search Input */}
        <div style={{ flex: '1 1 240px', minWidth: 200, position: 'relative' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search by title, description or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', borderRadius: 8, padding: '8px 12px 8px 34px' }}
          />
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
            🔍
          </span>
        </div>

        {/* Category Dropdown */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
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

          {/* Priority Dropdown */}
          <select
            className="form-input"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{ borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
          >
            <option value="all">All Priorities</option>
            {IT_TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>{p} Priority</option>
            ))}
          </select>
        </div>
      </div>

      {/* TASK LIST TABLE / CARDS */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', background: '#fff', borderRadius: 14 }}>
          Loading your tasks...
        </div>
      ) : filteredTasks.length === 0 ? (
        <div style={{
          padding: '60px 20px',
          textAlign: 'center',
          background: '#fff',
          borderRadius: 14,
          border: '1px dashed #cbd5e1',
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: '#334155', marginBottom: 4 }}>No tasks found</h3>
          <p style={{ fontSize: 14, color: '#64748b', maxWidth: 420, margin: '0 auto' }}>
            {searchQuery || categoryFilter !== 'all' || priorityFilter !== 'all' || activeTab !== 'all'
              ? 'No tasks match your selected filter criteria. Try resetting filters.'
              : 'You do not have any tasks in this queue currently.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              style={{
                background: '#fff',
                borderRadius: 14,
                border: task.is_overdue ? '1px solid #fecdd3' : '1px solid #e2e8f0',
                padding: '20px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
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
                  <div style={{ fontSize: 12, color: '#64748b' }}>Due Date</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: task.is_overdue ? '#e11d48' : '#0f172a' }}>
                    {task.due_date}
                  </div>
                  {task.start_date && (
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                      Start: {task.start_date}
                    </div>
                  )}
                </div>
              </div>

              {/* Additional instructions if any */}
              {task.additional_instructions && (
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, color: '#475569' }}>
                  <strong>Instructions:</strong> {task.additional_instructions}
                </div>
              )}

              {/* Attachments preview */}
              {task.attachments?.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>HR Reference Files:</span>
                  {task.attachments.map((a, i) => (
                    <a
                      key={i}
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '4px 10px',
                        background: '#f1f5f9',
                        borderRadius: 6,
                        fontSize: 12,
                        color: '#0284c7',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      📎 {a.name || a.url}
                    </a>
                  ))}
                </div>
              )}

              {/* Work submissions review notes */}
              {task.review_feedback?.length > 0 && (
                <div style={{
                  background: task.status === 'Completed' ? '#f0fdf4' : '#fffbeb',
                  border: task.status === 'Completed' ? '1px solid #bbf7d0' : '1px solid #fef08a',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                }}>
                  <strong style={{ color: task.status === 'Completed' ? '#166534' : '#854d0e' }}>
                    {task.status === 'Completed' ? '✓ HR Approval Feedback:' : '⚠️ HR Changes Requested:'}
                  </strong>
                  <div style={{ marginTop: 2, color: task.status === 'Completed' ? '#15803d' : '#a16207' }}>
                    {task.review_feedback[task.review_feedback.length - 1].feedback || 'No comment provided'}
                  </div>
                </div>
              )}

              {/* ACTION FOOTER */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
                paddingTop: 12,
                borderTop: '1px solid #f1f5f9',
              }}>
                <button
                  onClick={() => setActiveTaskModal(task)}
                  className="btn btn-outline"
                  style={{ fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 8 }}
                >
                  📜 View History & Details
                </button>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* Status workflow buttons based on current state */}
                  {task.status === 'Assigned' && (
                    <button
                      disabled={updatingTaskId === task.id}
                      onClick={() => handleUpdateStatus(task.id, 'Acknowledged')}
                      className="btn"
                      style={{ background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 8 }}
                    >
                      Acknowledge Task
                    </button>
                  )}

                  {(task.status === 'Assigned' || task.status === 'Acknowledged' || task.status === 'On Hold' || task.status === 'Reopened') && (
                    <button
                      disabled={updatingTaskId === task.id}
                      onClick={() => handleUpdateStatus(task.id, 'In Progress')}
                      className="btn btn-primary"
                      style={{ background: '#0284c7', borderColor: '#0284c7', fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 8 }}
                    >
                      Start Working (In Progress)
                    </button>
                  )}

                  {task.status === 'In Progress' && (
                    <button
                      disabled={updatingTaskId === task.id}
                      onClick={() => handleUpdateStatus(task.id, 'On Hold')}
                      className="btn btn-outline"
                      style={{ fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 8 }}
                    >
                      Put On Hold
                    </button>
                  )}

                  {task.status !== 'Completed' && task.status !== 'Cancelled' && (
                    <button
                      onClick={() => {
                        setSubmitModalTask(task);
                        setSubmissionComment('');
                        setSubmissionAttachments([]);
                      }}
                      className="btn btn-primary"
                      style={{
                        background: '#16a34a',
                        borderColor: '#16a34a',
                        fontSize: 12,
                        fontWeight: 700,
                        padding: '6px 16px',
                        borderRadius: 8,
                      }}
                    >
                      🚀 Submit for HR Review
                    </button>
                  )}

                  {task.status === 'Submitted for Review' && (
                    <span style={{ fontSize: 12, color: '#7c3aed', fontWeight: 700, background: '#f5f3ff', padding: '6px 12px', borderRadius: 8, border: '1px solid #ddd6fe' }}>
                      ⏳ Awaiting HR Review
                    </span>
                  )}

                  {task.status === 'Completed' && (
                    <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 700, background: '#f0fdf4', padding: '6px 12px', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                      ✓ Task Completed
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* WORK SUBMISSION MODAL */}
      {submitModalTask && (
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
            maxWidth: 620,
            width: '100%',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 19, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Submit Work for HR Review
                </h2>
                <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>
                  Task: <strong>{submitModalTask.title}</strong>
                </p>
              </div>
              <button
                onClick={() => setSubmitModalTask(null)}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForReview}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                  Work Summary / Completion Notes *
                </label>
                <textarea
                  className="form-input"
                  rows={4}
                  placeholder="Describe the solution implemented, testing done, or release details for HR review..."
                  value={submissionComment}
                  onChange={(e) => setSubmissionComment(e.target.value)}
                  style={{ width: '100%', borderRadius: 8 }}
                  required
                />
              </div>

              {/* Attachments Section */}
              <div style={{ marginBottom: 20, background: '#f8fafc', padding: '16px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                  Work Deliverables / Proof Attachments (URLs or Files)
                </label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="File or Link Label (e.g. GitHub PR, Preview URL)"
                    value={submissionFileName}
                    onChange={(e) => setSubmissionFileName(e.target.value)}
                    style={{ flex: 1, borderRadius: 8 }}
                  />
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://..."
                    value={submissionLink}
                    onChange={(e) => setSubmissionLink(e.target.value)}
                    style={{ flex: 1.5, borderRadius: 8 }}
                  />
                  <button
                    type="button"
                    onClick={handleAddSubmissionAttachment}
                    className="btn btn-outline"
                    style={{ borderRadius: 8, fontSize: 12, fontWeight: 700 }}
                  >
                    + Add
                  </button>
                </div>

                {submissionAttachments.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                    {submissionAttachments.map((att, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 12px',
                          background: '#fff',
                          borderRadius: 6,
                          border: '1px solid #e2e8f0',
                          fontSize: 12,
                        }}
                      >
                        <span style={{ color: '#0284c7', fontWeight: 600 }}>📎 {att.name}: {att.url}</span>
                        <button
                          type="button"
                          onClick={() => setSubmissionAttachments(submissionAttachments.filter((_, i) => i !== idx))}
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
                  onClick={() => setSubmitModalTask(null)}
                  className="btn btn-outline"
                  style={{ borderRadius: 8 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{ background: '#16a34a', borderColor: '#16a34a', borderRadius: 8, fontWeight: 700 }}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit to HR for Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL TASK DETAILS & AUDIT HISTORY MODAL */}
      {activeTaskModal && (
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
                  <span className={`badge ${getPriorityBadgeClass(activeTaskModal.priority)}`}>
                    {activeTaskModal.priority}
                  </span>
                  <span className={`badge ${getStatusBadgeClass(activeTaskModal.status)}`}>
                    {activeTaskModal.status}
                  </span>
                  <span className="badge b-gray">{activeTaskModal.category}</span>
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {activeTaskModal.title}
                </h2>
              </div>
              <button
                onClick={() => setActiveTaskModal(null)}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>
                Description
              </div>
              <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap', background: '#f8fafc', padding: '14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                {activeTaskModal.description}
              </div>
            </div>

            {/* Audit History Timeline */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 10 }}>
                Status Audit Trail ({activeTaskModal.status_history?.length || 0})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(activeTaskModal.status_history || []).map((h, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '10px 14px',
                      background: '#f8fafc',
                      borderRadius: 8,
                      borderLeft: '4px solid #0284c7',
                      fontSize: 13,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>
                        {h.from_status ? `${h.from_status} → ${h.to_status}` : h.to_status}
                      </span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>
                        {new Date(h.changed_at).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      By: <strong>{h.changed_by_name}</strong> ({h.changed_by_role})
                    </div>
                    {h.comment && (
                      <div style={{ fontSize: 13, color: '#334155', marginTop: 4, fontStyle: 'italic' }}>
                        &ldquo;{h.comment}&rdquo;
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setActiveTaskModal(null)}
                className="btn btn-primary"
                style={{ borderRadius: 8, padding: '8px 20px' }}
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

export default ItMyTasksSection;

