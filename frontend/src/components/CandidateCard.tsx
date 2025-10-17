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
  Clock
} from "lucide-react";

interface CandidateCardProps {
  candidate: {
    id: string;
    name: string;
    email: string;
    phone: string;
    position: string;
    stage: string;
    score: number;
    skills: string[];
    experience: string;
    education: string;
    linkedinUrl?: string;
    resumeDate: string;
    status: string;
  };
}

const stageColors: Record<string, { bg: string; text: string; label: string }> = {
  new: { bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400", text: "text-blue-600", label: "New Application" },
  screening: { bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400", text: "text-purple-600", label: "Screening" },
  interview: { bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400", text: "text-amber-600", label: "Interview Stage" },
  offer: { bg: "bg-green-500/10 text-green-600 dark:text-green-400", text: "text-green-600", label: "Offer Sent" },
  rejected: { bg: "bg-red-500/10 text-red-600 dark:text-red-400", text: "text-red-600", label: "Not Selected" }
};

const CandidateCard = ({ candidate }: CandidateCardProps) => {
  const stageInfo = stageColors[candidate.stage] || stageColors.new;

  return (
    <Card className="p-6 hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Section: Candidate Info */}
        <div className="flex-1 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-semibold text-foreground">{candidate.name}</h3>
                <Badge className={stageInfo.bg}>{stageInfo.label}</Badge>
              </div>
              <p className="text-muted-foreground font-medium">{candidate.position}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/10">
                <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                <span className="font-bold text-amber-600 dark:text-amber-400">{candidate.score}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <a href={`mailto:${candidate.email}`} className="hover:text-primary transition-colors">
                {candidate.email}
              </a>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{candidate.phone}</span>
            </div>
            {candidate.linkedinUrl && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Linkedin className="h-4 w-4" />
                <a 
                  href={candidate.linkedinUrl} 
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

          <div className="flex flex-wrap gap-2">
            {candidate.skills.map((skill, index) => (
              <Badge key={index} variant="secondary" className="px-3 py-1">
                {skill}
              </Badge>
            ))}
          </div>

          <div className="pt-2 space-y-1 text-sm text-muted-foreground">
            <p><strong>Experience:</strong> {candidate.experience}</p>
            <p><strong>Education:</strong> {candidate.education}</p>
          </div>
        </div>

        {/* Right Section: Actions */}
        <div className="lg:w-48 flex flex-col gap-2">
          <Button variant="default" size="sm" className="w-full gap-2">
            <Calendar className="h-4 w-4" />
            Schedule Interview
          </Button>
          <Button variant="outline" size="sm" className="w-full gap-2">
            <Mail className="h-4 w-4" />
            Send Email
          </Button>
          <Button variant="outline" size="sm" className="w-full gap-2">
            View Resume
          </Button>
          <div className="mt-auto pt-4 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Applied {candidate.resumeDate}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CandidateCard;
