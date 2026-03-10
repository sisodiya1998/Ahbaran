import { auth, db } from './firebase.js';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, limit, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// PUBLIC CHAT
const chatBox = document.getElementById('chat-box');
const qPub = query(collection(db, "messages"), where("type", "==", "public"), orderBy("createdAt", "asc"), limit(100));

onSnapshot(qPub, (snapshot) => {
    chatBox.innerHTML = '';
    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const isSelf = auth.currentUser && auth.currentUser.uid === data.uid;
        chatBox.innerHTML += `
            <div class="msg-bubble ${isSelf ? 'self' : ''}">
                <img src="${data.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}" class="avatar-sm">
                <div>
                    <span class="msg-info">${data.name}</span>
                    <div class="msg-text">${data.text}</div>
                </div>
            </div>`;
    });
    chatBox.scrollTop = chatBox.scrollHeight;
});

document.getElementById('chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text || !auth.currentUser) return;
    input.value = '';
    
    await addDoc(collection(db, "messages"), {
        text, type: "public",
        uid: auth.currentUser.uid,
        name: auth.currentUser.isAnonymous ? localStorage.getItem('guestName') : auth.currentUser.displayName,
        photoURL: document.getElementById('mobile-avatar').src, // user current photo
        createdAt: serverTimestamp()
    });
});

// PRIVATE CHAT
let activePrivateChatId = null;
let privateChatUnsubscribe = null;

onSnapshot(collection(db, "users"), (snapshot) => {
    const usersList = document.getElementById('pc-users-list');
    usersList.innerHTML = '';
    if(!auth.currentUser || auth.currentUser.isAnonymous) return;
    
    snapshot.forEach(docSnap => {
        const user = docSnap.data();
        if(user.uid !== auth.currentUser.uid) {
            const div = document.createElement('div');
            div.className = 'user-list-item';
            div.innerHTML = `<img src="${user.photoURL}" class="avatar-sm"> <strong>${user.name}</strong>`;
            div.onclick = () => openPrivateChat(user);
            usersList.appendChild(div);
        }
    });
});

function openPrivateChat(targetUser) {
    document.getElementById('pc-dm-header').innerHTML = `<div class="flex-align-center"><img src="${targetUser.photoURL}" class="avatar-sm"> Chatting with ${targetUser.name}</div>`;
    document.getElementById('pc-dm-area').classList.remove('hidden');
    
    const u1 = auth.currentUser.uid;
    const u2 = targetUser.uid;
    activePrivateChatId = u1 < u2 ? `${u1}_${u2}` : `${u2}_${u1}`;

    if(privateChatUnsubscribe) privateChatUnsubscribe();
    
    const pcChatBox = document.getElementById('pc-chat-box');
    const qPriv = query(collection(db, "messages"), where("chatId", "==", activePrivateChatId), orderBy("createdAt", "asc"));
    
    privateChatUnsubscribe = onSnapshot(qPriv, (snapshot) => {
        pcChatBox.innerHTML = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const isSelf = data.uid === auth.currentUser.uid;
            pcChatBox.innerHTML += `
                <div class="msg-bubble ${isSelf ? 'self' : ''}">
                    <div class="msg-text">${data.text}</div>
                </div>`;
        });
        pcChatBox.scrollTop = pcChatBox.scrollHeight;
    });
}

document.getElementById('pc-chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('pc-chat-input');
    const text = input.value.trim();
    if (!text || !activePrivateChatId) return;
    input.value = '';
    
    await addDoc(collection(db, "messages"), {
        text, type: "private", chatId: activePrivateChatId,
        uid: auth.currentUser.uid,
        createdAt: serverTimestamp()
    });
});