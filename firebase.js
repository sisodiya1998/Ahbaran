import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDofStHVzO_D6VBQ8dHHEodgIWmKXOoSE8",
    authDomain: "meragav-bdc89.firebaseapp.com",
    projectId: "meragav-bdc89",
    storageBucket: "meragav-bdc89.firebasestorage.app",
    messagingSenderId: "1040183992371",
    appId: "1:1040183992371:web:ac8e1a7dd22cec0f000346",
    measurementId: "G-N46V6452ZJ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();