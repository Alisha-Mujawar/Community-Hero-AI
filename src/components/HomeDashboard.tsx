import { AlertTriangle, CheckCircle2, Clock, Plus, ArrowRight, Shield, Award, Sparkles } from "lucide-react";
import { Complaint, QuickStats } from "../types";
import { computeQuickStats } from "../services/complaints";

interface HomeDashboardProps {
  user: { name: string; email: string };
  complaints: Complaint[];
  onReportIssueClick: () => void;
  onViewComplaint: (complaint: Complaint) => void;
}

export default function HomeDashboard({ user, complaints, onReportIssueClick, onViewComplaint }: HomeDashboardProps) {
  const stats = computeQuickStats(complaints);
  const recentIssues = complaints.slice(0, 3);

  // Status style helper
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
    <div className="flex-1 overflow-y-auto p-8 bg-slate-50 font-sans" id="home-dashboard-container">
      {/* Top Welcome Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 rounded-2xl p-8 text-white relative overflow-hidden shadow-lg mb-8" id="home-welcome-card">
        {/* Decorative ambient background blur */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
        <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl -mb-10" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6" id="welcome-content">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-500/15 border border-teal-500/20 text-teal-300 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Empowering Community Action
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight" id="welcome-title">
              Welcome Back, {user.name}!
            </h2>
            <p className="text-slate-300 text-sm mt-2 leading-relaxed" id="welcome-text">
              You are signed in as a Community Hero. Thank you for keeping our neighborhood clean, safe, and efficient. Use our real-time AI to submit, identify, and dispatch civic issues instantly.
            </p>
          </div>
          
          <button
            id="home-report-cta-btn"
            onClick={onReportIssueClick}
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold rounded-xl shadow-md shadow-teal-500/20 transition-all hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5" />
            Report Civic Issue
          </button>
        </div>
      </div>

      {/* Quick Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8" id="home-stats-grid">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between" id="stat-total">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Reports</span>
            <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{stats.total}</h3>
            <p className="text-xs text-slate-400 mt-1">Submitted in your region</p>
          </div>
          <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-500">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between" id="stat-pending">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active / Pending</span>
            <h3 className="text-3xl font-extrabold text-amber-600 mt-1">{stats.pending}</h3>
            <p className="text-xs text-amber-500 mt-1">Currently being reviewed</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center text-amber-500">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between" id="stat-resolved">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Resolved Issues</span>
            <h3 className="text-3xl font-extrabold text-emerald-600 mt-1">{stats.resolved}</h3>
            <p className="text-xs text-emerald-500 mt-1">Completed by city works</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-500">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Body Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="home-body-grid">
        {/* Recent Complaints Column */}
        <div className="lg:col-span-2 space-y-4" id="home-recent-column">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-slate-800">Your Recent Reports</h3>
            <span className="text-xs text-slate-400 font-medium">Showing latest {recentIssues.length}</span>
          </div>

          {recentIssues.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center" id="empty-recent-state">
              <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6 text-slate-300" />
              </div>
              <h4 className="text-slate-700 font-semibold mb-1">No reports filed yet</h4>
              <p className="text-slate-400 text-xs max-w-sm mx-auto mb-4">
                Be the first to keep our neighborhood safe. Click the button above to file a complaint.
              </p>
            </div>
          ) : (
            <div className="space-y-4" id="recent-issues-list">
              {recentIssues.map((issue) => (
                <div
                  id={`recent-issue-card-${issue.id}`}
                  key={issue.id}
                  onClick={() => onViewComplaint(issue)}
                  className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all cursor-pointer flex gap-4"
                >
                  {issue.imageUrl && (
                    <img
                      src={issue.imageUrl}
                      alt={issue.category}
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 rounded-xl object-cover flex-shrink-0 bg-slate-100 border border-slate-100"
                    />
                  )}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-slate-800 truncate">{issue.category}</span>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${getSeverityStyle(issue.severity)}`}>
                            {issue.severity}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getStatusStyle(issue.status)}`}>
                            {issue.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {issue.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                      <span className="truncate max-w-[150px]">📍 {issue.location}</span>
                      <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Info Panel */}
        <div className="space-y-6" id="home-info-sidebar">
          {/* AI Feature Spotlight */}
          <div className="bg-teal-50 p-6 rounded-2xl border border-teal-100/60 relative overflow-hidden" id="ai-feature-spotlight">
            <div className="absolute top-0 right-0 w-24 h-24 bg-teal-400/10 rounded-full blur-xl" />
            <h4 className="text-teal-900 font-bold text-sm mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-teal-600" />
              AI Autopiloting Enabled
            </h4>
            <p className="text-teal-700/80 text-xs leading-relaxed mb-4">
              Our backend utilizes <strong>Gemini 2.5 Flash</strong> to analyze incoming issue photos instantly. It automatically extracts:
            </p>
            <ul className="space-y-2 text-xs text-teal-800 font-medium mb-1">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                Precise Complaint Category
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                Infrastructure Severity Levels
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                Action Priority Recommendations
              </li>
            </ul>
          </div>

          {/* Civic Guidelines */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm" id="civic-guidelines">
            <h4 className="text-slate-800 font-bold text-sm mb-3">Submission Guidelines</h4>
            <div className="space-y-3" id="guideline-list">
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                <div>
                  <h5 className="text-xs font-semibold text-slate-700">Clear Photography</h5>
                  <p className="text-[11px] text-slate-400 leading-normal">Ensure the problem (e.g., pothole depth or trash volume) is fully visible and in daylight if possible.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                <div>
                  <h5 className="text-xs font-semibold text-slate-700">Detailed Coordinates</h5>
                  <p className="text-[11px] text-slate-400 leading-normal">Provide landmark coordinates or street numbers to guide the maintenance crew quickly.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
