import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Calendar, 
  FileText, 
  TrendingUp,
  CheckCircle2
} from "lucide-react";
import CandidateCard from "@/components/CandidateCard";
import InterviewScheduler from "@/components/InterviewScheduler";
import PipelineStats from "@/components/PipelineStats";

const API_BASE = "http://localhost:5000/api"; // ✅ Flask backend URL

const Index = () => {
  const [candidates, setCandidates] = useState([]);
  const [selectedTab, setSelectedTab] = useState("pipeline");
  const [loading, setLoading] = useState(false);
  const [fetchMessage, setFetchMessage] = useState("");

  // Fetch candidates from Flask
  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/candidates`);
      const data = await res.json();
      if (data.success) {
        setCandidates(data.candidates || []);
      } else {
        console.error("Error:", data.error);
      }
    } catch (err) {
      console.error("Failed to fetch candidates:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch resumes from Gmail
  const fetchGmailResumes = async () => {
    try {
      setFetchMessage("Fetching resumes from Gmail...");
      const res = await fetch(`${API_BASE}/gmail/fetch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "has:attachment" }),
      });
      const data = await res.json();
      setFetchMessage(data.message || data.error);
    } catch (err) {
      setFetchMessage("Error connecting to backend");
    }
  };

  // Parse all resumes
  const parseAllResumes = async () => {
    try {
      setFetchMessage("Parsing all resumes...");
      const res = await fetch(`${API_BASE}/parse/all`, { method: "POST" });
      const data = await res.json();
      setFetchMessage(data.message || data.error);
    } catch (err) {
      setFetchMessage("Error parsing resumes");
    }
  };

  // Enrich candidates
  const enrichCandidates = async () => {
    try {
      setFetchMessage("Enriching candidate profiles...");
      const res = await fetch(`${API_BASE}/candidates/enrich`, { method: "POST" });
      const data = await res.json();
      setFetchMessage(data.message || data.error);
    } catch (err) {
      setFetchMessage("Error enriching candidates");
    }
  };

  // Load candidates on mount
  useEffect(() => {
    fetchCandidates();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">AI Recruiter Copilot</h1>
                <p className="text-sm text-muted-foreground">Intelligent Hiring Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="gap-2">
                <CheckCircle2 className="h-3 w-3" />
                Connected to Flask API
              </Badge>
              <Button onClick={fetchGmailResumes} variant="default" size="sm" className="gap-2">
                <FileText className="h-4 w-4" />
                Fetch New Resumes
              </Button>
              <Button onClick={parseAllResumes} variant="outline" size="sm">
                Parse Resumes
              </Button>
              <Button onClick={enrichCandidates} variant="outline" size="sm">
                Enrich Candidates
              </Button>
            </div>
          </div>
          {fetchMessage && <p className="text-sm text-muted-foreground mt-2">{fetchMessage}</p>}
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="pipeline" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-2">
              <Calendar className="h-4 w-4" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <FileText className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Pipeline Tab */}
          <TabsContent value="pipeline" className="space-y-6">
            <PipelineStats candidates={candidates} />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">Candidate Pipeline</h2>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-2">
                    <Users className="h-3 w-3" />
                    {loading ? "Loading..." : `${candidates.length} Active Candidates`}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-4">
                {candidates.length > 0 ? (
                  candidates.map((candidate) => (
                    <CandidateCard key={candidate.id} candidate={candidate} />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No candidates available.</p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-6">
            <InterviewScheduler candidates={candidates.filter(c => c.stage === "interview")} />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Recruitment Analytics</h3>
              <p>📊 Coming soon — integrate with `/api/stats` for real-time analytics.</p>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
