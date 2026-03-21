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

const WORKER_UPLOAD_URL = "https://sparkling-hall-7749.ohkvchnjvbnb.workers.dev";

const ADMIN_EMAILS = [
  "ohkvchnjvbnb@gmail.com",
  "raedhammd22@gmail.com"
].map((email) => email.toLowerCase().trim());

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
const imagesInput = document.getElementById("imagesInput");
const descriptionInput = document.getElementById("description");
const previewList = document.getElementById("previewList");

const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");

const adminNameDisplay = document.getElementById("adminNameDisplay");
const avatarChar = document.getElementById("avatarChar");

const statProducts = document.getElementById("statProducts");
const statSelected = document.getElementById("statSelected");
const statImages = document.getElementById("statImages");

const tabs = document.querySelectorAll(".tab");
const sections = document.querySelectorAll(".section");

let editingId = null;
let adminAllowed = false;
let authResolved = false;
let selectedImageFiles = [];
let existingImages = [];
let allProducts = [];

function showNotice(text, type = "success") {
  if (!noticeBox) return;
  noticeBox.className = "notice show " + type;
  noticeBox.textContent = text;

  clearTimeout(window.__noticeTimer);
  window.__noticeTimer = setTimeout(() => {
    noticeBox.className = "notice";
    noticeBox.textContent = "";
  }, 2200);
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function switchTab(tabName) {
  tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });

  sections.forEach((section) => {
    section.classList.toggle("active", section.id === "tab-" + tabName);
  });
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => switchTab(tab.dataset.tab));
});

function updateStats() {
  statProducts.textContent = String(allProducts.length);
  statSelected.textContent = String(selectedImageFiles.length || existingImages.length || 0);

  const totalImages = allProducts.reduce((sum, product) => {
    return sum + (Array.isArray(product.images) ? product.images.length : 0);
  }, 0);

  statImages.textContent = String(totalImages);
}

async function uploadImage(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(WORKER_UPLOAD_URL, {
    method: "POST",
    body: formData,
    mode: "cors",
    cache: "no-store"
  });

  const text = await response.text();

  let data = null;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new Error("استجابة غير صالحة من السيرفر: " + text);
  }

  if (!response.ok || !data?.success || !data?.url) {
    throw new Error(data?.error || "فشل رفع الصورة");
  }

  return data.url;
}

function buildPreviewSources() {
  if (selectedImageFiles.length) {
    return selectedImageFiles.map((file, index) => ({
      src: URL.createObjectURL(file),
      isMain: index === 0
    }));
  }

  return existingImages.map((src, index) => ({
    src,
    isMain: index === 0
  }));
}

function renderPreview() {
  const images = buildPreviewSources();
  previewList.innerHTML = "";

  if (!images.length) {
    previewList.innerHTML = `<div class="empty-box">لا توجد صور للمعاينة حالياً</div>`;
    updateStats();
    return;
  }

  images.forEach((item) => {
    const box = document.createElement("div");
    box.className = "preview-box";
    box.innerHTML = `
      <img src="${escapeHtml(item.src)}" alt="preview">
      ${item.isMain ? `<div class="preview-badge">رئيسية</div>` : ""}
    `;
    previewList.appendChild(box);
  });

  updateStats();
}

function resetForm() {
  editingId = null;
  formTitle.textContent = "إضافة منتج جديد";

  nameInput.value = "";
  categoryInput.value = "electronics";
  priceInput.value = "";
  oldPriceInput.value = "";
  badgeInput.value = "";
  imagesInput.value = "";
  descriptionInput.value = "";

  selectedImageFiles = [];
  existingImages = [];

  saveBtn.disabled = false;
  saveBtn.textContent = "حفظ المنتج";

  renderPreview();
  switchTab("add");
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
      : ["https://via.placeholder.com/600x600?text=XR+Store"]
  };
}

