import { db, auth } from "./firebase.js";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* 🔥 رابط Worker */
const WORKER_UPLOAD_URL = "https://sparkling-hall-7749.ohkvchnjvbnb.workers.dev";

/* 🔐 الادمن */
const ADMIN_EMAILS = [
  "ohkvchnjvbnb@gmail.com",
  "raedhammd22@gmail.com"
];

/* عناصر الصفحة */
const formTitle = document.getElementById("formTitle");
const noticeBox = document.getElementById("noticeBox");
const productsList = document.getElementById("productsList");
const adminEmailInfo = document.getElementById("adminEmailInfo");
const logoutBtn = document.getElementById("logoutBtn");

const nameInput = document.getElementById("name");
const categoryInput = document.getElementById("category");
const priceInput = document.getElementById("price");
const oldPriceInput = document.getElementById("oldPrice");
const badgeInput = document.getElementById("badge");
const mainImageInput = document.getElementById("mainImage");
const moreImagesInput = document.getElementById("moreImages");
const descriptionInput = document.getElementById("description");
const previewList = document.getElementById("previewList");

const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");

/* 🔥 زر رفع */
const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");

let editingId = null;
let adminAllowed = false;
let authResolved = false;

/* إشعار */
function showNotice(text) {
  noticeBox.textContent = text;
  noticeBox.classList.add("show");
  setTimeout(() => noticeBox.classList.remove("show"), 1500);
}

/* 🔥 رفع صورة */
async function uploadImage(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(WORKER_UPLOAD_URL, {
    method: "POST",
    body: formData
  });

  if (!res.ok) throw new Error("Upload failed");

  const data = await res.json();
  return data.url;
}

/* زر الرفع */
uploadBtn?.addEventListener("click", async () => {
  if (!fileInput.files.length) {
    alert("اختر صورة أولاً");
    return;
  }

  try {
    showNotice("جاري رفع الصورة...");
    const url = await uploadImage(fileInput.files[0]);

    mainImageInput.value = url;
    renderPreview();

    showNotice("تم رفع الصورة");
  } catch (e) {
    console.error(e);
    alert("فشل رفع الصورة");
  }
});

/* بناء الصور */
function buildImagesArray() {
  const arr = [];
  const main = mainImageInput.value.trim();
  if (main) arr.push(main);

  const more = moreImagesInput.value
    .split("\n")
    .map(v => v.trim())
    .filter(Boolean);

  more.forEach(url => {
    if (!arr.includes(url)) arr.push(url);
  });

  return arr;
}

/* عرض الصور */
function renderPreview() {
  const images = buildImagesArray();
  previewList.innerHTML = "";

  if (!images.length) {
    previewList.innerHTML = `<div class="empty-box">لا توجد صور</div>`;
    return;
  }

  images.forEach(src => {
    const box = document.createElement("div");
    box.className = "preview-box";
    box.innerHTML = `<img src="${src}">`;
    previewList.appendChild(box);
  });
}

/* إعادة تعيين */
function resetForm() {
  editingId = null;
  formTitle.textContent = "إضافة منتج";
  nameInput.value = "";
  categoryInput.value = "accessories";
  priceInput.value = "";
  oldPriceInput.value = "";
  badgeInput.value = "";
  mainImageInput.value = "";
  moreImagesInput.value = "";
  descriptionInput.value = "";
  renderPreview();
}

/* حفظ */
saveBtn.addEventListener("click", async () => {
  if (!adminAllowed) return;

  const name = nameInput.value.trim();
  const price = Number(priceInput.value);
  const images = buildImagesArray();

  if (!name || !price) {
    alert("اكتب الاسم والسعر");
    return;
  }

  if (!images.length) {
    alert("ارفع صورة");
    return;
  }

  const payload = {
    name,
    category: categoryInput.value,
    price,
    oldPrice: Number(oldPriceInput.value || 0),
    badge: badgeInput.value || "منتج",
    description: descriptionInput.value || "",
    image: images[0],
    images
  };

  try {
    if (editingId) {
      await updateDoc(doc(db, "products", editingId), payload);
      showNotice("تم التعديل");
    } else {
      await addDoc(collection(db, "products"), payload);
      showNotice("تمت الإضافة");
    }
    resetForm();
  } catch (e) {
    console.error(e);
    alert("خطأ بالحفظ");
  }
});

/* عرض المنتجات */
function renderProducts(items) {
  productsList.innerHTML = "";

  items.forEach(product => {
    const item = document.createElement("div");
    item.innerHTML = `
      <h3>${product.name}</h3>
      <img src="${product.image}" style="width:80px">
      <button class="edit">تعديل</button>
      <button class="delete">حذف</button>
    `;

    item.querySelector(".edit").onclick = () => {
      editingId = product.id;
      nameInput.value = product.name;
      priceInput.value = product.price;
      mainImageInput.value = product.image;
      renderPreview();
    };

    item.querySelector(".delete").onclick = async () => {
      await deleteDoc(doc(db, "products", product.id));
      showNotice("تم الحذف");
    };

    productsList.appendChild(item);
  });
}

/* تحميل المنتجات */
function listenProducts() {
  const q = query(collection(db, "products"), orderBy("name"));
  onSnapshot(q, snap => {
    const items = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));
    renderProducts(items);
  });
}

/* تسجيل الدخول */
onAuthStateChanged(auth, async user => {
  if (authResolved) return;
  authResolved = true;

  if (!user) {
    window.location.replace("login.html");
    return;
  }

  const email = user.email.toLowerCase();

  if (!ADMIN_EMAILS.includes(email)) {
    await signOut(auth);
    window.location.replace("login.html");
    return;
  }

  adminAllowed = true;
  adminEmailInfo.textContent = email;
  listenProducts();
});

/* خروج */
logoutBtn.onclick = async () => {
  await signOut(auth);
  window.location.replace("login.html");
};
