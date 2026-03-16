import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCMvjw8Pv_ixcecNYxsokBOAdjwCJvDnig",
  authDomain: "xr-store-20583.firebaseapp.com",
  projectId: "xr-store-20583",
  storageBucket: "xr-store-20583.firebasestorage.app",
  messagingSenderId: "967462689229",
  appId: "1:967462689229:web:71b44aa4ec33253d6dcc84",
  measurementId: "G-79KCXRRXS2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const adminEmails = [
  "ohkvchnjvbnb@gmail.com",
  "raedhammd22@gmail.com"
];

onAuthStateChanged(auth, (user) => {

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  if (!adminEmails.includes(user.email)) {
    alert("ليس لديك صلاحية دخول الادمن");
    signOut(auth);
    window.location.href = "login.html";
    return;
  }

  loadProducts();
});

async function loadProducts() {
  const productsDiv = document.getElementById("products");

  const querySnapshot = await getDocs(collection(db, "products"));

  productsDiv.innerHTML = "";

  querySnapshot.forEach((docItem) => {

    const data = docItem.data();

    const div = document.createElement("div");

    div.innerHTML = `
      <h3>${data.name}</h3>
      <p>${data.price}$</p>
      <img src="${data.image}" width="120">
      <br>
      <button onclick="deleteProduct('${docItem.id}')">حذف</button>
      <hr>
    `;

    productsDiv.appendChild(div);

  });

}

window.addProduct = async function() {

  const name = document.getElementById("name").value;
  const price = document.getElementById("price").value;
  const image = document.getElementById("image").value;

  await addDoc(collection(db, "products"), {
    name,
    price,
    image
  });

  alert("تمت إضافة المنتج");

  loadProducts();
};

window.deleteProduct = async function(id) {

  await deleteDoc(doc(db, "products", id));

  loadProducts();
};

window.logout = function() {
  signOut(auth);
};
