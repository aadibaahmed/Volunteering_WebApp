// Hardcoded events data (no database implementation)
const hardcodedEvents = [
  {
    name: "Community Health Fair",
    requirements: ["First Aid", "CPR", "Teaching"],
    location: "Central Park, New York",
    volunteers: 10,
    start: "09:00",
    end: "17:00",
    date: "2024-01-20"
  },
  {
    name: "Food Bank Distribution",
    requirements: ["Food Service", "Logistics"],
    location: "Downtown LA Food Bank",
    volunteers: 15,
    start: "08:00",
    end: "14:00",
    date: "2024-01-18"
  },
  {
    name: "Beach Cleanup",
    requirements: ["Cleaning", "Organizing"],
    location: "Santa Monica Beach",
    volunteers: 20,
    start: "07:00",
    end: "12:00",
    date: "2024-01-22"
  }
];

export async function getAllEvents() {
  return hardcodedEvents;
}