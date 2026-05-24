import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

export const firebaseConfig = {
  apiKey: "AIzaSyAFz57Ku9PqgZzLe9DF1CFKDGz740TvwjA",
  authDomain: "habitflow-casal-57723.firebaseapp.com",
  databaseURL: "https://habitflow-casal-57723-default-rtdb.firebaseio.com",
  projectId: "habitflow-casal-57723",
  storageBucket: "habitflow-casal-57723.firebasestorage.app",
  messagingSenderId: "205690500990",
  appId: "1:205690500990:web:4afcaeef3e297dc351a52f"
};

let app;
let auth;
let rtdb;
let isFirebaseAvailable = false;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  rtdb = getDatabase(app);
  isFirebaseAvailable = true;
} catch (error) {
  console.warn('Firebase failed to initialize. Falling back to offline client-first storage.', error);
}

export { app, auth, rtdb, isFirebaseAvailable };
