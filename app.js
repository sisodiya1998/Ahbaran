import { auth, db, storage, googleProvider } from './firebase.js';
import { signInWithPopup, signInAnonymously, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { collection, addDoc, query, onSnapshot, orderBy, serverTimestamp, setDoc, doc, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const splashScreen = document.getElementById('splash-screen');
const loginSection = document.getElementById('login-section');
const appContainer = document.getElementById('app-container');

setTimeout(() => {
    splashScreen.classList.add('hidden');
    checkAuthState();
}, 1500);

function checkAuthState() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            if (user.isAnonymous) {
                let guestName = localStorage.getItem('guestName');
                if (!guestName) {
                    guestName = 'Guest' + Math.floor(Math.random() * 9000 + 1000);
                    localStorage.setItem('guestName', guestName);
                }
                user.displayName = guestName;
                user.photoURL = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
            } else {
                // Save registered user for private chat
                await setDoc(doc(db, "users", user.uid), {
                    uid: user.uid,
                    name: user.displayName,
                    photoURL: user.photoURL,
                    lastSeen: serverTimestamp()
                }, { merge: true });
                document.getElementById('nav-private-chat').classList.remove('hidden');
            }
            showApp(user);
        } else {
            loginSection.classList.remove('hidden');
            appContainer.classList.add('hidden');
        }
    });
}

document.getElementById('btn-google-login').addEventListener('click', () => signInWithPopup(auth, googleProvider));
document.getElementById('btn-guest-login').addEventListener('click', () => signInAnonymously(auth));
document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('isAdmin');
    signOut(auth);
});

function showApp(user) {
    loginSection.classList.add('hidden');
    appContainer.classList.remove('hidden');
    document.getElementById('user-name').textContent = user.displayName;
    document.getElementById('user-email').textContent = user.isAnonymous ? 'Guest Account' : user.email;
    document.getElementById('user-avatar').src = user.photoURL;

    if (localStorage.getItem('isAdmin') === 'true') {
        document.getElementById('nav-admin').classList.remove('hidden');
    }

    loadHeroSlider();
    loadCommunityPosts();
    loadGallery();
    loadNews();
    loadDirectory();
}

// Navigation Logic
document.querySelectorAll('.nav-links li').forEach(link => {
    link.addEventListener('click', () => {
        document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        const target = link.getAttribute('data-target');
        document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
        document.getElementById(target).classList.remove('hidden');
        if (window.innerWidth <= 768) document.querySelector('.sidebar').classList.remove('open');
    });
});
document.getElementById('menu-toggle').addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('open'));

// Community Posts Submission
document.getElementById('post-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = document.getElementById('post-text').value;
    const file = document.getElementById('post-image').files[0];
    const loader = document.getElementById('post-upload-loader');
    
    loader.classList.remove('hidden');
    document.getElementById('btn-submit-post').disabled = true;

    let imageUrl = null;
    try {
        if (file) {
            const storageRef = ref(storage, `posts/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            imageUrl = await getDownloadURL(storageRef);
        }
        await addDoc(collection(db, "posts"), {
            text, imageUrl, 
            author: auth.currentUser.displayName,
            uid: auth.currentUser.uid,
            photoURL: auth.currentUser.photoURL,
            approved: false,
            createdAt: serverTimestamp()
        });
        e.target.reset();
        alert("Post submitted for admin approval!");
    } catch (error) {
        console.error(error);
        alert("Error posting.");
    } finally {
        loader.classList.add('hidden');
        document.getElementById('btn-submit-post').disabled = false;
    }
});

// Load Approved Posts
function loadCommunityPosts() {
    const q = query(collection(db, "posts"), where("approved", "==", true), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        const container = document.getElementById('posts-container');
        container.innerHTML = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const date = data.createdAt ? data.createdAt.toDate().toLocaleDateString() : '';
            container.innerHTML += `
                <div class="list-item">
                    <div class="list-item-header">
                        <div style="display:flex; gap:10px; align-items:center;">
                            <img src="${data.photoURL}" style="width:30px; height:30px; border-radius:50%;">
                            <strong>${data.author}</strong>
                        </div>
                        <small>${date}</small>
                    </div>
                    <p>${data.text}</p>
                    ${data.imageUrl ? `<img src="${data.imageUrl}" class="list-item-img" onclick="window.open('${data.imageUrl}')">` : ''}
                </div>`;
        });
    });
}

// Load Gallery (Images from approved posts & news)
function loadGallery() {
    const q = query(collection(db, "posts"), where("approved", "==", true), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        const grid = document.getElementById('gallery-grid');
        grid.innerHTML = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.imageUrl) {
                grid.innerHTML += `<div class="gallery-item" onclick="window.open('${data.imageUrl}')"><img src="${data.imageUrl}" loading="lazy"></div>`;
            }
        });
    });
}

// Load Hero Slider (Latest Slide News)
function loadHeroSlider() {
    const q = query(collection(db, "news"), where("isSlide", "==", true), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        const slider = document.getElementById('hero-slider');
        let slidesHTML = '';
        let slides = [];
        snapshot.forEach(docSnap => slides.push(docSnap.data()));
        
        if (slides.length === 0) return; // keep default
        
        slides.forEach((s, i) => {
            slidesHTML += `
                <div class="slide ${i === 0 ? 'active' : ''}">
                    <img src="${s.imageUrl || 'https://images.unsplash.com/photo-1596443686812-2f45229eebc3?w=1000'}" alt="Slide">
                    <div class="slide-caption">${s.title}</div>
                </div>`;
        });
        slider.innerHTML = slidesHTML;
        startSlider();
    });
}

let slideInterval;
function startSlider() {
    clearInterval(slideInterval);
    slideInterval = setInterval(() => {
        const slides = document.querySelectorAll('.hero-slider .slide');
        if(slides.length <= 1) return;
        let activeIdx = Array.from(slides).findIndex(s => s.classList.contains('active'));
        slides[activeIdx].classList.remove('active');
        activeIdx = (activeIdx + 1) % slides.length;
        slides[activeIdx].classList.add('active');
    }, 4000);
}

// Load News
function loadNews() {
    const q = query(collection(db, "news"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        const container = document.getElementById('news-container');
        container.innerHTML = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            container.innerHTML += `
                <div class="list-item">
                    <h3>${data.title}</h3>
                    <p>${data.content}</p>
                    ${data.imageUrl ? `<img src="${data.imageUrl}" class="list-item-img">` : ''}
                </div>`;
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
                    <h3>${data.name}</h3>
                    <p>📞 ${data.mobile} | 👨‍👩‍👦 Members: ${data.members}</p>
                    <p>🏠 ${data.address}</p>
                </div>`;
        });
    });
}

document.getElementById('dir-search').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.dir-item').forEach(item => {
        item.style.display = item.innerText.toLowerCase().includes(term) ? 'flex' : 'none';
    });
});

// Complaints
document.getElementById('complaint-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "complaints"), {
        uid: auth.currentUser.uid,
        name: auth.currentUser.displayName,
        type: document.getElementById('comp-type').value,
        desc: document.getElementById('comp-desc').value,
        status: 'Pending',
        createdAt: serverTimestamp()
    });
    e.target.reset();
    alert("Complaint submitted.");
});