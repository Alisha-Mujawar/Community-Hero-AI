import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  doc, 
  query, 
  orderBy,
  arrayUnion,
  Timestamp
} from "firebase/firestore";
import { db, auth, isFirebaseConfigured } from "../firebase";
import { Complaint, IssueStatus, Comment, QuickStats, IssueSeverity, IssuePriority } from "../types";

const COMPLAINTS_COLLECTION = "complaints";
const LOCAL_STORAGE_KEY = "community_hero_complaints";

// Firestore Error Information conforming to the firebase-integration skill
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Standard Firestore-only service with no local fallbacks or seeding logic.
export async function getComplaints(user?: { email: string; role: "citizen" | "authority"; userId?: string }): Promise<Complaint[]> {
  if (!isFirebaseConfigured || !db) {
    return [];
  }

  try {
    const q = query(collection(db, COMPLAINTS_COLLECTION));
    const querySnapshot = await getDocs(q);
    
    let list: Complaint[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        ...data
      } as Complaint);
    });

    // Sort by createdAt descending
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Filter based on user role and identification if specified
    if (user) {
      if (user.role === "citizen") {
        return list.filter(
          (c) => 
            (c.userId && c.userId === user.userId) || 
            (c.reporterEmail && c.reporterEmail.toLowerCase() === user.email.toLowerCase())
        );
      }
    }

    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COMPLAINTS_COLLECTION);
    return [];
  }
}

export async function addComplaint(complaintData: Omit<Complaint, "id">): Promise<string> {
  if (!isFirebaseConfigured || !db) {
    throw new Error("Firebase is not configured.");
  }

  try {
    const docRef = await addDoc(collection(db, COMPLAINTS_COLLECTION), complaintData);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COMPLAINTS_COLLECTION);
    throw error;
  }
}

export async function updateComplaintStatus(
  id: string, 
  status: IssueStatus, 
  comment?: Omit<Comment, "id" | "createdAt">
): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    throw new Error("Firebase is not configured.");
  }

  try {
    const docRef = doc(db, COMPLAINTS_COLLECTION, id);
    const updates: any = { status };
    
    if (status === "Resolved") {
      updates.resolvedAt = new Date().toISOString();
    }

    if (comment) {
      const fullComment: Comment = {
        id: Math.random().toString(36).substring(2, 9),
        authorEmail: comment.authorEmail,
        authorName: comment.authorName,
        text: comment.text,
        createdAt: new Date().toISOString()
      };
      updates.comments = arrayUnion(fullComment);
    }

    await updateDoc(docRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COMPLAINTS_COLLECTION}/${id}`);
    throw error;
  }
}

export async function addCommentToComplaint(
  id: string, 
  comment: Omit<Comment, "id" | "createdAt">
): Promise<Comment> {
  if (!isFirebaseConfigured || !db) {
    throw new Error("Firebase is not configured.");
  }

  const fullComment: Comment = {
    id: Math.random().toString(36).substring(2, 9),
    authorEmail: comment.authorEmail,
    authorName: comment.authorName,
    text: comment.text,
    createdAt: new Date().toISOString()
  };

  try {
    const docRef = doc(db, COMPLAINTS_COLLECTION, id);
    await updateDoc(docRef, {
      comments: arrayUnion(fullComment)
    });
    return fullComment;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COMPLAINTS_COLLECTION}/${id}/comments`);
    throw error;
  }
}

export function computeQuickStats(complaints: Complaint[]): QuickStats {
  const stats: QuickStats = {
    total: complaints.length,
    pending: 0,
    resolved: 0,
    byCategory: {}
  };

  complaints.forEach((c) => {
    if (c.status === "Pending" || c.status === "In Progress") {
      stats.pending++;
    } else if (c.status === "Resolved") {
      stats.resolved++;
    }

    const cat = c.category || "Other";
    stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;
  });

  return stats;
}
