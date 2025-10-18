import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Mail, ExternalLink, Trash2, Plus, CalendarDays, X } from "lucide-react";

const API_BASE = "http://localhost:5000/api";

const InterviewScheduler = ({ candidates }) => {
  const [scheduledInterviews, setScheduledInterviews] = useState([]);
  const [upcomingInterviews, setUpcomingInterviews] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showScheduler, setShowScheduler] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [scheduleParams, setScheduleParams] = useState({
    duration_minutes: 45,
    buffer_minutes: 15,
    work_hours: [9, 17],
    skip_weekends: true
  });

  // Fetch all interview data
  const fetchInterviewData = async () => {
    try {
      setLoading(true);
      
      // Fetch scheduled interviews from local storage
      const scheduledRes = await fetch(`${API_BASE}/interviews/scheduled`);
      const scheduledData = await scheduledRes.json();
      
      // Fetch upcoming interviews from Google Calendar
      const upcomingRes = await fetch(`${API_BASE}/interviews/upcoming`);
      const upcomingData = await upcomingRes.json();
      
      // Fetch available slots
      const availabilityRes = await fetch(`${API_BASE}/calendar/availability`);
      const availabilityData = await availabilityRes.json();
      
      if (scheduledData.success) {
        setScheduledInterviews(scheduledData.interviews || []);
      }
      
      if (upcomingData.success) {
        setUpcomingInterviews(upcomingData.events || []);
      }
      
      if (availabilityData.success) {
        setAvailableSlots(availabilityData.available_slots || []);
      }
    } catch (err) {
      console.error("Failed to fetch interview data:", err);
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
        fetchInterviewData();
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

  // Schedule single interview with specific time
  const scheduleSingleInterview = async (candidateId, startTime = null) => {
    try {
      setLoading(true);
      setMessage(`Scheduling interview...`);
      
      if (!startTime) {
        // Calculate next available slot
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(scheduleParams.work_hours[0], 0, 0, 0);
        startTime = tomorrow.toISOString();
      }
      
      const res = await fetch(`${API_BASE}/interviews/schedule-single`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_id: candidateId,
          start_time: startTime,
          duration_minutes: scheduleParams.duration_minutes
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage(`✅ Interview scheduled for ${data.candidate}`);
        setShowScheduler(false);
        setSelectedCandidate(null);
        fetchInterviewData();
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

  // Cancel interview
  const cancelInterview = async (eventId) => {
    try {
      setLoading(true);
      
      const res = await fetch(`${API_BASE}/interviews/cancel/${eventId}`, {
        method: "DELETE"
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage("✅ Interview cancelled successfully");
        fetchInterviewData();
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      setMessage("❌ Failed to cancel interview");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Open scheduler for specific candidate
  const openScheduler = (candidate) => {
    setSelectedCandidate(candidate);
    setShowScheduler(true);
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
      }),
      full: date.toLocaleString()
    };
  };

  // Load interview data on mount
  useEffect(() => {
    fetchInterviewData();
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
            <div className="flex gap-2">
              <Button 
                onClick={() => fetchInterviewData()} 
                variant="outline"
                disabled={loading}
              >
                Refresh
              </Button>
              <Button 
                onClick={scheduleAllInterviews} 
                disabled={loading || candidates.length === 0}
                className="gap-2"
              >
                <Calendar className="h-4 w-4" />
                Schedule All Candidates
              </Button>
            </div>
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

      {/* Candidate Scheduler Modal */}
      {showScheduler && selectedCandidate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Schedule Interview with {selectedCandidate.full_name}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowScheduler(false);
                    setSelectedCandidate(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* Available Slots */}
                <div>
                  <h4 className="font-medium mb-2">Available Time Slots</h4>
                  <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                    {availableSlots.map((slot, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="justify-start h-auto py-3"
                        onClick={() => scheduleSingleInterview(selectedCandidate.id, slot.start)}
                        disabled={loading}
                      >
                        <div className="text-left">
                          <div className="font-medium">
                            {formatDateTime(slot.start).date}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDateTime(slot.start).time}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                  {availableSlots.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No available slots found. Try adjusting schedule parameters.
                    </p>
                  )}
                </div>

                {/* Quick Schedule Options */}
                <div>
                  <h4 className="font-medium mb-2">Quick Schedule</h4>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => scheduleSingleInterview(selectedCandidate.id)}
                      disabled={loading}
                    >
                      Next Available Slot
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        tomorrow.setHours(10, 0, 0, 0); // 10 AM tomorrow
                        scheduleSingleInterview(selectedCandidate.id, tomorrow.toISOString());
                      }}
                      disabled={loading}
                    >
                      Tomorrow 10 AM
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unscheduled Candidates */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              Candidates Ready for Scheduling ({candidates.length})
            </h3>
            <Badge variant="secondary">
              {candidates.length} available
            </Badge>
          </div>
          
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
                    <div className="flex gap-1 mt-1">
                      {candidate.skills?.slice(0, 3).map((skill, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={() => openScheduler(candidate)}
                  disabled={loading}
                  size="sm"
                  className="gap-2"
                >
                  <CalendarDays className="h-4 w-4" />
                  Schedule
                </Button>
              </div>
            ))}
            
            {candidates.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No candidates available for scheduling.
              </p>
            )}
          </div>
        </Card>

        {/* Scheduled & Upcoming Interviews */}
        <div className="space-y-6">
          {/* Scheduled Interviews */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Scheduled Interviews ({scheduledInterviews.length})
              </h3>
              <Badge variant="secondary">
                {scheduledInterviews.length} total
              </Badge>
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

                      <div className="flex gap-2">
                        {interview.calendar_link && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => window.open(interview.calendar_link, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                            View
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => interview.event_id && cancelInterview(interview.event_id)}
                          disabled={loading}
                        >
                          <Trash2 className="h-3 w-3" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Upcoming Calendar Events */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Upcoming Calendar Events ({upcomingInterviews.length})
              </h3>
              <Badge variant="secondary">
                Next 7 days
              </Badge>
            </div>

            {upcomingInterviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming events found.</p>
            ) : (
              <div className="space-y-3">
                {upcomingInterviews.map((event, idx) => {
                  const { date, time } = formatDateTime(event.start_time);
                  return (
                    <div 
                      key={event.id}
                      className="flex items-start justify-between p-4 border rounded-lg hover:border-primary/50 transition-colors"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{event.summary}</span>
                          <Badge variant="outline" className="text-xs">
                            Calendar
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
                        </div>
                        
                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {event.description.substring(0, 100)}...
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {event.hangoutLink && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => window.open(event.hangoutLink, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                            Join
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => cancelInterview(event.id)}
                          disabled={loading}
                        >
                          <Trash2 className="h-3 w-3" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InterviewScheduler;