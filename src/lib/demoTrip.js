// One-off demo content for the family's test trip ("TECT Drive" 2027), asked for
// to see what a fully filled-in trip looks like. TripContext calls
// seedDemoTrips() once the trip list is loaded: each matching trip that has no
// `demo_seeded` flag gets every day's plan (replacing what was there), a few
// notes, and the flag — so it runs once, on whichever device opens the app first.
// Ids are fixed, so two devices racing write the same thing.
// shortcut: no photos (they need a Drive upload); remove this file and its call
// in TripContext once the demo has been seeded.

import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/api/firebase";
import { write } from "@/api/offline";
import { saveDay, updateTrip } from "@/api/trips";
import { buildDays } from "@/lib/tripDays";

// Cyrillic look-alikes → Latin, so "ТЕСТ Drive" and "TECT Drive" both match.
const LATIN = { А: "A", В: "B", Е: "E", К: "K", М: "M", Н: "H", О: "O", Р: "P", С: "C", Т: "T", Х: "X" };
const norm = (s) =>
  String(s || "")
    .toUpperCase()
    .replace(/[АВЕКМНОРСТХ]/g, (c) => LATIN[c])
    .replace(/\s+/g, " ")
    .trim();

export function isDemoTarget(trip) {
  return (
    !trip?.demo_seeded &&
    /^TE[CS]T DRIVE$/.test(norm(trip.city)) &&
    String(trip.startDate || trip.year || "").startsWith("2027")
  );
}

const item = (text, extra = {}) => ({ text, address: "", mapUrl: "", cost: null, time: "", end_time: "", ...extra });
const block = (title, icon, items) => ({ title, icon, mapUrl: "", items });

const FIRST = {
  city: "Milan",
  stay: "Milan",
  insurance: { company: "Harel — travel & medical", cost: 186 },
  sim: { company: "Airalo eSIM Europe, 10 GB", cost: 24 },
  expenses: [{ text: "Espresso and croissant at the airport", cost: 7.5 }],
  sections: [
    block("Flight", "Plane", [
      item("Flight Tel Aviv → Milan Malpensa (LY 381), seats 23A–C", {
        time: "06:15", end_time: "09:40", cost: 780, address: "Milano Malpensa Airport", gcal: true,
        note: { text: "Check-in opens 24 h before. One checked bag each.", link: "https://www.elal.com" },
      }),
    ]),
    block("Car", "Car", [
      item("Pick up the rental car — Hertz, Terminal 1 (Fiat 500X, automatic)", {
        time: "10:30", cost: 420, fixed: true, address: "Aeroporto di Milano Malpensa, Terminal 1",
        note: { text: "Booking HZ-77310. Full-to-full fuel. Photo the car before leaving.", link: "" },
      }),
    ]),
    block("Hotel", "BedDouble", [
      item("Check-in Hotel Milano Scala (3 nights)", {
        time: "15:00", cost: 640, fixed: true, address: "Via dell'Orso 7, Milano",
        note: { text: "Booking ref HB-48213 — free cancellation until 25 Aug.", link: "https://www.hotelmilanoscala.it" },
      }),
    ]),
    block("Evening", "UtensilsCrossed", [
      item("Dinner at Trattoria Milanese — risotto alla milanese", { time: "20:00", cost: 95, address: "Via Santa Marta 11, Milano" }),
    ]),
  ],
};

