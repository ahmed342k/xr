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

if (mainImageInput) {
  const eventName = isFileInput(mainImageInput) ? "change" : "input";
  mainImageInput.addEventListener(eventName, renderPreview);
}

if (moreImagesInput) {
  const eventName = isFileInput(moreImagesInput) ? "change" : "input";
  moreImagesInput.addEventListener(eventName, renderPreview);
}

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

  if (!name || !price) {
    alert("اكتب اسم المنتج والسعر");
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "جاري الرفع والحفظ...";

  try {
    const images = await collectImages();

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
