import { auth, db, storage, googleProvider } from './firebase.js';
import { signInWithPopup, signInAnonymously, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { collection, addDoc, query, onSnapshot, orderBy, serverTimestamp, setDoc, doc, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const splashScreen = document.getElementById('splash-screen');
const loginSection = document.getElementById('login-section');
const appContainer = document.getElementById('app-container');

// App Initialization
setTimeout(() => {
    splashScreen.classList.add('hidden');
    checkAuthState();
}, 1500);

function checkAuthState() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            let userData = { name: '', photo: '', email: '' };
            if (user.isAnonymous) {
                let guestName = localStorage.getItem('guestName') || 'Guest' + Math.floor(Math.random() * 9000);
                localStorage.setItem('guestName', guestName);
                userData = { name: guestName, photo: 'https://cdn-icons-png.flaticon.com/512/149/149071.png', email: 'Guest Account' };
                document.getElementById('nav-private-chat').classList.add('hidden');
            } else {
                userData = { name: user.displayName, photo: user.photoURL, email: user.email };
                await setDoc(doc(db, "users", user.uid), { uid: user.uid, name: user.displayName, photoURL: user.photoURL, lastSeen: serverTimestamp() }, { merge: true });
                document.getElementById('nav-private-chat').classList.remove('hidden');
            }
            setupUIForUser(userData);
            showApp();
        } else {
            loginSection.classList.remove('hidden');
            appContainer.classList.add('hidden');
        }
    });
}

// Auth Handlers
document.getElementById('btn-google-login').addEventListener('click', () => signInWithPopup(auth, googleProvider));
document.getElementById('btn-guest-login').addEventListener('click', () => signInAnonymously(auth));
document.getElementById('btn-logout').addEventListener('click', () => { localStorage.removeItem('isAdmin'); signOut(auth); });

function setupUIForUser(user) {
    document.getElementById('post-avatar').src = user.photo;
    document.getElementById('mobile-avatar').src = user.photo;
    document.getElementById('profile-avatar-large').src = user.photo;
    document.getElementById('profile-name').innerText = user.name;
    document.getElementById('profile-email').innerText = user.email;
    document.getElementById('profile-role').innerText = auth.currentUser.isAnonymous ? "Guest User" : "Verified Villager";
}

function showApp() {
    loginSection.classList.add('hidden');
    appContainer.classList.remove('hidden');
    if (localStorage.getItem('isAdmin') === 'true') document.getElementById('nav-admin').classList.remove('hidden');
    
    loadHeroSlider();
    loadCommunityPosts();
    loadMyPosts();
    loadGallery();
    loadNews();
    loadDirectory();
}

// Navigation Logic
document.querySelectorAll('.nav-links li').forEach(link => {
    link.addEventListener('click', () => {
        document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
        document.getElementById(link.getAttribute('data-target')).classList.remove('hidden');
        if (window.innerWidth <= 768) document.querySelector('.sidebar').classList.remove('open');
    });
});
document.getElementById('menu-toggle').addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('open'));

// Create Post Logic (Image Preview)
const postImageInput = document.getElementById('post-image');
const imagePreviewContainer = document.getElementById('image-preview-container');
const postImagePreview = document.getElementById('post-image-preview');

postImageInput.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => { postImagePreview.src = e.target.result; imagePreviewContainer.classList.remove('hidden'); }
        reader.readAsDataURL(file);
    }
});

