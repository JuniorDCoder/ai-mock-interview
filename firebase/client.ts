// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";


const firebaseConfig = {
  apiKey: "AIzaSyCQb7pu8GiGIGCfKvRrNpBS_DNHq11Ildg",
  authDomain: "prepwise-1ffd3.firebaseapp.com",
  projectId: "prepwise-1ffd3",
  storageBucket: "prepwise-1ffd3.firebasestorage.app",
  messagingSenderId: "1051368507549",
  appId: "1:1051368507549:web:f2e8d943a300c9a57b6c74",
  measurementId: "G-51B6LGHNNG"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);