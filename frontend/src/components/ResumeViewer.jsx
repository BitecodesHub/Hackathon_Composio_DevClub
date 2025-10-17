import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Download, 
  Eye, 
  X,
  Loader2,
  AlertCircle,
  ExternalLink
} from "lucide-react";

const API_BASE = "http://localhost:5000/api";

const ResumeViewer = ({ candidate, variant = "button" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [resumeContent, setResumeContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Extract resume filename from candidate data
  const getResumeFilename = () => {
    // Try multiple possible filename patterns
    if (candidate?.resume_filename) return candidate.resume_filename;
    if (candidate?.filename) {
      // Replace .json with .pdf or .docx
      return candidate.filename.replace('.json', '.pdf');
    }
    // Fallback to ID-based naming
    return `${candidate?.id}.pdf`;
  };

  const handleViewResume = async () => {
    setIsOpen(true);
    setLoading(true);
    setError(null);

    try {
      const filename = getResumeFilename();
      const response = await fetch(`${API_BASE}/resumes/view/${filename}`);
      const data = await response.json();

      if (data.success) {
        setResumeContent(data.content);
      } else {
        setError(data.error || "Failed to load resume");
      }
    } catch (err) {
      setError("Error connecting to server. Make sure Flask backend is running.");
      console.error("Error viewing resume:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadResume = async (e) => {
    e?.stopPropagation();
    try {
      const filename = getResumeFilename();
      const url = `${API_BASE}/resumes/download/${filename}`;
      window.open(url, '_blank');
    } catch (err) {
      console.error("Error downloading resume:", err);
    }
  };

  const handleOpenPDF = () => {
    const filename = getResumeFilename();
    const url = `${API_BASE}/resumes/download/${filename}`;
    window.open(url, '_blank');
  };

  return (
    <>
      {/* Trigger Button */}
      {variant === "button" ? (
        <Button
          onClick={handleViewResume}
          variant="outline"
          size="sm"
          className="w-full gap-2"
        >
          <Eye className="h-4 w-4" />
          View Resume
        </Button>
      ) : (
        <button
          onClick={handleViewResume}
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          <FileText className="h-3 w-3" />
          View Resume
        </button>
      )}

      {/* Modal Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <Card 
            className="w-full max-w-4xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">
                    {candidate?.full_name || candidate?.name || "Candidate"}'s Resume
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {getResumeFilename()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleDownloadResume}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button
                  onClick={() => setIsOpen(false)}
                  variant="ghost"
                  size="sm"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-2 p-4 border-b bg-muted/30">
              <Badge variant="secondary" className="gap-2">
                <Eye className="h-3 w-3" />
                Text Extracted View
              </Badge>
              <Button
                onClick={handleOpenPDF}
                variant="outline"
                size="sm"
                className="gap-2 ml-auto"
              >
                <ExternalLink className="h-4 w-4" />
                Open Original PDF
              </Button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-6 bg-background">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
                    <p className="text-sm text-muted-foreground">Extracting resume text...</p>
                    <p className="text-xs text-muted-foreground mt-1">This may take a few seconds</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center max-w-md">
                    <AlertCircle className="h-10 w-10 mx-auto mb-3 text-destructive" />
                    <p className="text-sm font-medium mb-2">Failed to Load Resume</p>
                    <p className="text-xs text-muted-foreground mb-4">{error}</p>
                    <div className="flex gap-2 justify-center">
                      <Button onClick={handleViewResume} size="sm" variant="default">
                        Retry
                      </Button>
                      <Button onClick={handleOpenPDF} variant="outline" size="sm">
                        Open PDF Instead
                      </Button>
                    </div>
                  </div>
                </div>
              ) : resumeContent ? (
                <div className="prose prose-sm max-w-none">
                  <div className="bg-muted/30 rounded-lg p-6 border">
                    <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">
                      {resumeContent}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No resume content available</p>
                    <Button onClick={handleOpenPDF} variant="outline" size="sm" className="mt-4">
                      Try Opening PDF
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-muted/50">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <span className="font-medium">Email:</span>
                    {candidate?.email || "Not provided"}
                  </span>
                  {candidate?.phone && (
                    <span className="flex items-center gap-1">
                      <span className="font-medium">Phone:</span>
                      {candidate.phone}
                    </span>
                  )}
                </div>
                {candidate?.skills && candidate.skills.length > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="font-medium">Top Skills:</span>
                    {candidate.skills.slice(0, 3).join(", ")}
                  </span>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
};

export default ResumeViewer;