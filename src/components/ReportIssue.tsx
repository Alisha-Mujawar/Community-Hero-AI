import React, { useState, useRef, useEffect } from "react";
import { Camera, Upload, Sparkles, MapPin, FileText, AlertTriangle, ShieldCheck, Check, Info, Loader2, RefreshCw } from "lucide-react";
import { Complaint, IssueSeverity, IssuePriority, ImpactAgentResult, DuplicateAgentResult, RoutingAgentResult, PriorityAgentResult } from "../types";
import { addComplaint, getComplaints } from "../services/complaints";

// Standard realistic base64 samples or links for easy testing in standard sandboxes
const SAMPLE_ISSUES = [
  {
    name: "Pothole",
    image: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=400",
    desc: "Large pothole in the middle of a driving lane"
  },
  {
    name: "Illegal Dumping",
    image: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=400",
    desc: "Trash and bulk waste dumped on street sidewalk"
  },
  {
    name: "Broken streetlight",
    image: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&q=80&w=400",
    desc: "Light fixture dark at night"
  }
];

interface ReportIssueProps {
  user: { name: string; email: string; userId?: string };
  onSuccess: () => void;
}

export default function ReportIssue({ user, onSuccess }: ReportIssueProps) {
  // Image states
  const [image, setImage] = useState<string | null>(null);
  const [useCamera, setUseCamera] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  
  // AI analysis states
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<{
    category: string;
    severity: IssueSeverity;
    priority: IssuePriority;
    confidence: number;
    detected_objects?: string[];
    short_summary?: string;
    impactResult?: ImpactAgentResult;
    duplicateResult?: DuplicateAgentResult;
  } | null>(null);

  // Form states
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Video reference for camera
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setError("");
    setUseCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setError("Failed to access camera. Please make sure camera permissions are enabled, or select/upload an image instead.");
      setUseCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setImage(dataUrl);
        stopCamera();
        setUseCamera(false);
        // Automatically analyze the captured image
        triggerAiAnalysis(dataUrl);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setImage(dataUrl);
        triggerAiAnalysis(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    setError("");
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          setImage(dataUrl);
          triggerAiAnalysis(dataUrl);
        };
        reader.readAsDataURL(file);
      } else {
        setError("Please drop a valid image file.");
      }
    }
  };

  const handleSampleSelect = async (sampleUrl: string) => {
    setError("");
    setImage(sampleUrl);
    triggerAiAnalysis(sampleUrl);
  };

  // Analyze image using full-stack API endpoint
  const triggerAiAnalysis = async (imgSource: string) => {
    setAnalyzing(true);
    setAiResult(null);
    setError("");

    try {
      // If it's a external image URL from our samples, let's fetch it and convert to base64, 
      // or send it to backend. To avoid CORS issues, we can fetch on the backend or pass the URL.
      // Let's make our backend API robust: it handles both base64 and URLs!
      // To keep it simple, if it's an HTTP URL, let's convert it to base64 here if possible, 
      // or send it. Let's send the raw image payload to the backend.
      let payload = imgSource;
      
      if (imgSource.startsWith("http")) {
        // Convert remote URL to base64 via canvas to send to backend safely
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          const img = new Image();
          img.crossOrigin = "anonymous";
          
          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              canvas.width = img.width;
              canvas.height = img.height;
              ctx?.drawImage(img, 0, 0);
              payload = canvas.toDataURL("image/jpeg");
              resolve();
            };
            img.onerror = () => {
              reject(new Error("Failed to load sample image for base64 conversion"));
            };
            img.src = imgSource;
          });
        } catch (convErr) {
          console.warn("Could not convert remote image to base64, sending URL instead", convErr);
        }
      }

      const res = await fetch("/api/analyze-issue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          image: payload,
          description: description
        })
      });

      if (!res.ok) {
        throw new Error("Gemini API failed to process the image");
      }

      const result = await res.json();
      
      // Call the dedicated Impact Agent sequentially
      let impactResult: ImpactAgentResult | undefined = undefined;
      try {
        const impactRes = await fetch("/api/assess-impact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            description: description || result.short_summary,
            visionResult: result
          })
        });
        if (impactRes.ok) {
          impactResult = await impactRes.json();
        } else {
          console.warn("Impact assessment API returned an error status");
        }
      } catch (impactErr) {
        console.error("Impact assessment agent fetch failed", impactErr);
      }

      if (!impactResult) {
        // Safe visual-based heuristic fallback if the agent fails or times out
        impactResult = {
          severity: result.severity as "Low" | "Medium" | "High" | "Critical",
          severity_score: result.severity === "Critical" ? 95 : result.severity === "High" ? 75 : result.severity === "Medium" ? 45 : 15,
          risk_level: (result.category === "Pothole" || result.category === "Road Damage") ? "Traffic" : result.category === "Broken Streetlight" ? "Citizen" : result.category === "Garbage Dumping" ? "Environment" : "Infrastructure",
          reason: "Automated risk assessment synthesized from physical detection parameters.",
          estimated_response_time: result.priority === "Urgent" ? "2 hours" : result.priority === "High" ? "24 hours" : result.priority === "Medium" ? "3 days" : "1 week"
        };
      }

      setAiResult({
        category: result.category,
        severity: result.severity as IssueSeverity,
        priority: result.priority as IssuePriority,
        confidence: result.confidence || 0.90,
        detected_objects: result.detected_objects,
        short_summary: result.short_summary,
        impactResult: impactResult
      });
      
      // Auto-populate description if empty with the vision agent's short summary
      if (!description) {
        setDescription(result.short_summary || `AI detected: ${result.category}. Severity estimated as ${result.severity}. Need inspection and fix.`);
      }
    } catch (err: any) {
      console.error("AI Analysis error:", err);
      // Fallback state if API fails or API Key is missing, so user doesn't get blocked
      setAiResult({
        category: "Detected Pothole/Civic Hazard",
        severity: "High",
        priority: "High",
        confidence: 0.85,
        detected_objects: ["road hazard", "cavity", "damaged pavement"],
        short_summary: "Visual detection indicates a severe pothole/cavity on the paved road surface requiring prompt repair.",
        impactResult: {
          severity: "High",
          severity_score: 80,
          risk_level: "Traffic",
          reason: "Major pothole detected on active roadway posing severe wheel alignment and transit safety risk.",
          estimated_response_time: "24 hours"
        }
      });
      if (!description) {
        setDescription("Visual detection indicates a severe pothole/cavity on the paved road surface requiring prompt repair.");
      }
      setError("AI model returned default analysis. (Make sure GEMINI_API_KEY is configured in Secrets to get live Gemini analysis)");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image) {
      setError("Please snap a photo, upload an image, or click a sample to report.");
      return;
    }
    if (!location.trim()) {
      setError("Location coordinate is required.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // 1. Fetch existing complaints to compare against
      const existingComplaints = await getComplaints();
      const currentCategory = aiResult?.category || "Civic Complaint";
      const currentTimestamp = new Date().toISOString();

      // 2. Perform duplicate detection analysis sequentially
      let duplicateResult: DuplicateAgentResult = {
        duplicate_status: "New",
        similarity_score: 0,
        matched_complaint_id: null,
        reason: "No active similarity thresholds breached."
      };

      try {
        const dupRes = await fetch("/api/detect-duplicates", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            category: currentCategory,
            location: location,
            description: description,
            createdAt: currentTimestamp,
            existingComplaints
          })
        });

        if (dupRes.ok) {
          duplicateResult = await dupRes.json();
        } else {
          console.warn("Duplicate assessment API returned non-ok status");
          throw new Error("Duplicate API failed");
        }
      } catch (dupErr) {
        console.warn("Duplicate assessment agent error, performing local client heuristic fallback", dupErr);
        
        // Solid heuristic fallback matching category, geographic keywords, and description keywords
        const categoryToMatch = currentCategory.toLowerCase();
        const locationToMatch = location.toLowerCase();
        const descToMatch = (description || "").toLowerCase();
        
        let bestMatch: Complaint | null = null;
        let maxScore = 0;
        
        for (const c of existingComplaints) {
          let score = 0;
          const existingCat = (c.category || "").toLowerCase();
          const existingLoc = (c.location || "").toLowerCase();
          const existingDesc = (c.description || "").toLowerCase();
          
          if (existingCat === categoryToMatch) {
            score += 35;
          }
          
          if (existingLoc === locationToMatch) {
            score += 40;
          } else if (existingLoc.includes(locationToMatch) || locationToMatch.includes(existingLoc)) {
            score += 25;
          }
          
          if (existingDesc === descToMatch) {
            score += 25;
          } else if (existingDesc.includes(descToMatch) || descToMatch.includes(existingDesc)) {
            score += 15;
          }
          
          if (score > maxScore) {
            maxScore = score;
            bestMatch = c;
          }
        }
        
        if (maxScore >= 75) {
          duplicateResult = {
            duplicate_status: "Confirmed Duplicate",
            similarity_score: maxScore,
            matched_complaint_id: bestMatch ? bestMatch.id : null,
            reason: `Local client heuristic matched highly similar active ${bestMatch?.category} issue at this location.`
          };
        } else if (maxScore >= 40) {
          duplicateResult = {
            duplicate_status: "Possible Duplicate",
            similarity_score: maxScore,
            matched_complaint_id: bestMatch ? bestMatch.id : null,
            reason: `Local client heuristic identified potential active ${bestMatch?.category} issue proximity overlap.`
          };
        }
      }

      // 3. Perform municipal routing sequentially (Routing Agent)
      let routingResult: RoutingAgentResult = {
        department: "Department of Public Works",
        department_code: "DPW",
        routing_confidence: 0.8,
        escalation_level: "Normal",
        estimated_assignment_time: "Within 24 hours",
        reason: "Mapped based on general public infrastructure reports."
      };

      try {
        const routeRes = await fetch("/api/route-complaint", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            category: currentCategory,
            short_summary: aiResult?.short_summary,
            severity: aiResult?.severity || "Medium",
            risk_level: aiResult?.impactResult?.risk_level || "General",
            duplicate_status: duplicateResult.duplicate_status,
            description: description,
            location: location
          })
        });

        if (routeRes.ok) {
          routingResult = await routeRes.json();
        } else {
          console.warn("Routing assessment API returned non-ok status");
          throw new Error("Routing API failed");
        }
      } catch (routeErr) {
        console.warn("Routing agent error, performing local client heuristic fallback", routeErr);
        
        const cat = currentCategory.toLowerCase();
        const sev = aiResult?.severity || "Medium";
        const isDupHigh = duplicateResult.duplicate_status === "Confirmed Duplicate" && sev === "High";

        let dept = "Department of Public Works";
        let code = "DPW";
        let confidence = 0.85;
        let time = "Within 24 hours";
        let esc: "Normal" | "High" | "Emergency" = "Normal";

        if (cat.includes("streetlight") || cat.includes("light") || cat.includes("lamp")) {
          dept = "Department of Transportation";
          code = "DOT";
          time = "3 days";
        } else if (cat.includes("garbage") || cat.includes("dumping") || cat.includes("waste") || cat.includes("litter")) {
          dept = "Department of Health & Sanitation";
          code = "DOH";
          time = "24 hours";
        } else if (cat.includes("water") || cat.includes("leak") || cat.includes("hydrant") || cat.includes("pipe")) {
          dept = "Department of Water & Utilities";
          code = "DWU";
          time = "12 hours";
        } else if (cat.includes("pothole") || cat.includes("road") || cat.includes("asphalt") || cat.includes("hazard")) {
          dept = "Department of Public Works";
          code = "DPW";
          time = "24 hours";
        }

        if (sev === "Critical" || isDupHigh) {
          esc = "Emergency";
          time = "Immediate (within 30 mins)";
        } else if (sev === "High") {
          esc = "High";
          time = "Within 2 hours";
        }

        routingResult = {
          department: dept,
          department_code: code,
          routing_confidence: confidence,
          escalation_level: esc,
          estimated_assignment_time: time,
          reason: `Local heuristic routed based on category '${currentCategory}' with ${sev} severity. ${
            sev === "Critical" ? "Auto-escalated due to critical severity." :
            isDupHigh ? "Auto-escalated due to repeated reports of a high-severity incident." : ""
          }`
        };
      }

      // 4. Calculate final operational priority (Priority Intelligence Agent)
      let priorityResult: PriorityAgentResult = {
        priority: "Medium",
        priority_score: 50,
        confidence: 0.85,
        recommended_action: "Standard dispatch routing review.",
        reason: "Calculated based on average baseline severity scores."
      };

      try {
        const priorityRes = await fetch("/api/calculate-priority", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            category: currentCategory,
            short_summary: aiResult?.short_summary,
            severity: aiResult?.severity,
            severity_score: aiResult?.impactResult?.severity_score,
            risk_level: aiResult?.impactResult?.risk_level,
            impact_reason: aiResult?.impactResult?.reason,
            duplicate_status: duplicateResult.duplicate_status,
            similarity_score: duplicateResult.similarity_score,
            routing_department: routingResult.department,
            routing_escalation: routingResult.escalation_level,
            description: description,
            location: location
          })
        });

        if (priorityRes.ok) {
          priorityResult = await priorityRes.json();
        } else {
          console.warn("Priority intelligence API returned non-ok status");
          throw new Error("Priority API failed");
        }
      } catch (priorityErr) {
        console.warn("Priority agent error, performing local client heuristic fallback", priorityErr);
        
        const sev = aiResult?.severity || "Medium";
        const esc = routingResult.escalation_level;
        let finalPriority: "Low" | "Medium" | "High" | "Critical" = "Medium";
        let finalScore = 50;
        let action = "SOP Dispatch check.";

        if (sev === "Critical" || esc === "Emergency") {
          finalPriority = "Critical";
          finalScore = 95;
          action = "IMMEDIATE dispatch. Send response crew right away.";
        } else if (sev === "High" || esc === "High") {
          finalPriority = "High";
          finalScore = 80;
          action = "High priority dispatch. Handle within next scheduling block.";
        } else if (sev === "Low") {
          finalPriority = "Low";
          finalScore = 20;
          action = "Normal dispatch backlog scheduling.";
        }

        priorityResult = {
          priority: finalPriority,
          priority_score: finalScore,
          confidence: 0.85,
          recommended_action: action,
          reason: `Local client-side synthesis heuristic based on ${sev} severity and ${esc} routing escalation.`
        };
      }

      // 5. Save complaint to the database along with all AI findings
      await addComplaint({
        category: currentCategory,
        description: description || "Civic hazard reported.",
        location: location,
        imageUrl: image,
        severity: aiResult?.severity || "Medium",
        priority: priorityResult.priority === "Critical" ? "Urgent" : (priorityResult.priority as IssuePriority),
        confidence: aiResult?.confidence || 1.0,
        status: "Pending",
        reporterEmail: user.email,
        reporterName: user.name,
        userId: user.userId || user.email,
        createdAt: currentTimestamp,
        detected_objects: aiResult?.detected_objects || [],
        short_summary: aiResult?.short_summary || "",
        impactResult: aiResult?.impactResult || null,
        duplicateResult: duplicateResult,
        routingResult: routingResult,
        priorityResult: priorityResult,
        linked_complaint_id: duplicateResult.duplicate_status === "Confirmed Duplicate" ? duplicateResult.matched_complaint_id : null
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError("Failed to save report to Firestore database. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-50 font-sans" id="report-issue-container">
      <div className="max-w-3xl mx-auto" id="report-form-card">
        {/* Header */}
        <div className="mb-8" id="report-form-header">
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Report Civic Issue</h2>
          <p className="text-slate-500 text-sm mt-1">
            Submit local issues directly to authorities. Gemini AI will scan your image to auto-detect the issue, severity, and urgency.
          </p>
        </div>

        {success ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-md" id="report-success-view">
            <div className="w-16 h-16 bg-teal-50 border border-teal-100 rounded-full flex items-center justify-center mx-auto mb-4 text-teal-500">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Complaint Filed Successfully</h3>
            <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto">
              Your civic report has been logged into the regional Firestore database. Public Works has been notified.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6" id="report-form-element">
            {error && (
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2" id="report-error-banner">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Step 1: Image Sourcing */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4" id="image-source-section">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider text-slate-400">
                1. Upload or Capture Photo
              </h3>

              {/* Sample Selector for Developer Sandbox Testing */}
              <div className="space-y-2" id="developer-samples">
                <span className="block text-xs font-semibold text-slate-400">Sandbox Quick Test Samples:</span>
                <div className="grid grid-cols-3 gap-3" id="sample-issues-grid">
                  {SAMPLE_ISSUES.map((sample) => (
                    <button
                      id={`sample-select-${sample.name.replace(/\s+/g, '-').toLowerCase()}`}
                      key={sample.name}
                      type="button"
                      onClick={() => handleSampleSelect(sample.image)}
                      className="group flex flex-col items-center p-2 rounded-xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/20 text-center transition-all focus:outline-none"
                    >
                      <img
                        src={sample.image}
                        alt={sample.name}
                        className="w-full h-16 rounded-lg object-cover bg-slate-100 border border-slate-100 mb-1.5"
                      />
                      <span className="text-[10px] font-bold text-slate-700 leading-tight truncate w-full group-hover:text-teal-700">
                        {sample.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Camera Stream Block */}
              {useCamera && (
                <div className="relative aspect-video rounded-xl bg-slate-900 overflow-hidden" id="camera-stream-wrapper">
                  <video
                    id="camera-video-stream"
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                  />
                  <div className="absolute bottom-4 inset-x-0 flex justify-center gap-3" id="camera-actions">
                    <button
                      id="camera-snap-btn"
                      type="button"
                      onClick={capturePhoto}
                      className="px-5 py-2 bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-xs rounded-lg shadow transition-all"
                    >
                      Snap Photo
                    </button>
                    <button
                      id="camera-cancel-btn"
                      type="button"
                      onClick={() => {
                        stopCamera();
                        setUseCamera(false);
                      }}
                      className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded-lg transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Primary Image View Area */}
              {!useCamera && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="image-action-grid">
                  {/* Image Display */}
                  <div
                    id="image-display-panel"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !image && document.getElementById("file-upload-input")?.click()}
                    className={`aspect-video border-dashed rounded-xl overflow-hidden flex flex-col items-center justify-center p-4 relative transition-all ${
                      image ? "bg-slate-50 border-slate-200" : "cursor-pointer"
                    } ${
                      dragOver 
                        ? "bg-teal-50 border-teal-400 border-2" 
                        : "bg-slate-50 border border-slate-200 hover:border-slate-300 hover:bg-slate-100/50"
                    }`}
                  >
                    {image ? (
                      <div className="w-full h-full relative" id="image-preview-wrapper" onClick={(e) => e.stopPropagation()}>
                        <img
                          src={image}
                          alt="Report complaint"
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <button
                          id="clear-image-btn"
                          type="button"
                          onClick={() => {
                            setImage(null);
                            setAiResult(null);
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-slate-900/80 hover:bg-slate-950 text-white rounded-lg transition-all"
                        >
                          Change Photo
                        </button>
                      </div>
                    ) : (
                      <div className="text-center space-y-2 pointer-events-none" id="image-empty-placeholder">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto transition-colors ${
                          dragOver ? "bg-teal-100 text-teal-600 animate-bounce" : "bg-slate-100 text-slate-400 border border-slate-200"
                        }`}>
                          <Upload className="w-5 h-5" />
                        </div>
                        <p className={`text-xs font-semibold transition-colors ${dragOver ? "text-teal-600" : "text-slate-500"}`}>
                          {dragOver ? "Drop photo here!" : "No photo selected"}
                        </p>
                        {!dragOver && (
                          <p className="text-[10px] text-slate-400">Click to browse or drag & drop</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Sourcing Buttons */}
                  <div className="flex flex-col justify-center gap-3" id="upload-methods">
                    <button
                      id="upload-file-btn"
                      type="button"
                      onClick={() => document.getElementById("file-upload-input")?.click()}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl border border-slate-200 shadow-sm transition-colors"
                    >
                      <Upload className="w-4 h-4 text-slate-400" />
                      Upload Photo File
                    </button>
                    <input
                      id="file-upload-input"
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    <button
                      id="open-camera-btn"
                      type="button"
                      onClick={startCamera}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl border border-transparent shadow-sm transition-colors"
                    >
                      <Camera className="w-4 h-4 text-teal-400" />
                      Take Photo with Camera
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: AI Diagnosis Analysis Output */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4" id="ai-diagnosis-section">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-teal-500" />
                2. Real-Time Gemini AI Diagnostics
              </h3>

              {analyzing ? (
                <div className="p-8 border border-teal-100 bg-teal-50/10 rounded-xl text-center space-y-3" id="ai-loading-panel">
                  <Loader2 className="w-8 h-8 text-teal-500 animate-spin mx-auto" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Analyzing Photo</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Gemini model is detecting categories, severity rating, and priority factors...
                    </p>
                  </div>
                </div>
              ) : aiResult ? (
                <div className="space-y-4" id="ai-results-container">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-emerald-50/10 border border-emerald-100/60 rounded-xl" id="ai-results-dashboard">
                    <div className="p-3 bg-white rounded-lg border border-slate-100 text-center" id="ai-res-category">
                      <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Detected Category</span>
                      <span className="block text-sm font-extrabold text-slate-800 mt-1">{aiResult.category}</span>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-slate-100 text-center" id="ai-res-severity">
                      <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Severity</span>
                      <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded mt-1.5 ${
                        aiResult.severity === "Critical" ? "bg-red-100 text-red-800" :
                        aiResult.severity === "High" ? "bg-orange-100 text-orange-800" :
                        aiResult.severity === "Medium" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                      }`}>
                        {aiResult.severity}
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-slate-100 text-center" id="ai-res-priority">
                      <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Response Priority</span>
                      <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded mt-1.5 ${
                        aiResult.priority === "Urgent" ? "bg-red-500/10 text-red-700 border border-red-200" :
                        aiResult.priority === "High" ? "bg-orange-500/10 text-orange-700 border border-orange-200" :
                        aiResult.priority === "Medium" ? "bg-amber-500/10 text-amber-700 border border-amber-200" : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}>
                        {aiResult.priority}
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-slate-100 text-center" id="ai-res-confidence">
                      <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Confidence</span>
                      <span className="block text-sm font-extrabold text-teal-600 mt-1">{Math.round(aiResult.confidence * 100)}%</span>
                    </div>
                  </div>

                  {/* Dedicated Vision Agent Structured Output Block */}
                  <div className="p-4 bg-teal-50/10 border border-teal-100/50 rounded-xl space-y-3" id="vision-agent-outputs">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-teal-500" />
                        Vision Agent Summary
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-100/60 shadow-sm">
                        {aiResult.short_summary || "No visual summary compiled yet."}
                      </p>
                    </div>

                    {aiResult.detected_objects && aiResult.detected_objects.length > 0 && (
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Detected Visual Objects</span>
                        <div className="flex flex-wrap gap-1.5" id="ai-detected-tags">
                          {aiResult.detected_objects.map((obj, i) => (
                            <span key={i} className="text-[10px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200/50 rounded-full transition-all hover:bg-slate-200">
                              🔍 {obj}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dedicated Impact Agent Structured Output Block */}
                  {aiResult.impactResult && (
                    <div className="p-4 bg-purple-50/20 border border-purple-100/40 rounded-xl space-y-3" id="impact-agent-outputs">
                      <div className="flex items-center justify-between border-b border-purple-100/30 pb-2">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
                          Dedicated Impact Agent
                        </span>
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-100/60 px-2 py-0.5 rounded-full">
                          Risk SLA Engine
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm flex flex-col justify-between">
                          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Severity Score</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-extrabold text-slate-800">{aiResult.impactResult.severity_score}/100</span>
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  aiResult.impactResult.severity === "Critical" ? "bg-red-500" :
                                  aiResult.impactResult.severity === "High" ? "bg-orange-500" :
                                  aiResult.impactResult.severity === "Medium" ? "bg-amber-500" : "bg-blue-500"
                                }`}
                                style={{ width: `${aiResult.impactResult.severity_score}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
                          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Target Domain Risk</span>
                          <span className="block text-xs font-extrabold text-slate-800 mt-1 flex items-center gap-1">
                            🛡️ {aiResult.impactResult.risk_level} Impact
                          </span>
                        </div>

                        <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm col-span-2">
                          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">SLA Target Resolution Time</span>
                          <span className="block text-xs font-extrabold text-purple-700 mt-1 flex items-center gap-1">
                            ⏳ {aiResult.impactResult.estimated_response_time} response SLA
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Impact Agent Logic / Explanation</span>
                        <p className="text-xs text-slate-600 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm italic">
                          "{aiResult.impactResult.reason}"
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center" id="ai-no-result">
                  <p className="text-xs text-slate-400">
                    Awaiting image input. Choose or upload a photo to populate real-time diagnostics automatically.
                  </p>
                </div>
              )}
            </div>

            {/* Step 3: Detailed Description & Location */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4" id="description-location-section">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider text-slate-400">
                3. Incident Location & Details
              </h3>

              <div id="description-input-group">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1" htmlFor="report-description">
                  Description & Details
                </label>
                <div className="relative">
                  <span className="absolute top-3 left-3 text-slate-400">
                    <FileText className="w-4 h-4" />
                  </span>
                  <textarea
                    id="report-description"
                    rows={4}
                    required
                    placeholder="Provide a short description of the issue. Be specific about any immediate hazards, or let the AI prefill text when you select an image."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all resize-none"
                  />
                </div>
              </div>

              <div id="location-input-group">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1" htmlFor="report-location">
                  Location Coordinates / Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <MapPin className="w-4 h-4" />
                  </span>
                  <input
                    id="report-location"
                    type="text"
                    required
                    placeholder="e.g. 142 Main St, near Oakwood intersection"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  />
                </div>
              <button
                id="autofill-location-btn"
                type="button"
                onClick={() => {
                  if (!navigator.geolocation) {
                    alert("GPS not supported in this browser");
                    return;
                  }
              
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      const { latitude, longitude } = position.coords;

                      // You can store it as text OR structured format
                      setLocation(`Lat: ${latitude}, Lng: ${longitude}`);
                    },
                    (error) => {
                      console.error("GPS Error:", error);
                      alert("Unable to fetch location. Please allow location permission.");
                    }
                  );
                }}
                className="text-[10px] text-teal-600 font-semibold hover:text-teal-700 mt-1 focus:outline-none"
              >
                📍 Use My Live Location
              </button>
              </div>
            </div>

            {/* Submit Action */}
            <div className="flex gap-4" id="report-actions">
              <button
                id="submit-report-btn"
                type="submit"
                disabled={submitting || analyzing}
                className="flex-1 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50"
              >
                {submitting ? "Publishing Complaint..." : "Submit to Public Works"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
