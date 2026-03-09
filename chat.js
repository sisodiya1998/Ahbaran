import { auth, db } from './firebase.js';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, limit } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatBox = document.getElementById('chat-box');

// Listen to messages
const q = query(collection(db, "messages"), orderBy("createdAt", "asc"), limit(100));
onSnapshot(q, (snapshot) => {
    chatBox.innerHTML = '';
    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const isSelf = auth.currentUser && auth.currentUser.uid === data.uid;
        
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${isSelf ? 'self' : ''}`;
        
        msgDiv.innerHTML = `
            <img src="${data.photoURL || 'https://via.placeholder.com/40'}" alt="Avatar">
            <div>
                <div class="msg-name">${data.name}</div>
                <div class="msg-content">${data.text}</div>
            </div>
        `;
        chatBox.appendChild(msgDiv);
    });
    chatBox.scrollTop = chatBox.scrollHeight;
});

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!chatInput.value.trim() || !auth.currentUser) return;
    
    const text = chatInput.value;
    chatInput.value = '';
    
    let user = auth.currentUser;
    let displayName = user.displayName;
    if(user.isAnonymous) displayName = localStorage.getItem('guestName') || 'Guest';

    try {
        await addDoc(collection(db, "messages"), {
            text: text,
            uid: user.uid,
            name: displayName,
            photoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${displayName}`,
            createdAt: serverTimestamp()
        });
    } catch (err) { console.error("Error sending msg", err); }
});