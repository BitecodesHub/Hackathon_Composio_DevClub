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
  Download
} from "lucide-react";
import ResumeViewer from "./ResumeViewer";

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
    resume_filename: candidate.resume_filename
  };

  const stageInfo = stageColors[normalizedCandidate.stage] || stageColors.new;

  const handleScheduleInterview = () => {
    // TODO: Implement interview scheduling
    console.log("Schedule interview for:", normalizedCandidate.name);
  };

  const handleSendEmail = () => {
    window.location.href = `mailto:${normalizedCandidate.email}`;
  };

  const handleDownloadResume = () => {
    const filename = normalizedCandidate.resume_filename || 
                    normalizedCandidate.filename?.replace('.json', '.pdf') || 
                    `${normalizedCandidate.id}.pdf`;
    const url = `${API_BASE}/resumes/download/${filename}`;
    window.open(url, '_blank');
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Section: Candidate Info */}
        <div className="flex-1 space-y-4">
          <div className="flex items-start justify-between">
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
            {normalizedCandidate.score > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/10">
                  <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {normalizedCandidate.score}
                  </span>
                </div>
              </div>
            )}
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
          
          {/* Resume Viewer Integration */}
          <ResumeViewer candidate={normalizedCandidate} variant="button" />
          
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