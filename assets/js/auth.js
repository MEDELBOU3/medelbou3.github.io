/**
 * auth.js — Firebase Authentication module
 */

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyByNls0SQLIs2KHgVwHFQUsbthAG2ZdR6c",
    authDomain: "blog-bca42.firebaseapp.com",
    projectId: "blog-bca42",
    storageBucket: "blog-bca42.firebasestorage.app",
    messagingSenderId: "368876770630",
    appId: "1:368876770630:web:29d1184df011533e2e8147",
    measurementId: "G-9H7S6K9JGQ"
};

// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp, deleteDoc, updateDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, collection, addDoc, getDocs, query, orderBy, serverTimestamp, deleteDoc, updateDoc, doc, getDoc };

// ─── DOM Elements ─────────────────────────────────────────── 
const authBtn = document.getElementById('auth-btn');
const mobileAuthBtn = document.getElementById('mobile-auth-btn');
const authModal = document.getElementById('auth-modal');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authToggleBtn = document.getElementById('auth-toggle-btn');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const userSection = document.getElementById('user-section');
const mobileUserSection = document.getElementById('mobile-user-section');

let isLoginMode = true;

// ─── UI Functions ─────────────────────────────────────────── 
function toggleAuthModal(show) {
    if (!authModal) return;
    authModal.classList.toggle('active', show);
    if (show) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
}

function updateAuthUI(user) {
    if (user) {
        // User is signed in
        const userHtml = `
            <div class="user-profile">
                <img src="${user.photoURL || 'https://i.pravatar.cc/150?u=' + user.uid}" alt="${user.displayName}" class="user-avatar">
                <div class="user-info">
                    <span class="user-name">${user.displayName || 'User'}</span>
                    <div style="display: flex; gap: 8px;">
                        <a href="create-post.html" class="logout-link" style="text-decoration: none; color: var(--color-primary); font-weight: 700;">Write Post</a>
                        <span style="opacity: 0.3;">|</span>
                        <button class="logout-link logout-btn-action">Sign Out</button>
                    </div>
                </div>
            </div>
        `;
        if (userSection) userSection.innerHTML = userHtml;
        if (mobileUserSection) mobileUserSection.innerHTML = userHtml;

        if (authBtn) authBtn.style.display = 'none';
        if (mobileAuthBtn) mobileAuthBtn.style.display = 'none';

        // Re-attach listeners to all logout buttons
        document.querySelectorAll('.logout-btn-action').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                signOut(auth).then(() => {
                    console.log('Signed out');
                }).catch(err => console.error(err));
            };
        });
    } else {
        // User is signed out
        if (userSection) userSection.innerHTML = '';
        if (mobileUserSection) mobileUserSection.innerHTML = '';
        if (authBtn) authBtn.style.display = 'flex';
        if (mobileAuthBtn) mobileAuthBtn.style.display = 'flex';
    }

    // Ensure icons are created/updated in the new HTML
    if (window.lucide) window.lucide.createIcons();
}

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    if (authTitle) authTitle.textContent = isLoginMode ? 'Sign In to Your Account' : 'Create an Account';
    if (authSubmitBtn) authSubmitBtn.textContent = isLoginMode ? 'Sign In' : 'Sign Up';
    if (authToggleBtn) {
        authToggleBtn.innerHTML = isLoginMode
            ? 'Don\'t have an account? <span>Sign Up</span>'
            : 'Already have an account? <span>Sign In</span>';
    }

    const nameField = document.getElementById('auth-name-field');
    if (nameField) nameField.style.display = isLoginMode ? 'none' : 'block';
}

// ─── Auth Listeners ───────────────────────────────────────── 
onAuthStateChanged(auth, (user) => {
    updateAuthUI(user);
    if (user) toggleAuthModal(false);
});

// ─── Event Listeners ──────────────────────────────────────── 
document.addEventListener('DOMContentLoaded', () => {
    authBtn?.addEventListener('click', () => toggleAuthModal(true));
    mobileAuthBtn?.addEventListener('click', () => toggleAuthModal(true));

    document.getElementById('auth-close')?.addEventListener('click', () => toggleAuthModal(false));

    authToggleBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthMode();
    });

    authForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const name = document.getElementById('auth-name')?.value;

        try {
            authSubmitBtn.disabled = true;
            authSubmitBtn.textContent = isLoginMode ? 'Signing in...' : 'Creating account...';

            if (isLoginMode) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(userCredential.user, {
                    displayName: name,
                    photoURL: `https://i.pravatar.cc/150?u=${userCredential.user.uid}`
                });
                // Force UI update
                updateAuthUI(userCredential.user);
            }
        } catch (error) {
            console.error('Auth error:', error);
            alert(error.message);
        } finally {
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = isLoginMode ? 'Sign In' : 'Sign Up';
        }
    });

    // Close modal on background click
    authModal?.addEventListener('click', (e) => {
        if (e.target === authModal) toggleAuthModal(false);
    });
});
