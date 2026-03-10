import { auth, db } from "./firebase.js";

import {
collection,
addDoc,
query,
orderBy,
onSnapshot,
serverTimestamp,
limit,
where
}
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


function escapeHTML(text){

return text
.replace(/&/g,"&amp;")
.replace(/</g,"&lt;")
.replace(/>/g,"&gt;")

}



const chatBox=document.getElementById("chat-box")

const q=query(
collection(db,"messages"),
where("type","==","public"),
orderBy("createdAt","asc"),
limit(100)
)

onSnapshot(q,snap=>{

chatBox.innerHTML=""

snap.forEach(d=>{

const data=d.data()

chatBox.innerHTML+=`

<div class="chat-msg">

<img src="${data.photoURL}">

<div>

<b>${data.name}</b>

<p>${escapeHTML(data.text)}</p>

</div>

</div>

`

})

chatBox.scrollTop=chatBox.scrollHeight

})



document.getElementById("chat-form")
.addEventListener("submit",async e=>{

e.preventDefault()

const input=document.getElementById("chat-input")

if(!input.value) return

await addDoc(collection(db,"messages"),{

text:input.value,

type:"public",

uid:auth.currentUser.uid,

name:auth.currentUser.displayName,

photoURL:auth.currentUser.photoURL,

createdAt:serverTimestamp()

})

input.value=""

})