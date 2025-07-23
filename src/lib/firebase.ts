// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseOptions } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyBPSB7ksOBZbijXchd89RIVFpTr2F5nFyg",
  authDomain: "newtab-ai.firebaseapp.com",
  projectId: "newtab-ai",
  storageBucket: "newtab-ai.appspot.com",
  messagingSenderId: "894589314623",
  appId: "1:894589314623:web:40d5cec82d81286b8afa8a",
  measurementId: "G-XXXXXXXXXX"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
