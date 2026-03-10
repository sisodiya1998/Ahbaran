import { auth, db, storage, googleProvider } from './firebase.js';

import {
signInWithPopup,
signInAnonymously,
onAuthStateChanged,
signOut
}
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
collection,
addDoc,
query,
onSnapshot,
orderBy,
serverTimestamp,
setDoc,
doc,
where,
getDocs
}
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
ref,
uploadBytes,
getDownloadURL
}
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";


const splash = document.getElementById("splash-screen");
const login = document.getElementById("login-section");
const app = document.getElementById("app-container");


setTimeout(()=>{

splash.classList.add("hidden");
checkAuth();

},1500);


function checkAuth(){

onAuthStateChanged(auth,async user=>{

if(user){

if(!user.isAnonymous){

await setDoc(doc(db,"users",user.uid),{

uid:user.uid,
name:user.displayName,
photoURL:user.photoURL,
lastSeen:serverTimestamp()

},{merge:true})

document.getElementById("nav-private-chat").classList.remove("hidden");

}

showApp(user)

}

else{

login.classList.remove("hidden")

}

})

}



document.getElementById("btn-google-login")
.onclick=()=>signInWithPopup(auth,googleProvider)

document.getElementById("btn-guest-login")
.onclick=()=>signInAnonymously(auth)

document.getElementById("btn-logout")
.onclick=()=>signOut(auth)



function showApp(user){

login.classList.add("hidden")

app.classList.remove("hidden")

document.getElementById("user-name").innerText=user.displayName

document.getElementById("user-avatar").src=user.photoURL

loadPosts()

loadNews()

loadGallery()

loadDirectory()

loadUserComplaints()

}



async function loadPosts(){

const q=query(
collection(db,"posts"),
where("approved","==",true),
orderBy("createdAt","desc")
)

onSnapshot(q,snap=>{

const container=document.getElementById("posts-container")

container.innerHTML=""

snap.forEach(d=>{

const data=d.data()

container.innerHTML+=`

<div class="list-item">

<b>${data.author}</b>

<p>${data.text}</p>

${data.imageUrl?`<img src="${data.imageUrl}" class="list-item-img">`:""}

</div>

`

})

})

}



function loadGallery(){

const q=query(
collection(db,"posts"),
where("approved","==",true)
)

onSnapshot(q,snap=>{

const grid=document.getElementById("gallery-grid")

grid.innerHTML=""

snap.forEach(d=>{

const data=d.data()

if(data.imageUrl){

grid.innerHTML+=`
<div class="gallery-item">
<img src="${data.imageUrl}">
</div>
`

}

})

})

}



function loadNews(){

const q=query(collection(db,"news"),orderBy("createdAt","desc"))

onSnapshot(q,snap=>{

const container=document.getElementById("news-container")

container.innerHTML=""

snap.forEach(d=>{

const data=d.data()

container.innerHTML+=`

<div class="list-item">

<h3>${data.title}</h3>

<p>${data.content}</p>

${data.imageUrl?`<img src="${data.imageUrl}">`:""}

</div>

`

})

})

}



function loadDirectory(){

const q=query(collection(db,"directory"),orderBy("name"))

onSnapshot(q,snap=>{

const container=document.getElementById("dir-container")

container.innerHTML=""

snap.forEach(d=>{

const data=d.data()

container.innerHTML+=`

<div class="list-item">

<h3>${data.name}</h3>

<p>📞 ${data.mobile}</p>

<p>${data.address}</p>

</div>

`

})

})

}



function loadUserComplaints(){

const q=query(

collection(db,"complaints"),

where("uid","==",auth.currentUser.uid),

orderBy("createdAt","desc")

)

onSnapshot(q,snap=>{

const container=document.getElementById("user-complaints-container")

container.innerHTML=""

snap.forEach(d=>{

const data=d.data()

container.innerHTML+=`

<div class="list-item">

<b>${data.type}</b>

<p>${data.desc}</p>

<small>Status : ${data.status}</small>

</div>

`

})

})

}



document.getElementById("complaint-form")
.addEventListener("submit",async e=>{

e.preventDefault()

await addDoc(collection(db,"complaints"),{

uid:auth.currentUser.uid,

name:auth.currentUser.displayName,

type:document.getElementById("comp-type").value,

desc:document.getElementById("comp-desc").value,

status:"Pending",

createdAt:serverTimestamp()

})

alert("Complaint Submitted")

})