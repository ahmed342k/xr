import { db } from "./firebase.js";
import {
  collection,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const productsContainer = document.getElementById("products");
const offersProducts = document.getElementById("offersProducts");
const cartCount = document.getElementById("cartCount");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const searchStatus = document.getElementById("searchStatus");
const categoryButtons = document.querySelectorAll(".category-btn");
const toast = document.getElementById("toast");

const themeBtn = document.getElementById("themeBtn");
const openCartBtn = document.getElementById("openCartBtn");
const heroCartBtn = document.getElementById("heroCartBtn");
const heroShopBtn = document.getElementById("heroShopBtn");
const closeCartBtn = document.getElementById("closeCartBtn");
const cartOverlay = document.getElementById("cartOverlay");
const cartDrawer = document.getElementById("cartDrawer");
const cartBody = document.getElementById("cartBody");
const totalItems = document.getElementById("totalItems");
const orderBtn = document.getElementById("orderBtn");

const productOverlay = document.getElementById("productOverlay");
const productModal = document.getElementById("productModal");
const closeProductBtn = document.getElementById("closeProductBtn");
const modalImage = document.getElementById("modalImage");
const modalThumbs = document.getElementById("modalThumbs");
const modalBadge = document.getElementById("modalBadge");
const modalTitle = document.getElementById("modalTitle");
const modalDescription = document.getElementById("modalDescription");
const modalOldPrice = document.getElementById("modalOldPrice");
const modalPrice = document.getElementById("modalPrice");
const modalAddBtn = document.getElementById("modalAddBtn");
const modalCartBtn = document.getElementById("modalCartBtn");
const galleryPrevBtn = document.getElementById("galleryPrevBtn");
const galleryNextBtn = document.getElementById("galleryNextBtn");

const navHomeBtn = document.getElementById("navHomeBtn");
const navOffersBtn = document.getElementById("navOffersBtn");
const navCategoriesBtn = document.getElementById("navCategoriesBtn");
const navCartBtn = document.getElementById("navCartBtn");

let products = [];
let activeCategory = "all";
let cart = JSON.parse(localStorage.getItem("xr_cart_v1") || "[]");
let currentModalProduct = null;
let currentModalImages = [];
let currentModalIndex = 0;

function normalizeProduct(docId, data) {
  const imageList = Array.isArray(data.images)
    ? data.images.filter(Boolean)
    : [];

  if (data.image && !imageList.length) {
    imageList.push(data.image);
  }

  return {
    id: docId,
    name: data.name || "منتج بدون اسم",
    price: Number(data.price || 0),
    oldPrice: Number(data.oldPrice || 0),
    category: data.category || "electronics",
    badge: data.badge || "منتج",
    description: data.description || "لا يوجد وصف لهذا المنتج.",
    images: imageList.length
      ? imageList
      : ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80"]
  };
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 1400);
}

function saveCart() {
  localStorage.setItem("xr_cart_v1", JSON.stringify(cart));
}

function openCart() {
  cartDrawer.classList.add("show");
  cartOverlay.classList.add("show");
}

function closeCart() {
  cartDrawer.classList.remove("show");
  cartOverlay.classList.remove("show");
}

function updateCartUI() {
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  cartCount.textContent = count;
  totalItems.textContent = count;

  if (!cart.length) {
    cartBody.innerHTML = '<div class="empty-cart">السلة فارغة حالياً</div>';
    return;
  }

  cartBody.innerHTML = "";

  cart.forEach((item) => {
    const el = document.createElement("div");
    el.className = "cart-item";
    el.innerHTML = `
      <div class="cart-item-top">
        <h4>${item.name}</h4>
        <strong>${item.price} ر.س</strong>
      </div>
      <p>العدد الحالي: ${item.qty}</p>
      <div class="cart-item-actions">
        <button class="qty-btn">+</button>
        <div class="qty-value">${item.qty}</div>
        <button class="qty-btn">-</button>
        <button class="remove-btn">حذف</button>
      </div>
    `;

    const buttons = el.querySelectorAll(".qty-btn");
    buttons[0].addEventListener("click", () => increaseQty(item.id));
    buttons[1].addEventListener("click", () => decreaseQty(item.id));
    el.querySelector(".remove-btn").addEventListener("click", () => removeItem(item.id));

    cartBody.appendChild(el);
  });
}

