import React, { useState, useEffect } from 'react';
import { Upload, Mail, FileText, Users, Calendar, BarChart3, Search, Eye, Download, Loader2, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

export default function RecruiterCopilot() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [candidates, setCandidates] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [resumeView, setResumeView] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState(null);

  // Fetch data on mount
  useEffect(() => {
    fetchStats();
    fetchCandidates();
    fetchResumes();
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/stats`);
      const data = await response.json();
      if (data.success) setStats(data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchCandidates = async () => {
    try {
      const response = await fetch(`${API_URL}/candidates`);
      const data = await response.json();
      if (data.success) setCandidates(data.candidates);
    } catch (error) {
      console.error('Error fetching candidates:', error);
    }
  };

  const fetchResumes = async () => {
    try {
      const response = await fetch(`${API_URL}/resumes/list`);
      const data = await response.json();
      if (data.success) setResumes(data.resumes);
    } catch (error) {
      console.error('Error fetching resumes:', error);
    }
  };

  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (!files.length) return;

    setLoading(true);
    let uploadedCount = 0;

    for (let file of files) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch(`${API_URL}/resumes/upload`, {
          method: 'POST',
          body: formData
        });
        const data = await response.json();
        if (data.success) uploadedCount++;
      } catch (error) {
        console.error('Upload error:', error);
      }
    }

    setLoading(false);
    showNotification(`Uploaded ${uploadedCount} resume(s) successfully`);
    fetchResumes();
    fetchStats();
  };

  const handleFetchFromGmail = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/gmail/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'has:attachment' })
      });
      const data = await response.json();
      
      if (data.success) {
        showNotification(`Fetched ${data.count} emails from Gmail`);
        fetchResumes();
        fetchStats();
      } else {
        showNotification(data.error, 'error');
      }
    } catch (error) {
      showNotification('Failed to fetch from Gmail', 'error');
    }
    setLoading(false);
  };

  const handleParseAll = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/parse/all`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        showNotification(data.message);
        await handleEnrichCandidates();
      } else {
        showNotification('Failed to parse resumes', 'error');
      }
    } catch (error) {
      showNotification('Error parsing resumes', 'error');
    }
    setLoading(false);
  };

  const handleEnrichCandidates = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/candidates/enrich`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        showNotification(data.message);
        fetchCandidates();
        fetchStats();
      }
    } catch (error) {
      showNotification('Error enriching candidates', 'error');
    }
    setLoading(false);
  };

  const handleScheduleInterviews = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/interviews/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration_minutes: 45,
          buffer_minutes: 15,
          work_hours: [9, 17],
          skip_weekends: true
        })
      });
      const data = await response.json();
      
      if (data.success) {
        showNotification(data.message);
      } else {
        showNotification('Failed to schedule interviews', 'error');
      }
    } catch (error) {
      showNotification('Error scheduling interviews', 'error');
    }
    setLoading(false);
  };

  const viewResume = async (filename) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/resumes/view/${filename}`);
      const data = await response.json();
      
      if (data.success) {
        setResumeView(data);
      }
    } catch (error) {
      showNotification('Error viewing resume', 'error');
    }
    setLoading(false);
  };

  const filteredCandidates = candidates.filter(c => 
    searchQuery === '' || 
    c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.skills?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    console.log("Heloooo")
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-3 ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white animate-slide-in`}>
          {notification.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            🤖 AI Recruiter Copilot
          </h1>
          <p className="text-slate-400 mt-1">Intelligent Resume Processing & Interview Scheduling</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex gap-2 bg-slate-800/30 p-2 rounded-lg">
          {[
            { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
            { id: 'resumes', icon: FileText, label: 'Resumes' },
            { id: 'candidates', icon: Users, label: 'Candidates' },
            { id: 'schedule', icon: Calendar, label: 'Schedule' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-500 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Resumes', value: stats?.total_resumes || 0, icon: FileText, color: 'blue' },
                { label: 'Parsed', value: stats?.parsed_resumes || 0, icon: CheckCircle, color: 'green' },
                { label: 'Enriched', value: stats?.enriched_candidates || 0, icon: Users, color: 'purple' },
                { label: 'Ready', value: stats?.enriched_candidates || 0, icon: Calendar, color: 'pink' }
              ].map((stat, i) => (
                <div key={i} className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm">{stat.label}</p>
                      <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-lg bg-${stat.color}-500/20`}>
                      <stat.icon className={`text-${stat.color}-400`} size={24} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <label className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg cursor-pointer hover:scale-105 transition-transform border border-purple-500/30">
                  <Upload size={32} className="text-purple-400" />
                  <span className="text-white font-medium">Upload Resumes</span>
                  <input type="file" multiple accept=".pdf,.docx,.doc" onChange={handleFileUpload} className="hidden" />
                </label>

                <button
                  onClick={handleFetchFromGmail}
                  disabled={loading}
                  className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg hover:scale-105 transition-transform border border-blue-500/30"
                >
                  <Mail size={32} className="text-blue-400" />
                  <span className="text-white font-medium">Fetch from Gmail</span>
                </button>

                <button
                  onClick={handleParseAll}
                  disabled={loading}
                  className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg hover:scale-105 transition-transform border border-green-500/30"
                >
                  <FileText size={32} className="text-green-400" />
                  <span className="text-white font-medium">Parse All</span>
                </button>

                <button
                  onClick={handleScheduleInterviews}
                  disabled={loading}
                  className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-lg hover:scale-105 transition-transform border border-pink-500/30"
                >
                  <Calendar size={32} className="text-pink-400" />
                  <span className="text-white font-medium">Schedule All</span>
                </button>
              </div>
            </div>

            {/* Top Skills */}
            {stats?.top_skills && stats.top_skills.length > 0 && (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Top Skills</h2>
                <div className="space-y-3">
                  {stats.top_skills.map((skill, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-32 text-slate-300">{skill.skill}</div>
                      <div className="flex-1 bg-slate-700/50 rounded-full h-6 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-full flex items-center justify-end px-3"
                          style={{ width: `${(skill.count / stats.top_skills[0].count) * 100}%` }}
                        >
                          <span className="text-xs text-white font-bold">{skill.count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Resumes Tab */}
        {activeTab === 'resumes' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Uploaded Resumes</h2>
              <button
                onClick={fetchResumes}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
              >
                <RefreshCw size={18} />
                Refresh
              </button>
            </div>

            <div className="grid gap-4">
              {resumes.map((resume, i) => (
                <div key={i} className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-500/20 rounded-lg">
                      <FileText className="text-purple-400" size={24} />
                    </div>
                    <div>
                      <p className="text-white font-medium">{resume.filename}</p>
                      <p className="text-slate-400 text-sm">
                        {(resume.size / 1024).toFixed(2)} KB • {new Date(resume.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => viewResume(resume.filename)}
                      className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30"
                    >
                      <Eye size={18} />
                    </button>
                    <a
                      href={`${API_URL}/resumes/download/${resume.filename}`}
                      className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30"
                    >
                      <Download size={18} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Candidates Tab */}
        {activeTab === 'candidates' && (
          <div className="space-y-4">
            <div className="flex gap-4 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Search candidates by name, email, or skills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-purple-500/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="grid gap-4">
              {filteredCandidates.map((candidate, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedCandidate(candidate)}
                  className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6 hover:border-purple-500/50 cursor-pointer transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white">{candidate.full_name || 'Unknown'}</h3>
                      <p className="text-slate-400 mt-1">{candidate.email}</p>
                      <p className="text-slate-400 text-sm mt-1">
                        {candidate.current_role} at {candidate.current_company}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {candidate.skills?.slice(0, 5).map((skill, j) => (
                          <span key={j} className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                            {skill}
                          </span>
                        ))}
                        {candidate.skills?.length > 5 && (
                          <span className="px-3 py-1 bg-slate-700/50 text-slate-400 rounded-full text-sm">
                            +{candidate.skills.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Interview Scheduling</h2>
            <p className="text-slate-400 mb-6">Configure and schedule interviews for all candidates</p>
            
            <button
              onClick={handleScheduleInterviews}
              disabled={loading || candidates.length === 0}
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Calendar size={20} />}
              {loading ? 'Scheduling...' : `Schedule ${candidates.length} Interviews`}
            </button>
          </div>
        )}
      </div>

      {/* Resume View Modal */}
      {resumeView && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-purple-500/20 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">{resumeView.filename}</h3>
              <button
                onClick={() => setResumeView(null)}
                className="p-2 hover:bg-slate-700 rounded-lg"
              >
                <XCircle className="text-slate-400" size={24} />
              </button>
            </div>
            <div className="p-6 overflow-auto flex-1">
              <pre className="text-slate-300 whitespace-pre-wrap font-mono text-sm">{resumeView.content}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Detail Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-purple-500/20 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">{selectedCandidate.full_name}</h3>
              <button
                onClick={() => setSelectedCandidate(null)}
                className="p-2 hover:bg-slate-700 rounded-lg"
              >
                <XCircle className="text-slate-400" size={24} />
              </button>
            </div>
            <div className="p-6 overflow-auto flex-1 space-y-6">
              <div>
                <h4 className="text-purple-400 font-medium mb-2">Contact Information</h4>
                <div className="space-y-2">
                  <p className="text-white">Email: {selectedCandidate.email}</p>
                  {selectedCandidate.phone && <p className="text-white">Phone: {selectedCandidate.phone}</p>}
                </div>
              </div>
              
              <div>
                <h4 className="text-purple-400 font-medium mb-2">Current Position</h4>
                <p className="text-white">{selectedCandidate.current_role}</p>
                <p className="text-slate-400">{selectedCandidate.current_company}</p>
              </div>
              
              {selectedCandidate.education && (
                <div>
                  <h4 className="text-purple-400 font-medium mb-2">Education</h4>
                  <p className="text-white">{selectedCandidate.education}</p>
                </div>
              )}
              
              {selectedCandidate.skills && selectedCandidate.skills.length > 0 && (
                <div>
                  <h4 className="text-purple-400 font-medium mb-2">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCandidate.skills.map((skill, i) => (
                      <span key={i} className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedCandidate.experience_summary && (
                <div>
                  <h4 className="text-purple-400 font-medium mb-2">Experience Summary</h4>
                  <p className="text-white whitespace-pre-wrap">{selectedCandidate.experience_summary}</p>
                </div>
              )}
              
              {selectedCandidate.linkedin_url && (
                <div>
                  <h4 className="text-purple-400 font-medium mb-2">LinkedIn</h4>
                  <a 
                    href={selectedCandidate.linkedin_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline break-all"
                  >
                    {selectedCandidate.linkedin_url}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="bg-slate-800 rounded-xl p-8 flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-purple-400" size={48} />
            <p className="text-white text-lg">Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
}