import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Users,
  Calendar,
  FileText,
  TrendingUp,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Search,
  Download,
  Mail,
  MessageSquare,
  Star,
  BarChart3,
  Clock,
  Award,
  Briefcase,
  GraduationCap,
  Send,
  Plus,
  Eye,
  Play,
  Pause,
  Settings,
  Workflow,
  Database,
  Cpu,
  Link,
  Zap,
} from "lucide-react";
import InterviewScheduler from "@/components/InterviewScheduler";
import PipelineStats from "@/components/PipelineStats";
import ResumeViewer from "@/components/ResumeViewer";

const API_BASE = "http://localhost:5000/api";

const Index = () => {
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [selectedTab, setSelectedTab] = useState("pipeline");
  const [loading, setLoading] = useState(false);
  const [fetchMessage, setFetchMessage] = useState("");
  const [apiConnected, setApiConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [experienceFilter, setExperienceFilter] = useState("all");
  const [sortBy, setSortBy] = useState("score");
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [currentCandidate, setCurrentCandidate] = useState(null);
  const [emailTemplate, setEmailTemplate] = useState("");
  const [candidateNotes, setCandidateNotes] = useState({});
  const [interviewFeedback, setInterviewFeedback] = useState({});
  
  // Enhanced Pipeline states
  const [pipelineStatus, setPipelineStatus] = useState("idle"); // idle, running, completed, error
  const [pipelineProgress, setPipelineProgress] = useState(0);
  const [pipelineResults, setPipelineResults] = useState(null);
  const [pipelineStages, setPipelineStages] = useState([
    { id: 'fetch', name: 'Fetch Resumes', status: 'pending', description: 'Fetch resumes from Gmail', icon: Database },
    { id: 'parse', name: 'Parse Resumes', status: 'pending', description: 'Extract text from resumes', icon: FileText },
    { id: 'gemini', name: 'AI Parsing', status: 'pending', description: 'AI parsing with Gemini', icon: Cpu },
    { id: 'enrich', name: 'Enrich Data', status: 'pending', description: 'Enrich with LinkedIn data', icon: Link },
    { id: 'schedule', name: 'Schedule Interviews', status: 'pending', description: 'Schedule interviews', icon: Calendar },
  ]);
  const [systemStatus, setSystemStatus] = useState(null);
  const [pipelineLogs, setPipelineLogs] = useState([]);
  const [currentRunningStage, setCurrentRunningStage] = useState(null);

  const emailTemplates = {
    interview_invite: "Hi {name},\n\nWe're impressed with your profile and would like to invite you for an interview.\n\nBest regards,\nRecruiting Team",
    rejection: "Hi {name},\n\nThank you for your interest. Unfortunately, we've decided to move forward with other candidates.\n\nBest regards,\nRecruiting Team",
    follow_up: "Hi {name},\n\nJust following up on your application. We'd like to know if you're still interested in the position.\n\nBest regards,\nRecruiting Team",
    offer: "Hi {name},\n\nCongratulations! We'd like to extend an offer for the position.\n\nBest regards,\nRecruiting Team",
  };

  // Helper function to add pipeline logs
  const addPipelineLog = (message, type = 'info') => {
    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      message,
      type,
    };
    
    setPipelineLogs(prev => [logEntry, ...prev].slice(0, 50)); // Keep last 50 logs
  };

  const checkApiHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (!res.ok) throw new Error("API health check failed");
      const data = await res.json();
      setApiConnected(data.status === "healthy");
      return data.status === "healthy";
    } catch (err) {
      setApiConnected(false);
      console.error("API health check failed:", err);
      return false;
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/system/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSystemStatus(data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch system status:", err);
    }
  };

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/candidates`);
      if (!res.ok) throw new Error("Failed to fetch candidates");
      const data = await res.json();

      if (data.success) {
        const candidatesWithScore = (data.candidates || []).map((c) => ({
          ...c,
          score: c.score || calculateScore(c),
          stage: c.stage || "screening",
        }));
        setCandidates(candidatesWithScore);
        setFilteredCandidates(candidatesWithScore);
        setFetchMessage(`✓ Loaded ${candidatesWithScore.length} candidates`);
        setTimeout(() => setFetchMessage(""), 3000);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error("Failed to fetch candidates:", err);
      setFetchMessage("✗ Failed to connect to backend. Is Flask running?");
      setApiConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const calculateScore = (candidate) => {
    let score = 0;
    const skills = candidate.skills || [];
    score += Math.min(skills.length * 5, 40);
    const experience = candidate.experience || [];
    const totalYears = experience.reduce(
      (acc, exp) => acc + (exp.duration ? parseInt(exp.duration) : 1),
      0
    );
    score += Math.min(totalYears * 3, 30);
    const education = candidate.education || [];
    score += Math.min(education.length * 10, 20);
    if (candidate.linkedin_url) score += 5;
    if (candidate.phone) score += 5;
    return Math.min(Math.round(score), 100);
  };

  const fetchGmailResumes = async () => {
    try {
      setFetchMessage("📧 Fetching resumes from Gmail...");
      const res = await fetch(`${API_BASE}/gmail/fetch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "has:attachment" }),
      });
      if (!res.ok) throw new Error("Failed to fetch resumes");
      const data = await res.json();
      setFetchMessage(data.success ? `✓ ${data.message}` : `✗ ${data.error}`);
      if (data.success) {
        setTimeout(fetchCandidates, 1000);
      }
    } catch (err) {
      setFetchMessage("✗ Error connecting to backend");
      console.error("Failed to fetch Gmail resumes:", err);
    }
  };

  const parseAllResumes = async () => {
    try {
      setFetchMessage("🔄 Parsing all resumes...");
      const res = await fetch(`${API_BASE}/parse/all`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to parse resumes");
      const data = await res.json();
      setFetchMessage(data.success ? `✓ ${data.message}` : `✗ ${data.error}`);
      if (data.success) {
        setTimeout(fetchCandidates, 1000);
      }
    } catch (err) {
      setFetchMessage("✗ Error parsing resumes");
      console.error("Failed to parse resumes:", err);
    }
  };

  const enrichCandidates = async () => {
    try {
      setFetchMessage("🚀 Enriching candidate profiles...");
      const res = await fetch(`${API_BASE}/candidates/enrich`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to enrich candidates");
      const data = await res.json();
      setFetchMessage(data.success ? `✓ ${data.message}` : `✗ ${data.error}`);
      if (data.success) {
        setTimeout(fetchCandidates, 1000);
      }
    } catch (err) {
      setFetchMessage("✗ Error enriching candidates");
      console.error("Failed to enrich candidates:", err);
    }
  };

  // Enhanced Pipeline functions
  const runCompletePipeline = async () => {
    try {
      setPipelineStatus("running");
      setPipelineProgress(0);
      setPipelineResults(null);
      setPipelineLogs([]);
      setCurrentRunningStage(null);
      
      // Reset all stages to pending
      setPipelineStages(prev => prev.map(stage => ({ ...stage, status: 'pending' })));
      
      const stages = ['fetch', 'parse', 'gemini', 'enrich', 'schedule'];
      let results = [];
      
      for (let i = 0; i < stages.length; i++) {
        const stageId = stages[i];
        const stage = pipelineStages.find(s => s.id === stageId);
        
        // Update current running stage
        setCurrentRunningStage(stageId);
        setPipelineStages(prev => 
          prev.map(s => s.id === stageId ? { ...s, status: 'running' } : s)
        );
        
        // Add log entry
        addPipelineLog(`Starting ${stage.name}...`, 'info');
        
        try {
          const result = await runPipelineStage(stageId);
          results.push(result);
          
          // Update stage status based on result
          setPipelineStages(prev =>
            prev.map(s => s.id === stageId ? { ...s, status: result.success ? 'completed' : 'failed' } : s)
          );
          
          if (result.success) {
            addPipelineLog(`✓ ${stage.name} completed successfully`, 'success');
          } else {
            addPipelineLog(`✗ ${stage.name} failed: ${result.error}`, 'error');
            // Stop pipeline if a stage fails
            break;
          }
          
        } catch (error) {
          const errorResult = { success: false, error: error.message };
          results.push(errorResult);
          setPipelineStages(prev =>
            prev.map(s => s.id === stageId ? { ...s, status: 'failed' } : s)
          );
          addPipelineLog(`✗ ${stage.name} failed: ${error.message}`, 'error');
          break;
        }
        
        // Update progress
        setPipelineProgress(((i + 1) / stages.length) * 100);
      }
      
      // Check if all stages completed successfully
      const allSuccess = results.every(r => r.success);
      setPipelineStatus(allSuccess ? 'completed' : 'error');
      setCurrentRunningStage(null);
      
      if (allSuccess) {
        addPipelineLog('🎉 All pipeline stages completed successfully!', 'success');
      } else {
        addPipelineLog('⚠️ Pipeline completed with errors', 'warning');
      }
      
      setPipelineResults({ results });
      
      // Refresh data
      setTimeout(() => {
        fetchCandidates();
        fetchSystemStatus();
      }, 1000);
      
    } catch (error) {
      setPipelineStatus('error');
      setCurrentRunningStage(null);
      addPipelineLog(`✗ Pipeline failed: ${error.message}`, 'error');
      console.error('Pipeline error:', error);
    }
  };

  const runPipelineStage = async (stageId) => {
    try {
      const stage = pipelineStages.find(s => s.id === stageId);
      addPipelineLog(`🚀 Running ${stage.name}...`, 'info');
      
      const res = await fetch(`${API_BASE}/pipeline/run-stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage_id: stageId }),
      });
      
      if (!res.ok) throw new Error('Failed to run pipeline stage');
      
      const data = await res.json();
      
      if (data.success) {
        return { success: true, data };
      } else {
        throw new Error(data.error || 'Stage failed');
      }
    } catch (error) {
      console.error(`Stage ${stageId} error:`, error);
      return { success: false, error: error.message };
    }
  };

  const getStageName = (stageId) => {
    const stages = {
      fetch: "Fetch Resumes",
      parse: "Parse Resumes", 
      gemini: "AI Parsing",
      enrich: "Enrich Data",
      schedule: "Schedule Interviews"
    };
    return stages[stageId] || stageId;
  };

  const cleanupSystem = async (type = "all") => {
    try {
      setFetchMessage("🧹 Cleaning up system...");
      const res = await fetch(`${API_BASE}/system/cleanup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      
      if (!res.ok) throw new Error("Cleanup failed");
      
      const data = await res.json();
      setFetchMessage(data.success ? `✓ ${data.message}` : `✗ ${data.error}`);
      
      if (data.success) {
        // Reset pipeline state
        setPipelineStages(prev => prev.map(stage => ({ ...stage, status: 'pending' })));
        setPipelineStatus('idle');
        setPipelineProgress(0);
        setPipelineResults(null);
        setPipelineLogs([]);
        setCurrentRunningStage(null);
        
        setTimeout(fetchCandidates, 1000);
        setTimeout(fetchSystemStatus, 1000);
      }
    } catch (err) {
      setFetchMessage(`✗ Cleanup failed: ${err.message}`);
    }
  };

  useEffect(() => {
    let filtered = [...candidates];

    if (searchQuery) {
      filtered = filtered.filter(
        (c) =>
          c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.skills?.some((s) =>
            s.toLowerCase().includes(searchQuery.toLowerCase())
          )
      );
    }

    if (skillFilter) {
      filtered = filtered.filter((c) =>
        c.skills?.some((s) => s.toLowerCase().includes(skillFilter.toLowerCase()))
      );
    }

    if (stageFilter !== "all") {
      filtered = filtered.filter((c) => c.stage === stageFilter);
    }

    if (experienceFilter !== "all") {
      filtered = filtered.filter((c) => {
        const totalYears = (c.experience || []).reduce(
          (acc, exp) => acc + (exp.duration ? parseInt(exp.duration) : 1),
          0
        );
        if (experienceFilter === "entry") return totalYears < 2;
        if (experienceFilter === "mid") return totalYears >= 2 && totalYears < 5;
        if (experienceFilter === "senior") return totalYears >= 5;
        return true;
      });
    }

    if (sortBy === "score") {
      filtered.sort((a, b) => (b.score || 0) - (a.score || 0));
    } else if (sortBy === "name") {
      filtered.sort((a, b) =>
        (a.full_name || "").localeCompare(b.full_name || "")
      );
    } else if (sortBy === "recent") {
      filtered.sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
      );
    }

    setFilteredCandidates(filtered);
  }, [candidates, searchQuery, skillFilter, stageFilter, experienceFilter, sortBy]);

  const exportToCSV = () => {
    const headers = [
      "Name",
      "Email",
      "Phone",
      "Skills",
      "Experience",
      "Score",
      "Stage",
    ];
    const rows = filteredCandidates.map((c) => [
      c.full_name || "",
      c.email || "",
      c.phone || "",
      (c.skills || []).join("; "),
      (c.experience || []).map((e) => `${e.title} at ${e.company}`).join("; "),
      c.score || 0,
      c.stage || "screening",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `candidates_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleCandidateSelection = (candidateId) => {
    setSelectedCandidates((prev) =>
      prev.includes(candidateId)
        ? prev.filter((id) => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  const sendEmail = (template) => {
    if (!currentCandidate) return;
    const email = emailTemplates[template].replace(
      "{name}",
      currentCandidate.full_name || "Candidate"
    );
    setEmailTemplate(email);
    setShowEmailDialog(true);
  };

  const addNote = (candidateId, note) => {
    setCandidateNotes((prev) => ({
      ...prev,
      [candidateId]: [
        ...(prev[candidateId] || []),
        {
          text: note,
          timestamp: new Date().toISOString(),
          author: "Recruiter",
        },
      ],
    }));
  };

  const saveFeedback = (candidateId, feedback) => {
    setInterviewFeedback((prev) => ({
      ...prev,
      [candidateId]: feedback,
    }));
  };

  useEffect(() => {
    checkApiHealth().then((healthy) => {
      if (healthy) {
        fetchCandidates();
        fetchSystemStatus();
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  AI Recruiter Copilot
                </h1>
                <p className="text-sm text-muted-foreground">
                  Intelligent Hiring Dashboard
                </p>
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
                    Connected
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3" />
                    Disconnected
                  </>
                )}
              </Badge>

              {/* Pipeline Status Badge */}
              <Badge
                variant={
                  pipelineStatus === 'completed' ? 'default' :
                  pipelineStatus === 'running' ? 'secondary' :
                  pipelineStatus === 'error' ? 'destructive' : 'outline'
                }
                className="gap-2"
              >
                {pipelineStatus === 'running' && <RefreshCw className="h-3 w-3 animate-spin" />}
                {pipelineStatus === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                {pipelineStatus === 'error' && <AlertCircle className="h-3 w-3" />}
                Pipeline: {pipelineStatus.charAt(0).toUpperCase() + pipelineStatus.slice(1)}
              </Badge>

              <Button
                onClick={fetchCandidates}
                variant="ghost"
                size="sm"
                className="gap-2"
                disabled={loading}
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              
              {/* Enhanced Pipeline Controls */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="default" size="sm" className="gap-2">
                    <Workflow className="h-4 w-4" />
                    Run Pipeline
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                  <DialogHeader>
                    <DialogTitle>AI Recruiter Pipeline</DialogTitle>
                    <DialogDescription>
                      Run the complete automated recruitment pipeline or individual stages
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6 overflow-y-auto max-h-[60vh]">
                    {/* Pipeline Status Header */}
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            pipelineStatus === 'running' ? 'bg-blue-100 text-blue-600' :
                            pipelineStatus === 'completed' ? 'bg-green-100 text-green-600' :
                            pipelineStatus === 'error' ? 'bg-red-100 text-red-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {pipelineStatus === 'running' ? <RefreshCw className="h-5 w-5 animate-spin" /> :
                             pipelineStatus === 'completed' ? <CheckCircle2 className="h-5 w-5" /> :
                             pipelineStatus === 'error' ? <AlertCircle className="h-5 w-5" /> :
                             <Play className="h-5 w-5" />}
                          </div>
                          <div>
                            <p className="font-medium">
                              {pipelineStatus === 'running' ? 'Pipeline Running' :
                               pipelineStatus === 'completed' ? 'Pipeline Completed' :
                               pipelineStatus === 'error' ? 'Pipeline Failed' :
                               'Ready to Run'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {pipelineStatus === 'running' ? `Currently running: ${currentRunningStage ? pipelineStages.find(s => s.id === currentRunningStage)?.name : '...'}` :
                               'Run individual stages or complete pipeline'}
                            </p>
                          </div>
                        </div>
                        <Badge variant={
                          pipelineStatus === 'completed' ? 'default' :
                          pipelineStatus === 'running' ? 'secondary' :
                          pipelineStatus === 'error' ? 'destructive' : 'outline'
                        }>
                          {Math.round(pipelineProgress)}% Complete
                        </Badge>
                      </div>
                      
                      {/* Progress Bar */}
                      {pipelineStatus === 'running' && (
                        <div className="mt-4">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${pipelineProgress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </Card>

                    {/* Pipeline Stages */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Pipeline Stages</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pipelineStages.map((stage) => {
                          const StageIcon = stage.icon;
                          const isRunning = currentRunningStage === stage.id;
                          const isDisabled = pipelineStatus === 'running' && !isRunning;
                          
                          return (
                            <Card key={stage.id} className={`p-4 ${
                              stage.status === 'completed' ? 'border-green-200 bg-green-50' :
                              stage.status === 'running' ? 'border-blue-200 bg-blue-50' :
                              stage.status === 'failed' ? 'border-red-200 bg-red-50' : ''
                            }`}>
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-lg ${
                                    stage.status === 'completed' ? 'bg-green-100' :
                                    stage.status === 'running' ? 'bg-blue-100' :
                                    stage.status === 'failed' ? 'bg-red-100' : 'bg-gray-100'
                                  }`}>
                                    <StageIcon className={`h-5 w-5 ${
                                      stage.status === 'completed' ? 'text-green-600' :
                                      stage.status === 'running' ? 'text-blue-600' :
                                      stage.status === 'failed' ? 'text-red-600' : 'text-gray-600'
                                    }`} />
                                  </div>
                                  <div>
                                    <p className="font-medium">{stage.name}</p>
                                    <p className="text-xs text-muted-foreground">{stage.description}</p>
                                  </div>
                                </div>
                                <Badge 
                                  variant={
                                    stage.status === 'completed' ? 'default' : 
                                    stage.status === 'running' ? 'secondary' :
                                    stage.status === 'failed' ? 'destructive' : 'outline'
                                  }
                                  className="gap-1"
                                >
                                  {stage.status === 'running' && <RefreshCw className="h-3 w-3 animate-spin" />}
                                  {stage.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                                  {stage.status === 'failed' && <AlertCircle className="h-3 w-3" />}
                                  {stage.status.charAt(0).toUpperCase() + stage.status.slice(1)}
                                </Badge>
                              </div>
                              <Button
                                onClick={() => runPipelineStage(stage.id)}
                                variant={stage.status === 'completed' ? 'outline' : 'default'}
                                size="sm"
                                className="w-full gap-2"
                                disabled={isDisabled || isRunning}
                              >
                                {isRunning ? (
                                  <>
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                    Running...
                                  </>
                                ) : stage.status === 'completed' ? (
                                  <>
                                    <RefreshCw className="h-3 w-3" />
                                    Run Again
                                  </>
                                ) : (
                                  <>
                                    <Play className="h-3 w-3" />
                                    Run Stage
                                  </>
                                )}
                              </Button>
                            </Card>
                          );
                        })}
                      </div>
                    </div>

                    {/* Pipeline Logs */}
                    {(pipelineLogs.length > 0 || pipelineStatus === 'running') && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Pipeline Logs</h4>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setPipelineLogs([])}
                            disabled={pipelineStatus === 'running'}
                          >
                            Clear Logs
                          </Button>
                        </div>
                        <Card className="p-4">
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {pipelineLogs.length > 0 ? (
                              pipelineLogs.map((log) => (
                                <div key={log.id} className="flex items-start gap-3 text-sm">
                                  <span className="text-muted-foreground text-xs mt-0.5 whitespace-nowrap">
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                  </span>
                                  <span className={`flex-1 ${
                                    log.type === 'success' ? 'text-green-600' :
                                    log.type === 'error' ? 'text-red-600' :
                                    log.type === 'warning' ? 'text-yellow-600' : 'text-foreground'
                                  }`}>
                                    {log.message}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                No logs yet. Run a pipeline stage to see logs here.
                              </p>
                            )}
                          </div>
                        </Card>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t">
                      <Button
                        onClick={runCompletePipeline}
                        className="flex-1 gap-2"
                        disabled={pipelineStatus === 'running'}
                        variant={pipelineStatus === 'running' ? 'outline' : 'default'}
                      >
                        {pipelineStatus === 'running' ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Running Pipeline...
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4" />
                            Run Complete Pipeline
                          </>
                        )}
                      </Button>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Settings className="h-4 w-4" />
                            Cleanup
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>System Cleanup</DialogTitle>
                            <DialogDescription>
                              Remove temporary files and reset pipeline state
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3">
                            <Button 
                              onClick={() => cleanupSystem("all")}
                              variant="outline" 
                              className="w-full justify-start"
                            >
                              Clean All Files
                            </Button>
                            <Button 
                              onClick={() => cleanupSystem("resumes")}
                              variant="outline" 
                              className="w-full justify-start"
                            >
                              Clean Resumes Only
                            </Button>
                            <Button 
                              onClick={() => cleanupSystem("parsed")}
                              variant="outline" 
                              className="w-full justify-start"
                            >
                              Clean Parsed Data
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {/* System Status */}
                    {systemStatus && (
                      <Card className="p-4">
                        <h4 className="font-medium mb-3">System Status</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <p className="text-muted-foreground">Resumes</p>
                            <p className="text-2xl font-bold text-blue-600">{systemStatus.folders?.resumes?.file_count || 0}</p>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <p className="text-muted-foreground">Parsed</p>
                            <p className="text-2xl font-bold text-green-600">{systemStatus.folders?.parsed_json?.file_count || 0}</p>
                          </div>
                          <div className="text-center p-3 bg-purple-50 rounded-lg">
                            <p className="text-muted-foreground">Enriched</p>
                            <p className="text-2xl font-bold text-purple-600">{systemStatus.folders?.enriched_json?.file_count || 0}</p>
                          </div>
                          <div className="text-center p-3 bg-orange-50 rounded-lg">
                            <p className="text-muted-foreground">Interviews</p>
                            <p className="text-2xl font-bold text-orange-600">{systemStatus.folders?.scheduled_interviews?.file_count || 0}</p>
                          </div>
                        </div>
                      </Card>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                onClick={fetchGmailResumes}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Fetch Resumes
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
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Candidates
                    </p>
                    <p className="text-2xl font-bold">{candidates.length}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Interview Stage
                    </p>
                    <p className="text-2xl font-bold">
                      {candidates.filter((c) => c.stage === "interview").length}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Star className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Score</p>
                    <p className="text-2xl font-bold">
                      {candidates.length > 0
                        ? (
                            candidates.reduce(
                              (acc, c) => acc + (c.score || 0),
                              0
                            ) / candidates.length
                          ).toFixed(0)
                        : "0"}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Clock className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">This Week</p>
                    <p className="text-2xl font-bold">
                      {
                        candidates.filter((c) => {
                          const date = new Date(c.created_at || Date.now());
                          const weekAgo = new Date(
                            Date.now() - 7 * 24 * 60 * 60 * 1000
                          );
                          return date > weekAgo;
                        }).length
                      }
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <PipelineStats candidates={candidates} />

            {/* Candidate List */}
            <Card className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search candidates..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={stageFilter} onValueChange={setStageFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    <SelectItem value="screening">Screening</SelectItem>
                    <SelectItem value="interview">Interview</SelectItem>
                    <SelectItem value="offer">Offer</SelectItem>
                    <SelectItem value="hired">Hired</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={experienceFilter}
                  onValueChange={setExperienceFilter}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Experience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="entry">Entry (0-2y)</SelectItem>
                    <SelectItem value="mid">Mid (2-5y)</SelectItem>
                    <SelectItem value="senior">Senior (5+y)</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="score">Highest Score</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="recent">Most Recent</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={exportToCSV}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </Card>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">
                  Candidate Pipeline
                </h2>
                <div className="flex items-center gap-2">
                  {selectedCandidates.length > 0 && (
                    <Badge variant="secondary" className="gap-2">
                      {selectedCandidates.length} selected
                    </Badge>
                  )}
                  <Badge variant="outline" className="gap-2">
                    <Users className="h-3 w-3" />
                    {filteredCandidates.length} Candidates
                  </Badge>
                </div>
              </div>

              <div className="grid gap-4">
                {loading ? (
                  <Card className="p-8 text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
                    <p className="text-sm text-muted-foreground">
                      Loading candidates...
                    </p>
                  </Card>
                ) : filteredCandidates.length > 0 ? (
                  filteredCandidates.map((candidate) => (
                    <Card
                      key={candidate.id}
                      className="p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg">
                              {(candidate.full_name || "U")[0].toUpperCase()}
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">
                                {candidate.full_name || "Unknown"}
                              </h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {candidate.email || "No email"}
                              </div>
                            </div>
                            <Badge variant="secondary" className="ml-auto">
                              <Star className="h-3 w-3 mr-1" />
                              {candidate.score || 0}
                            </Badge>
                          </div>
                          <div className="space-y-2 mb-3">
                            {candidate.experience?.[0] && (
                              <div className="flex items-center gap-2 text-sm">
                                <Briefcase className="h-4 w-4 text-muted-foreground" />
                                <span>
                                  {candidate.experience[0].title} at{" "}
                                  {candidate.experience[0].company}
                                </span>
                              </div>
                            )}
                            {candidate.education?.[0] && (
                              <div className="flex items-center gap-2 text-sm">
                                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                                <span>
                                  {candidate.education[0].degree} -{" "}
                                  {candidate.education[0].institution}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {(candidate.skills || [])
                              .slice(0, 5)
                              .map((skill, idx) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {skill}
                                </Badge>
                              ))}
                            {(candidate.skills?.length || 0) > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{(candidate.skills.length - 5)} more
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {/* Resume Viewer Button */}
                            <ResumeViewer candidate={candidate} variant="button" />
                            
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setCurrentCandidate(candidate)}
                                >
                                  <Mail className="h-4 w-4 mr-2" />
                                  Email
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>
                                    Send Email to {candidate.full_name}
                                  </DialogTitle>
                                  <DialogDescription>
                                    Choose a template or write a custom message
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="flex gap-2 flex-wrap">
                                    <Button
                                      size="sm"
                                      onClick={() => sendEmail("interview_invite")}
                                    >
                                      Interview Invite
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => sendEmail("follow_up")}
                                    >
                                      Follow Up
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => sendEmail("offer")}
                                    >
                                      Offer
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => sendEmail("rejection")}
                                    >
                                      Rejection
                                    </Button>
                                  </div>
                                  <Textarea
                                    value={emailTemplate}
                                    onChange={(e) =>
                                      setEmailTemplate(e.target.value)
                                    }
                                    placeholder="Email message..."
                                    rows={6}
                                  />
                                  <Button className="w-full gap-2">
                                    <Send className="h-4 w-4" />
                                    Send Email
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setCurrentCandidate(candidate)}
                                >
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Notes
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>
                                    Notes for {candidate.full_name}
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {(candidateNotes[candidate.id] || []).map(
                                      (note, idx) => (
                                        <Card key={idx} className="p-3">
                                          <p className="text-sm">{note.text}</p>
                                          <p className="text-xs text-muted-foreground mt-1">
                                            {note.author} -{" "}
                                            {new Date(note.timestamp).toLocaleString()}
                                          </p>
                                        </Card>
                                      )
                                    )}
                                  </div>
                                  <Textarea
                                    placeholder="Add a note..."
                                    id={`note-${candidate.id}`}
                                  />
                                  <Button
                                    className="w-full"
                                    onClick={() => {
                                      const input = document.getElementById(
                                        `note-${candidate.id}`
                                      );
                                      if (input?.value) {
                                        addNote(candidate.id, input.value);
                                        input.value = "";
                                      }
                                    }}
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Note
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setCurrentCandidate(candidate)}
                                >
                                  <Award className="h-4 w-4 mr-2" />
                                  Feedback
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>
                                    Interview Feedback - {candidate.full_name}
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  {interviewFeedback[candidate.id] && (
                                    <Card className="p-4 bg-muted/30">
                                      <p className="text-sm font-medium mb-2">
                                        Previous Feedback:
                                      </p>
                                      <p className="text-sm">
                                        {interviewFeedback[candidate.id].feedback}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-2">
                                        Rating: {interviewFeedback[candidate.id].rating}/5
                                      </p>
                                    </Card>
                                  )}
                                  <div>
                                    <label className="text-sm font-medium mb-2 block">
                                      Rating
                                    </label>
                                    <Select
                                      onValueChange={(value) =>
                                        saveFeedback(candidate.id, {
                                          ...interviewFeedback[candidate.id],
                                          rating: value,
                                        })
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select rating" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="5">5 - Excellent</SelectItem>
                                        <SelectItem value="4">4 - Very Good</SelectItem>
                                        <SelectItem value="3">3 - Good</SelectItem>
                                        <SelectItem value="2">2 - Fair</SelectItem>
                                        <SelectItem value="1">1 - Poor</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium mb-2 block">
                                      Feedback
                                    </label>
                                    <Textarea
                                      placeholder="Interview feedback..."
                                      onChange={(e) =>
                                        saveFeedback(candidate.id, {
                                          ...interviewFeedback[candidate.id],
                                          feedback: e.target.value,
                                        })
                                      }
                                      rows={5}
                                    />
                                  </div>
                                  <Button
                                    className="w-full"
                                    onClick={() => {
                                      if (
                                        interviewFeedback[candidate.id]?.rating &&
                                        interviewFeedback[candidate.id]?.feedback
                                      ) {
                                        saveFeedback(candidate.id, {
                                          ...interviewFeedback[candidate.id],
                                          date: new Date().toISOString(),
                                        });
                                      }
                                    }}
                                  >
                                    Save Feedback
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge
                            variant={
                              candidate.stage === "hired"
                                ? "default"
                                : candidate.stage === "interview"
                                ? "secondary"
                                : candidate.stage === "rejected"
                                ? "destructive"
                                : "outline"
                            }
                          >
                            {candidate.stage || "screening"}
                          </Badge>
                          <input
                            type="checkbox"
                            checked={selectedCandidates.includes(candidate.id)}
                            onChange={() => toggleCandidateSelection(candidate.id)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <Card className="p-8 text-center">
                    <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm font-medium mb-1">
                      No candidates found
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Try adjusting your filters or fetch resumes from Gmail
                    </p>
                    <Button
                      onClick={fetchGmailResumes}
                      size="sm"
                      className="gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Fetch Resumes from Gmail
                    </Button>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
           <InterviewScheduler
  candidates={candidates.filter((c) => 
    c.stage === "screening" || 
    c.stage === "interview" ||
    !c.stage // Include candidates without a stage set
  )}
/>
          </TabsContent>
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Stage Distribution
                </h3>
                <div className="space-y-3">
                  {["screening", "interview", "offer", "hired", "rejected"].map(
                    (stage) => {
                      const count = candidates.filter(
                        (c) => c.stage === stage
                      ).length;
                      const percentage =
                        candidates.length > 0
                          ? ((count / candidates.length) * 100).toFixed(0)
                          : 0;
                      return (
                        <div key={stage}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="capitalize">{stage}</span>
                            <span className="font-medium">
                              {count} ({percentage}%)
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                stage === "hired"
                                  ? "bg-green-500"
                                  : stage === "interview"
                                  ? "bg-blue-500"
                                  : stage === "offer"
                                  ? "bg-purple-500"
                                  : stage === "rejected"
                                  ? "bg-red-500"
                                  : "bg-gray-400"
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </Card>
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Top Skills
                </h3>
                <div className="space-y-3">
                  {(() => {
                    const skillCounts = {};
                    candidates.forEach((c) => {
                      (c.skills || []).forEach((skill) => {
                        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
                      });
                    });
                    const topSkills = Object.entries(skillCounts)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 8);
                    return topSkills.map(([skill, count]) => (
                      <div key={skill}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{skill}</span>
                          <span className="font-medium">{count} candidates</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-accent"
                            style={{
                              width: `${
                                (count / candidates.length) * 100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </Card>
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Score Distribution
                </h3>
                <div className="space-y-3">
                  {["90-100", "80-89", "70-79", "60-69", "Below 60"].map(
                    (range) => {
                      const [min, max] = range.includes("Below")
                        ? [0, 59]
                        : range.split("-").map(Number);
                      const count = candidates.filter((c) => {
                        const score = c.score || 0;
                        return score >= min && score <= max;
                      }).length;
                      const percentage =
                        candidates.length > 0
                          ? ((count / candidates.length) * 100).toFixed(0)
                          : 0;
                      return (
                        <div key={range}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{range} points</span>
                            <span className="font-medium">
                              {count} ({percentage}%)
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                range.startsWith("90")
                                  ? "bg-green-500"
                                  : range.startsWith("80")
                                  ? "bg-blue-500"
                                  : range.startsWith("70")
                                  ? "bg-yellow-500"
                                  : range.startsWith("60")
                                  ? "bg-orange-500"
                                  : "bg-red-500"
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </Card>
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Experience Levels
                </h3>
                <div className="space-y-3">
                  {[
                    { label: "Entry Level (0-2y)", min: 0, max: 2 },
                    { label: "Mid Level (2-5y)", min: 2, max: 5 },
                    { label: "Senior (5-10y)", min: 5, max: 10 },
                    { label: "Expert (10+y)", min: 10, max: 999 },
                  ].map(({ label, min, max }) => {
                    const count = candidates.filter((c) => {
                      const totalYears = (c.experience || []).reduce(
                        (acc, exp) =>
                          acc + (exp.duration ? parseInt(exp.duration) : 1),
                        0
                      );
                      return totalYears >= min && totalYears < max;
                    }).length;
                    const percentage =
                      candidates.length > 0
                        ? ((count / candidates.length) * 100).toFixed(0)
                        : 0;
                    return (
                      <div key={label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{label}</span>
                          <span className="font-medium">
                            {count} ({percentage}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-400 to-purple-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Recruitment Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-1">
                    Total Candidates
                  </p>
                  <p className="text-3xl font-bold">{candidates.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Active in pipeline
                  </p>
                </Card>
                <Card className="p-4 bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-1">
                    Interview Stage
                  </p>
                  <p className="text-3xl font-bold">
                    {candidates.filter((c) => c.stage === "interview").length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ready to schedule
                  </p>
                </Card>
                <Card className="p-4 bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-1">
                    Avg. Score
                  </p>
                  <p className="text-3xl font-bold">
                    {candidates.length > 0
                      ? (
                          candidates.reduce(
                            (acc, c) => acc + (c.score || 0),
                            0
                          ) / candidates.length
                        ).toFixed(0)
                      : "0"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Out of 100 points
                  </p>
                </Card>
                <Card className="p-4 bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-1">Hired</p>
                  <p className="text-3xl font-bold">
                    {candidates.filter((c) => c.stage === "hired").length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Successful placements
                  </p>
                </Card>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;