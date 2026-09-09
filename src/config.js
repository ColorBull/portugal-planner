// ---------------------------------------------------------------------------
// App configuration.
//
// Like the afula-move app, every value here is meant to live in the source.
// A Firebase *web* config is public by design — it only identifies the
// project. What actually protects the data is:
//   1. firestore.rules  — only the e-mails in ALLOWED_EMAILS can read/write
//   2. Firebase Auth "Authorized domains" — sign-in only from your own site
//
// Fill these in after creating the Firebase project. See SETUP.md.
// ---------------------------------------------------------------------------

export const firebaseConfig = {
  apiKey: "AIzaSyAOW0bFrvUUdnJiKWy-I5IWz3Lo6njgJAE",
  authDomain: "portugal-planner-53a05.firebaseapp.com",
  projectId: "portugal-planner-53a05",
  storageBucket: "portugal-planner-53a05.firebasestorage.app",
  messagingSenderId: "771186568675",
  appId: "1:771186568675:web:a39b51df79763c9b4a44d6",
};

// Google accounts allowed to open the planner. Lower-case.
// Keep this identical to the list inside firestore.rules.
export const ALLOWED_EMAILS = [
  "yoffedani@gmail.com",
  "yoffeleonid@gmail.com",
  "yoffelena@gmail.com",
];

// A Google Drive folder that every allowed account can view.
// All uploaded photos & documents are created inside it.
// (Right-click the folder in Drive → Share → copy the id from the URL:
//  https://drive.google.com/drive/folders/<THIS_PART>)
export const DRIVE_FOLDER_ID = "1DDQbHpWGi7JaFVmIKkzpb7oIUurJMXne";

// One shared itinerary. Everything is stored under trips/{TRIP_ID} in Firestore.
export const TRIP_ID = "portugal-2026";
