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
].map((v) => v.toLowerCase().trim());

const WORKER_UPLOAD_URL = "https://sparkling-hall-7749.ohkvchnjvbnb.workers.dev";

const authLoading = document.getElementById("authLoading");
const adminApp = document.getElementById("adminApp");

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
let authChecked = false;
let currentEditingImages = [];

function showNotice(text) {
  noticeBox.textContent = text;
  noticeBox.classList.add("show");
  clearTimeout(window.noticeTimer);
  window.noticeTimer = setTimeout(() => {
    noticeBox.classList.remove("show");
  }, 1600);
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function showAdminApp(email) {
  adminAllowed = true;
  adminEmailInfo.textContent = "مسجل الدخول: " + email;
  authLoading.style.display = "none";
  adminApp.style.display = "block";
}

function hideAdminApp() {
  adminAllowed = false;
  adminApp.style.display = "none";
  authLoading.style.display = "flex";
}

async function goLogin() {
  hideAdminApp();
  window.location.replace("login.html");
}

async function uploadImage(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(WORKER_UPLOAD_URL, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "فشل رفع الصورة");
    throw new Error(errorText || "فشل رفع الصورة");
  }

  const data = await response.json();

  if (!data.url) {
    throw new Error("لم يتم إرجاع رابط الصورة");
  }

  return data.url;
}

function renderPreviewFromUrls(urls = []) {
  previewList.innerHTML = "";

  if (!urls.length) {
    previewList.innerHTML = `<div class="empty-box">لا توجد صور للمعاينة حالياً</div>`;
    return;
  }

  urls.forEach((src) => {
    const box = document.createElement("div");
    box.className = "preview-box";
    box.innerHTML = `<img src="${escapeHtml(src)}" alt="preview">`;
    previewList.appendChild(box);
  });
}

function renderPreviewFromFiles() {
  const list = [];

  const mainFile = mainImageInput.files?.[0];
  if (mainFile) {
    list.push(URL.createObjectURL(mainFile));
  } else if (currentEditingImages[0]) {
    list.push(currentEditingImages[0]);
  }

  const moreFiles = Array.from(moreImagesInput.files || []);
  if (moreFiles.length) {
    moreFiles.forEach((file) => list.push(URL.createObjectURL(file)));
  } else if (currentEditingImages.length > 1) {
    list.push(...currentEditingImages.slice(1));
  }

  renderPreviewFromUrls(list);
}

function resetForm() {
  editingId = null;
  currentEditingImages = [];
  formTitle.textContent = "إضافة منتج";
  nameInput.value = "";
  categoryInput.value = "accessories";
  priceInput.value = "";
  oldPriceInput.value = "";
  badgeInput.value = "";
  mainImageInput.value = "";
  moreImagesInput.value = "";
  descriptionInput.value = "";
  saveBtn.disabled = false;
  saveBtn.textContent = "حفظ المنتج";
  renderPreviewFromUrls([]);
}

function normalizeProduct(id, data) {
  const images = Array.isArray(data.images)
    ? data.images.filter(Boolean)
    : (data.image ? [data.image] : []);

  return {
    id,
    name: data.name || "منتج بدون اسم",
    price: safeNumber(data.price),
    oldPrice: safeNumber(data.oldPrice),
    category: data.category || "electronics",
    badge: data.badge || "منتج",
    description: data.description || "لا يوجد وصف لهذا المنتج.",
    images: images.length
      ? images
      : ["https://via.placeholder.com/600x600?text=XR+Store"]
  };
}

async function collectImagesForSave() {
  let images = [];

  const mainFile = mainImageInput.files?.[0];
  const moreFiles = Array.from(moreImagesInput.files || []);

  if (mainFile) {
    const mainUrl = await uploadImage(mainFile);
    images.push(mainUrl);
  } else if (editingId && currentEditingImages[0]) {
    images.push(currentEditingImages[0]);
  }

  if (moreFiles.length) {
    for (const file of moreFiles) {
      const url = await uploadImage(file);
      images.push(url);
    }
  } else if (editingId && currentEditingImages.length > 1) {
    images.push(...currentEditingImages.slice(1));
  }

  return images.filter(Boolean);
}

function editProduct(product) {
  editingId = product.id;
  currentEditingImages = Array.isArray(product.images) ? [...product.images] : [];
  formTitle.textContent = "تعديل المنتج";
  nameInput.value = product.name;
  categoryInput.value = product.category;
  priceInput.value = product.price;
  oldPriceInput.value = product.oldPrice || "";
  badgeInput.value = product.badge || "";
  mainImageInput.value = "";
  moreImagesInput.value = "";
  descriptionInput.value = product.description || "";
  renderPreviewFromUrls(currentEditingImages);
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
          <img src="${escapeHtml(product.images[0])}" alt="${escapeHtml(product.name)}">
        </div>

        <div style="flex:1">
          <h3>${escapeHtml(product.name)}</h3>
          <p>${escapeHtml(product.description)}</p>
          <div class="admin-product-price">
            ${product.price} ر.س
            ${product.oldPrice ? `- قبل الخصم ${product.oldPrice} ر.س` : ""}
          </div>
          <p>الفئة: ${escapeHtml(product.category)} | عدد الصور: ${product.images.length}</p>

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

function startProductsListener() {
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

mainImageInput.addEventListener("change", renderPreviewFromFiles);
moreImagesInput.addEventListener("change", renderPreviewFromFiles);

resetBtn.addEventListener("click", resetForm);

logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error(error);
  }
  await goLogin();
});

saveBtn.addEventListener("click", async () => {
  if (!adminAllowed) return;

  const name = nameInput.value.trim();
  const category = categoryInput.value;
  const price = safeNumber(priceInput.value);
  const oldPrice = safeNumber(oldPriceInput.value || 0);
  const badge = badgeInput.value.trim() || "منتج";
  const description = descriptionInput.value.trim() || "لا يوجد وصف لهذا المنتج.";

  if (!name || !price) {
    alert("اكتب اسم المنتج والسعر");
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "جاري الرفع والحفظ...";

  try {
    const images = await collectImagesForSave();

    if (!images.length) {
      alert("أضف صورة واحدة على الأقل");
      saveBtn.disabled = false;
      saveBtn.textContent = "حفظ المنتج";
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
    alert("حدث خطأ أثناء الرفع أو الحفظ:\n" + error.message);
    saveBtn.disabled = false;
    saveBtn.textContent = "حفظ المنتج";
  }
});

onAuthStateChanged(auth, async (user) => {
  if (authChecked) return;
  authChecked = true;

  if (!user) {
    await goLogin();
    return;
  }

  const email = (user.email || "").toLowerCase().trim();

  if (!ADMIN_EMAILS.includes(email)) {
    try {
      await signOut(auth);
    } catch (error) {
      console.error(error);
    }
    await goLogin();
    return;
  }

  showAdminApp(email);
  renderPreviewFromUrls([]);
  startProductsListener();
});