function addToCart(product) {
  const existing = cart.find((item) => item.id === product.id);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      qty: 1
    });
  }

  saveCart();
  updateCartUI();
  showToast("تمت إضافة المنتج");
}

function increaseQty(id) {
  const item = cart.find((i) => i.id === id);
  if (!item) return;
  item.qty += 1;
  saveCart();
  updateCartUI();
}

function decreaseQty(id) {
  const item = cart.find((i) => i.id === id);
  if (!item) return;
  item.qty -= 1;
  if (item.qty <= 0) {
    cart = cart.filter((i) => i.id !== id);
  }
  saveCart();
  updateCartUI();
}

function removeItem(id) {
  cart = cart.filter((i) => i.id !== id);
  saveCart();
  updateCartUI();
}

function renderModalThumbs(images) {
  modalThumbs.innerHTML = "";
  images.forEach((src, index) => {
    const btn = document.createElement("button");
    btn.className = "thumb-btn" + (index === currentModalIndex ? " active" : "");
    btn.innerHTML = `<img src="${src}" alt="صورة المنتج">`;
    btn.addEventListener("click", () => {
      currentModalIndex = index;
      updateMainModalImage();
    });
    modalThumbs.appendChild(btn);
  });
}

function updateMainModalImage() {
  if (!currentModalImages.length) return;
  modalImage.src = currentModalImages[currentModalIndex];
  modalThumbs.querySelectorAll(".thumb-btn").forEach((btn, index) => {
    btn.classList.toggle("active", index === currentModalIndex);
  });
  const multiple = currentModalImages.length > 1;
  galleryPrevBtn.style.display = multiple ? "grid" : "none";
  galleryNextBtn.style.display = multiple ? "grid" : "none";
}

function showPrevImage() {
  if (!currentModalImages.length) return;
  currentModalIndex = (currentModalIndex - 1 + currentModalImages.length) % currentModalImages.length;
  updateMainModalImage();
}

function showNextImage() {
  if (!currentModalImages.length) return;
  currentModalIndex = (currentModalIndex + 1) % currentModalImages.length;
  updateMainModalImage();
}

function openProductModal(product) {
  currentModalProduct = product;
  currentModalImages = product.images || [];
  currentModalIndex = 0;

  renderModalThumbs(currentModalImages);
  updateMainModalImage();

  modalTitle.textContent = product.name;
  modalBadge.textContent = product.badge || "منتج";
  modalDescription.textContent = product.description || "لا يوجد وصف لهذا المنتج.";
  modalPrice.textContent = `${product.price} ر.س`;
  modalOldPrice.textContent = product.oldPrice ? `${product.oldPrice} ر.س` : "";
  modalOldPrice.style.display = product.oldPrice ? "inline" : "none";

  productModal.classList.add("show");
  productOverlay.classList.add("show");
}

function closeProductModal() {
  productModal.classList.remove("show");
  productOverlay.classList.remove("show");
}

function buildProductCard(product) {
  const card = document.createElement("div");
  card.className = "product";

  card.innerHTML = `
    <div class="product-badge">${product.badge || "منتج"}</div>
    <div class="product-image">
      <img src="${product.images[0]}" alt="${product.name}">
    </div>
    <h3>${product.name}</h3>
    <div class="meta">${product.description || "لا يوجد وصف لهذا المنتج."}</div>
    <div class="price-row">
      ${product.oldPrice ? `<span class="old-price">${product.oldPrice} ر.س</span>` : ""}
      <div class="price">${product.price} ر.س</div>
    </div>
    <div class="product-actions">
      <button class="main-btn">أضف للطلب</button>
      <button class="sub-btn">عرض</button>
    </div>
  `;

  card.querySelector(".main-btn").addEventListener("click", () => addToCart(product));
  card.querySelector(".sub-btn").addEventListener("click", () => openProductModal(product));
  card.querySelector(".product-image").addEventListener("click", () => openProductModal(product));
  card.querySelector("h3").addEventListener("click", () => openProductModal(product));

  return card;
}

