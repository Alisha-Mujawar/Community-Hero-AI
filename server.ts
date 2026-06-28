import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Set high body limits for image uploads
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Initialize Gemini API client lazily to avoid crashing if GEMINI_API_KEY is missing
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables.");
    }
    aiClient = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// API endpoint for civic issue analysis
app.post("/api/analyze-issue", async (req, res) => {
  try {
    const { image, description } = req.body; // Expects base64 data url and optional description string
    if (!image) {
      return res.status(400).json({ error: "No image data provided" });
    }

    // Parse data URL
    const matches = image.match(/^data:([^;]+);base64,(.+)$/);
    let mimeType = "image/jpeg";
    let base64Data = image;

    if (matches && matches.length === 3) {
      mimeType = matches[1];
      base64Data = matches[2];
    } else {
      // If it is already raw base64
      base64Data = image.replace(/^data:image\/[a-z]+;base64,/, "");
    }

    const ai = getAiClient();
    
    // Call Gemini to analyze the civic issue with vision and text description context together
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        `Analyze this image of a municipal/civic issue (such as potholes, garbage, water leakage, broken streetlights, illegal dumping, road damage, drainage issues, etc.) in conjunction with the user's description.
        
User-provided description of the incident: "${description || 'No description provided by the user yet.'}"

Perform a thorough visual analysis. Provide a highly accurate classification.
Your output must be a valid JSON object matching the requested schema. Provide:
- category: The primary issue category (e.g. Pothole, Garbage Dumping, Water Leakage, Broken Streetlight, Drainage, Road Damage, Traffic Hazard, Vandalism, or Other).
- severity: One of: Low, Medium, High, or Critical. Be objective. Direct safety hazards should be High/Critical.
- priority: One of: Low, Medium, High, or Urgent.
- confidence: A confidence score between 0.0 and 1.0.
- detected_objects: An array of key physical objects, hazards, or structures detected in the image (e.g., ["cracked asphalt", "water puddle", "traffic cone"]).
- short_summary: A concise, clear, and professional vision-agent summary of what is seen in the image, noting any matching or contrasting points with the user's description. This summary should remain highly structured and machine-readable for downstream AI systems.`,
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            severity: { 
              type: Type.STRING, 
              enum: ["Low", "Medium", "High", "Critical"] 
            },
            priority: { 
              type: Type.STRING, 
              enum: ["Low", "Medium", "High", "Urgent"] 
            },
            confidence: { type: Type.NUMBER },
            detected_objects: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            short_summary: { type: Type.STRING }
          },
          required: ["category", "severity", "priority", "confidence", "detected_objects", "short_summary"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Gemini returned empty response.");
    }

    const analysis = JSON.parse(resultText);
    res.json(analysis);
  } catch (error: any) {
    console.error("Civic issue analysis failed:", error);
    res.status(500).json({ 
      error: "Failed to analyze image with Gemini", 
      details: error.message 
    });
  }
});

// API endpoint for civic impact assessment (Impact Agent)
app.post("/api/assess-impact", async (req, res) => {
  try {
    const { description, visionResult } = req.body;
    
    const ai = getAiClient();
    
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        `You are a dedicated municipal Impact Agent. Your responsibility is ONLY to assess the civic impact and response urgency of an incident.
        
You will receive the structured visual analysis from the Vision Agent and the user's description.

Vision Agent visual analysis: ${JSON.stringify(visionResult || {})}
User-provided description: "${description || 'No description provided.'}"

Evaluate the impact objectively and return a JSON object matching this schema:
- severity: Overall severity rating based on risk factors. One of: Low, Medium, High, or Critical.
- severity_score: An integer score from 0 to 100 reflecting the hazard level (0 is negligible, 100 is life-threatening or extreme infrastructure breakdown).
- risk_level: The primary domain or entity most at risk. One of: Citizen, Traffic, Environment, or Infrastructure.
- reason: A concise explanation (1-2 sentences) of why this severity and risk level was selected.
- estimated_response_time: Recommended response SLA timeline. One of: "2 hours", "24 hours", "3 days", "1 week".`,
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            severity: { 
              type: Type.STRING, 
              enum: ["Low", "Medium", "High", "Critical"] 
            },
            severity_score: { type: Type.INTEGER },
            risk_level: { 
              type: Type.STRING, 
              enum: ["Citizen", "Traffic", "Environment", "Infrastructure"] 
            },
            reason: { type: Type.STRING },
            estimated_response_time: { 
              type: Type.STRING, 
              enum: ["2 hours", "24 hours", "3 days", "1 week"] 
            }
          },
          required: ["severity", "severity_score", "risk_level", "reason", "estimated_response_time"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Gemini returned empty impact assessment.");
    }

    const impact = JSON.parse(resultText);
    res.json(impact);
  } catch (error: any) {
    console.error("Impact assessment failed:", error);
    res.status(500).json({ 
      error: "Failed to assess impact with Gemini", 
      details: error.message 
    });
  }
});

