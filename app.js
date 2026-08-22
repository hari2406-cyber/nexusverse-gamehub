// Firebase SDK (Module Imports)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Your Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCVbvw2Tj5rxKhsG7JYfvBXVAwGgaULyMY",
  authDomain: "nexusverse-ce94f.firebaseapp.com",
  projectId: "nexusverse-ce94f",
  storageBucket: "nexusverse-ce94f.firebasestorage.app",
  messagingSenderId: "481484791977",
  appId: "1:481484791977:web:b39792bbc9f8203a2349b8",
  measurementId: "G-2ZMNLGCZMP"
};

// Initialize Firebase & Auth
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Modal Functions
window.openAuthModal = () => {
  const modal = document.getElementById('authModal');
  if(modal) modal.style.display = 'flex';
};

window.closeAuthModal = () => {
  const modal = document.getElementById('authModal');
  if(modal) modal.style.display = 'none';
};

// Helper function to safely get input value from multiple possible ID names
const getInputValue = (id1, id2) => {
  const el = document.getElementById(id1) || document.getElementById(id2);
  return el ? el.value.trim() : '';
};

// 1. Email Sign Up
window.signUpEmail = async () => {
  const email = getInputValue('authEmail', 'email');
  const password = getInputValue('authPassword', 'password');
  
  if(!email || !password) {
    alert('Please enter both email and password.');
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert('Account created successfully!');
    window.closeAuthModal();
  } catch (error) {
    alert('Sign Up Error: ' + error.message);
  }
};

// 2. Email Login
window.loginEmail = async () => {
  const email = getInputValue('authEmail', 'email');
  const password = getInputValue('authPassword', 'password');

  if(!email || !password) {
    alert('Please enter both email and password.');
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert('Logged in successfully!');
    window.closeAuthModal();
  } catch (error) {
    alert('Login Error: ' + error.message);
  }
};

// 3. Google OAuth Login
window.loginGoogle = async () => {
  try {
    await signInWithPopup(auth, googleProvider);
    window.closeAuthModal();
  } catch (error) {
    alert('Google Auth Error: ' + error.message);
  }
};

// 4. Logout Function
window.logout = () => signOut(auth);

// 5. Active User Listener
onAuthStateChanged(auth, (user) => {
  const loginBtn = document.getElementById('loginBtn');
  const signupBtn = document.getElementById('signupBtn');
  const userProfile = document.getElementById('userProfile');
  const userName = document.getElementById('userName');

  if (user) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (signupBtn) signupBtn.style.display = 'none';
    if (userProfile) userProfile.style.display = 'inline-block';
    if (userName) userName.innerText = user.displayName || user.email.split('@')[0];
  } else {
    if (loginBtn) loginBtn.style.display = 'inline-block';
    if (signupBtn) signupBtn.style.display = 'inline-block';
    if (userProfile) userProfile.style.display = 'none';
  }
});
