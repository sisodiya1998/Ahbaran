import { auth, db, storage } from './firebase.js';
import { collection, addDoc, query, orderBy, onSnapshot, updateDoc, deleteDoc, doc, serverTimestamp, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// Admin Access (Using your password)
document.getElementById('floating-admin-btn').addEventListener('click', () => {
    if(localStorage.getItem('isAdmin') === 'true') {
        document.querySelector('[data-target=\'admin\']').click();
        return;
    }
    const pass = prompt("Enter Village Admin Password:");
    if (pass === "Gavmera123") {
        localStorage.setItem('isAdmin', 'true');
        document.getElementById('nav-admin').classList.remove('hidden');
        document.querySelector('[data-target=\'admin\']').click();
        alert("Welcome Admin! Access Granted.");
    } else {
        alert("Incorrect Password!");
    }
});

// Load Pending Posts for Approval
const qPending = query(collection(db, "posts"), where("approved", "==", false), orderBy("createdAt", "desc"));
onSnapshot(qPending, (snapshot) => {
    const container = document.getElementById('admin-pending-list');
    container.innerHTML = '';
    if (snapshot.empty) container.innerHTML = '<p class="text-muted text-center mt-20">No pending posts to approve.</p>';
    
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        container.innerHTML += `
            <div class="card post-card">
                <div class="post-header">
                    <div class="post-user-info"><img src="${data.photoURL}" class="avatar-sm"> <h4>${data.author}</h4></div>
                </div>
                <div class="post-content">${data.text}</div>
                ${data.imageUrl ? `<img src="${data.imageUrl}" class="post-image">` : ''}
                <div class="flex-align-center mt-10">
                    <button class="btn btn-primary w-100" onclick="approvePost('${docSnap.id}')"><span class="material-icons-round">check_circle</span> Approve</button>
                    <button class="btn btn-danger w-100" onclick="deletePost('${docSnap.id}')"><span class="material-icons-round">delete</span> Reject</button>
                </div>
            </div>`;
    });
});

window.approvePost = async (id) => await updateDoc(doc(db, "posts", id), { approved: true });
window.deletePost = async (id) => { if(confirm("Are you sure you want to delete this user's post?")) await deleteDoc(doc(db, "posts", id)); };

// Add News/Slide
document.getElementById('add-news-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-news');
    const loader = document.getElementById('news-upload-loader');
    
    btn.disabled = true; loader.classList.remove('hidden');
    try {
        let imageUrl = null;
        const file = document.getElementById('news-image').files[0];
        if (file) {
            const storageRef = ref(storage, `news/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            imageUrl = await getDownloadURL(storageRef);
        }
        await addDoc(collection(db, "news"), { 
            title: document.getElementById('news-title').value, 
            content: document.getElementById('news-content').value, 
            isSlide: document.getElementById('news-is-slide').checked, 
            imageUrl, createdAt: serverTimestamp() 
        });
        e.target.reset(); alert("News published successfully!");
    } catch (err) { alert("Error"); }
    btn.disabled = false; loader.classList.add('hidden');
});

// Add Directory
document.getElementById('dir-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "directory"), {
        name: document.getElementById('dir-name').value, mobile: document.getElementById('dir-mobile').value,
        members: document.getElementById('dir-members').value, address: document.getElementById('dir-address').value,
        createdAt: serverTimestamp()
    });
    e.target.reset(); alert("Family added to directory!");
});