function editProduct(product) {
  editingId = product.id;
  formTitle.textContent = "تعديل منتج";

  nameInput.value = product.name || "";
  categoryInput.value = product.category || "electronics";
  priceInput.value = product.price || "";
  oldPriceInput.value = product.oldPrice || "";
  badgeInput.value = product.badge || "";
  descriptionInput.value = product.description || "";

  imagesInput.value = "";
  selectedImageFiles = [];
  existingImages = Array.isArray(product.images) ? [...product.images] : [];

  renderPreview();
  switchTab("add");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function removeProduct(id) {
  if (!adminAllowed) return;

  const ok = confirm("هل تريد حذف المنتج؟");
  if (!ok) return;

  try {
    await deleteDoc(doc(db, "products", id));
    showNotice("تم حذف المنتج", "success");

    if (editingId === id) {
      resetForm();
    }
  } catch (error) {
    console.error(error);
    showNotice("حدث خطأ أثناء حذف المنتج", "error");
  }
}

function renderProducts(items) {
  productsList.innerHTML = "";

  if (!items.length) {
    productsList.innerHTML = `<div class="empty-box">لا توجد منتجات حالياً</div>`;
    updateStats();
    return;
  }

  items.forEach((product) => {
    const item = document.createElement("div");
    item.className = "product-card";

    item.innerHTML = `
      <div class="product-top">
        <div class="product-thumb">
          <img src="${escapeHtml(product.images[0])}" alt="${escapeHtml(product.name)}">
        </div>

        <div style="flex:1">
          <div class="product-name">${escapeHtml(product.name)}</div>
          <div class="product-desc">${escapeHtml(product.description)}</div>

          <div class="product-meta">
            <span>الفئة: ${escapeHtml(product.category)}</span>
            <span>عدد الصور: ${product.images.length}</span>
            <span>الشارة: ${escapeHtml(product.badge || "منتج")}</span>
          </div>

          <div class="product-price">
            ${product.price} ر.س
            ${product.oldPrice ? `- قبل الخصم ${product.oldPrice} ر.س` : ""}
          </div>
        </div>
      </div>

      <div class="product-actions">
        <button class="btn" type="button">تعديل</button>
        <button class="btn-danger" type="button">حذف</button>
      </div>
    `;

    const buttons = item.querySelectorAll("button");
    buttons[0].addEventListener("click", () => editProduct(product));
    buttons[1].addEventListener("click", () => removeProduct(product.id));

    productsList.appendChild(item);
  });

  updateStats();
}

function listenProducts() {
  const productsRef = query(collection(db, "products"), orderBy("name"));

  onSnapshot(
    productsRef,
    (snapshot) => {
      const items = snapshot.docs.map((d) => normalizeProduct(d.id, d.data()));
      allProducts = items;
      renderProducts(items);
    },
    (error) => {
      console.error(error);
      productsList.innerHTML = `<div class="empty-box">فشل تحميل المنتجات</div>`;
    }
  );
}

imagesInput.addEventListener("change", () => {
  selectedImageFiles = Array.from(imagesInput.files || []);
  renderPreview();
});

resetBtn.addEventListener("click", resetForm);

logoutBtn.addEventListener("click", async () => {
  try {
    localStorage.removeItem("xr_admin_name");
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

  if (!name || !price) {
    showNotice("اكتب اسم المنتج والسعر", "error");
    return;
  }

  let images = [];

  try {
    saveBtn.disabled = true;
    saveBtn.textContent = "جاري رفع الصور والحفظ...";

    if (selectedImageFiles.length) {
      for (const file of selectedImageFiles) {
        const imageUrl = await uploadImage(file);
        images.push(imageUrl);
      }
    } else if (editingId && existingImages.length) {
      images = [...existingImages];
    }

    if (!images.length) {
      showNotice("أضف صورة واحدة على الأقل", "error");
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
      showNotice("تم تعديل المنتج", "success");
    } else {
      await addDoc(collection(db, "products"), payload);
      showNotice("تمت إضافة المنتج", "success");
    }

    resetForm();
    switchTab("list");
  } catch (error) {
    console.error(error);
    showNotice("حدث خطأ أثناء الحفظ أو رفع الصور: " + error.message, "error");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "حفظ المنتج";
  }
});

onAuthStateChanged(auth, async (user) => {
  if (authResolved) return;
  authResolved = true;

  if (!user) {
    window.location.replace("login.html");
    return;
  }

  const email = (user.email || "").toLowerCase().trim();

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

  const storedName = (localStorage.getItem("xr_admin_name") || "المدير").trim();
  adminNameDisplay.textContent = "أهلاً، " + storedName;
  avatarChar.textContent = storedName.charAt(0) || "A";

  adminEmailInfo.textContent = "مسجل الدخول: " + email;

  if (authLoading) authLoading.style.display = "none";
  if (adminApp) adminApp.style.display = "block";

  renderPreview();
  listenProducts();
  updateStats();
});
