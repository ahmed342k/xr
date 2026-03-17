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

/* رابط Worker الجديد */
const WORKER_UPLOAD_URL = "https://sparkling-hall-7749.ohkvchnjvbnb.workers.dev";

/* إيميلات الأدمن */
const ADMIN_EMAILS = [
  "ohkvchnjvbnb@gmail.com",
  "raedhammd22@gmail.com"
].map((email) => email.toLowerCase().trim());

/* عناصر التحقق */
const authLoading = document.getElementById("authLoading");
const adminApp = document.getElementById("adminApp");

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
const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const mainImageInput = document.getElementById("mainImage");
const moreImagesInput = document.getElementById("moreImages");
const descriptionInput = document.getElementById("description");
const previewList = document.getElementById("previewList");

const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");

/* متغيرات الحالة */
let editingId = null;
let adminAllowed = false;
let authResolved = false;

/* إشعار */
function showNotice(text) {
  if (!noticeBox) return;
  noticeBox.textContent = text;
  noticeBox.classList.add("show");

  clearTimeout(window.__noticeTimer);
  window.__noticeTimer = setTimeout(() => {
    noticeBox.classList.remove("show");
  }, 1800);
}

/* تنظيف نصوص */
function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* رفع صورة إلى Worker */
async function uploadImage(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(WORKER_UPLOAD_URL, {
    method: "POST",
    body: formData
  });

  let data = null;

  try {
    data = await response.json();
  } catch (error) {
    throw new Error("فشل قراءة استجابة الرفع");
  }

  if (!response.ok || !data?.success || !data?.url) {
    throw new Error(data?.error || "فشل رفع الصورة");
  }

  return data.url;
}

/* رفع الصورة الرئيسية من زر الرفع */
async function handleMainImageUpload() {
  if (!fileInput || !fileInput.files || !fileInput.files.length) {
    alert("اختر صورة أولاً");
    return;
  }

  const file = fileInput.files[0];

  try {
    uploadBtn.disabled = true;
    uploadBtn.textContent = "جاري الرفع...";

    const imageUrl = await uploadImage(file);

    mainImageInput.value = imageUrl;
    renderPreview();
    showNotice("تم رفع الصورة بنجاح");
  } catch (error) {
    console.error(error);
    alert("حدث خطأ أثناء رفع الصورة:\n" + error.message);
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.textContent = "رفع صورة";
  }
}

/* بناء مصفوفة الصور من الحقول */
function buildImagesArray() {
  const arr = [];

  const main = (mainImageInput?.value || "").trim();
  if (main) arr.push(main);

  const more = (moreImagesInput?.value || "")
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);

  more.forEach((url) => {
    if (!arr.includes(url)) {
      arr.push(url);
    }
  });

  return arr;
}

/* معاينة الصور */
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
    box.innerHTML = `<img src="${escapeHtml(src)}" alt="preview">`;
    previewList.appendChild(box);
  });
}

/* إعادة تعيين النموذج */
function resetForm() {
  editingId = null;
  formTitle.textContent = "إضافة منتج";

  nameInput.value = "";
  categoryInput.value = "accessories";
  priceInput.value = "";
  oldPriceInput.value = "";
  badgeInput.value = "";
  fileInput.value = "";
  mainImageInput.value = "";
  moreImagesInput.value = "";
  descriptionInput.value = "";

  saveBtn.disabled = false;
  saveBtn.textContent = "حفظ المنتج";

  renderPreview();
}

/* تطبيع بيانات المنتج */
function normalizeProduct(id, data) {
  const images = Array.isArray(data.images)
    ? data.images.filter(Boolean)
    : (data.image ? [data.image] : []);

  return {
    id,
    name: data.name || "منتج بدون اسم",
    price: Number(data.price || 0),
    oldPrice: Number(data.oldPrice || 0),
    category: data.category || "accessories",
    badge: data.badge || "منتج",
    description: data.description || "لا يوجد وصف لهذا المنتج.",
    images: images.length
      ? images
      : ["https://via.placeholder.com/600x600?text=XR+Store"]
  };
}

/* وضع منتج في حالة التعديل */
function editProduct(product) {
  editingId = product.id;
  formTitle.textContent = "تعديل المنتج";

  nameInput.value = product.name || "";
  categoryInput.value = product.category || "accessories";
  priceInput.value = product.price || "";
  oldPriceInput.value = product.oldPrice || "";
  badgeInput.value = product.badge || "";
  mainImageInput.value = product.images?.[0] || "";
  moreImagesInput.value = product.images?.slice(1).join("\n") || "";
  descriptionInput.value = product.description || "";

  renderPreview();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* حذف منتج */
async function removeProduct(id) {
  if (!adminAllowed) return;

  const ok = confirm("هل تريد حذف المنتج؟");
  if (!ok) return;

  try {
    await deleteDoc(doc(db, "products", id));
    showNotice("تم حذف المنتج");

    if (editingId === id) {
      resetForm();
    }
  } catch (error) {
    console.error(error);
    alert("حدث خطأ أثناء حذف المنتج");
  }
}

/* عرض المنتجات */
function renderProducts(items) {
  productsList.innerHTML = "";

  if (!items.length) {
    productsList.innerHTML = `<div class="empty-box">لا توجد منتجات حالياً</div>`;
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
            <button class="admin-btn" type="button">تعديل</button>
            <button class="admin-btn-danger" type="button">حذف</button>
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

/* الاستماع للمنتجات */
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
      productsList.innerHTML = `<div class="empty-box">فشل تحميل المنتجات</div>`;
    }
  );
}

/* أحداث المعاينة */
mainImageInput.addEventListener("input", renderPreview);
moreImagesInput.addEventListener("input", renderPreview);

/* زر رفع الصورة */
uploadBtn.addEventListener("click", handleMainImageUpload);

/* إعادة ضبط */
resetBtn.addEventListener("click", resetForm);

/* تسجيل الخروج */
logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error(error);
  }

  window.location.replace("login.html");
});

/* حفظ المنتج */
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
    saveBtn.disabled = true;
    saveBtn.textContent = "جاري الحفظ...";

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
    alert("حدث خطأ أثناء الحفظ:\n" + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "حفظ المنتج";
  }
});

/* التحقق من تسجيل الدخول */
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

  /* إظهار لوحة الأدمن */
  adminAllowed = true;
  adminEmailInfo.textContent = "مسجل الدخول: " + email;

  if (authLoading) authLoading.style.display = "none";
  if (adminApp) adminApp.style.display = "block";

  renderPreview();
  listenProducts();
});
