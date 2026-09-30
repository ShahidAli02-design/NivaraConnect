import React, { useState, useEffect } from 'react';
import {
  Wrench, Filter, Plus, Sparkles, CheckCircle2, Clock,
  AlertTriangle, Phone, MessageSquare, ChevronRight, User, Search
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { api } from '../services/api';
import { Complaint, ComplaintCategory, ComplaintPriority, ComplaintStatus, SocietyStaff } from '../types';

export const ComplaintsView: React.FC = () => {
  const { currentUser } = useAuth();
  const { refreshTrigger, triggerSound } = useRealtime();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [staff, setStaff] = useState<SocietyStaff[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Complaint for Details & Timeline Modal
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [timelineComment, setTimelineComment] = useState('');
  const [assignedStaffInput, setAssignedStaffInput] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [statusUpdateInput, setStatusUpdateInput] = useState<ComplaintStatus>('In Progress');

  // New Ticket Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<ComplaintCategory>('Plumbing');
  const [newPriority, setNewPriority] = useState<ComplaintPriority>('Medium');
  const [newDesc, setNewDesc] = useState('');
  const [newFlat, setNewFlat] = useState(currentUser.apartmentId || 'A-402');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadComplaints();
    loadStaff();
  }, [refreshTrigger]);

  const loadComplaints = async () => {
    try {
      const data = await api.getComplaints();
      setComplaints(data);
      if (selectedComplaint) {
        const updated = data.find(c => c.id === selectedComplaint.id);
        if (updated) setSelectedComplaint(updated);
      }
    } catch (e) {
      console.error('Failed to load complaints', e);
    } finally {
      setLoading(false);
    }
  };

  const loadStaff = async () => {
    try {
      setStaff(await api.getStaff());
    } catch (e) {
      console.error('Failed to load staff', e);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDesc) return;
    setIsSubmitting(true);
    try {
      await api.createComplaint({
        title: newTitle,
        description: newDesc,
        category: newCategory,
        priority: newPriority,
        apartmentId: newFlat,
        residentName: currentUser.name,
        residentPhone: currentUser.phone,
      });
      triggerSound('success');
      setShowNewModal(false);
      setNewTitle('');
      setNewDesc('');
      loadComplaints();
    } catch (e) {
      console.error('Failed to create ticket', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTicket = async () => {
    if (!selectedComplaint) return;
    const worker = staff.find(s => s.id === selectedStaffId);
    try {
      await api.updateComplaint(selectedComplaint.id, {
        status: statusUpdateInput,
        assignedStaff: worker ? `${worker.name} (${worker.role})` : (assignedStaffInput || selectedComplaint.assignedStaff),
        assignedStaffPhone: worker?.phone,
        comment: timelineComment || `Status updated to ${statusUpdateInput}`,
        updatedBy: currentUser.name,
        authorRole: currentUser.role,
      });
      triggerSound('success');
      setTimelineComment('');
      loadComplaints();
    } catch (e) {
      console.error('Failed to update ticket', e);
    }
  };

  const filteredComplaints = complaints.filter(c => {
    if (currentUser.role === 'resident') {
      if (c.apartmentId !== currentUser.apartmentId) return false;
    }
    if (statusFilter !== 'All' && c.status !== statusFilter) return false;
    if (categoryFilter !== 'All' && c.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return c.title.toLowerCase().includes(q) ||
             c.description.toLowerCase().includes(q) ||
             c.apartmentId.toLowerCase().includes(q);
    }
    return true;
  });

  const categories: ComplaintCategory[] = [
    'Plumbing', 'Electrical', 'Lift / Elevator', 'Security & Gate',
    'Cleanliness & Waste', 'Noise / Disturbance', 'Carpentry / Civil',
    'Parking', 'Garden & Amenities', 'Other'
  ];

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card rounded-3xl p-6 border-amber-200/80 shadow-sm text-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl border border-amber-200">
              <Wrench className="w-5 h-5" />
            </div>
            Society Service Tickets & Maintenance
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {currentUser.role === 'resident'
              ? `Service tickets registered for Flat ${currentUser.apartmentId || 'A-402'}`
              : 'Society-wide maintenance dispatch & tracking board'}
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2.5 btn-gold text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shrink-0 active:scale-95"
        >
          <Plus className="w-4 h-4" /> Register New Ticket
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-card rounded-3xl p-4 border-amber-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tickets..."
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 w-56 bg-slate-50 text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-amber-200"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:border-amber-500 bg-slate-50 text-slate-800 focus:bg-white"
          >
            <option value="All">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:border-amber-500 bg-slate-50 text-slate-800 focus:bg-white"
          >
            <option value="All">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="text-slate-500 text-xs font-medium">
          Showing <strong className="text-slate-900">{filteredComplaints.length}</strong> tickets
        </div>
      </div>

      {/* Tickets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredComplaints.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white border border-amber-200/70 shadow-xs rounded-2xl p-6 text-slate-400 text-sm">
            No complaints found matching current filters.
          </div>
        ) : (
          filteredComplaints.map((c) => (
            <div
              key={c.id}
              onClick={() => {
                setSelectedComplaint(c);
                setStatusUpdateInput(c.status);
                setAssignedStaffInput(c.assignedStaff || '');
                setSelectedStaffId('');
              }}
              className="bg-white rounded-2xl border border-amber-200/70 hover:border-amber-300 hover:bg-amber-50/40 shadow-xs p-5 cursor-pointer transition-all space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                    c.priority === 'Emergency' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                    c.priority === 'High' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {c.priority}
                  </span>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-xl border ${
                    c.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                    c.status === 'In Progress' ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}>
                    {c.status}
                  </span>
                </div>

                <div>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                    {c.category} • Flat {c.apartmentId}
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 mt-0.5 line-clamp-1">{c.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">{c.description}</p>
                </div>
              </div>

              {/* AI Triage Snippet */}
              {c.aiTriageSummary && (
                <div className="p-2 bg-amber-50/70 rounded-xl border border-amber-300/60 text-[11px] text-amber-800 flex items-start gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                  <span className="line-clamp-1">{c.aiTriageSummary.suggestedAction}</span>
                </div>
              )}

              <div className="pt-2 border-t border-amber-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>By {c.residentName}</span>
                <span className="font-mono text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Ticket Details & Timeline Drawer Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-amber-300 space-y-4 max-h-[90vh] overflow-y-auto text-slate-800">
            <div className="flex items-start justify-between pb-3 border-b border-amber-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                    Flat {selectedComplaint.apartmentId}
                  </span>
                  <span className="text-xs font-mono text-slate-400">Ticket #{selectedComplaint.id}</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-1">{selectedComplaint.title}</h2>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="text-slate-400 hover:text-rose-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Main Info */}
            <div className="p-4 bg-amber-50/60 border border-amber-200/70 rounded-xl space-y-2 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="text-slate-500 block">Category</span>
                  <span className="font-semibold text-slate-900">{selectedComplaint.category}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Priority</span>
                  <span className="font-semibold text-slate-900">{selectedComplaint.priority}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Resident</span>
                  <span className="font-semibold text-slate-900">{selectedComplaint.residentName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Phone</span>
                  <span className="font-mono text-slate-600">{selectedComplaint.residentPhone}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-amber-100">
                <span className="text-slate-500 block mb-0.5">Description:</span>
                <p className="text-slate-600 leading-relaxed">{selectedComplaint.description}</p>
              </div>
            </div>

            {/* AI Triage Card */}
            {selectedComplaint.aiTriageSummary && (
              <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-300/60 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-amber-900 font-semibold">
                  <Sparkles className="w-4 h-4 text-amber-700" /> AI Triage Assessment
                </div>
                <p className="text-slate-600">{selectedComplaint.aiTriageSummary.suggestedAction}</p>
                <div className="text-[11px] text-amber-700 font-mono pt-1">
                  Estimated Repair Time: {selectedComplaint.aiTriageSummary.estimatedTime}
                </div>
              </div>
            )}

            {/* Action Form (For Admins or Updating Status) */}
            {currentUser.role === 'admin' && (
              <div className="p-4 bg-amber-50/60 border border-amber-200/70 rounded-xl space-y-3 text-xs">
                <span className="font-semibold text-amber-800 block">Administrator Dispatch Actions:</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 mb-1">Update Status:</label>
                    <select
                      value={statusUpdateInput}
                      onChange={(e) => setStatusUpdateInput(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 text-slate-800 rounded-lg border border-slate-200 font-semibold focus:outline-none focus:border-amber-500 focus:bg-white"
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Assign On-Duty Worker:</label>
                    <select
                      value={selectedStaffId}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 text-slate-800 rounded-lg border border-slate-200 font-semibold focus:outline-none focus:border-amber-500 focus:bg-white"
                    >
                      <option value="">— Select a worker —</option>
                      {staff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.role}) {s.status !== 'On Duty' ? `— ${s.status}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Or type an external vendor name:</label>
                  <input
                    type="text"
                    value={assignedStaffInput}
                    onChange={(e) => setAssignedStaffInput(e.target.value)}
                    placeholder="e.g. Schindler Elevator Service"
                    className="w-full px-3 py-2 bg-slate-50 text-slate-800 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-amber-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Timeline Note / Work Update:</label>
                  <input
                    type="text"
                    value={timelineComment}
                    onChange={(e) => setTimelineComment(e.target.value)}
                    placeholder="e.g. Replacement pipe fitted; checking for leaks"
                    className="w-full px-3 py-2 bg-slate-50 text-slate-800 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-amber-200"
                  />
                </div>
                <button
                  onClick={handleUpdateTicket}
                  className="px-4 py-2 btn-gold font-semibold rounded-lg transition-colors"
                >
                  Save Dispatch Updates
                </button>
              </div>
            )}

            {/* Timeline History */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Activity Timeline ({selectedComplaint.timeline.length})
              </span>
              <div className="space-y-2 text-xs">
                {selectedComplaint.timeline.map((item, idx) => (
                  <div key={idx} className="p-3 bg-white border border-amber-200/70 rounded-xl flex items-start gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{item.action}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">By {item.authorName} ({item.authorRole})</div>
                      {item.comment && <p className="text-slate-600 mt-1">{item.comment}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-300 space-y-4 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-amber-100">
              <h3 className="text-base font-bold text-slate-900">Lodge Society Service Ticket</h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-rose-600 font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateTicket} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Issue Title:</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Lift buzzer continuously ringing"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Category:</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Priority:</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description:</label>
                <textarea
                  required
                  rows={4}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Explain the problem in detail..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-200 leading-relaxed"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 btn-gold text-xs font-semibold rounded-xl transition-all"
                >
                  {isSubmitting ? 'Submitting...' : 'Register Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
