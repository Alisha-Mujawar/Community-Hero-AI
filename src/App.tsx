import React, { useState, useEffect } from "react";
import { auth } from "./firebase";
import AuthPage from "./components/AuthPage";
import Sidebar from "./components/Sidebar";
import HomeDashboard from "./components/HomeDashboard";
import ReportIssue from "./components/ReportIssue";
import ComplaintHistory from "./components/ComplaintHistory";
import AuthorityDashboard from "./components/AuthorityDashboard";
import { Complaint } from "./types";
import { getComplaints } from "./services/complaints";
import { Loader2 } from "lucide-react";

export default function App() {
  const [user, setUser] = useState<{ email: string; name: string; role: "citizen" | "authority"; userId: string } | null>(null);
  const [currentTab, setCurrentTab] = useState<string>("home");
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | undefined>(undefined);

  // Auto-switch tabs based on user role when logging in
  useEffect(() => {
    if (user) {
      if (user.role === "authority") {
        setCurrentTab("authority");
      } else {
        setCurrentTab("home");
      }
    }
  }, [user]);

  // Load complaints from Firestore
  useEffect(() => {
    if (!user) {
      setComplaints([]);
      setLoading(false);
      return;
    }
    async function loadData() {
      setLoading(true);
      try {
        const data = await getComplaints(user);
        setComplaints(data);
      } catch (err) {
        console.warn("Failed to load complaints:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [refreshKey, user]);

  const handleRefreshData = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleLogin = (loggedInUser: { email: string; name: string; role: "citizen" | "authority"; userId: string }) => {
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
    if (auth) {
      try {
        await auth.signOut();
      } catch (err) {
        console.warn("Firebase Auth signOut failed:", err);
      }
    }
    setUser(null);
    setCurrentTab("home");
    setSelectedComplaintId(undefined);
    setComplaints([]);
  };

  const handleViewComplaintFromHome = (complaint: Complaint) => {
    setSelectedComplaintId(complaint.id);
    setCurrentTab("history");
  };

  if (!user) {
    return <AuthPage onLoginSuccess={handleLogin} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans" id="app-root">
      {/* Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          setSelectedComplaintId(undefined); // Reset deep-linked selected complaint on manual tab change
        }}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden" id="app-main-content">
        {loading && complaints.length === 0 ? (
          <div className="flex-1 flex items-center justify-center bg-slate-50" id="main-loading-spinner">
            <div className="text-center space-y-3">
              <Loader2 className="w-10 h-10 text-teal-500 animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Loading database cache...</p>
            </div>
          </div>
        ) : (
          <>
            {currentTab === "home" && user.role === "citizen" && (
              <HomeDashboard
                user={user}
                complaints={complaints}
                onReportIssueClick={() => setCurrentTab("report")}
                onViewComplaint={handleViewComplaintFromHome}
              />
            )}

            {currentTab === "report" && user.role === "citizen" && (
              <ReportIssue
                user={user}
                onSuccess={() => {
                  handleRefreshData();
                  setCurrentTab("history");
                }}
              />
            )}

            {currentTab === "history" && (
              <ComplaintHistory
                user={user}
                complaints={complaints}
                selectedComplaintId={selectedComplaintId}
                onRefresh={handleRefreshData}
              />
            )}

            {currentTab === "authority" && user.role === "authority" && (
              <AuthorityDashboard
                user={user}
                complaints={complaints}
                onRefresh={handleRefreshData}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