function renderOffers() {
  offersProducts.innerHTML = "";
  const offers = products.filter((p) => Number(p.oldPrice) > Number(p.price));
  if (!offers.length) {
    offersProducts.innerHTML = '<div class="empty-box">لا توجد عروض حالياً</div>';
    return;
  }
  offers.forEach((product) => {
    offersProducts.appendChild(buildProductCard(product));
  });
}

function renderProducts() {
  const term = searchInput.value.trim().toLowerCase();

  const filtered = products.filter((p) => {
    const matchCategory = activeCategory === "all" || p.category === activeCategory;
    const matchSearch =
      p.name.toLowerCase().includes(term) ||
      (p.description || "").toLowerCase().includes(term);
    return matchCategory && matchSearch;
  });

  productsContainer.innerHTML = "";

  if (!filtered.length) {
    productsContainer.innerHTML = '<div class="empty-box">لا توجد منتجات مطابقة حالياً</div>';
    searchStatus.textContent = "لم يتم العثور على نتائج";
    return;
  }

  filtered.forEach((p) => productsContainer.appendChild(buildProductCard(p)));
  searchStatus.textContent = `يعرض ${filtered.length} منتج`;
}

function goToSection(id) {
  document.getElementById(id).scrollIntoView({ behavior: "smooth" });
}

function initEvents() {
  themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
  });

  searchBtn.addEventListener("click", () => {
    searchInput.focus();
    renderProducts();
  });

  searchInput.addEventListener("input", renderProducts);

  heroShopBtn.addEventListener("click", () => goToSection("productsSection"));
  heroCartBtn.addEventListener("click", openCart);
  openCartBtn.addEventListener("click", openCart);
  navCartBtn.addEventListener("click", openCart);

  closeCartBtn.addEventListener("click", closeCart);
  cartOverlay.addEventListener("click", closeCart);

  closeProductBtn.addEventListener("click", closeProductModal);
  productOverlay.addEventListener("click", closeProductModal);

  galleryPrevBtn.addEventListener("click", showPrevImage);
  galleryNextBtn.addEventListener("click", showNextImage);

  navHomeBtn.addEventListener("click", () => goToSection("homeSection"));
  navOffersBtn.addEventListener("click", () => goToSection("offersSection"));
  navCategoriesBtn.addEventListener("click", () => goToSection("categoriesSection"));

  modalAddBtn.addEventListener("click", () => {
    if (currentModalProduct) addToCart(currentModalProduct);
  });

  modalCartBtn.addEventListener("click", () => {
    closeProductModal();
    openCart();
  });

  orderBtn.addEventListener("click", () => {
    if (!cart.length) {
      showToast("السلة فارغة");
      return;
    }
    showToast("السلة جاهزة، أضف لاحقاً ربط واتساب أو صفحة طلب");
  });

  categoryButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      categoryButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeCategory = btn.dataset.category;
      renderProducts();
    });
  });

  document.addEventListener("keydown", (e) => {
    if (!productModal.classList.contains("show")) return;
    if (e.key === "ArrowLeft") showNextImage();
    if (e.key === "ArrowRight") showPrevImage();
  });
}

function listenProducts() {
  const productsRef = query(collection(db, "products"), orderBy("name"));
  onSnapshot(
    productsRef,
    (snapshot) => {
      products = snapshot.docs.map((doc) => normalizeProduct(doc.id, doc.data()));
      renderOffers();
      renderProducts();
    },
    (error) => {
      console.error(error);
      searchStatus.textContent = "فشل تحميل المنتجات من Firebase";
      productsContainer.innerHTML = '<div class="empty-box">حدث خطأ أثناء جلب المنتجات. تأكد من قواعد Firestore وأن الملفات مرفوعة بشكل صحيح.</div>';
    }
  );
}

initEvents();
updateCartUI();
listenProducts();
