import { auth, db, googleProvider } from './firebase.js';
import { signInWithPopup, signInAnonymously, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { collection, addDoc, query, onSnapshot, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const splashScreen = document.getElementById('splash-screen');
const loginSection = document.getElementById('login-section');
const appContainer = document.getElementById('app-container');
const btnGoogleLogin = document.getElementById('btn-google-login');
const btnGuestLogin = document.getElementById('btn-guest-login');
const btnLogout = document.getElementById('btn-logout');

let currentUser = null;

setTimeout(() => {
    splashScreen.classList.add('hidden');
    checkAuthState();
}, 1500);

function checkAuthState() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            if (user.isAnonymous) {
                let guestName = localStorage.getItem('guestName');
                if (!guestName) {
                    guestName = 'Guest' + Math.floor(Math.random() * 9000 + 1000);
                    localStorage.setItem('guestName', guestName);
                }
                user.displayName = guestName;
                user.photoURL = 'https://api.dicebear.com/7.x/bottts/svg?seed=' + guestName;
            }
            showApp(user);
        } else {
            loginSection.classList.remove('hidden');
            appContainer.classList.add('hidden');
        }
    });
}

btnGoogleLogin.addEventListener('click', async () => {
    try { await signInWithPopup(auth, googleProvider); } 
    catch (error) { console.error("Login failed", error); alert("Login failed."); }
});

btnGuestLogin.addEventListener('click', async () => {
    try { await signInAnonymously(auth); } 
    catch (error) { console.error("Guest login failed", error); }
});

btnLogout.addEventListener('click', () => { signOut(auth); });

function showApp(user) {
    loginSection.classList.add('hidden');
    appContainer.classList.remove('hidden');
    document.getElementById('user-name').textContent = user.displayName || 'User';
    document.getElementById('user-email').textContent = user.isAnonymous ? 'Guest Account' : user.email;
    document.getElementById('user-avatar').src = user.photoURL || 'https://via.placeholder.com/50';

    if (!user.isAnonymous && user.email === 'admin@garhi.village') {
        document.getElementById('nav-admin').classList.remove('hidden');
    }

    loadNews();
    loadDirectory();
}

// Navigation
const navLinks = document.querySelectorAll('.nav-links li');
const pages = document.querySelectorAll('.page');
const sidebar = document.querySelector('.sidebar');
const menuToggle = document.getElementById('menu-toggle');

navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        const target = link.getAttribute('data-target');
        pages.forEach(p => p.classList.add('hidden'));
        document.getElementById(target).classList.remove('hidden');
        if (window.innerWidth <= 768) sidebar.classList.remove('open');
    });
});

menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));

// Directory Submission
document.getElementById('dir-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('dir-name').value;
    const mobile = document.getElementById('dir-mobile').value;
    const members = document.getElementById('dir-members').value;
    const address = document.getElementById('dir-address').value;

    try {
        await addDoc(collection(db, "directory"), { name, mobile, members, address, createdAt: serverTimestamp() });
        e.target.reset();
        alert("Added to directory!");
    } catch (err) { console.error(err); }
});

// Complaints Submission
document.getElementById('complaint-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = document.getElementById('comp-type').value;
    const desc = document.getElementById('comp-desc').value;

    try {
        await addDoc(collection(db, "complaints"), {
            uid: currentUser.uid,
            name: currentUser.displayName,
            type,
            desc,
            status: 'Pending',
            createdAt: serverTimestamp()
        });
        e.target.reset();
        alert("Complaint submitted successfully.");
    } catch (err) { console.error(err); }
});

// Load News
function loadNews() {
    const q = query(collection(db, "news"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        const container = document.getElementById('news-container');
        container.innerHTML = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const date = data.createdAt ? data.createdAt.toDate().toLocaleDateString() : '';
            container.innerHTML += `
                <div class="list-item">
                    <div class="list-item-content">
                        <h3>${data.title}</h3>
                        <p>${data.content}</p>
                        <p><small>${date}</small></p>
                    </div>
                </div>
            `;
        });
    });
}

// Load Directory
function loadDirectory() {
    const q = query(collection(db, "directory"), orderBy("name"));
    onSnapshot(q, (snapshot) => {
        const container = document.getElementById('dir-container');
        container.innerHTML = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            container.innerHTML += `
                <div class="list-item dir-item">
                    <div class="list-item-content">
                        <h3>${data.name} (Family Head)</h3>
                        <p><span class="material-icons text-sm">call</span> ${data.mobile}</p>
                        <p><span class="material-icons text-sm">group</span> Members: ${data.members}</p>
                        <p><span class="material-icons text-sm">home</span> ${data.address}</p>
                    </div>
                </div>
            `;
        });
    });
}

document.getElementById('dir-search').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.dir-item').forEach(item => {
        const text = item.innerText.toLowerCase();
        item.style.display = text.includes(term) ? 'flex' : 'none';
    });
});