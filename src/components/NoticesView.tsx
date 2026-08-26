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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm text-slate-200">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <FileText className="w-5 h-5" />
            </div>
            Digital Notice Board & Community Polls
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Official announcements, AGM circulars, emergency updates, and resident votes
          </p>
        </div>

        {currentUser.role === 'admin' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all shrink-0 active:scale-95"
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
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
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
              className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm p-6 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                    n.priority === 'Urgent / Alert' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                    n.priority === 'Important' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                    'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    {n.priority}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {new Date(n.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">{n.category}</span>
                  <h2 className="text-base font-bold text-white mt-0.5">{n.title}</h2>
                </div>

                <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                  {n.content}
                </div>

                {/* Poll Section */}
                {n.poll && (
                  <div className="p-4 bg-slate-950/80 rounded-xl border border-indigo-500/20 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
                      <Vote className="w-4 h-4 text-indigo-400" />
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
                                ? 'border-indigo-500 bg-indigo-950/50 text-indigo-200 font-medium'
                                : 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300'
                            }`}
                          >
                            <div
                              className="absolute left-0 top-0 bottom-0 bg-indigo-500/20 pointer-events-none"
                              style={{ width: `${pct}%` }}
                            />
                            <div className="relative flex justify-between items-center">
                              <span>{opt.text} {isVoted && '✓ (Your Vote)'}</span>
                              <span className="font-mono text-xs font-bold text-slate-400">{opt.votes} ({pct}%)</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Card Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <div className="text-slate-400">
                  Published by <strong className="text-white font-medium">{n.publishedBy}</strong>
                </div>

                <button
                  onClick={() => handleAcknowledge(n.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-colors ${
                    isAcked
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/50'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Publish Society Announcement</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            {/* AI Assistant Generator */}
            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-indigo-500/20 space-y-2">
              <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" /> Draft Notice with Gemini AI:
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="e.g. Pest control treatment across all wings next Tuesday"
                  className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAiDraft}
                  disabled={isDraftingAi || !aiTopic.trim()}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shrink-0 shadow-md shadow-indigo-600/20"
                >
                  {isDraftingAi ? 'Drafting...' : 'AI Draft'}
                </button>
              </div>
            </div>

            <form onSubmit={handlePublish} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Headline:</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Notice Headline"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950/70 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:border-indigo-500"
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Priority:</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Important">Important</option>
                    <option value="Urgent / Alert">Urgent / Alert</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notice Content:</label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter full notice announcement..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-800 bg-slate-950/70 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              {/* Poll Toggle */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasPoll}
                    onChange={(e) => setHasPoll(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded bg-slate-900 border-slate-700"
                  />
                  <span>Attach Interactive Community Poll</span>
                </label>

                {hasPoll && (
                  <div className="p-3 bg-slate-950/80 rounded-xl space-y-2 text-xs border border-slate-800">
                    <input
                      type="text"
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                      placeholder="Poll Question (e.g. Do you support installing EV chargers?)"
                      className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-200 placeholder-slate-500"
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
                        className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-200"
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
                        className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-200"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700/60 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPublishing}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20"
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