const MIDDLE = [
  {
    city: "Milan",
    expenses: [{ text: "Gelato", cost: 9 }, { text: "Metro day tickets", cost: 15 }],
    sections: [
      block("Morning", "Church", [
        item("Duomo di Milano — cathedral and rooftop terraces", {
          time: "09:00", end_time: "11:00", cost: 60, address: "Piazza del Duomo, Milano",
          note: { text: "Shoulders and knees covered. Lift ticket for the roof.", link: "https://www.duomomilano.it" },
        }),
        item("Coffee in the Galleria Vittorio Emanuele II", { time: "11:15", cost: 12, address: "Galleria Vittorio Emanuele II, Milano" }),
      ]),
      block("Afternoon", "Building2", [
        item("The Last Supper — Santa Maria delle Grazie", {
          time: "15:15", end_time: "15:30", cost: 70, address: "Piazza di Santa Maria delle Grazie 2, Milano", gcal: true,
          note: { text: "Tickets booked 3 months ahead — be there 20 min early.", link: "https://cenacolovinciano.org" },
        }),
      ]),
      block("Evening", "Wine", [
        item("Aperitivo along the Navigli canals", { time: "19:00", cost: 40, address: "Alzaia Naviglio Grande, Milano" }),
      ]),
    ],
  },
  {
    city: "Milan → Lake Como",
    stay: "Bellagio",
    expenses: [{ text: "Parking in Como", cost: 14 }],
    sections: [
      block("Drive", "Car", [item("Drive to Como (about 1 h)", { time: "09:00", end_time: "10:00" })]),
      block("On the lake", "Ship", [
        item("Ferry Como → Bellagio", { time: "11:30", end_time: "13:30", cost: 32, address: "Pontile Navigazione Laghi, Como" }),
        item("Villa Melzi gardens", { time: "14:00", cost: 30, address: "Lungolario Manzoni, Bellagio" }),
      ]),
      block("Hotel", "BedDouble", [
        item("Check-in Hotel Florence, lake view", { time: "17:00", cost: 310, fixed: true, address: "Piazza Mazzini 46, Bellagio" }),
      ]),
    ],
  },
  {
    city: "Bellagio → Verona",
    stay: "Verona",
    expenses: [{ text: "Motorway tolls", cost: 18 }, { text: "Pizza slices", cost: 11 }],
    sections: [
      block("Drive", "Car", [item("Drive to Verona (about 2 h 30)", { time: "09:30", end_time: "12:00" })]),
      block("Sights", "Landmark", [
        item("Arena di Verona — Roman amphitheatre", { time: "13:30", cost: 24, address: "Piazza Bra 1, Verona" }),
        item("Juliet's House and balcony", { time: "15:00", cost: 18, address: "Via Cappello 23, Verona" }),
      ]),
      block("Evening", "UtensilsCrossed", [
        item("Dinner at Osteria al Duca", { time: "20:00", cost: 80, address: "Via Arche Scaligere 2, Verona" }),
        item("Hotel Accademia (1 night)", { cost: 220, fixed: true, address: "Via Scala 12, Verona" }),
      ]),
    ],
  },
  {
    city: "Venice",
    stay: "Verona",
    expenses: [{ text: "Tramezzini at the station", cost: 13 }],
    sections: [
      block("Train", "Train", [
        item("Train Verona → Venezia Santa Lucia", { time: "08:40", end_time: "09:55", cost: 48, gcal: true }),
      ]),
      block("Venice", "Ship", [
        item("Vaporetto day pass, line 1 along the Grand Canal", { cost: 50 }),
        item("St Mark's Basilica", { time: "11:00", cost: 6, address: "Piazza San Marco, Venezia" }),
        item("Rialto Bridge at sunset", { time: "18:30", address: "Ponte di Rialto, Venezia" }),
      ]),
      block("Back", "Train", [item("Train back to Verona", { time: "21:05", end_time: "22:20", cost: 48 })]),
    ],
  },
  {
    city: "Verona → Florence",
    stay: "Florence",
    expenses: [{ text: "Coffee stop on the A1", cost: 6 }],
    sections: [
      block("Drive", "Car", [item("Drive to Florence (about 3 h)", { time: "09:00", end_time: "12:00" })]),
      block("Art", "Building2", [
        item("Uffizi Gallery", {
          time: "14:00", end_time: "16:30", cost: 58, address: "Piazzale degli Uffizi 6, Firenze",
          note: { text: "Timed entry — keep the QR code on the phone.", link: "https://www.uffizi.it" },
        }),
      ]),
      block("Evening", "Camera", [
        item("Sunset at Piazzale Michelangelo", { time: "19:15", address: "Piazzale Michelangelo, Firenze" }),
        item("Hotel Brunelleschi (2 nights)", { cost: 520, fixed: true, address: "Piazza Santa Elisabetta 3, Firenze" }),
      ]),
    ],
  },
  {
    city: "Siena & Chianti",
    stay: "Florence",
    expenses: [{ text: "Panforte to bring home", cost: 16 }],
    sections: [
      block("Chianti", "Wine", [
        item("Wine tasting at Castello di Ama", { time: "11:00", end_time: "12:30", cost: 120, address: "Località Ama, Gaiole in Chianti" }),
      ]),
      block("Siena", "Landmark", [
        item("Piazza del Campo and the Torre del Mangia", { time: "15:00", cost: 30, address: "Piazza del Campo, Siena" }),
      ]),
      block("Dinner", "UtensilsCrossed", [
        item("Bistecca alla fiorentina at Trattoria Mario", { time: "20:30", cost: 110, address: "Via Rosina 2, Firenze" }),
      ]),
    ],
  },
];

const LAST = {
  city: "Florence → Tel Aviv",
  expenses: [{ text: "Last gelato", cost: 8 }],
  sections: [
    block("Car", "Car", [
      item("Return the car at Florence Airport (full tank)", { time: "09:00", address: "Aeroporto di Firenze-Peretola" }),
    ]),
    block("Flight", "Plane", [
      item("Flight Florence → Tel Aviv", { time: "12:10", end_time: "17:30", cost: 690, gcal: true }),
    ]),
  ],
};

// Each day's plan (day key → plan) and the notes, with fixed ids.
export function demoContent(trip) {
  const days = buildDays(trip.startDate, trip.endDate);
  const plans = {};
  const notes = [];
  days.forEach((day, d) => {
    const tpl = d === 0 ? FIRST : d === days.length - 1 && days.length > 1 ? LAST : MIDDLE[(d - 1) % MIDDLE.length];
    const { sections, expenses = [], ...rest } = tpl;
    plans[day.key] = {
      stay: "",
      ...rest,
      expenses: expenses.map((e, i) => ({ id: `demo-exp-${d}-${i}`, fixed: false, at: Date.now(), by: null, ...e })),
      sections: sections.map((s, si) => ({
        ...s,
        id: `demo-sec-${d}-${si}`,
        items: s.items.map(({ note, ...it }, ii) => {
          const id = `demo-item-${d}-${si}-${ii}`;
          if (note) notes.push({ id: `demo-note-${d}-${si}-${ii}`, day_key: day.key, item_id: id, ...note });
          return { ...it, id };
        }),
      })),
    };
  });
  return { plans, notes };
}

async function seedTrip(trip) {
  const { plans, notes } = demoContent(trip);
  for (const [key, plan] of Object.entries(plans)) await saveDay(trip.id, key, plan);
  for (const { id, ...n } of notes) {
    await write(
      setDoc(doc(db, "trips", trip.id, "notes", id), {
        ...n,
        created_by: auth.currentUser?.email || null,
        created_date: serverTimestamp(),
      })
    );
  }
  await updateTrip(trip.id, { demo_seeded: true });
}

// Returns true when something was written (the caller reloads).
export async function seedDemoTrips(trips) {
  let seeded = false;
  for (const trip of trips.filter(isDemoTarget)) {
    try {
      await seedTrip(trip);
      seeded = true;
    } catch (e) {
      console.warn("Could not fill the demo trip", trip.id, e);
    }
  }
  return seeded;
}