document.getElementById('btn-submit-post').addEventListener('click', async () => {
    const text = document.getElementById('post-text').value.trim();
    const file = postImageInput.files[0];
    if (!text && !file) return alert("Please write something or attach a photo!");

    const loader = document.getElementById('post-upload-loader');
    loader.classList.remove('hidden');
    document.getElementById('btn-submit-post').disabled = true;

    try {
        let imageUrl = null;
        if (file) {
            const storageRef = ref(storage, `posts/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            imageUrl = await getDownloadURL(storageRef);
        }
        await addDoc(collection(db, "posts"), {
            text, imageUrl, 
            author: auth.currentUser.isAnonymous ? localStorage.getItem('guestName') : auth.currentUser.displayName,
            uid: auth.currentUser.uid,
            photoURL: document.getElementById('post-avatar').src,
            approved: false,
            createdAt: serverTimestamp()
        });
        document.getElementById('post-text').value = '';
        postImageInput.value = '';
        imagePreviewContainer.classList.add('hidden');
        alert("Post submitted! It will appear on the feed once the Admin approves it.");
    } catch (error) { console.error(error); alert("Error posting."); }
    
    loader.classList.add('hidden');
    document.getElementById('btn-submit-post').disabled = false;
});

// Render Post Card HTML
function createPostCardHTML(data, showStatus = false) {
    const date = data.createdAt ? data.createdAt.toDate().toLocaleDateString() : 'Just now';
    let statusBadge = '';
    if (showStatus) {
        statusBadge = data.approved 
            ? `<span class="post-status status-approved">Approved</span>`
            : `<span class="post-status status-pending">Pending Approval</span>`;
    }
    return `
        <div class="card post-card">
            <div class="post-header">
                <div class="post-user-info">
                    <img src="${data.photoURL}" class="avatar-sm">
                    <div>
                        <h4>${data.author}</h4>
                        <span class="post-date">${date}</span>
                    </div>
                </div>
                ${statusBadge}
            </div>
            <div class="post-content">${data.text}</div>
            ${data.imageUrl ? `<img src="${data.imageUrl}" class="post-image" onclick="window.open('${data.imageUrl}')">` : ''}
        </div>`;
}

// Load Approved Feed
function loadCommunityPosts() {
    const q = query(collection(db, "posts"), where("approved", "==", true), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        const container = document.getElementById('posts-container');
        container.innerHTML = '';
        snapshot.forEach(docSnap => container.innerHTML += createPostCardHTML(docSnap.data()));
    });
}

// Load My Profile Posts (Pending & Approved)
function loadMyPosts() {
    auth.onAuthStateChanged(user => {
        if(!user) return;
        const q = query(collection(db, "posts"), where("uid", "==", user.uid), orderBy("createdAt", "desc"));
        onSnapshot(q, (snapshot) => {
            const container = document.getElementById('my-posts-container');
            container.innerHTML = '';
            if(snapshot.empty) container.innerHTML = '<p class="text-muted">You haven\'t posted anything yet.</p>';
            snapshot.forEach(docSnap => container.innerHTML += createPostCardHTML(docSnap.data(), true));
        });
    });
}

// Gallery, Slider, Directory functions remain standard...
function loadGallery() {
    const q = query(collection(db, "posts"), where("approved", "==", true), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        const grid = document.getElementById('gallery-grid');
        grid.innerHTML = '';
        snapshot.forEach(docSnap => {
            if (docSnap.data().imageUrl) {
                grid.innerHTML += `<div class="gallery-item card" onclick="window.open('${docSnap.data().imageUrl}')"><img src="${docSnap.data().imageUrl}" loading="lazy"></div>`;
            }
        });
    });
}

function loadHeroSlider() {
    const q = query(collection(db, "news"), where("isSlide", "==", true), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        const slider = document.getElementById('hero-slider');
        let slidesHTML = '';
        let count = 0;
        snapshot.forEach(docSnap => {
            const s = docSnap.data();
            slidesHTML += `
                <div class="slide ${count === 0 ? 'active' : ''}">
                    <img src="${s.imageUrl || 'https://images.unsplash.com/photo-1596443686812-2f45229eebc3?w=1000'}">
                    <div class="slide-caption">${s.title}</div>
                </div>`;
            count++;
        });
        if(count > 0) slider.innerHTML = slidesHTML;
        setInterval(() => {
            const slides = document.querySelectorAll('.hero-slider .slide');
            if(slides.length <= 1) return;
            let activeIdx = Array.from(slides).findIndex(s => s.classList.contains('active'));
            slides[activeIdx].classList.remove('active');
            slides[(activeIdx + 1) % slides.length].classList.add('active');
        }, 4000);
    });
}

function loadNews() {
    const q = query(collection(db, "news"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        const container = document.getElementById('news-container');
        container.innerHTML = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            container.innerHTML += `
                <div class="card news-card">
                    ${data.imageUrl ? `<img src="${data.imageUrl}">` : ''}
                    <div>
                        <h4 class="text-primary">${data.title}</h4>
                        <p class="text-sm mt-10">${data.content}</p>
                    </div>
                </div>`;
        });
    });
}

function loadDirectory() {
    const q = query(collection(db, "directory"), orderBy("name"));
    onSnapshot(q, (snapshot) => {
        const container = document.getElementById('dir-container');
        container.innerHTML = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            container.innerHTML += `
                <div class="card dir-card dir-item">
                    <h4>${data.name}</h4>
                    <div class="text-sm text-muted mt-10 flex-align-center"><span class="material-icons-round" style="font-size:16px;">call</span> ${data.mobile}</div>
                    <div class="text-sm text-muted flex-align-center mt-10"><span class="material-icons-round" style="font-size:16px;">groups</span> Members: ${data.members}</div>
                    <div class="text-sm text-muted flex-align-center mt-10"><span class="material-icons-round" style="font-size:16px;">home</span> ${data.address}</div>
                </div>`;
        });
    });
}

document.getElementById('dir-search').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.dir-item').forEach(item => {
        item.style.display = item.innerText.toLowerCase().includes(term) ? 'block' : 'none';
    });
});