/**
 * SACAB TV – Firebase Configuration
 * Project: sacab4
 */
const firebaseConfig = {
  apiKey: "AIzaSyBcXbEjWrNih6_eLK9J3VqmWj--n0Xc5ko",
  authDomain: "sacab4.firebaseapp.com",
  databaseURL: "https://sacab4-default-rtdb.firebaseio.com",
  projectId: "sacab4",
  storageBucket: "sacab4.firebasestorage.app",
  messagingSenderId: "460527133065",
  appId: "1:460527133065:web:2392cef4f637eaf8040158",
  measurementId: "G-VW6S5M5L6C"
};

// Super Admin (verified only after Firebase Auth + role check in DB)
const SUPER_ADMIN_EMAIL = "abdimalikbaashi@gmail.com";

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
const storage = firebase.storage();

window.SACAB = {
  auth,
  db,
  storage,
  SUPER_ADMIN_EMAIL,
  config: firebaseConfig
};
