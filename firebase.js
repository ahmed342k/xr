import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

export { db };
