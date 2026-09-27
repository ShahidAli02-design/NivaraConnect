import React, { useState, useEffect } from 'react';
import {
  FileText, Sparkles, Plus, Vote, CheckCircle2,
  Calendar, AlertTriangle, Users, MessageSquare, Send, ThumbsUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { api } from '../services/api';
import { Notice, NoticeCategory, NoticePriority } from '../types';

export const NoticesView: React.FC = () => {
  const { currentUser } = useAuth();
  const { refreshTrigger, triggerSound } = useRealtime();

  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Create Notice Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<NoticeCategory>('General');
  const [priority, setPriority] = useState<NoticePriority>('Normal');
  const [hasPoll, setHasPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['Yes', 'No', 'Neutral / Abstain']);
  const [aiTopic, setAiTopic] = useState('');
  const [isDraftingAi, setIsDraftingAi] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    loadNotices();
  }, [refreshTrigger]);

  const loadNotices = async () => {
    try {
      const data = await api.getNotices();
      setNotices(data);
    } catch (e) {
      console.error('Failed to load notices', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAiDraft = async () => {
    if (!aiTopic.trim()) return;
    setIsDraftingAi(true);
    try {
      const result = await api.draftNoticeWithAi(aiTopic, category, 'Clear, polite, and formal');
      setTitle(result.title);
      setContent(result.content);
      setPriority(result.priority as any);
    } catch (e) {
      console.error('AI draft error', e);
    } finally {
      setIsDraftingAi(false);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    setIsPublishing(true);
    try {
      await api.createNotice({
        title,
        content,
        category,
        priority,
        publishedBy: currentUser.name,
        publisherRole: currentUser.role,
        pollQuestion: hasPoll ? pollQuestion : undefined,
        pollOptions: hasPoll ? pollOptions.filter(o => o.trim()) : undefined,
      });
      triggerSound('success');
      setShowCreateModal(false);
      setTitle('');
      setContent('');
      setAiTopic('');
      setHasPoll(false);
      loadNotices();
    } catch (e) {
      console.error('Publish error', e);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleVote = async (noticeId: string, optionId: string) => {
    try {
      await api.votePoll(noticeId, optionId, currentUser.id);
      triggerSound('beep');
      loadNotices();
    } catch (e) {
      console.error('Vote failed', e);
    }
  };

  const handleAcknowledge = async (noticeId: string) => {
    try {
      await api.acknowledgeNotice(noticeId, currentUser.id);
      triggerSound('success');
      loadNotices();
    } catch (e) {
      console.error('Acknowledge failed', e);
    }
  };

  const filteredNotices = notices.filter(n => {
    if (categoryFilter !== 'All' && n.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-6 rounded-3xl border-amber-200/80 shadow-sm">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl border border-amber-200">
              <FileText className="w-5 h-5" />
            </div>
            Digital Notice Board & Community Polls
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Official announcements, AGM circulars, emergency updates, and resident votes
          </p>
        </div>

        {currentUser.role === 'admin' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 btn-gold text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shrink-0 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Publish Announcement
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
        {['All', 'AGM / Meeting', 'Water / Power Supply', 'Maintenance', 'Event', 'Security', 'General'].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3.5 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap ${
              categoryFilter === cat
                ? 'bg-gold-gradient text-white shadow-sm'
                : 'bg-white text-slate-500 hover:text-slate-900 border border-amber-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Notices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredNotices.map((n) => {
          const isAcked = n.acknowledgedUserIds.includes(currentUser.id);
          return (
            <div
              key={n.id}
              className="glass-card rounded-3xl border-amber-200/80 shadow-sm p-6 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                    n.priority === 'Urgent / Alert' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                    n.priority === 'Important' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                    'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {n.priority}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {new Date(n.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider">{n.category}</span>
                  <h2 className="text-base font-bold text-slate-900 mt-0.5">{n.title}</h2>
                </div>

                <div className="text-xs text-slate-600 leading-relaxed whitespace-pre-line bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/70">
                  {n.content}
                </div>

                {/* Poll Section */}
                {n.poll && (
                  <div className="p-4 bg-white rounded-xl border border-amber-300/70 space-y-2.5 shadow-xs">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
                      <Vote className="w-4 h-4 text-amber-600" />
                      <span>Community Poll: {n.poll.question}</span>
                    </div>

                    <div className="space-y-1.5">
                      {n.poll.options.map((opt) => {
                        const isVoted = opt.votedUserIds.includes(currentUser.id);
                        const totalVotes = n.poll?.options.reduce((sum, o) => sum + o.votes, 0) || 1;
                        const pct = Math.round((opt.votes / totalVotes) * 100);
                        return (
                          <button
                            key={opt.id}
                            onClick={() => handleVote(n.id, opt.id)}
                            className={`w-full text-left p-2.5 rounded-lg border text-xs relative overflow-hidden transition-all ${
                              isVoted
                                ? 'border-amber-400 bg-amber-100/70 text-amber-900 font-bold'
                                : 'border-slate-200 bg-white hover:bg-amber-50/60 text-slate-600'
                            }`}
                          >
                            <div
                              className="absolute left-0 top-0 bottom-0 bg-amber-200/40 pointer-events-none"
                              style={{ width: `${pct}%` }}
                            />
                            <div className="relative flex justify-between items-center">
                              <span>{opt.text} {isVoted && '✓ (Your Vote)'}</span>
                              <span className="font-mono text-xs font-bold text-slate-500">{opt.votes} ({pct}%)</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Card Footer */}
              <div className="pt-3 border-t border-amber-100 flex items-center justify-between text-xs">
                <div className="text-slate-500">
                  Published by <strong className="text-slate-900 font-medium">{n.publishedBy}</strong>
                </div>

                <button
                  onClick={() => handleAcknowledge(n.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-colors ${
                    isAcked
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-white hover:bg-amber-50 text-slate-700 border border-amber-200 shadow-xs'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{isAcked ? 'Acknowledged' : 'Acknowledge'} ({n.acknowledgementsCount})</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Publish Notice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-amber-300 space-y-4 max-h-[90vh] overflow-y-auto text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-amber-100">
              <h3 className="text-base font-black text-slate-900">Publish Society Announcement</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-rose-600 font-bold">✕</button>
            </div>

            {/* AI Assistant Generator */}
            <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-300 space-y-2">
              <span className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" /> Draft Notice with Gemini AI:
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="e.g. Pest control treatment across all wings next Tuesday"
                  className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-200"
                />
                <button
                  type="button"
                  onClick={handleAiDraft}
                  disabled={isDraftingAi || !aiTopic.trim()}
                  className="px-3 py-2 btn-gold text-xs font-semibold rounded-lg shrink-0"
                >
                  {isDraftingAi ? 'Drafting...' : 'AI Draft'}
                </button>
              </div>
            </div>

            <form onSubmit={handlePublish} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Headline:</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Notice Headline"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Category:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white"
                  >
                    <option value="General">General</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Water / Power Supply">Water / Power Supply</option>
                    <option value="AGM / Meeting">AGM / Meeting</option>
                    <option value="Event">Event</option>
                    <option value="Security">Security</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Priority:</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Important">Important</option>
                    <option value="Urgent / Alert">Urgent / Alert</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notice Content:</label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter full notice announcement..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white leading-relaxed"
                />
              </div>

              {/* Poll Toggle */}
              <div className="pt-2 border-t border-amber-100 space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasPoll}
                    onChange={(e) => setHasPoll(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded bg-white border-slate-300"
                  />
                  <span>Attach Interactive Community Poll</span>
                </label>

                {hasPoll && (
                  <div className="p-3 bg-amber-50/60 rounded-xl space-y-2 text-xs border border-amber-200/70">
                    <input
                      type="text"
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                      placeholder="Poll Question (e.g. Do you support installing EV chargers?)"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={pollOptions[0]}
                        onChange={(e) => {
                          const copy = [...pollOptions];
                          copy[0] = e.target.value;
                          setPollOptions(copy);
                        }}
                        placeholder="Option 1"
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800"
                      />
                      <input
                        type="text"
                        value={pollOptions[1]}
                        onChange={(e) => {
                          const copy = [...pollOptions];
                          copy[1] = e.target.value;
                          setPollOptions(copy);
                        }}
                        placeholder="Option 2"
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPublishing}
                  className="flex-1 py-2.5 btn-gold text-xs font-semibold rounded-xl"
                >
                  {isPublishing ? 'Publishing...' : 'Broadcast Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
