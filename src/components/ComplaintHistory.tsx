import React, { useState } from "react";
import { Search, Filter, Calendar, MapPin, MessageSquare, Send, X, ShieldAlert, Sparkles, AlertCircle, AlertTriangle, Building, Zap, Gauge } from "lucide-react";
import { Complaint, IssueStatus, IssueSeverity } from "../types";
import { addCommentToComplaint } from "../services/complaints";
import { AIDecisionTimeline } from "./AIDecisionTimeline";

interface ComplaintHistoryProps {
  user: { email: string; name: string };
  complaints: Complaint[];
  selectedComplaintId?: string;
  onRefresh: () => void;
}

export default function ComplaintHistory({ user, complaints, selectedComplaintId, onRefresh }: ComplaintHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSeverity, setSelectedSeverity] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  // Selected complaint details view state
  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(
    selectedComplaintId ? complaints.find(c => c.id === selectedComplaintId) || null : null
  );
  const [newCommentText, setNewCommentText] = useState("");
  const [addingComment, setAddingComment] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);

  // Categorize unique categories for filters
  const categories = ["All", ...Array.from(new Set(complaints.map((c) => c.category)))];

  // Filters logic
  const filteredComplaints = complaints.filter((c) => {
    const matchesSearch = 
      c.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "All" || c.category === selectedCategory;
    const matchesSeverity = selectedSeverity === "All" || c.severity === selectedSeverity;
    const matchesStatus = selectedStatus === "All" || c.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesSeverity && matchesStatus;
  });

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeComplaint || !newCommentText.trim()) return;

    setAddingComment(true);
    try {
      const added = await addCommentToComplaint(activeComplaint.id, {
        authorEmail: user.email,
        authorName: user.name,
        text: newCommentText.trim()
      });

      // Update local state for immediate feedback
      setActiveComplaint({
        ...activeComplaint,
        comments: [...(activeComplaint.comments || []), added]
      });
      setNewCommentText("");
      onRefresh(); // Trigger parent refresh to fetch new data
    } catch (err) {
      console.error("Failed to post comment:", err);
    } finally {
      setAddingComment(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Resolved":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "In Progress":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case "Critical":
        return "bg-red-100 text-red-800 font-bold";
      case "High":
        return "bg-orange-100 text-orange-800";
      case "Medium":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50 font-sans" id="complaint-history-container">
      {/* Sidebar List and Filters */}
      <div className="flex-1 flex flex-col overflow-hidden p-8" id="complaint-history-list-view">
        {/* Title */}
        <div className="mb-6 flex items-center justify-between" id="complaint-history-header">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Complaint Archive</h2>
            <p className="text-slate-500 text-sm">Monitor public submissions, tracking status updates and response actions.</p>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3 mb-6" id="history-filters-panel">
          <div className="flex flex-col md:flex-row gap-3" id="filters-row">
            {/* Search */}
            <div className="flex-1 relative" id="search-container">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                id="complaint-search-input"
                type="text"
                placeholder="Search issues, location description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
              />
            </div>

            {/* Selects */}
            <div className="grid grid-cols-3 gap-2" id="dropdowns-container">
              <select
                id="filter-category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="All">All Categories</option>
                {categories.filter(c => c !== "All").map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                id="filter-severity"
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="All">All Severities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>

              <select
                id="filter-status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
          </div>
        </div>

        {/* Complaints Grid/List */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2" id="complaints-list-scroll">
          {filteredComplaints.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center" id="complaints-empty-state">
              <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-slate-700 font-semibold mb-1">No reports match your filters</h4>
              <p className="text-slate-400 text-xs">Try adjusting your keyword searches or category parameters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="complaints-grid">
              {filteredComplaints.map((c) => (
                <div
                  id={`archive-item-${c.id}`}
                  key={c.id}
                  onClick={() => setActiveComplaint(c)}
                  className={`bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between ${
                    activeComplaint?.id === c.id ? "border-teal-500 ring-2 ring-teal-500/10" : "border-slate-100 hover:border-slate-200"
                  }`}
                >
                  <div className="flex gap-4">
                    {c.imageUrl && (
                      <img
                        src={c.imageUrl}
                        alt={c.category}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-lg object-cover bg-slate-50 border border-slate-100 flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <span className="text-sm font-bold text-slate-800 truncate">{c.category}</span>
                        <div className="flex gap-1 flex-shrink-0">
                          {c.duplicateResult && c.duplicateResult.duplicate_status !== "New" && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                              c.duplicateResult.duplicate_status === "Confirmed Duplicate"
                                ? "bg-rose-50 text-rose-600 border border-rose-100"
                                : "bg-amber-50 text-amber-600 border border-amber-100"
                            }`}>
                              {c.duplicateResult.duplicate_status === "Confirmed Duplicate" ? "Duplicate" : "Potential Duplicate"}
                            </span>
                          )}
                          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${getSeverityStyle(c.severity)}`}>
                            {c.severity}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                        {c.description}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-50 pt-3 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="truncate max-w-[140px]">📍 {c.location}</span>
                    <span className={`px-1.5 py-0.5 rounded border ${getStatusStyle(c.status)}`}>
                      {c.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Slide-out details drawer / sidebar */}
      {activeComplaint && (
        <div className="w-96 bg-white border-l border-slate-200 flex flex-col justify-between shadow-lg h-full overflow-hidden" id="complaint-detail-drawer">
          {/* Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between" id="detail-header">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Complaint Details</span>
              <h3 className="text-md font-extrabold text-slate-800 mt-0.5">{activeComplaint.category}</h3>
            </div>
            <button
              id="close-drawer-btn"
              onClick={() => setActiveComplaint(null)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Details Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6" id="detail-body">
            {activeComplaint.imageUrl && (
              <div id="detail-img-container">
                <img
                  src={activeComplaint.imageUrl}
                  alt={activeComplaint.category}
                  referrerPolicy="no-referrer"
                  className="w-full aspect-video object-cover rounded-xl bg-slate-100 border border-slate-100 shadow-inner"
                />
              </div>
            )}

            {/* Issue AI Stats */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3" id="detail-ai-stats">
              <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                Gemini Inspection Results
              </span>
              
              <div className="grid grid-cols-2 gap-3" id="detail-ai-metrics">
                <div>
                  <span className="text-[10px] text-slate-400 block">Severity Rating</span>
                  <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded mt-1 ${getSeverityStyle(activeComplaint.severity)}`}>
                    {activeComplaint.severity}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Dispatch Priority</span>
                  <span className="text-xs font-extrabold text-slate-700 mt-1 block">{activeComplaint.priority}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Current Status</span>
                  <span className="text-xs font-semibold text-slate-800 mt-1 block">● {activeComplaint.status}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">AI Confidence</span>
                  <span className="text-xs font-extrabold text-teal-600 mt-1 block">{Math.round(activeComplaint.confidence * 100)}%</span>
                </div>
              </div>

              {/* Enhanced Vision Agent properties */}
              {(activeComplaint.short_summary || (activeComplaint.detected_objects && activeComplaint.detected_objects.length > 0)) && (
                <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-3" id="detail-vision-agent-box">
                  {activeComplaint.short_summary && (
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Vision Agent Summary</span>
                      <p className="text-xs text-slate-600 leading-relaxed italic bg-white p-2.5 rounded-lg border border-slate-100/60">
                        "{activeComplaint.short_summary}"
                      </p>
                    </div>
                  )}

                  {activeComplaint.detected_objects && activeComplaint.detected_objects.length > 0 && (
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Detected Objects</span>
                      <div className="flex flex-wrap gap-1" id="detail-detected-tags">
                        {activeComplaint.detected_objects.map((obj, i) => (
                          <span key={i} className="text-[9px] font-medium px-2 py-0.5 bg-slate-200/50 text-slate-600 border border-slate-200/30 rounded-full">
                            🔍 {obj}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Collapsible JSON Metadata for Downstream AI Agents */}
                  <div className="pt-2" id="detail-metadata-collapsible">
                    <button
                      type="button"
                      id="toggle-metadata-btn"
                      onClick={() => setShowMetadata(!showMetadata)}
                      className="text-[9px] font-semibold text-teal-600 hover:text-teal-700 transition-colors flex items-center gap-1 focus:outline-none cursor-pointer"
                    >
                      {showMetadata ? "Hide Downstream JSON Schema" : "Show Downstream JSON Schema"}
                    </button>

                    {showMetadata && (
                      <div className="mt-2 p-2 bg-slate-900 text-slate-300 rounded-lg text-[10px] font-mono overflow-x-auto max-w-full leading-normal border border-slate-850" id="raw-metadata-code">
                        <pre>{JSON.stringify({
                          category: activeComplaint.category,
                          confidence: activeComplaint.confidence,
                          detected_objects: activeComplaint.detected_objects,
                          short_summary: activeComplaint.short_summary,
                          impact_analysis: activeComplaint.impactResult || null,
                          machine_readable: true,
                          target_agents: ["DispatchAgent", "AuditAgent", "ImpactAgent"]
                        }, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Dedicated Impact Agent Assessment */}
              {activeComplaint.impactResult && (
                <div className="mt-3 pt-3 border-t border-purple-100/50 space-y-3" id="detail-impact-agent-box">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-purple-750 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                      Impact Agent Assessment
                    </span>
                    <span className="text-[9px] font-bold text-purple-650 bg-purple-50 px-2 py-0.5 rounded border border-purple-100/40">
                      SLA Verified
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-white p-2 rounded border border-slate-100/80">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Risk Severity Score</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-extrabold text-slate-700">{activeComplaint.impactResult.severity_score}/100</span>
                        <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              activeComplaint.impactResult.severity === "Critical" ? "bg-red-500" :
                              activeComplaint.impactResult.severity === "High" ? "bg-orange-500" :
                              activeComplaint.impactResult.severity === "Medium" ? "bg-amber-500" : "bg-blue-500"
                            }`}
                            style={{ width: `${activeComplaint.impactResult.severity_score}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-2 rounded border border-slate-100/80">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Target Risk Level</span>
                      <span className="font-extrabold text-slate-700 block mt-0.5">🛡️ {activeComplaint.impactResult.risk_level} Impact</span>
                    </div>

                    <div className="bg-white p-2 rounded border border-slate-100/80 col-span-2">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Target Resolution Timeline</span>
                      <span className="font-extrabold text-purple-700 block mt-0.5">⏳ Response SLA: {activeComplaint.impactResult.estimated_response_time}</span>
                    </div>
                  </div>

                  {activeComplaint.impactResult.reason && (
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Urgency Rationale</span>
                      <p className="text-xs text-slate-600 leading-relaxed bg-white p-2 rounded-lg border border-slate-100 shadow-sm italic">
                        "{activeComplaint.impactResult.reason}"
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Dedicated Duplicate Detection Agent */}
              {activeComplaint.duplicateResult && (
                <div className="mt-3 pt-3 border-t border-rose-100/50 space-y-3" id="detail-duplicate-agent-box">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-rose-750 uppercase tracking-wider flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                      Duplicate Detection Agent
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                      activeComplaint.duplicateResult.duplicate_status === "Confirmed Duplicate"
                        ? "text-rose-600 bg-rose-50 border-rose-100"
                        : activeComplaint.duplicateResult.duplicate_status === "Possible Duplicate"
                        ? "text-amber-600 bg-amber-50 border-amber-100"
                        : "text-emerald-600 bg-emerald-50 border-emerald-100"
                    }`}>
                      {activeComplaint.duplicateResult.duplicate_status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-white p-2 rounded border border-slate-100/80">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Similarity Confidence</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-extrabold text-slate-700">{activeComplaint.duplicateResult.similarity_score}%</span>
                        <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              activeComplaint.duplicateResult.duplicate_status === "Confirmed Duplicate" ? "bg-rose-500" :
                              activeComplaint.duplicateResult.duplicate_status === "Possible Duplicate" ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${activeComplaint.duplicateResult.similarity_score}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-2 rounded border border-slate-100/80">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Linked Core Record</span>
                      <span className="font-extrabold text-slate-700 block mt-0.5 truncate">
                        {activeComplaint.linked_complaint_id 
                          ? `🔗 Linked to #${activeComplaint.linked_complaint_id.slice(-6).toUpperCase()}`
                          : "🟢 Unique Core Issue"}
                      </span>
                    </div>
                  </div>

                  {activeComplaint.duplicateResult.reason && (
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Similarity Diagnosis</span>
                      <p className="text-xs text-slate-650 leading-relaxed bg-white p-2 rounded-lg border border-slate-100 shadow-sm italic">
                        "{activeComplaint.duplicateResult.reason}"
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Dedicated Municipal Routing Agent */}
              {activeComplaint.routingResult && (
                <div className="mt-3 pt-3 border-t border-indigo-100/50 space-y-3" id="detail-routing-agent-box">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-indigo-750 uppercase tracking-wider flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-indigo-500" />
                      Municipal Routing Agent
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                      activeComplaint.routingResult.escalation_level === "Emergency"
                        ? "text-rose-600 bg-rose-50 border-rose-100 animate-pulse"
                        : activeComplaint.routingResult.escalation_level === "High"
                        ? "text-amber-600 bg-amber-50 border-amber-100"
                        : "text-indigo-600 bg-indigo-50 border-indigo-100"
                    }`}>
                      {activeComplaint.routingResult.escalation_level} Escalation
                    </span>
                  </div>

                  <div className="bg-gradient-to-r from-indigo-50/50 to-slate-50/50 p-2.5 rounded-lg border border-indigo-100/20">
                    <div className="flex items-start justify-between gap-1.5">
                      <div>
                        <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-wider block">Assigned Department</span>
                        <span className="font-extrabold text-slate-800 text-xs mt-0.5 block">{activeComplaint.routingResult.department}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded self-start">
                        {activeComplaint.routingResult.department_code}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-white p-2 rounded border border-slate-100/80">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Routing Confidence</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-extrabold text-slate-700">
                          {Math.round(activeComplaint.routingResult.routing_confidence * 100)}%
                        </span>
                        <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${Math.round(activeComplaint.routingResult.routing_confidence * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-2 rounded border border-slate-100/80">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Assignment SLA</span>
                      <span className="font-extrabold text-slate-700 block mt-0.5 truncate">
                        ⚡ {activeComplaint.routingResult.estimated_assignment_time}
                      </span>
                    </div>
                  </div>

                  {activeComplaint.routingResult.reason && (
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Routing Rationale</span>
                      <p className="text-xs text-slate-650 leading-relaxed bg-white p-2 rounded-lg border border-slate-100 shadow-sm italic">
                        "{activeComplaint.routingResult.reason}"
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Dedicated Priority Intelligence Agent */}
              {activeComplaint.priorityResult && (
                <div className="mt-3 pt-3 border-t border-purple-100/50 space-y-3" id="detail-priority-agent-box">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-purple-750 uppercase tracking-wider flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-purple-500" />
                      Priority Intelligence Agent
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                      activeComplaint.priorityResult.priority === "Critical"
                        ? "text-rose-600 bg-rose-50 border-rose-200/50 animate-pulse font-extrabold"
                        : activeComplaint.priorityResult.priority === "High"
                        ? "text-orange-600 bg-orange-50 border-orange-200/50"
                        : activeComplaint.priorityResult.priority === "Medium"
                        ? "text-amber-600 bg-amber-50 border-amber-200/50"
                        : "text-emerald-600 bg-emerald-50 border-emerald-200/50"
                    }`}>
                      {activeComplaint.priorityResult.priority} Priority
                    </span>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50/50 to-indigo-50/50 p-2.5 rounded-lg border border-purple-100/20">
                    <span className="text-[8px] font-bold text-purple-400 uppercase tracking-wider block">Recommended Dispatch Action</span>
                    <span className="font-extrabold text-slate-800 text-xs mt-0.5 block">
                      ⚡ {activeComplaint.priorityResult.recommended_action}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-white p-2 rounded border border-slate-100/80 shadow-xs">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Priority Score Meter</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-extrabold text-slate-700">{activeComplaint.priorityResult.priority_score}/100</span>
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              activeComplaint.priorityResult.priority === "Critical" ? "bg-rose-500" :
                              activeComplaint.priorityResult.priority === "High" ? "bg-orange-500" :
                              activeComplaint.priorityResult.priority === "Medium" ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${activeComplaint.priorityResult.priority_score}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-2 rounded border border-slate-100/80 shadow-xs">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-0.5">
                        <Gauge className="w-3.5 h-3.5 text-slate-400" />
                        Confidence Score
                      </span>
                      <span className="font-extrabold text-slate-700 block mt-0.5">
                        {Math.round(activeComplaint.priorityResult.confidence * 100)}% Match Accuracy
                      </span>
                    </div>
                  </div>

                  {activeComplaint.priorityResult.reason && (
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Urgency Rationale</span>
                      <p className="text-xs text-slate-650 leading-relaxed bg-white p-2 rounded-lg border border-slate-100 shadow-sm italic">
                        "{activeComplaint.priorityResult.reason}"
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AI Decision Timeline */}
            <div className="mt-4" id="detail-decision-timeline">
              <AIDecisionTimeline complaint={activeComplaint} />
            </div>

            {/* Description & Location */}
            <div className="space-y-3" id="detail-descriptions">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Description</span>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed bg-slate-50/60 p-3 rounded-lg border border-slate-100/40">
                  {activeComplaint.description}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Coordinates & Location</span>
                <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{activeComplaint.location}</span>
                </div>
              </div>

              <div className="flex justify-between border-t border-slate-50 pt-4 text-[10px] text-slate-400">
                <span>By: {activeComplaint.reporterName}</span>
                <span>{new Date(activeComplaint.createdAt).toLocaleString()}</span>
              </div>
            </div>

            {/* Comments Stream */}
            <div className="border-t border-slate-100 pt-5 space-y-4" id="detail-comments-stream">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" />
                Comments & Dispatch Log ({activeComplaint.comments?.length || 0})
              </span>

              <div className="space-y-3 max-h-52 overflow-y-auto pr-1" id="comments-list">
                {activeComplaint.comments?.map((comment) => (
                  <div key={comment.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100/80" id={`comment-${comment.id}`}>
                    <div className="flex justify-between items-center text-[9px] text-slate-400 mb-1">
                      <span className="font-bold text-slate-600">{comment.authorName}</span>
                      <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-normal">{comment.text}</p>
                  </div>
                ))}
                {(!activeComplaint.comments || activeComplaint.comments.length === 0) && (
                  <p className="text-xs text-slate-400 italic text-center py-2">No updates recorded yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Add Comment Input Form */}
          <form onSubmit={handleAddComment} className="p-4 border-t border-slate-100 bg-slate-50" id="comment-add-form">
            <div className="relative flex items-center" id="comment-input-wrapper">
              <input
                id="comment-text-input"
                type="text"
                required
                placeholder="Type an update or reply..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                disabled={addingComment}
                className="w-full pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
              />
              <button
                id="comment-submit-btn"
                type="submit"
                disabled={addingComment || !newCommentText.trim()}
                className="absolute right-1.5 p-1.5 text-teal-600 hover:text-teal-700 focus:outline-none disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
