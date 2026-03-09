import { auth, db } from './firebase.js';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Add News
document.getElementById('add-news-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('news-title').value;
    const content = document.getElementById('news-content').value;

    try {
        await addDoc(collection(db, "news"), { title, content, createdAt: serverTimestamp() });
        e.target.reset();
        alert("News published!");
    } catch (err) { console.error(err); }
});

// Load Admin News
const qNews = query(collection(db, "news"), orderBy("createdAt", "desc"));
onSnapshot(qNews, (snapshot) => {
    const container = document.getElementById('admin-news-list');
    container.innerHTML = '';
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        container.innerHTML += `
            <div class="list-item">
                <div class="list-item-content">
                    <h3>${data.title}</h3>
                    <p>${data.content}</p>
                </div>
                <button class="delete-btn material-icons" onclick="deleteDocItem('news', '${docSnap.id}')">delete</button>
            </div>
        `;
    });
});

// Load Admin Complaints
const qComp = query(collection(db, "complaints"), orderBy("createdAt", "desc"));
onSnapshot(qComp, (snapshot) => {
    const container = document.getElementById('admin-complaints-list');
    container.innerHTML = '';
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        container.innerHTML += `
            <div class="list-item">
                <div class="list-item-content">
                    <h3>${data.type} - ${data.name}</h3>
                    <p>${data.desc}</p>
                    <p><strong>Status:</strong> ${data.status}</p>
                </div>
                <button class="delete-btn material-icons" onclick="deleteDocItem('complaints', '${docSnap.id}')">delete</button>
            </div>
        `;
    });
});

window.deleteDocItem = async (col, id) => {
    if(confirm("Are you sure you want to delete this?")) {
        await deleteDoc(doc(db, col, id));
    }
};