// API endpoint for duplicate check (Duplicate Detection Agent)
app.post("/api/detect-duplicates", async (req, res) => {
  try {
    const { category, location, description, createdAt, existingComplaints } = req.body;
    
    if (!existingComplaints || !Array.isArray(existingComplaints) || existingComplaints.length === 0) {
      return res.json({
        duplicate_status: "New",
        similarity_score: 0,
        matched_complaint_id: null,
        reason: "No existing complaints found in database to compare against."
      });
    }

    const ai = getAiClient();
    
    // Select relevant details to send to prompt to optimize prompt length
    const serializedExisting = existingComplaints.map((c: any) => ({
      id: c.id,
      category: c.category,
      location: c.location,
      description: c.description || "",
      createdAt: c.createdAt,
      status: c.status || "Pending"
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        `You are a dedicated municipal Duplicate Detection Agent. Your sole responsibility is to check and assess if a newly reported civic complaint is a duplicate of any active/existing complaints in the system.

A duplicate is defined as a report describing the exact same physical hazard or event in the exact same location (or very close vicinity).

New Complaint Details:
- Category: "${category || 'Unknown'}"
- Location: "${location || 'Unknown'}"
- Description: "${description || 'No description provided.'}"
- Submission Time: "${createdAt || new Date().toISOString()}"

Existing Complaints in Database:
${JSON.stringify(serializedExisting)}

Compare the current complaint against the existing ones using:
1. Category matching: Are they reporting the exact same category of civic issues?
2. Location proximity: Do the addresses or descriptions of location indicate the same spot, intersection, or within 50-100 meters?
3. Description context: Are they describing the exact same thing (e.g. the exact same pothole, the exact same dumped sofa, the exact same broken streetlamp)?
4. Submission time: Duplicate reports typically occur within a close timeframe while the original is still unresolved.

Determine the status:
- "Confirmed Duplicate": Highly confident (score >= 85) that this is the exact same issue in the exact same spot reported during a timeframe when the original issue is pending/active.
- "Possible Duplicate": Moderately confident (score 40-84) that it might be the same issue, or a very similar issue very close by.
- "New Complaint": Confident (score < 40) that this is a completely different or distinct incident.

Evaluate objectively and return a JSON object matching this schema:
- duplicate_status: One of: "New", "Possible Duplicate", "Confirmed Duplicate".
- similarity_score: An integer score from 0 to 100 representing confidence/similarity.
- matched_complaint_id: The ID of the matching complaint from the list, or null if duplicate_status is "New" or no close match exists.
- reason: A concise (1-2 sentences) explanation of why this duplicate status was chosen, detailing the matching parameters or key differences.`,
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            duplicate_status: { 
              type: Type.STRING, 
              enum: ["New", "Possible Duplicate", "Confirmed Duplicate"] 
            },
            similarity_score: { type: Type.INTEGER },
            matched_complaint_id: { type: Type.STRING, nullable: true },
            reason: { type: Type.STRING }
          },
          required: ["duplicate_status", "similarity_score", "reason"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Gemini returned empty duplicate assessment.");
    }

    const result = JSON.parse(resultText);
    res.json(result);
  } catch (error: any) {
    console.error("Duplicate detection failed:", error);
    res.status(500).json({ 
      error: "Failed to run duplicate detection with Gemini", 
      details: error.message 
    });
  }
});

// API endpoint for municipal routing (Routing Agent)
app.post("/api/route-complaint", async (req, res) => {
  try {
    const { category, short_summary, severity, risk_level, duplicate_status, description, location } = req.body;

    const ai = getAiClient();

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        `You are an expert municipal Routing Agent. Your task is to analyze details of a civic complaint and route it to the correct department.

Input Context:
- Category (from Vision Agent): "${category || "Civic Complaint"}"
- Short Summary (from Vision Agent): "${short_summary || "N/A"}"
- Severity (from Impact Agent): "${severity || "Medium"}"
- Risk Impact Domain (from Impact Agent): "${risk_level || "General"}"
- Duplicate Status: "${duplicate_status || "New"}"
- Reporter Description: "${description || "N/A"}"
- Location: "${location || "N/A"}"

Routing Guidelines & Responsibilities:
1. Determine the responsible Municipal Department (e.g. "Department of Public Works", "Department of Transportation", "Department of Health & Sanitation", "Department of Water & Utilities", or another specific city division).
2. Assign a standard department code (e.g. "DPW", "DOT", "DOH", "DWU", etc.).
3. Determine Routing Confidence (0.0 to 1.0).
4. Determine the Escalation Level: "Normal", "High", or "Emergency".
   CRITICAL ESCALATION RULE:
   - If the complaint is "Critical" severity, OR if the duplicate status is "Confirmed Duplicate" AND severity is "High", you MUST set the escalation_level to "Emergency" (or "High") and specify this in your reason (e.g. "Auto-escalated due to critical severity or recurring high-severity duplicate report").
5. Estimate assignment time (e.g. "Immediate", "Within 1 hour", "Within 12 hours", "Within 24 hours").
6. Provide a concise, clear reason justifying the department routing and the escalation level.

Evaluate objectively and return a JSON object matching this schema:
- department: string
- department_code: string
- routing_confidence: number (float)
- escalation_level: One of: "Normal", "High", "Emergency"
- estimated_assignment_time: string
- reason: string`,
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            department: { type: Type.STRING },
            department_code: { type: Type.STRING },
            routing_confidence: { type: Type.NUMBER },
            escalation_level: { 
              type: Type.STRING, 
              enum: ["Normal", "High", "Emergency"] 
            },
            estimated_assignment_time: { type: Type.STRING },
            reason: { type: Type.STRING }
          },
          required: [
            "department", 
            "department_code", 
            "routing_confidence", 
            "escalation_level", 
            "estimated_assignment_time", 
            "reason"
          ]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Gemini returned empty routing assessment.");
    }

    const result = JSON.parse(resultText);
    res.json(result);
  } catch (error: any) {
    console.error("Routing failed:", error);
    res.status(500).json({ 
      error: "Failed to run routing assessment with Gemini", 
      details: error.message 
    });
  }
});

