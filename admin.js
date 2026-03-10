import { auth, db, storage } from './firebase.js';
import { collection, addDoc, query, orderBy, onSnapshot, updateDoc, deleteDoc, doc, serverTimestamp, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// Admin Login Prompt
document.getElementById('floating-admin-btn').addEventListener('click', () => {
    if(localStorage.getItem('isAdmin') === 'true') {
        document.querySelector('[data-target=\'admin\']').click();
        return;
    }
    const pass = prompt("Enter Admin Password:");
    if (pass === "Gavmera123") {
        localStorage.setItem('isAdmin', 'true');
        document.getElementById('nav-admin').classList.remove('hidden');
        document.querySelector('[data-target=\'admin\']').click();
        alert("Admin Access Granted!");
    } else {
        alert("Incorrect Password!");
    }
});

// Load Pending Posts
const qPending = query(collection(db, "posts"), where("approved", "==", false), orderBy("createdAt", "desc"));
onSnapshot(qPending, (snapshot) => {
    const container = document.getElementById('admin-pending-list');
    container.innerHTML = '';
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        container.innerHTML += `
            <div class="list-item">
                <p><strong>${data.author}:</strong> ${data.text}</p>
                ${data.imageUrl ? `<img src="${data.imageUrl}" class="list-item-img">` : ''}
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="approvePost('${docSnap.id}')">Approve</button>
                    <button class="btn btn-danger" onclick="deletePost('${docSnap.id}')">Reject</button>
                </div>
            </div>`;
    });
});

window.approvePost = async (id) => {
    await updateDoc(doc(db, "posts", id), { approved: true });
};
window.deletePost = async (id) => {
    if(confirm("Delete this post?")) await deleteDoc(doc(db, "posts", id));
};

// Add News / Slide
document.getElementById('add-news-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('news-title').value;
    const content = document.getElementById('news-content').value;
    const isSlide = document.getElementById('news-is-slide').checked;
    const file = document.getElementById('news-image').files[0];
    const loader = document.getElementById('news-upload-loader');

    loader.classList.remove('hidden');
    document.getElementById('btn-submit-news').disabled = true;

    let imageUrl = null;
    try {
        if (file) {
            const storageRef = ref(storage, `news/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            imageUrl = await getDownloadURL(storageRef);
        }
        await addDoc(collection(db, "news"), { title, content, isSlide, imageUrl, createdAt: serverTimestamp() });
        e.target.reset();
        alert("Published successfully!");
    } catch (err) { console.error(err); } finally {
        loader.classList.add('hidden');
        document.getElementById('btn-submit-news').disabled = false;
    }
});

// Add Directory Entry
document.getElementById('dir-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "directory"), {
        name: document.getElementById('dir-name').value,
        mobile: document.getElementById('dir-mobile').value,
        members: document.getElementById('dir-members').value,
        address: document.getElementById('dir-address').value,
        createdAt: serverTimestamp()
    });
    e.target.reset();
    alert("Added to directory!");
});