import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Video, MapPin, User } from "lucide-react";

interface InterviewSchedulerProps {
  candidates: Array<{
    id: string;
    name: string;
    position: string;
    email: string;
  }>;
}

const upcomingInterviews = [
  {
    id: "1",
    candidateName: "Sarah Johnson",
    position: "Senior Frontend Developer",
    date: "Oct 18, 2025",
    time: "2:00 PM - 3:00 PM",
    type: "Technical Interview",
    location: "Google Meet",
    interviewer: "John Smith"
  },
  {
    id: "2",
    candidateName: "Michael Chen",
    position: "Full Stack Engineer",
    date: "Oct 19, 2025",
    time: "10:00 AM - 11:00 AM",
    type: "Screening Call",
    location: "Zoom",
    interviewer: "Emma Wilson"
  },
  {
    id: "3",
    candidateName: "Emily Rodriguez",
    position: "Backend Developer",
    date: "Oct 20, 2025",
    time: "3:30 PM - 4:30 PM",
    type: "Final Round",
    location: "In-person (Office)",
    interviewer: "David Lee"
  }
];

const InterviewScheduler = ({ candidates }: InterviewSchedulerProps) => {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-foreground">Upcoming Interviews</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {upcomingInterviews.length} interviews scheduled this week
            </p>
          </div>
          <Button variant="default" className="gap-2">
            <Calendar className="h-4 w-4" />
            Schedule New Interview
          </Button>
        </div>

        <div className="space-y-4">
          {upcomingInterviews.map((interview) => (
            <Card key={interview.id} className="p-5 border-l-4 border-l-primary hover:shadow-md transition-shadow">
              <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
                <div className="space-y-3 flex-1">
                  <div>
                    <h4 className="font-semibold text-foreground text-lg">{interview.candidateName}</h4>
                    <p className="text-sm text-muted-foreground">{interview.position}</p>
                  </div>

                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="font-medium">{interview.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>{interview.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>{interview.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4 text-primary" />
                      <span>Interviewer: {interview.interviewer}</span>
                    </div>
                  </div>

                  <Badge variant="secondary" className="w-fit">
                    {interview.type}
                  </Badge>
                </div>

                <div className="flex lg:flex-col gap-2 lg:w-40">
                  <Button variant="default" size="sm" className="flex-1 gap-2">
                    <Video className="h-4 w-4" />
                    Join Meeting
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    Reschedule
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Schedule</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Select a candidate from the interview stage to schedule their next interview:
        </p>
        <div className="space-y-2">
          {candidates.map((candidate) => (
            <div
              key={candidate.id}
              className="flex items-center justify-between p-3 rounded-lg border hover:border-primary transition-colors"
            >
              <div>
                <p className="font-medium text-foreground">{candidate.name}</p>
                <p className="text-sm text-muted-foreground">{candidate.position}</p>
              </div>
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="h-4 w-4" />
                Schedule
              </Button>
            </div>
          ))}
          {candidates.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No candidates in interview stage
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default InterviewScheduler;
