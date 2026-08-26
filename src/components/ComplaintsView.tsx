import React, { useState, useEffect } from 'react';
import { 
  Wrench, Filter, Plus, Sparkles, CheckCircle2, Clock, 
  AlertTriangle, Phone, MessageSquare, ChevronRight, User, Search
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { api } from '../services/api';
import { Complaint, ComplaintCategory, ComplaintPriority, ComplaintStatus } from '../types';

export const ComplaintsView: React.FC = () => {
  const { currentUser } = useAuth();
  const { refreshTrigger, triggerSound } = useRealtime();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Complaint for Details & Timeline Modal
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [timelineComment, setTimelineComment] = useState('');
  const [assignedStaffInput, setAssignedStaffInput] = useState('');
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
    try {
      await api.updateComplaint(selectedComplaint.id, {
        status: statusUpdateInput,
        assignedStaff: assignedStaffInput || selectedComplaint.assignedStaff,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm text-slate-200">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Wrench className="w-5 h-5" />
            </div>
            Society Service Tickets & Maintenance
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {currentUser.role === 'resident' 
              ? `Service tickets registered for Flat ${currentUser.apartmentId || 'A-402'}`
              : 'Society-wide maintenance dispatch & tracking board'}
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all shrink-0 active:scale-95"
        >
          <Plus className="w-4 h-4" /> Register New Ticket
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tickets..."
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 w-56 bg-slate-950/70 text-slate-200 placeholder-slate-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-800 font-medium focus:outline-none bg-slate-950 text-slate-300"
          >
            <option value="All">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-800 font-medium focus:outline-none bg-slate-950 text-slate-300"
          >
            <option value="All">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="text-slate-400 text-xs font-medium">
          Showing <strong className="text-white">{filteredComplaints.length}</strong> tickets
        </div>
      </div>

      {/* Tickets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredComplaints.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-slate-900 rounded-2xl border border-slate-800 p-6 text-slate-500 text-sm">
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
              }}
              className="bg-slate-900 rounded-2xl border border-slate-800 hover:border-slate-700 hover:bg-slate-850 p-5 cursor-pointer transition-all space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                    c.priority === 'Emergency' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                    c.priority === 'High' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    {c.priority}
                  </span>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-xl border ${
                    c.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    c.status === 'In Progress' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {c.status}
                  </span>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    {c.category} • Flat {c.apartmentId}
                  </div>
                  <h3 className="text-sm font-semibold text-white mt-0.5 line-clamp-1">{c.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1">{c.description}</p>
                </div>
              </div>

              {/* AI Triage Snippet */}
              {c.aiTriageSummary && (
                <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-[11px] text-indigo-300 flex items-start gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-1">{c.aiTriageSummary.suggestedAction}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                <span>By {c.residentName}</span>
                <span className="font-mono text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Ticket Details & Timeline Drawer Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto text-slate-200">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                    Flat {selectedComplaint.apartmentId}
                  </span>
                  <span className="text-xs font-mono text-slate-500">Ticket #{selectedComplaint.id}</span>
                </div>
                <h2 className="text-lg font-bold text-white mt-1">{selectedComplaint.title}</h2>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="text-slate-400 hover:text-white text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Main Info */}
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="text-slate-400 block">Category</span>
                  <span className="font-semibold text-white">{selectedComplaint.category}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Priority</span>
                  <span className="font-semibold text-white">{selectedComplaint.priority}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Resident</span>
                  <span className="font-semibold text-white">{selectedComplaint.residentName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Phone</span>
                  <span className="font-mono text-slate-300">{selectedComplaint.residentPhone}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800">
                <span className="text-slate-400 block mb-0.5">Description:</span>
                <p className="text-slate-300 leading-relaxed">{selectedComplaint.description}</p>
              </div>
            </div>

            {/* AI Triage Card */}
            {selectedComplaint.aiTriageSummary && (
              <div className="p-3.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-300 font-semibold">
                  <Sparkles className="w-4 h-4 text-indigo-400" /> AI Triage Assessment
                </div>
                <p className="text-slate-300">{selectedComplaint.aiTriageSummary.suggestedAction}</p>
                <div className="text-[11px] text-indigo-400 font-mono pt-1">
                  Estimated Repair Time: {selectedComplaint.aiTriageSummary.estimatedTime}
                </div>
              </div>
            )}

            {/* Action Form (For Admins or Updating Status) */}
            {currentUser.role === 'admin' && (
              <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-3 text-xs">
                <span className="font-semibold text-indigo-300 block">Administrator Dispatch Actions:</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Update Status:</label>
                    <select
                      value={statusUpdateInput}
                      onChange={(e) => setStatusUpdateInput(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-900 text-slate-200 rounded-lg border border-slate-800 font-semibold focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Assign Staff / Vendor:</label>
                    <input
                      type="text"
                      value={assignedStaffInput}
                      onChange={(e) => setAssignedStaffInput(e.target.value)}
                      placeholder="e.g. Suresh Kumar (Plumber)"
                      className="w-full px-3 py-2 bg-slate-900 text-slate-200 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500 placeholder-slate-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Timeline Note / Work Update:</label>
                  <input
                    type="text"
                    value={timelineComment}
                    onChange={(e) => setTimelineComment(e.target.value)}
                    placeholder="e.g. Replacement pipe fitted; checking for leaks"
                    className="w-full px-3 py-2 bg-slate-900 text-slate-200 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500 placeholder-slate-500"
                  />
                </div>
                <button
                  onClick={handleUpdateTicket}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-md shadow-indigo-600/20 transition-colors"
                >
                  Save Dispatch Updates
                </button>
              </div>
            )}

            {/* Timeline History */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Activity Timeline ({selectedComplaint.timeline.length})
              </span>
              <div className="space-y-2 text-xs">
                {selectedComplaint.timeline.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-start gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">{item.action}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">By {item.authorName} ({item.authorRole})</div>
                      {item.comment && <p className="text-slate-300 mt-1">{item.comment}</p>}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-800 space-y-4 text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Lodge Society Service Ticket</h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateTicket} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Issue Title:</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Lift buzzer continuously ringing"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950/70 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category:</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Priority:</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description:</label>
                <textarea
                  required
                  rows={4}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Explain the problem in detail..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-800 bg-slate-950/70 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700/60 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
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