// API endpoint for final operational priority calculation (Priority Intelligence Agent)
app.post("/api/calculate-priority", async (req, res) => {
  try {
    const { 
      category, 
      short_summary, 
      severity, 
      risk_level, 
      severity_score, 
      impact_reason, 
      duplicate_status, 
      similarity_score, 
      routing_department, 
      routing_escalation, 
      description, 
      location 
    } = req.body;

    const ai = getAiClient();

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        `You are an expert municipal Priority Intelligence Agent. Your task is to analyze all upstream agent findings alongside the complaint metadata to determine a single, unified operational priority and priority score.

Input Context:
- Vision Agent Category: "${category || "N/A"}"
- Vision Agent Short Summary: "${short_summary || "N/A"}"
- Impact Agent Severity: "${severity || "N/A"}"
- Impact Agent Severity Score: ${severity_score || 50}
- Impact Agent Risk Level/Domain: "${risk_level || "N/A"}"
- Impact Agent Reason: "${impact_reason || "N/A"}"
- Duplicate Agent Status: "${duplicate_status || "N/A"}"
- Duplicate Agent Similarity Score: ${similarity_score || 0}%
- Routing Agent Department: "${routing_department || "N/A"}"
- Routing Agent Escalation Level: "${routing_escalation || "N/A"}"
- Reporter Description: "${description || "N/A"}"
- Location: "${location || "N/A"}"

Evaluation Rules:
1. Systematically combine and synthesize these metrics. Do not rely on a single field alone.
   - For instance, a complaint with "High" severity but "Confirmed Duplicate" status might be deprioritized in terms of *new action* but auto-escalated for *re-dispatch* depending on the department SLA.
   - A "Critical" severity issue from the Impact Agent coupled with an "Emergency" escalation from the Routing Agent warrants a "Critical" final priority with a score above 90.
2. Calculate a priority score between 0 and 100, where higher scores represent higher operational urgency.
3. Determine confidence (0.0 to 1.0) based on how coherent and well-routed the information seems.
4. Determine the final priority: "Low", "Medium", "High", or "Critical".
5. Recommend the specific action that dispatchers or teams should take next.
6. Provide a cohesive reason explaining the rationale for this synthesis.

Evaluate objectively and return a JSON object matching this schema:
- priority: One of "Low", "Medium", "High", "Critical"
- priority_score: number (integer, 0-100)
- confidence: number (float, 0.0-1.0)
- recommended_action: string
- reason: string`,
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            priority: { 
              type: Type.STRING,
              enum: ["Low", "Medium", "High", "Critical"]
            },
            priority_score: { type: Type.INTEGER },
            confidence: { type: Type.NUMBER },
            recommended_action: { type: Type.STRING },
            reason: { type: Type.STRING }
          },
          required: [
            "priority",
            "priority_score",
            "confidence",
            "recommended_action",
            "reason"
          ]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Gemini returned empty priority assessment.");
    }

    const result = JSON.parse(resultText);
    res.json(result);
  } catch (error: any) {
    console.error("Priority calculation failed:", error);
    res.status(500).json({ 
      error: "Failed to run priority calculation with Gemini", 
      details: error.message 
    });
  }
});

// Vite middleware for development or static file serving for production
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
