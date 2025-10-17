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
  CheckCircle2,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import CandidateCard from "@/components/CandidateCard";
import InterviewScheduler from "@/components/InterviewScheduler";
import PipelineStats from "@/components/PipelineStats";

const API_BASE = "http://localhost:5000/api";

const Index = () => {
  const [candidates, setCandidates] = useState([]);
  const [selectedTab, setSelectedTab] = useState("pipeline");
  const [loading, setLoading] = useState(false);
  const [fetchMessage, setFetchMessage] = useState("");
  const [apiConnected, setApiConnected] = useState(false);

  // Check API health
  const checkApiHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      const data = await res.json();
      setApiConnected(data.status === 'healthy');
      return true;
    } catch (err) {
      setApiConnected(false);
      console.error("API health check failed:", err);
      return false;
    }
  };

  // Fetch candidates from Flask
  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/candidates`);
      const data = await res.json();
      
      if (data.success) {
        setCandidates(data.candidates || []);
        setFetchMessage(`✓ Loaded ${data.candidates?.length || 0} candidates`);
        setTimeout(() => setFetchMessage(""), 3000);
      } else {
        console.error("Error:", data.error);
        setFetchMessage(`✗ Error: ${data.error}`);
      }
    } catch (err) {
      console.error("Failed to fetch candidates:", err);
      setFetchMessage("✗ Failed to connect to backend. Is Flask running?");
      setApiConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // Fetch resumes from Gmail
  const fetchGmailResumes = async () => {
    try {
      setFetchMessage("📧 Fetching resumes from Gmail...");
      const res = await fetch(`${API_BASE}/gmail/fetch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "has:attachment" }),
      });
      const data = await res.json();
      setFetchMessage(data.success ? `✓ ${data.message}` : `✗ ${data.error}`);
      
      if (data.success) {
        setTimeout(() => fetchCandidates(), 1000);
      }
    } catch (err) {
      setFetchMessage("✗ Error connecting to backend");
    }
  };

  // Parse all resumes
  const parseAllResumes = async () => {
    try {
      setFetchMessage("🔄 Parsing all resumes...");
      const res = await fetch(`${API_BASE}/parse/all`, { method: "POST" });
      const data = await res.json();
      setFetchMessage(data.success ? `✓ ${data.message}` : `✗ ${data.error}`);
      
      if (data.success) {
        setTimeout(() => fetchCandidates(), 1000);
      }
    } catch (err) {
      setFetchMessage("✗ Error parsing resumes");
    }
  };

  // Enrich candidates
  const enrichCandidates = async () => {
    try {
      setFetchMessage("🚀 Enriching candidate profiles...");
      const res = await fetch(`${API_BASE}/candidates/enrich`, { method: "POST" });
      const data = await res.json();
      setFetchMessage(data.success ? `✓ ${data.message}` : `✗ ${data.error}`);
      
      if (data.success) {
        setTimeout(() => fetchCandidates(), 1000);
      }
    } catch (err) {
      setFetchMessage("✗ Error enriching candidates");
    }
  };

  // Load candidates on mount
  useEffect(() => {
    checkApiHealth().then((healthy) => {
      if (healthy) {
        fetchCandidates();
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">AI Recruiter Copilot</h1>
                <p className="text-sm text-muted-foreground">Intelligent Hiring Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              <Badge 
                variant={apiConnected ? "secondary" : "destructive"} 
                className="gap-2"
              >
                {apiConnected ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    Connected to Flask API
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3" />
                    API Disconnected
                  </>
                )}
              </Badge>
              
              <Button 
                onClick={fetchCandidates} 
                variant="ghost" 
                size="sm"
                className="gap-2"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              <Button 
                onClick={fetchGmailResumes} 
                variant="default" 
                size="sm" 
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Fetch Resumes
              </Button>
              
              <Button 
                onClick={parseAllResumes} 
                variant="outline" 
                size="sm"
              >
                Parse Resumes
              </Button>
              
              <Button 
                onClick={enrichCandidates} 
                variant="outline" 
                size="sm"
              >
                Enrich Candidates
              </Button>
            </div>
          </div>
          
          {fetchMessage && (
            <div className="mt-3 p-2 rounded-md bg-muted/50 border">
              <p className="text-sm text-muted-foreground">{fetchMessage}</p>
            </div>
          )}
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
                {loading ? (
                  <Card className="p-8 text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
                    <p className="text-sm text-muted-foreground">Loading candidates...</p>
                  </Card>
                ) : candidates.length > 0 ? (
                  candidates.map((candidate) => (
                    <CandidateCard key={candidate.id} candidate={candidate} />
                  ))
                ) : (
                  <Card className="p-8 text-center">
                    <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm font-medium mb-1">No candidates available</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Fetch resumes from Gmail to get started
                    </p>
                    <Button onClick={fetchGmailResumes} size="sm" className="gap-2">
                      <FileText className="h-4 w-4" />
                      Fetch Resumes from Gmail
                    </Button>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-6">
            <InterviewScheduler 
              candidates={candidates.filter(c => c.stage === "interview")} 
            />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Recruitment Analytics
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4 bg-muted/30">
                    <p className="text-sm text-muted-foreground mb-1">Total Candidates</p>
                    <p className="text-2xl font-bold">{candidates.length}</p>
                  </Card>
                  <Card className="p-4 bg-muted/30">
                    <p className="text-sm text-muted-foreground mb-1">Interview Stage</p>
                    <p className="text-2xl font-bold">
                      {candidates.filter(c => c.stage === "interview").length}
                    </p>
                  </Card>
                  <Card className="p-4 bg-muted/30">
                    <p className="text-sm text-muted-foreground mb-1">Avg. Score</p>
                    <p className="text-2xl font-bold">
                      {candidates.length > 0 
                        ? (candidates.reduce((acc, c) => acc + (c.score || 0), 0) / candidates.length).toFixed(1)
                        : "0"}
                    </p>
                  </Card>
                </div>
                <p className="text-sm text-muted-foreground">
                  📊 More detailed analytics coming soon — integrate with `/api/stats` for real-time insights.
                </p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;