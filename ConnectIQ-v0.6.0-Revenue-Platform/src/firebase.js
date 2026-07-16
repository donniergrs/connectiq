import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDGnGuLpveq8hIzZ-lqTiusUv1uwBrLD0U",
  authDomain: "connectiq-8a7e3.firebaseapp.com",
  projectId: "connectiq-8a7e3",
  storageBucket: "connectiq-8a7e3.firebasestorage.app",
  messagingSenderId: "992918619087",
  appId: "1:992918619087:web:3b94cbfdfe9aab646d08ba",
  measurementId: "G-RV69FHXNHJ",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;