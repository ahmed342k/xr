import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCMvjw8Pv_ixcecNYxsokBOAdjwCJvDnig",
  authDomain: "xr-store-20583.firebaseapp.com",
  projectId: "xr-store-20583",
  storageBucket: "xr-store-20583.firebasestorage.app",
  messagingSenderId: "967462689229",
  appId: "1:967462689229:web:71b44aa4ec33253d6dcc84"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const productsContainer = document.getElementById("products");

onSnapshot(collection(db, "products"), (snapshot) => {
  productsContainer.innerHTML = "";

  snapshot.forEach((doc) => {
    const product = doc.data();

    const card = `
      <div class="product">
        <img src="${product.image}">
        <h3>${product.name}</h3>
        <p>${product.price}</p>
      </div>
    `;

    productsContainer.innerHTML += card;
  });
});
