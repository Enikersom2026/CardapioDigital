import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
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
} from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyD5kk3WUqqF7U6Qg3UtRdqGjKN6Bd_1Zsk",
  authDomain: "cardapiodigital-b8551.firebaseapp.com",
  projectId: "cardapiodigital-b8551",
  storageBucket: "cardapiodigital-b8551.firebasestorage.app",
  messagingSenderId: "560080093081",
  appId: "1:560080093081:web:fac59c4fa4b392657c1d08",
};

// Initialize Firebase safely
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
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
};
export type { FirebaseUser };
