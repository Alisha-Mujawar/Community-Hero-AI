import React, { useState } from "react";
import { Clock, CheckCircle, AlertTriangle, MessageSquare, Send, Check, ShieldAlert, FileText, MapPin, Sparkles, Filter, Info, X, Building, Zap, Gauge } from "lucide-react";
import { Complaint, IssueStatus, IssueSeverity, Comment } from "../types";
import { updateComplaintStatus } from "../services/complaints";
import { AIDecisionTimeline } from "./AIDecisionTimeline";

interface AuthorityDashboardProps {
  user: { email: string; name: string };
  complaints: Complaint[];
  onRefresh: () => void;
}

export default function AuthorityDashboard({ user, complaints, onRefresh }: AuthorityDashboardProps) {
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<"All" | "Pending" | "In Progress" | "Resolved">("All");
  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(null);
  const [officialFeedback, setOfficialFeedback] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);
  const [error, setError] = useState("");
  const [showMetadata, setShowMetadata] = useState(false);

  // Aggregate statistics
  const pendingCount = complaints.filter(c => c.status === "Pending").length;
  const progressCount = complaints.filter(c => c.status === "In Progress").length;
  const resolvedCount = complaints.filter(c => c.status === "Resolved").length;
  const criticalCount = complaints.filter(c => c.severity === "Critical" || c.severity === "High").length;

  // Compute category percentages for visual progress bars
  const total = complaints.length || 1;
  const categoryCount: Record<string, number> = {};
  complaints.forEach(c => {
    categoryCount[c.category] = (categoryCount[c.category] || 0) + 1;
  });

  const categoryStats = Object.keys(categoryCount).map(cat => ({
    name: cat,
    count: categoryCount[cat],
    percentage: Math.round((categoryCount[cat] / total) * 100)
  })).sort((a, b) => b.count - a.count);

  // Filter complaints
  const filtered = complaints.filter(c => {
    if (selectedStatusFilter === "All") return true;
    return c.status === selectedStatusFilter;
  });

  // Handle Status Update
  const handleUpdateStatus = async (status: IssueStatus) => {
    if (!activeComplaint) return;
    setSubmittingAction(true);
    setError("");

    try {
      const commentPayload = officialFeedback.trim() 
        ? {
            authorEmail: user.email,
            authorName: user.name,
            text: `[OFFICIAL FEEDBACK - Status changed to ${status}]: ${officialFeedback.trim()}`
          }
        : undefined;

      await updateComplaintStatus(activeComplaint.id, status, commentPayload);
      
      // Update local states
      const updatedComments = commentPayload 
        ? [
            ...(activeComplaint.comments || []),
            {
              id: Math.random().toString(36).substring(2, 9),
              createdAt: new Date().toISOString(),
              ...commentPayload
            }
          ]
        : activeComplaint.comments;

      setActiveComplaint({
        ...activeComplaint,
        status,
        comments: updatedComments
      });
      setOfficialFeedback("");
      onRefresh(); // Trigger parent database reload
    } catch (err: any) {
      console.error(err);
      setError("Failed to update Firestore document status.");
    } finally {
      setSubmittingAction(false);
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case "Critical":
        return "bg-red-100 text-red-800 font-bold border border-red-200";
      case "High":
        return "bg-orange-100 text-orange-800 border border-orange-200";
      case "Medium":
        return "bg-amber-100 text-amber-800 border border-amber-200";
      default:
        return "bg-blue-100 text-blue-800 border border-blue-200";
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Resolved":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      case "In Progress":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-red-50 text-red-700 border border-red-200";
    }
  };

  return (
    <div className="flex-1 overflow-hidden flex bg-slate-50 font-sans" id="authority-dashboard-container">
      {/* Left Columns - Stats & Active List */}
      <div className="flex-1 flex flex-col overflow-hidden p-8" id="authority-left-panel">
        
        {/* Header */}
        <div className="mb-6 flex items-center justify-between" id="authority-header">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Public Works Authority Control</h2>
            <p className="text-slate-500 text-sm">Review real-time citizen-reported complaints, manage dispatches, and log status updates.</p>
          </div>
        </div>

        {/* Analytics Top Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6" id="authority-stats-strip">
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center" id="auth-stat-pending">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">New Pending</span>
            <span className="text-2xl font-extrabold text-red-600 block mt-1">{pendingCount}</span>
            <span className="text-[9px] text-slate-400">Needs dispatcher</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center" id="auth-stat-progress">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">In Dispatch</span>
            <span className="text-2xl font-extrabold text-amber-500 block mt-1">{progressCount}</span>
            <span className="text-[9px] text-slate-400">Technicians active</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center" id="auth-stat-resolved">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Resolved Issues</span>
            <span className="text-2xl font-extrabold text-emerald-600 block mt-1">{resolvedCount}</span>
            <span className="text-[9px] text-slate-400">Archived cases</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center" id="auth-stat-critical">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">High Severity</span>
            <span className="text-2xl font-extrabold text-rose-700 block mt-1">{criticalCount}</span>
            <span className="text-[9px] text-rose-500 font-semibold">Immediate hazards</span>
          </div>
        </div>

        {/* Content Splitting */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden" id="authority-split-grid">
          {/* List and Table Column */}
          <div className="lg:col-span-2 flex flex-col overflow-hidden" id="authority-list-col">
            
            {/* Table Filters */}
            <div className="flex items-center justify-between bg-white px-4 py-3 rounded-t-xl border-t border-x border-slate-100" id="table-filter-bar">
              <span className="text-xs font-bold text-slate-700">Submissions Queue</span>
              <div className="flex gap-1.5" id="table-filter-buttons">
                {(["All", "Pending", "In Progress", "Resolved"] as const).map((status) => (
                  <button
                    id={`auth-filter-${status.toLowerCase().replace(/\s+/g, '-')}`}
                    key={status}
                    onClick={() => setSelectedStatusFilter(status)}
                    className={`px-3 py-1 rounded text-[10px] font-bold transition-colors ${
                      selectedStatusFilter === status 
                        ? "bg-slate-900 text-white" 
                        : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Submissions List Container */}
            <div className="flex-1 overflow-y-auto bg-white border-x border-b border-slate-100 rounded-b-xl" id="queue-scroll">
              {filtered.length === 0 ? (
                <div className="p-12 text-center" id="queue-empty">
                  <p className="text-xs text-slate-400 italic">No submissions match the selected queue filter.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50" id="queue-items-list">
                  {filtered.map((item) => (
                    <div
                      id={`queue-item-${item.id}`}
                      key={item.id}
                      onClick={() => {
                        setActiveComplaint(item);
                        setOfficialFeedback("");
                      }}
                      className={`p-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors cursor-pointer ${
                        activeComplaint?.id === item.id ? "bg-teal-50/20" : ""
                      }`}
                    >
                      <div className="flex gap-3 min-w-0" id="queue-item-left">
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.category}
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded object-cover border border-slate-100 bg-slate-50 flex-shrink-0"
                          />
                        )}
                        <div className="min-w-0" id="queue-item-texts">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="text-xs font-bold text-slate-800 truncate">{item.category}</h4>
                            {item.duplicateResult && item.duplicateResult.duplicate_status !== "New" && (
                              <span className={`text-[8px] font-bold px-1 rounded-full ${
                                item.duplicateResult.duplicate_status === "Confirmed Duplicate"
                                  ? "bg-rose-100 text-rose-800 border border-rose-200/40"
                                  : "bg-amber-100 text-amber-800 border border-amber-200/40"
                              }`}>
                                {item.duplicateResult.duplicate_status === "Confirmed Duplicate" ? "Duplicate" : "Potential Duplicate"}
                              </span>
                            )}
                            <span className={`text-[8px] font-bold px-1 rounded-full ${getSeverityStyle(item.severity)}`}>
                              {item.severity}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate leading-relaxed max-w-sm">
                            {item.description}
                          </p>
                          <span className="text-[9px] text-slate-400 block mt-1">📍 {item.location}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 flex-shrink-0" id="queue-item-right">
                        <span className={`text-[9px] font-semibold px-2 py-0.5 rounded border ${getStatusStyle(item.status)}`}>
                          {item.status}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar Charts and Category distribution */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-5 overflow-y-auto" id="authority-charts-panel">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Category Distribution</h3>
            
            <div className="space-y-4" id="distribution-bars">
              {categoryStats.map((cat) => (
                <div key={cat.name} className="space-y-1" id={`dist-bar-${cat.name.replace(/\s+/g, '-').toLowerCase()}`}>
                  <div className="flex justify-between text-xs" id="dist-texts">
                    <span className="font-semibold text-slate-700 truncate max-w-[130px]">{cat.name}</span>
                    <span className="text-slate-400 font-medium">{cat.count} ({cat.percentage}%)</span>
                  </div>
                  {/* Styled proportional loading bar */}
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden" id="dist-bar-track">
                    <div
                      className="h-full bg-teal-500 rounded-full transition-all"
                      style={{ width: `${cat.percentage}%` }}
                      id="dist-bar-fill"
                    />
                  </div>
                </div>
              ))}

              {categoryStats.length === 0 && (
                <p className="text-xs text-slate-400 italic text-center py-4">No data categories loaded.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Extreme Right Action Drawer */}
      {activeComplaint && (
        <div className="w-96 bg-white border-l border-slate-200 flex flex-col justify-between shadow-lg h-full overflow-hidden" id="authority-action-drawer">
          {/* Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between" id="action-drawer-header">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Review Dispatch Case</span>
              <h3 className="text-md font-extrabold text-slate-800 mt-0.5 truncate max-w-[200px]">{activeComplaint.category}</h3>
            </div>
            <button
              id="close-action-drawer-btn"
              onClick={() => setActiveComplaint(null)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Actions & Description Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5" id="action-drawer-body">
            {activeComplaint.imageUrl && (
              <img
                src={activeComplaint.imageUrl}
                alt={activeComplaint.category}
                referrerPolicy="no-referrer"
                className="w-full aspect-video object-cover rounded-xl bg-slate-50 border border-slate-100 shadow-sm"
              />
            )}

            {/* Quick Summary Coordinates */}
            <div className="space-y-2 text-xs text-slate-600 bg-slate-50/60 border border-slate-100 p-3 rounded-lg" id="action-case-details">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="truncate">📍 {activeComplaint.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="line-clamp-2">{activeComplaint.description}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-100/60 pt-2 text-[10px] text-slate-400">
                <span>By: {activeComplaint.reporterName}</span>
                <span>{new Date(activeComplaint.createdAt).toLocaleString()}</span>
              </div>
            </div>

            {/* AI Diagnostics details */}
            <div className="p-3.5 bg-purple-50/30 border border-purple-100/50 rounded-xl space-y-3" id="action-ai-audit">
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                Gemini Inspection Audit
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs" id="action-ai-grid">
                <div>
                  <span className="text-[10px] text-slate-400">AI Category</span>
                  <span className="block font-bold text-slate-700">{activeComplaint.category}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Severity</span>
                  <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${getSeverityStyle(activeComplaint.severity)}`}>
                    {activeComplaint.severity}
                  </span>
                </div>
              </div>

              {/* Enhanced Vision Agent metrics */}
              {(activeComplaint.short_summary || (activeComplaint.detected_objects && activeComplaint.detected_objects.length > 0)) && (
                <div className="mt-2.5 pt-2.5 border-t border-purple-100/40 space-y-2.5 text-xs" id="action-vision-agent-box">
                  {activeComplaint.short_summary && (
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Vision Agent Summary</span>
                      <p className="text-xs text-slate-600 leading-relaxed italic bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
                        "{activeComplaint.short_summary}"
                      </p>
                    </div>
                  )}

                  {activeComplaint.detected_objects && activeComplaint.detected_objects.length > 0 && (
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Detected Objects</span>
                      <div className="flex flex-wrap gap-1" id="action-detected-tags">
                        {activeComplaint.detected_objects.map((obj, i) => (
                          <span key={i} className="text-[9px] font-medium px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200/30 rounded-full">
                            🔍 {obj}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                                {/* Collapsible JSON Metadata for Downstream AI Agents */}
                  <div className="pt-1" id="action-metadata-collapsible">
                    <button
                      type="button"
                      id="toggle-action-metadata-btn"
                      onClick={() => setShowMetadata(!showMetadata)}
                      className="text-[9px] font-semibold text-purple-700 hover:text-purple-800 transition-colors flex items-center gap-1 focus:outline-none cursor-pointer"
                    >
                      {showMetadata ? "Hide Downstream JSON Schema" : "Show Downstream JSON Schema"}
                    </button>

                    {showMetadata && (
                      <div className="mt-2 p-2 bg-slate-900 text-slate-300 rounded-lg text-[10px] font-mono overflow-x-auto max-w-full leading-normal border border-slate-850" id="action-raw-metadata-code">
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

              {/* Enhanced Impact Agent metrics for Authority Dispatch */}
              {activeComplaint.impactResult && (
                <div className="mt-2.5 pt-2.5 border-t border-purple-150 space-y-2 text-xs" id="action-impact-agent-box">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-purple-700 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                      Impact Agent Assessment
                    </span>
                    <span className="text-[9px] font-bold text-purple-700 bg-purple-100/50 px-2 py-0.5 rounded border border-purple-200/30">
                      SLA Priority Matrix
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-white p-2 rounded border border-purple-100/30 shadow-sm">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Severity Score</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-extrabold text-slate-800">{activeComplaint.impactResult.severity_score}/100</span>
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

                    <div className="bg-white p-2 rounded border border-purple-100/30 shadow-sm">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Risk Category</span>
                      <span className="font-extrabold text-slate-800 block mt-0.5">🛡️ {activeComplaint.impactResult.risk_level} Impact</span>
                    </div>

                    <div className="bg-white p-2 rounded border border-purple-100/30 shadow-sm col-span-2">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Response SLA Timeline</span>
                      <span className="font-extrabold text-purple-750 block mt-0.5">⏳ Dispatch required within {activeComplaint.impactResult.estimated_response_time}</span>
                    </div>
                  </div>

                  {activeComplaint.impactResult.reason && (
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Urgency Reason / SLA Calculation</span>
                      <p className="text-xs text-slate-650 leading-relaxed bg-white p-2 rounded-lg border border-purple-150/40 shadow-xs italic">
                        "{activeComplaint.impactResult.reason}"
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Dedicated Duplicate Detection Assessment for Authority Dispatch */}
              {activeComplaint.duplicateResult && (
                <div className="mt-2.5 pt-2.5 border-t border-rose-150 space-y-2 text-xs" id="action-duplicate-agent-box">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-rose-700 uppercase tracking-wider flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                      Duplicate Detection Assessment
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                      activeComplaint.duplicateResult.duplicate_status === "Confirmed Duplicate"
                        ? "text-rose-750 bg-rose-50 border-rose-200/30"
                        : activeComplaint.duplicateResult.duplicate_status === "Possible Duplicate"
                        ? "text-amber-750 bg-amber-50 border-amber-200/30"
                        : "text-emerald-750 bg-emerald-50 border-emerald-200/30"
                    }`}>
                      {activeComplaint.duplicateResult.duplicate_status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-white p-2 rounded border border-rose-100/30 shadow-sm">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Similarity Confidence</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-extrabold text-slate-800">{activeComplaint.duplicateResult.similarity_score}%</span>
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

                    <div className="bg-white p-2 rounded border border-rose-100/30 shadow-sm">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Record Core Mapping</span>
                      <span className="font-extrabold text-slate-800 block mt-0.5 truncate">
                        {activeComplaint.linked_complaint_id 
                          ? `🔗 Linked to Original #${activeComplaint.linked_complaint_id.slice(-6).toUpperCase()}`
                          : "🟢 Primary Unique Incident"}
                      </span>
                    </div>
                  </div>

                  {activeComplaint.duplicateResult.reason && (
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Duplicate Agent Logic / Similarity Criteria</span>
                      <p className="text-xs text-slate-650 leading-relaxed bg-white p-2 rounded-lg border border-rose-150/40 shadow-xs italic">
                        "{activeComplaint.duplicateResult.reason}"
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Dedicated Municipal Routing Assessment for Authority Dispatch */}
              {activeComplaint.routingResult && (
                <div className="mt-2.5 pt-2.5 border-t border-indigo-150 space-y-2 text-xs" id="action-routing-agent-box">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-indigo-600" />
                      Municipal Routing Assessment
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                      activeComplaint.routingResult.escalation_level === "Emergency"
                        ? "text-rose-750 bg-rose-50 border-rose-200/30 animate-pulse font-extrabold"
                        : activeComplaint.routingResult.escalation_level === "High"
                        ? "text-amber-750 bg-amber-50 border-amber-200/30"
                        : "text-indigo-750 bg-indigo-50 border-indigo-200/30"
                    }`}>
                      {activeComplaint.routingResult.escalation_level} Escalation
                    </span>
                  </div>

                  <div className="bg-gradient-to-r from-indigo-50/50 to-slate-50/50 p-2.5 rounded-lg border border-indigo-100/30">
                    <div className="flex items-start justify-between gap-1.5">
                      <div>
                        <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-wider block">Target Agency / Division</span>
                        <span className="font-extrabold text-slate-800 text-xs mt-0.5 block">{activeComplaint.routingResult.department}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded self-start">
                        {activeComplaint.routingResult.department_code}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-white p-2 rounded border border-indigo-100/30 shadow-sm">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Routing Confidence</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-extrabold text-slate-800">
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

                    <div className="bg-white p-2 rounded border border-indigo-100/30 shadow-sm">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">SLA Assignment</span>
                      <span className="font-extrabold text-slate-800 block mt-0.5 truncate">
                        ⚡ {activeComplaint.routingResult.estimated_assignment_time}
                      </span>
                    </div>
                  </div>

                  {activeComplaint.routingResult.reason && (
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Routing Decision Logic</span>
                      <p className="text-xs text-slate-650 leading-relaxed bg-white p-2 rounded-lg border border-indigo-150/40 shadow-xs italic">
                        "{activeComplaint.routingResult.reason}"
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Dedicated Priority Intelligence Assessment for Authority Dispatch */}
              {activeComplaint.priorityResult && (
                <div className="mt-2.5 pt-2.5 border-t border-purple-150 space-y-2 text-xs" id="action-priority-agent-box">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-purple-750 uppercase tracking-wider flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-purple-600 animate-bounce" />
                      Priority Intelligence Assessment
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                      activeComplaint.priorityResult.priority === "Critical"
                        ? "text-rose-750 bg-rose-50 border-rose-200/30 animate-pulse font-extrabold"
                        : activeComplaint.priorityResult.priority === "High"
                        ? "text-orange-750 bg-orange-50 border-orange-200/30"
                        : activeComplaint.priorityResult.priority === "Medium"
                        ? "text-amber-750 bg-amber-50 border-amber-200/30"
                        : "text-emerald-750 bg-emerald-50 border-emerald-200/30"
                    }`}>
                      {activeComplaint.priorityResult.priority} operational urgency
                    </span>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50/50 to-indigo-50/50 p-2.5 rounded-lg border border-purple-100/30">
                    <div>
                      <span className="text-[8px] font-bold text-purple-400 uppercase tracking-wider block">Recommended Dispatch Action</span>
                      <span className="font-extrabold text-slate-800 text-xs mt-0.5 block">⚡ {activeComplaint.priorityResult.recommended_action}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-white p-2 rounded border border-purple-100/30 shadow-sm">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Priority Score Meter</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-extrabold text-slate-800">
                          {activeComplaint.priorityResult.priority_score}/100
                        </span>
                        <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
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

                    <div className="bg-white p-2 rounded border border-purple-100/30 shadow-sm">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-0.5">
                        <Gauge className="w-3.5 h-3.5 text-slate-400" />
                        Confidence Accuracy
                      </span>
                      <span className="font-extrabold text-slate-800 block mt-0.5">
                        {Math.round(activeComplaint.priorityResult.confidence * 100)}% Match
                      </span>
                    </div>
                  </div>

                  {activeComplaint.priorityResult.reason && (
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Priority Synthesis Reason</span>
                      <p className="text-xs text-slate-650 leading-relaxed bg-white p-2 rounded-lg border border-indigo-150/40 shadow-xs italic">
                        "{activeComplaint.priorityResult.reason}"
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AI Decision Timeline */}
            <div id="action-decision-timeline" className="mb-4">
              <AIDecisionTimeline complaint={activeComplaint} />
            </div>

            {/* Error notifications */}
            {error && (
              <p className="text-xs text-red-600 p-3 bg-red-50 border border-red-200 rounded-lg" id="action-error-msg">{error}</p>
            )}

            {/* Feedback Dispatch Textbox */}
            <div className="space-y-1.5" id="official-comment-group">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider" htmlFor="official-feedback">
                Dispatch / Resolution Notes
              </label>
              <textarea
                id="official-feedback"
                rows={3}
                placeholder="Write official resolution update, or dispatch notes to log in Firestore (e.g. dispatched crew with patch-machine #2)..."
                value={officialFeedback}
                onChange={(e) => setOfficialFeedback(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all resize-none"
              />
            </div>
          </div>

          {/* Action Triggers Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col gap-2.5" id="action-drawer-footer">
            {activeComplaint.status !== "In Progress" && activeComplaint.status !== "Resolved" && (
              <button
                id="action-start-progress-btn"
                onClick={() => handleUpdateStatus("In Progress")}
                disabled={submittingAction}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                {submittingAction ? "Processing..." : "Start Dispatch Work (In Progress)"}
              </button>
            )}

            {activeComplaint.status !== "Resolved" && (
              <button
                id="action-resolve-btn"
                onClick={() => handleUpdateStatus("Resolved")}
                disabled={submittingAction}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                {submittingAction ? "Processing..." : "Mark as Resolved"}
              </button>
            )}

            {activeComplaint.status === "Resolved" && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs flex items-center justify-center gap-2 border border-emerald-100" id="case-fully-resolved-msg">
                <Check className="w-4 h-4" />
                <span>Case fully resolved and closed.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
