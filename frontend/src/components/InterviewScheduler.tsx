import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Mail, ExternalLink, Trash2, Plus } from "lucide-react";

const API_BASE = "http://localhost:5000/api";

const InterviewScheduler = ({ candidates }) => {
  const [scheduledInterviews, setScheduledInterviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [scheduleParams, setScheduleParams] = useState({
    duration_minutes: 45,
    buffer_minutes: 15,
    work_hours: [9, 17],
    skip_weekends: true
  });

  // Fetch scheduled interviews
  const fetchScheduledInterviews = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/interviews/scheduled`);
      const data = await res.json();
      if (data.success) {
        setScheduledInterviews(data.interviews || []);
      }
    } catch (err) {
      console.error("Failed to fetch scheduled interviews:", err);
    } finally {
      setLoading(false);
    }
  };

  // Schedule all interviews
  const scheduleAllInterviews = async () => {
    try {
      setLoading(true);
      setMessage("Scheduling interviews...");
      
      const res = await fetch(`${API_BASE}/interviews/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scheduleParams)
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage(`✅ ${data.message}`);
        fetchScheduledInterviews();
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      setMessage("❌ Failed to schedule interviews");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Schedule single interview
  const scheduleSingleInterview = async (candidateId) => {
    try {
      setLoading(true);
      setMessage(`Scheduling interview for candidate...`);
      
      // Calculate next available slot
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(scheduleParams.work_hours[0], 0, 0, 0);
      
      const res = await fetch(`${API_BASE}/interviews/schedule-single`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_id: candidateId,
          start_time: tomorrow.toISOString(),
          duration_minutes: scheduleParams.duration_minutes
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage(`✅ Interview scheduled for ${data.candidate}`);
        fetchScheduledInterviews();
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      setMessage("❌ Failed to schedule interview");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Format date and time
  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })
    };
  };

  // Load scheduled interviews on mount
  useEffect(() => {
    fetchScheduledInterviews();
  }, []);

  return (
    <div className="space-y-6">
      {/* Schedule Controls */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Interview Scheduling</h3>
              <p className="text-sm text-muted-foreground">
                Schedule interviews with candidates from enriched profiles
              </p>
            </div>
            <Button 
              onClick={scheduleAllInterviews} 
              disabled={loading || candidates.length === 0}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              Schedule All Candidates
            </Button>
          </div>

          {/* Schedule Parameters */}
          <div className="grid grid-cols-4 gap-4 pt-4 border-t">
            <div>
              <label className="text-sm font-medium">Duration (min)</label>
              <input
                type="number"
                value={scheduleParams.duration_minutes}
                onChange={(e) => setScheduleParams({
                  ...scheduleParams,
                  duration_minutes: parseInt(e.target.value)
                })}
                className="w-full mt-1 px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Buffer (min)</label>
              <input
                type="number"
                value={scheduleParams.buffer_minutes}
                onChange={(e) => setScheduleParams({
                  ...scheduleParams,
                  buffer_minutes: parseInt(e.target.value)
                })}
                className="w-full mt-1 px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Work Hours</label>
              <input
                type="text"
                value={`${scheduleParams.work_hours[0]}:00 - ${scheduleParams.work_hours[1]}:00`}
                disabled
                className="w-full mt-1 px-3 py-2 border rounded-md bg-muted"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scheduleParams.skip_weekends}
                  onChange={(e) => setScheduleParams({
                    ...scheduleParams,
                    skip_weekends: e.target.checked
                  })}
                  className="rounded"
                />
                <span className="text-sm font-medium">Skip Weekends</span>
              </label>
            </div>
          </div>

          {message && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm">{message}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Unscheduled Candidates */}
      {candidates.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Candidates Ready for Scheduling ({candidates.length})
          </h3>
          <div className="space-y-3">
            {candidates.map((candidate) => (
              <div 
                key={candidate.id} 
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{candidate.full_name || "Unknown"}</p>
                    <p className="text-sm text-muted-foreground">{candidate.email}</p>
                  </div>
                </div>
                <Button 
                  onClick={() => scheduleSingleInterview(candidate.id)}
                  disabled={loading}
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Schedule
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Scheduled Interviews */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            Scheduled Interviews ({scheduledInterviews.length})
          </h3>
          <Button 
            onClick={fetchScheduledInterviews} 
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            Refresh
          </Button>
        </div>

        {loading && scheduledInterviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading interviews...</p>
        ) : scheduledInterviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No interviews scheduled yet.</p>
        ) : (
          <div className="space-y-3">
            {scheduledInterviews.map((interview, idx) => {
              const { date, time } = formatDateTime(interview.start_time);
              return (
                <div 
                  key={idx}
                  className="flex items-start justify-between p-4 border rounded-lg hover:border-primary/50 transition-colors"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{interview.candidate_name}</span>
                      <Badge variant="secondary" className="text-xs">
                        Scheduled
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{time}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span>{interview.email}</span>
                      </div>
                    </div>
                  </div>

                  {interview.calendar_link && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => window.open(interview.calendar_link, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                      View in Calendar
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default InterviewScheduler;