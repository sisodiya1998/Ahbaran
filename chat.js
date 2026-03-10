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
            <div class="chat-msg ${isSelf ? 'self' : ''}">
                <img src="${data.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}">
                <div>
                    <div class="msg-name">${data.name}</div>
                    <div class="msg-content">${data.text}</div>
                </div>
            </div>`;
    });
    chatBox.scrollTop = chatBox.scrollHeight;
});

document.getElementById('chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    if (!input.value.trim() || !auth.currentUser) return;
    const text = input.value;
    input.value = '';
    
    await addDoc(collection(db, "messages"), {
        text, type: "public",
        uid: auth.currentUser.uid,
        name: auth.currentUser.displayName,
        photoURL: auth.currentUser.photoURL,
        createdAt: serverTimestamp()
    });
});

// PRIVATE CHAT
let activePrivateChatId = null;
let activePrivateChatUser = null;
let privateChatUnsubscribe = null;

const usersList = document.getElementById('pc-users-list');
const dmArea = document.getElementById('pc-dm-area');
const pcChatBox = document.getElementById('pc-chat-box');

// Load registered users
onSnapshot(collection(db, "users"), (snapshot) => {
    usersList.innerHTML = '';
    if(!auth.currentUser || auth.currentUser.isAnonymous) return;
    
    snapshot.forEach(docSnap => {
        const user = docSnap.data();
        if(user.uid !== auth.currentUser.uid) {
            const div = document.createElement('div');
            div.className = 'user-item';
            div.innerHTML = `<img src="${user.photoURL}"> <span>${user.name}</span>`;
            div.onclick = () => openPrivateChat(user);
            usersList.appendChild(div);
        }
    });
});

function openPrivateChat(targetUser) {
    activePrivateChatUser = targetUser;
    document.getElementById('pc-dm-header').innerText = `Chatting with ${targetUser.name}`;
    dmArea.classList.remove('hidden');
    
    const u1 = auth.currentUser.uid;
    const u2 = targetUser.uid;
    activePrivateChatId = u1 < u2 ? `${u1}_${u2}` : `${u2}_${u1}`;

    if(privateChatUnsubscribe) privateChatUnsubscribe();
    
    const qPriv = query(collection(db, "messages"), where("chatId", "==", activePrivateChatId), orderBy("createdAt", "asc"));
    privateChatUnsubscribe = onSnapshot(qPriv, (snapshot) => {
        pcChatBox.innerHTML = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const isSelf = data.uid === auth.currentUser.uid;
            pcChatBox.innerHTML += `
                <div class="chat-msg ${isSelf ? 'self' : ''}">
                    <div class="msg-content">${data.text}</div>
                </div>`;
        });
        pcChatBox.scrollTop = pcChatBox.scrollHeight;
    });
}

document.getElementById('pc-chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('pc-chat-input');
    if (!input.value.trim() || !activePrivateChatId) return;
    const text = input.value;
    input.value = '';
    
    await addDoc(collection(db, "messages"), {
        text, type: "private", chatId: activePrivateChatId,
        uid: auth.currentUser.uid,
        createdAt: serverTimestamp()
    });
});