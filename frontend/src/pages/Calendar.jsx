import { useEffect, useState } from "react";

export default function Calendar() {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);

  // Wait for gapi to be available
  const waitForGapi = () =>
    new Promise((resolve) => {
      const check = () => {
        if (window.gapi) resolve(window.gapi);
        else setTimeout(check, 50);
      };
      check();
    });

  useEffect(() => {
    const initializeGapi = async () => {
      try {
        const gapi = await waitForGapi();

        await new Promise((resolve, reject) => {
          gapi.load("client:auth2", { callback: resolve, onerror: reject });
        });

        await gapi.client.init({
          apiKey: "AIzaSyDj63l6Em6gSpAmPUTZUSKaZJ988UmrN84",
          clientId: "915660634853-9rqbrgdcu5afj7k706pdv26871ilb0bd.apps.googleusercontent.com",
          discoveryDocs: [
            "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
          ],
          scope: "https://www.googleapis.com/auth/calendar.readonly",
        });

        const response = await gapi.client.calendar.events.list({
          calendarId: "primary",
          timeMin: new Date().toISOString(),
          showDeleted: false,
          singleEvents: true,
          maxResults: 10,
          orderBy: "startTime",
        });

        setEvents(response.result.items || []);
      } catch (err) {
        console.error("Error initializing gapi", err);
        setError(err);
      }
    };

    initializeGapi();
  }, []);

  if (error) {
    return (
      <div>
        <p>Error loading calendar: {error.message || "Check console"}</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Upcoming Events</h2>
      {events.length === 0 ? (
        <p>No upcoming events</p>
      ) : (
        <ul>
          {events.map((event) => (
            <li key={event.id}>
              {event.summary} — {new Date(event.start.dateTime || event.start.date).toLocaleString()}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
