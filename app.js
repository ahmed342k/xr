import { db } from "./firebase.js";
import { collection,getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const productsContainer=document.getElementById("products");

async function loadProducts(){

const querySnapshot=await getDocs(collection(db,"products"));

querySnapshot.forEach((doc)=>{

const data=doc.data();

productsContainer.innerHTML+=`

<div class="product">

<img src="${data.image}">

<h3>${data.name}</h3>

<div class="price">${data.price}$</div>

</div>

`;

});

}

loadProducts();
