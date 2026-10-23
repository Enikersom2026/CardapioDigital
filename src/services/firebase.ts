import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  deleteUser,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
} from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD5kk3WUqqF7U6Qg3UtRdqGjKN6Bd_1Zsk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "cardapiodigital-b8551.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "cardapiodigital-b8551",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "cardapiodigital-b8551.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "560080093081",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:560080093081:web:fac59c4fa4b392657c1d08",
};

// Initialize Firebase safely
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  deleteUser,
  onAuthStateChanged,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
};
export type { FirebaseUser };
