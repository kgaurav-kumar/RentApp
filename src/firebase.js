import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBxcpuVF1VLpC5ijvvblxEvtI-n6ld_sdE",
  authDomain: "rent-c1dc0.firebaseapp.com",
  projectId: "rent-c1dc0",
  storageBucket: "rent-c1dc0.firebasestorage.app",
  messagingSenderId: "108718676846",
  appId: "1:108718676846:web:91ff515b35c880518abf7f",
  measurementId: "G-RZD2WP97JF"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
