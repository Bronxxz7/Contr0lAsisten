import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAGk7mlHcP4pyG62EzcjCBFhY-z7cxZuq0",
  authDomain: "ugel-base-de-datos.firebaseapp.com",
  projectId: "ugel-base-de-datos",
  storageBucket: "ugel-base-de-datos.firebasestorage.app",
  messagingSenderId: "882587815857",
  appId: "1:882587815857:web:f31a973c2d1162503b3790"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);  
const db = getFirestore(app);

export { auth, db };