export type IssueSeverity = "Low" | "Medium" | "High" | "Critical";
export type IssuePriority = "Low" | "Medium" | "High" | "Urgent";
export type IssueStatus = "Pending" | "In Progress" | "Resolved";

export interface Comment {
  id: string;
  authorEmail: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface ImpactAgentResult {
  severity: "Low" | "Medium" | "High" | "Critical";
  severity_score: number;
  risk_level: "Citizen" | "Traffic" | "Environment" | "Infrastructure";
  reason: string;
  estimated_response_time: "2 hours" | "24 hours" | "3 days" | "1 week";
}

export interface DuplicateAgentResult {
  duplicate_status: "New" | "Possible Duplicate" | "Confirmed Duplicate";
  similarity_score: number;
  matched_complaint_id: string | null;
  reason: string;
}

export interface RoutingAgentResult {
  department: string;
  department_code: string;
  routing_confidence: number;
  escalation_level: "Normal" | "High" | "Emergency";
  estimated_assignment_time: string;
  reason: string;
}

export interface PriorityAgentResult {
  priority: "Low" | "Medium" | "High" | "Critical";
  priority_score: number;
  confidence: number;
  recommended_action: string;
  reason: string;
}

export interface Complaint {
  id: string;
  category: string;
  description: string;
  location: string;
  imageUrl?: string; // Base64 image data or URL
  severity: IssueSeverity;
  priority: IssuePriority;
  confidence: number;
  status: IssueStatus;
  reporterEmail: string;
  reporterName: string;
  userId?: string;
  createdAt: string;
  resolvedAt?: string;
  comments?: Comment[];
  detected_objects?: string[];
  short_summary?: string;
  impactResult?: ImpactAgentResult;
  duplicateResult?: DuplicateAgentResult;
  routingResult?: RoutingAgentResult;
  priorityResult?: PriorityAgentResult;
  linked_complaint_id?: string | null;
}

export interface QuickStats {
  total: number;
  pending: number;
  resolved: number;
  byCategory: Record<string, number>;
}
