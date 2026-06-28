import React, { useState } from "react";
import { Eye, ShieldAlert, Copy, Building, Zap, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { Complaint } from "../types";

interface AIDecisionTimelineProps {
  complaint: Complaint;
}

interface TimelineStep {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  colorClass: {
    icon: string;
    bg: string;
    border: string;
    text: string;
  };
  timestampOffsetSeconds: number;
  renderSummary: () => React.ReactNode;
  getRawJson: () => any;
}

export const AIDecisionTimeline: React.FC<AIDecisionTimelineProps> = ({ complaint }) => {
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };

  // Generate simulated chronological timestamps based on the complaint creation time
  const getSimulatedTime = (offsetSeconds: number) => {
    if (!complaint.createdAt) return null;
    try {
      const baseDate = new Date(complaint.createdAt);
      const newDate = new Date(baseDate.getTime() + offsetSeconds * 1000);
      return newDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return null;
    }
  };

  const steps: TimelineStep[] = [
    {
      id: "vision",
      name: "1. Vision Agent",
      icon: Eye,
      colorClass: {
        icon: "text-blue-600",
        bg: "bg-blue-50/70",
        border: "border-blue-100",
        text: "text-blue-800",
      },
      timestampOffsetSeconds: 1.2,
      renderSummary: () => (
        <div className="space-y-1 text-slate-700">
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Category:</span>
            <span className="text-xs font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
              {complaint.category || "Unclassified"}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-2">Vision Confidence:</span>
            <span className="text-xs font-mono font-bold text-emerald-600">
              {Math.round((complaint.confidence || 0.9) * 100)}%
            </span>
          </div>
          {complaint.short_summary && (
            <p className="text-xs leading-relaxed text-slate-600 italic">
              "{complaint.short_summary}"
            </p>
          )}
          {complaint.detected_objects && complaint.detected_objects.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {complaint.detected_objects.map((obj, i) => (
                <span key={i} className="text-[9px] bg-slate-100 text-slate-600 px-1 rounded font-medium">
                  {obj}
                </span>
              ))}
            </div>
          )}
        </div>
      ),
      getRawJson: () => ({
        stage: "Vision Analysis",
        category: complaint.category,
        detected_objects: complaint.detected_objects || [],
        confidence_level: complaint.confidence,
        short_summary: complaint.short_summary,
      }),
    },
    {
      id: "impact",
      name: "2. Impact Agent",
      icon: ShieldAlert,
      colorClass: {
        icon: "text-rose-600",
        bg: "bg-rose-50/70",
        border: "border-rose-100",
        text: "text-rose-800",
      },
      timestampOffsetSeconds: 3.8,
      renderSummary: () => {
        const impact = complaint.impactResult;
        if (!impact) return <span className="text-xs text-slate-400">Analysis not triggered</span>;
        return (
          <div className="space-y-1 text-slate-700">
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <div>
                <span className="text-[9px] font-semibold text-slate-400 block uppercase">Severity Assessment</span>
                <span className="font-extrabold text-rose-600">{impact.severity} ({impact.severity_score}/100)</span>
              </div>
              <div>
                <span className="text-[9px] font-semibold text-slate-400 block uppercase">Impact Domain</span>
                <span className="font-semibold text-slate-700 bg-slate-100 px-1 py-0.5 rounded">{impact.risk_level}</span>
              </div>
            </div>
            {impact.reason && (
              <p className="text-[11px] leading-relaxed text-slate-600 italic mt-0.5">
                "{impact.reason}"
              </p>
            )}
            <div className="text-[10px] text-slate-500 font-medium">
              SLA Expected Response: <span className="font-bold text-slate-700">{impact.estimated_response_time}</span>
            </div>
          </div>
        );
      },
      getRawJson: () => complaint.impactResult || { status: "no_data" },
    },
    {
      id: "duplicate",
      name: "3. Duplicate Detection Agent",
      icon: Copy,
      colorClass: {
        icon: "text-amber-600",
        bg: "bg-amber-50/70",
        border: "border-amber-100",
        text: "text-amber-800",
      },
      timestampOffsetSeconds: 6.1,
      renderSummary: () => {
        const dup = complaint.duplicateResult;
        if (!dup) return <span className="text-xs text-slate-400">Analysis not triggered</span>;
        return (
          <div className="space-y-1 text-slate-700">
            <div className="flex justify-between items-center">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                dup.duplicate_status === "Confirmed Duplicate" ? "bg-rose-100 text-rose-800" :
                dup.duplicate_status === "Possible Duplicate" ? "bg-amber-100 text-amber-800" :
                "bg-emerald-100 text-emerald-800"
              }`}>
                {dup.duplicate_status}
              </span>
              <span className="text-xs text-slate-500">
                Similarity Match: <span className="font-extrabold text-slate-700">{dup.similarity_score}%</span>
              </span>
            </div>
            {dup.reason && (
              <p className="text-[11px] leading-relaxed text-slate-650 italic">
                "{dup.reason}"
              </p>
            )}
            {complaint.linked_complaint_id && (
              <span className="text-[10px] text-indigo-600 font-bold block mt-0.5">
                🔗 Master Case Association: #{complaint.linked_complaint_id.slice(-6).toUpperCase()}
              </span>
            )}
          </div>
        );
      },
      getRawJson: () => complaint.duplicateResult || { status: "no_data" },
    },
    {
      id: "routing",
      name: "4. Municipal Routing Agent",
      icon: Building,
      colorClass: {
        icon: "text-indigo-600",
        bg: "bg-indigo-50/70",
        border: "border-indigo-100",
        text: "text-indigo-800",
      },
      timestampOffsetSeconds: 8.9,
      renderSummary: () => {
        const route = complaint.routingResult;
        if (!route) return <span className="text-xs text-slate-400">Analysis not triggered</span>;
        return (
          <div className="space-y-1 text-slate-700">
            <div className="flex justify-between items-start gap-1">
              <div>
                <span className="text-[9px] font-semibold text-slate-400 block uppercase">Department Assignment</span>
                <span className="font-extrabold text-slate-800 text-xs">{route.department}</span>
              </div>
              <span className="text-[9px] font-mono font-bold bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded">
                {route.department_code}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[10px] mt-1">
              <div>
                Escalation Level: <span className="font-bold text-indigo-600">{route.escalation_level}</span>
              </div>
              <div>
                Routing Confidence: <span className="font-bold text-slate-700">{Math.round(route.routing_confidence * 100)}%</span>
              </div>
            </div>
            {route.reason && (
              <p className="text-[11px] leading-relaxed text-slate-600 italic">
                "{route.reason}"
              </p>
            )}
          </div>
        );
      },
      getRawJson: () => complaint.routingResult || { status: "no_data" },
    },
    {
      id: "priority",
      name: "5. Priority Intelligence Agent",
      icon: Zap,
      colorClass: {
        icon: "text-purple-600",
        bg: "bg-purple-50/70",
        border: "border-purple-100",
        text: "text-purple-800",
      },
      timestampOffsetSeconds: 11.5,
      renderSummary: () => {
        const p = complaint.priorityResult;
        if (!p) return <span className="text-xs text-slate-400">Analysis not triggered</span>;
        return (
          <div className="space-y-1.5 text-slate-700">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                p.priority === "Critical" ? "bg-rose-100 text-rose-800 animate-pulse" :
                p.priority === "High" ? "bg-orange-100 text-orange-800" :
                p.priority === "Medium" ? "bg-amber-100 text-amber-800" :
                "bg-emerald-100 text-emerald-800"
              }`}>
                {p.priority} Urgency
              </span>
              <span className="text-xs font-semibold text-slate-600">
                Score: <span className="font-extrabold text-slate-800">{p.priority_score}/100</span>
              </span>
            </div>
            <div className="bg-purple-50/40 p-2 rounded-md border border-purple-100/30">
              <span className="text-[8px] font-bold text-purple-400 uppercase tracking-wide block">Operational Directive</span>
              <span className="text-xs font-bold text-slate-800">⚡ {p.recommended_action}</span>
            </div>
            {p.reason && (
              <p className="text-[11px] leading-relaxed text-slate-600 italic">
                "{p.reason}"
              </p>
            )}
          </div>
        );
      },
      getRawJson: () => complaint.priorityResult || { status: "no_data" },
    },
  ];

  return (
    <div className="bg-slate-50/30 rounded-xl border border-slate-100 p-3.5 space-y-4 shadow-sm" id="ai-decision-timeline-card">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <h3 className="text-xs font-extrabold text-slate-800 tracking-wide uppercase flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-purple-600 animate-pulse" />
          AI Decision Pipeline Timeline
        </h3>
        <span className="text-[9px] text-slate-400 font-semibold flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Sequential Execution
        </span>
      </div>

      <div className="relative pl-6 space-y-4">
        {/* Timeline Line */}
        <div className="absolute left-3 top-2.5 bottom-2.5 w-0.5 bg-slate-200" />

        {steps.map((step) => {
          const IconComponent = step.icon;
          const isExpanded = !!expandedSteps[step.id];
          const stepTime = getSimulatedTime(step.timestampOffsetSeconds);

          return (
            <div key={step.id} className="relative group" id={`timeline-step-${step.id}`}>
              {/* Node Icon */}
              <div className={`absolute -left-[23px] top-0.5 w-[20px] h-[20px] rounded-full border ${step.colorClass.border} ${step.colorClass.bg} flex items-center justify-center shadow-sm z-10 transition-transform group-hover:scale-110`}>
                <IconComponent className={`w-3 h-3 ${step.colorClass.icon}`} />
              </div>

              {/* Step Details */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-bold ${step.colorClass.text}`}>
                    {step.name}
                  </span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {stepTime && (
                      <span className="text-[9px] font-mono font-medium text-slate-400 bg-slate-100/50 px-1 rounded">
                        +{step.timestampOffsetSeconds}s ({stepTime})
                      </span>
                    )}
                    <button
                      onClick={() => toggleStep(step.id)}
                      className="text-slate-400 hover:text-slate-600 p-0.5 hover:bg-slate-100 rounded transition-colors"
                      aria-label="Toggle JSON Output"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-100/80 shadow-xs">
                  {step.renderSummary()}

                  {/* Expandable JSON Accordion */}
                  {isExpanded && (
                    <div className="mt-2 pt-2 border-t border-dashed border-slate-100 text-[10px] font-mono text-slate-600 bg-slate-50 p-2 rounded overflow-x-auto max-h-[160px]">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Raw Structured JSON
                      </span>
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(step.getRawJson(), null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
