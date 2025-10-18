import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Mail, 
  Phone, 
  Linkedin, 
  ExternalLink,
  Calendar,
  Star,
  Clock,
  Download,
  Eye,
  FileText,
  X
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const API_BASE = "http://localhost:5000/api";

const stageColors = {
  new: { bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400", text: "text-blue-600", label: "New Application" },
  screening: { bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400", text: "text-purple-600", label: "Screening" },
  interview: { bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400", text: "text-amber-600", label: "Interview Stage" },
  offer: { bg: "bg-green-500/10 text-green-600 dark:text-green-400", text: "text-green-600", label: "Offer Sent" },
  rejected: { bg: "bg-red-500/10 text-red-600 dark:text-red-400", text: "text-red-600", label: "Not Selected" }
};

const CandidateCard = ({ candidate }) => {
  // Normalize candidate data (handles both formats from backend)
  const normalizedCandidate = {
    id: candidate.id || candidate.candidate_id,
    name: candidate.full_name || candidate.name,
    email: candidate.email,
    phone: candidate.phone || candidate.contact_number,
    position: candidate.position || candidate.desired_position || "Not specified",
    stage: candidate.stage || "new",
    score: candidate.score || candidate.match_score || 0,
    skills: candidate.skills || [],
    experience: candidate.experience || candidate.total_experience || "Not specified",
    education: candidate.education || (candidate.education_details?.[0]?.degree) || "Not specified",
    linkedinUrl: candidate.linkedin_url || candidate.linkedinUrl,
    resumeDate: candidate.resumeDate || candidate.created_at || new Date().toLocaleDateString(),
    status: candidate.status || "active",
    filename: candidate.filename,
    resume_filename: candidate.resume_filename,
    resume_text: candidate.resume_text || candidate.raw_text || ""
  };

  const stageInfo = stageColors[normalizedCandidate.stage] || stageColors.new;

  const handleScheduleInterview = () => {
    // TODO: Implement interview scheduling
    console.log("Schedule interview for:", normalizedCandidate.name);
  };

  const handleSendEmail = () => {
    window.location.href = `mailto:${normalizedCandidate.email}`;
  };

  const getResumeFilename = () => {
    return normalizedCandidate.resume_filename || 
           normalizedCandidate.filename?.replace('.json', '.pdf') || 
           `${normalizedCandidate.id}.pdf`;
  };

  const handleDownloadResume = () => {
    const filename = getResumeFilename();
    const url = `${API_BASE}/resumes/download/${filename}`;
    
    // Create a temporary anchor element to trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = `${normalizedCandidate.name.replace(/\s+/g, '_')}_Resume.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleViewResume = () => {
    const filename = getResumeFilename();
    const url = `${API_BASE}/resumes/download/${filename}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const ResumeViewerModal = () => {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full gap-2">
            <Eye className="h-4 w-4" />
            View Resume
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Resume - {normalizedCandidate.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            {/* Resume Preview */}
            <div className="flex-1 border rounded-lg overflow-hidden bg-gray-50">
              {normalizedCandidate.resume_text ? (
                <div className="h-full overflow-y-auto p-6 bg-white">
                  <div className="prose max-w-none">
                    <h2 className="text-2xl font-bold mb-4">{normalizedCandidate.name}</h2>
                    
                    {normalizedCandidate.email && (
                      <div className="mb-4">
                        <p><strong>Email:</strong> {normalizedCandidate.email}</p>
                        {normalizedCandidate.phone && <p><strong>Phone:</strong> {normalizedCandidate.phone}</p>}
                      </div>
                    )}
                    
                    {normalizedCandidate.skills.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold mb-2">Skills</h3>
                        <div className="flex flex-wrap gap-1">
                          {normalizedCandidate.skills.map((skill, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {normalizedCandidate.resume_text}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center p-6">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">Resume preview not available</p>
                    <p className="text-sm text-gray-400">
                      {getResumeFilename().endsWith('.pdf') 
                        ? 'PDF resume available for download' 
                        : 'No resume text extracted'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t">
              <Button 
                onClick={handleDownloadResume}
                variant="default" 
                className="flex-1 gap-2"
              >
                <Download className="h-4 w-4" />
                Download Resume
              </Button>
              <Button 
                onClick={handleViewResume}
                variant="outline" 
                className="flex-1 gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open in New Tab
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const CompactResumeViewer = () => {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Eye className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Resume Preview - {normalizedCandidate.name}</DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg p-4 max-h-[60vh] overflow-y-auto">
            {normalizedCandidate.resume_text ? (
              <div className="prose max-w-none text-sm">
                <pre className="whitespace-pre-wrap font-sans">
                  {normalizedCandidate.resume_text}
                </pre>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <FileText className="h-8 w-8 mx-auto mb-2" />
                <p>No resume text available</p>
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end pt-4">
            <Button onClick={handleDownloadResume} variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Section: Candidate Info */}
        <div className="flex-1 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold text-foreground">
                    {normalizedCandidate.name}
                  </h3>
                  <Badge className={stageInfo.bg}>{stageInfo.label}</Badge>
                </div>
                <p className="text-muted-foreground font-medium">
                  {normalizedCandidate.position}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {normalizedCandidate.score > 0 && (
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/10">
                  <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {normalizedCandidate.score}
                  </span>
                </div>
              )}
              <CompactResumeViewer />
            </div>
          </div>

          <div className="grid gap-2 text-sm">
            {normalizedCandidate.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <a 
                  href={`mailto:${normalizedCandidate.email}`} 
                  className="hover:text-primary transition-colors truncate"
                >
                  {normalizedCandidate.email}
                </a>
              </div>
            )}
            {normalizedCandidate.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span>{normalizedCandidate.phone}</span>
              </div>
            )}
            {normalizedCandidate.linkedinUrl && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Linkedin className="h-4 w-4 flex-shrink-0" />
                <a 
                  href={normalizedCandidate.linkedinUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors flex items-center gap-1"
                >
                  LinkedIn Profile
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>

          {normalizedCandidate.skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {normalizedCandidate.skills.slice(0, 8).map((skill, index) => (
                <Badge key={index} variant="secondary" className="px-3 py-1">
                  {skill}
                </Badge>
              ))}
              {normalizedCandidate.skills.length > 8 && (
                <Badge variant="outline" className="px-3 py-1">
                  +{normalizedCandidate.skills.length - 8} more
                </Badge>
              )}
            </div>
          )}

          <div className="pt-2 space-y-1 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Experience:</strong>{" "}
              {normalizedCandidate.experience}
            </p>
            <p>
              <strong className="text-foreground">Education:</strong>{" "}
              {normalizedCandidate.education}
            </p>
          </div>
        </div>

        {/* Right Section: Actions */}
        <div className="lg:w-48 flex flex-col gap-2">
          <Button 
            onClick={handleScheduleInterview}
            variant="default" 
            size="sm" 
            className="w-full gap-2"
          >
            <Calendar className="h-4 w-4" />
            Schedule Interview
          </Button>
          <Button 
            onClick={handleSendEmail}
            variant="outline" 
            size="sm" 
            className="w-full gap-2"
          >
            <Mail className="h-4 w-4" />
            Send Email
          </Button>
          
          {/* Resume Viewer Modal */}
          <ResumeViewerModal />
          
          <Button 
            onClick={handleDownloadResume}
            variant="outline" 
            size="sm" 
            className="w-full gap-2"
          >
            <Download className="h-4 w-4" />
            Download Resume
          </Button>
          
          <div className="mt-auto pt-4 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3 flex-shrink-0" />
              <span>Applied {normalizedCandidate.resumeDate}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CandidateCard;