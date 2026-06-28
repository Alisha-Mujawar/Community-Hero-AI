import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your custom Firebase project configuration for "community-hero-ai-93ce4"
const firebaseConfig = {
  apiKey: "AIzaSyDqvziRE4WFqfLJhMqbdQx4ogrMOyIIJJ4",
  authDomain: "community-hero-ai-93ce4.firebaseapp.com",
  projectId: "community-hero-ai-93ce4",
  storageBucket: "community-hero-ai-93ce4.firebasestorage.app",
  messagingSenderId: "1088661364933",
  appId: "1:1088661364933:web:5765ba91ee731eaa3550ac",
  measurementId: "G-E2FDNN6KQN"
};

// Check if Firebase is configured with real credentials (user has replaced placeholders)
export const isFirebaseConfigured = 
  firebaseConfig.apiKey !== "" && 
  firebaseConfig.apiKey !== "YOUR_API_KEY" && 
  !firebaseConfig.apiKey.startsWith("YOUR_") &&
  firebaseConfig.appId !== "YOUR_APP_ID";

// Safely initialize Firebase only if configured
const app = isFirebaseConfigured 
  ? (getApps().length > 0 ? getApp() : initializeApp(firebaseConfig))
  : null;

export const db = app ? getFirestore(app) : null;
export const auth = app ? getAuth(app) : null;
