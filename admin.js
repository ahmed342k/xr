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

const ADMIN_EMAILS = [
  "ohkvchnjvbnb@gmail.com",
  "raedhammd22@gmail.com"
];

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

let editingId = null;
let adminAllowed = false;
let authResolved = false;

function showNotice(text) {
  noticeBox.textContent = text;
  noticeBox.classList.add("show");
  clearTimeout(window.noticeTimer);
  window.noticeTimer = setTimeout(() => {
    noticeBox.classList.remove("show");
  }, 1600);
}

function buildImagesArray() {
  const arr = [];
  const main = mainImageInput.value.trim();
  if (main) arr.push(main);

  const more = moreImagesInput.value
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);

  more.forEach((url) => {
    if (!arr.includes(url)) arr.push(url);
  });

  return arr;
}

function renderPreview() {
  const images = buildImagesArray();
  previewList.innerHTML = "";

  if (!images.length) {
    previewList.innerHTML = `<div class="empty-box">لا توجد صور للمعاينة حالياً</div>`;
    return;
  }

  images.forEach((src) => {
    const box = document.createElement("div");
    box.className = "preview-box";
    box.innerHTML = `<img src="${src}" alt="preview">`;
    previewList.appendChild(box);
  });
}

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

function normalizeProduct(id, data) {
  const images = Array.isArray(data.images)
    ? data.images.filter(Boolean)
    : (data.image ? [data.image] : []);

  return {
    id,
    name: data.name || "منتج بدون اسم",
    price: Number(data.price || 0),
    oldPrice: Number(data.oldPrice || 0),
    category: data.category || "electronics",
    badge: data.badge || "منتج",
    description: data.description || "لا يوجد وصف لهذا المنتج.",
    images: images.length
      ? images
      : ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80"]
  };
}

function editProduct(product) {
  editingId = product.id;
  formTitle.textContent = "تعديل المنتج";
  nameInput.value = product.name;
  categoryInput.value = product.category;
  priceInput.value = product.price;
  oldPriceInput.value = product.oldPrice || "";
  badgeInput.value = product.badge || "";
  mainImageInput.value = product.images[0] || "";
  moreImagesInput.value = product.images.slice(1).join("\n");
  descriptionInput.value = product.description || "";
  renderPreview();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function removeProduct(id) {
  if (!adminAllowed) return;
  if (!confirm("حذف المنتج؟")) return;

  try {
    await deleteDoc(doc(db, "products", id));
    showNotice("تم حذف المنتج");
    if (editingId === id) resetForm();
  } catch (error) {
    console.error(error);
    alert("حدث خطأ أثناء الحذف");
  }
}

function renderProducts(items) {
  productsList.innerHTML = "";

  if (!items.length) {
    productsList.innerHTML = '<div class="empty-box">لا توجد منتجات حالياً</div>';
    return;
  }

  items.forEach((product) => {
    const item = document.createElement("div");
    item.className = "admin-product";
    item.innerHTML = `
      <div class="admin-product-row">
        <div class="admin-thumb">
          <img src="${product.images[0]}" alt="${product.name}">
        </div>

        <div style="flex:1">
          <h3>${product.name}</h3>
          <p>${product.description}</p>
          <div class="admin-product-price">${product.price} ر.س ${product.oldPrice ? `- قبل الخصم ${product.oldPrice} ر.س` : ""}</div>
          <p>الفئة: ${product.category} | عدد الصور: ${product.images.length}</p>

          <div class="admin-actions">
            <button class="admin-btn">تعديل</button>
            <button class="admin-btn-danger">حذف</button>
          </div>
        </div>
      </div>
    `;

    const buttons = item.querySelectorAll("button");
    buttons[0].addEventListener("click", () => editProduct(product));
    buttons[1].addEventListener("click", () => removeProduct(product.id));

    productsList.appendChild(item);
  });
}

function listenProducts() {
  const productsRef = query(collection(db, "products"), orderBy("name"));
  onSnapshot(
    productsRef,
    (snapshot) => {
      const items = snapshot.docs.map((d) => normalizeProduct(d.id, d.data()));
      renderProducts(items);
    },
    (error) => {
      console.error(error);
      productsList.innerHTML = '<div class="empty-box">فشل تحميل المنتجات. تأكد من Firestore Rules وأن Test Mode شغال.</div>';
    }
  );
}

mainImageInput.addEventListener("input", renderPreview);
moreImagesInput.addEventListener("input", renderPreview);

resetBtn.addEventListener("click", resetForm);

logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error(error);
  }
  window.location.replace("login.html");
});

saveBtn.addEventListener("click", async () => {
  if (!adminAllowed) return;

  const name = nameInput.value.trim();
  const category = categoryInput.value;
  const price = Number(priceInput.value);
  const oldPrice = Number(oldPriceInput.value || 0);
  const badge = badgeInput.value.trim() || "منتج";
  const description = descriptionInput.value.trim() || "لا يوجد وصف لهذا المنتج.";
  const images = buildImagesArray();

  if (!name || !price) {
    alert("اكتب اسم المنتج والسعر");
    return;
  }

  if (!images.length) {
    alert("أضف صورة واحدة على الأقل");
    return;
  }

  const payload = {
    name,
    category,
    price,
    oldPrice,
    badge,
    description,
    image: images[0],
    images
  };

  try {
    if (editingId) {
      await updateDoc(doc(db, "products", editingId), payload);
      showNotice("تم تعديل المنتج");
    } else {
      await addDoc(collection(db, "products"), payload);
      showNotice("تمت إضافة المنتج");
    }

    resetForm();
  } catch (error) {
    console.error(error);
    alert("حدث خطأ أثناء الحفظ");
  }
});

onAuthStateChanged(auth, async (user) => {
  if (authResolved) return;
  authResolved = true;

  if (!user) {
    window.location.replace("login.html");
    return;
  }

  const email = (user.email || "").toLowerCase();

  if (!ADMIN_EMAILS.includes(email)) {
    try {
      await signOut(auth);
    } catch (error) {
      console.error(error);
    }
    window.location.replace("login.html");
    return;
  }

  adminAllowed = true;
  adminEmailInfo.textContent = "مسجل الدخول: " + email;

  renderPreview();
  listenProducts();
});
