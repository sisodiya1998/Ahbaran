import { db } from "./firebase.js";

import {
collection,
addDoc,
query,
orderBy,
onSnapshot,
updateDoc,
deleteDoc,
doc,
serverTimestamp,
where,
getDocs
}
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


const q=query(
collection(db,"posts"),
where("approved","==",false),
orderBy("createdAt","desc")
)

onSnapshot(q,snap=>{

const container=document.getElementById("admin-pending-list")

container.innerHTML=""

snap.forEach(d=>{

const data=d.data()

container.innerHTML+=`

<div class="list-item">

<p>${data.text}</p>

<button onclick="approvePost('${d.id}')">Approve</button>

<button onclick="deletePost('${d.id}')">Delete</button>

</div>

`

})

})


window.approvePost=async id=>{

await updateDoc(doc(db,"posts",id),{

approved:true

})

}


window.deletePost=async id=>{

await deleteDoc(doc(db,"posts",id))

}



document.getElementById("dir-form")
.addEventListener("submit",async e=>{

e.preventDefault()

const mobile=document.getElementById("dir-mobile").value

const q=query(
collection(db,"directory"),
where("mobile","==",mobile)
)

const snap=await getDocs(q)

if(!snap.empty){

alert("Mobile already exists")

return

}

await addDoc(collection(db,"directory"),{

name:document.getElementById("dir-name").value,

mobile,

members:document.getElementById("dir-members").value,

address:document.getElementById("dir-address").value,

createdAt:serverTimestamp()

})

alert("Added")

})