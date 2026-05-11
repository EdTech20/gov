import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDmh4oOy_YXw6aw0k9F5IR8OBHtu8wE7fM",
  authDomain: "govcore-38e1a.firebaseapp.com",
  projectId: "govcore-38e1a",
  storageBucket: "govcore-38e1a.firebasestorage.app",
  messagingSenderId: "775100111227",
  appId: "1:775100111227:web:6980a2291b205b334445de",
  measurementId: "G-Z6LFLJ659M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export { app, auth, db, analytics };
