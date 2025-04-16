// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAumjc1aUUcK1l0ejZJGZNs6N-KBcQ39bA",
  authDomain: "chirpchat-cd606.firebaseapp.com",
  projectId: "chirpchat-cd606",
  storageBucket: "chirpchat-cd606.firebasestorage.app",
  messagingSenderId: "457469946819",
  appId: "1:457469946819:web:fa53ab43fe45ac5a05eb76",
  measurementId: "G-GC3V8FX9HF"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };
