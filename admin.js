(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function rp(n) { return "Rp " + Number(n).toLocaleString("id-ID"); }

  var toastTimer;
  function toast(msg) {
    var t = $("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }

  function friendlyError(err) {
    if (err && err.od24NotConfigured) return err.message;
    if (err && err.message === "Invalid login credentials") return "Email atau kata sandi salah.";
    if (err && err.message) return err.message;
    return "Terjadi kesalahan tak terduga.";
  }

  var OD = window.OD24_DATA;
  var products = [];

  /* ====== GERBANG LOGIN (Supabase Auth sungguhan) ====== */
  var checking = $("admin-checking"), gate = $("admin-gate"), panel = $("admin-panel");
  function showChecking() { checking.hidden = false; gate.hidden = true; panel.hidden = true; }
  function showGate() { checking.hidden = true; gate.hidden = false; panel.hidden = true; }
  function showPanel() {
    checking.hidden = true;
    gate.hidden = true;
    panel.hidden = false;
    loadAndRenderList();
  }

  showChecking();
  OD.getSession().then(function (session) {
    if (session) showPanel(); else showGate();
  }).catch(function (err) {
    console.error(err);
    showGate();
  });

  var gateForm = $("gate-form"), gateSubmit = $("gate-submit");
  gateForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = $("gate-email").value.trim();
    var pass = $("gate-pass").value;
    gateSubmit.disabled = true;
    gateSubmit.textContent = "Memeriksa…";
    OD.signIn(email, pass).then(function () {
      $("gate-error").hidden = true;
      showPanel();
    }).catch(function (err) {
      console.error(err);
      $("gate-error").textContent = friendlyError(err);
      $("gate-error").hidden = false;
      $("gate-pass").value = "";
      $("gate-pass").focus();
    }).finally(function () {
      gateSubmit.disabled = false;
      gateSubmit.textContent = "Masuk";
    });
  });

  $("admin-logout").addEventListener("click", function () {
    OD.signOut().then(showGate);
  });

  $("admin-reset").addEventListener("click", function () {
    loadAndRenderList();
  });

  OD.onAuthChange(function (session) {
    if (!session && panel.hidden === false) {
      showGate();
    }
  });

  /* ====== BANTUAN "COCOK UNTUK MOBIL" ====== */
  function fitsToText(fits) {
    if (!fits) return "";
    return fits.map(function (f) { return f[0] + " - " + f[1]; }).join("\n");
  }
  function textToFits(text) {
    var lines = text.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
    if (!lines.length) return null;
    return lines.map(function (l) {
      var parts = l.split(" - ");
      var make = (parts[0] || "").trim();
      var model = (parts.slice(1).join(" - ") || "").trim();
      return [make, model || "Semua tipe"];
    });
  }
  function fitSummary(fits) {
    if (!fits) return "Cocok untuk banyak mobil";
    return fits.map(function (f) { return f[0] + " " + f[1]; }).join(", ");
  }

  /* ====== FORM TAMBAH / EDIT ====== */
  var catSel = $("f-cat");
  catSel.innerHTML = OD.CATS.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join("");

  var form = $("product-form"), formTitle = $("form-title"), submitBtn = $("form-submit"), cancelBtn = $("form-cancel");
  var submitBtnDefaultText = submitBtn.textContent;

  /* Pratinjau foto: cari elemen #f-image-preview di HTML (opsional).
     Kalau elemen ini tidak ada di HTML, kode ini tidak melakukan apa-apa
     dan tidak akan error. */
  var imageInput = $("f-image");
  var imagePreview = $("f-image-preview");

  function updateImagePreview() {
    if (!imagePreview) return;
    var src = imageInput ? imageInput.value.trim() : "";
    if (src) {
      imagePreview.src = src;
      imagePreview.style.display = "block";
      imagePreview.onerror = function () {
        imagePreview.style.display = "none";
      };
    } else {
      imagePreview.style.display = "none";
      imagePreview.removeAttribute("src");
    }
  }
  if (imageInput) {
    imageInput.addEventListener("input", updateImagePreview);
  }

  function resetForm() {
    form.reset();
    $("f-index").value = "-1";
    formTitle.textContent = "Tambah produk baru";
    submitBtn.textContent = "Tambah produk";
    submitBtnDefaultText = "Tambah produk";
    cancelBtn.hidden = true;
    updateImagePreview();
  }

  function fillFormForEdit(i) {
    var p = products[i];
    $("f-index").value = String(i);
    $("f-name").value = p.name;
    $("f-cat").value = p.cat;
    $("f-tag").value = p.tag;
    $("f-price").value = p.price;
    $("f-stock").value = p.stock || 0;
    $("f-fits").value = fitsToText(p.fits);
    if (imageInput) imageInput.value = p.image || "";
    formTitle.textContent = "Ubah produk";
    submitBtn.textContent = "Simpan perubahan";
    submitBtnDefaultText = "Simpan perubahan";
    cancelBtn.hidden = false;
    updateImagePreview();
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  cancelBtn.addEventListener("click", resetForm);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var idx = parseInt($("f-index").value, 10);
    var data = {
      name: $("f-name").value.trim(),
      cat: $("f-cat").value,
      tag: $("f-tag").value,
      price: Math.max(0, parseInt($("f-price").value, 10) || 0),
      stock: Math.max(0, parseInt($("f-stock").value, 10) || 0),
      fits: textToFits($("f-fits").value),
      image: imageInput ? (imageInput.value.trim() || null) : undefined
    };
    if (!data.name) { $("f-name").focus(); return; }
    if (data.image === undefined) delete data.image;

    submitBtn.disabled = true;
    submitBtn.textContent = "Menyimpan…";

    var task = (idx === -1)
      ? OD.addProduct(data).then(function (saved) { products.push(saved); toast("Produk ditambahkan"); })
      : OD.updateProduct(products[idx].id, data).then(function (saved) { products[idx] = saved; toast("Perubahan disimpan"); });

    task.then(function () {
      resetForm();
      renderList();
    }).catch(function (err) {
      console.error(err);
      toast("Gagal menyimpan: " + friendlyError(err));
    }).finally(function () {
      submitBtn.disabled = false;
      submitBtn.textContent = submitBtnDefaultText;
    });
  });

  /* ====== MUAT DATA DARI SUPABASE ====== */
  function loadAndRenderList() {
    var listEl = $("admin-list");
    $("admin-count").textContent = "Memuat…";
    listEl.innerHTML = '<p style="color:var(--muted);">Memuat produk dari database…</p>';
    OD.fetchProducts().then(function (list) {
      products = list;
      renderList();
    }).catch(function (err) {
      console.error(err);
      $("admin-count").textContent = "";
      listEl.innerHTML = '<p style="color:var(--orange-btn); font-weight:700;">Gagal memuat produk: ' + esc(friendlyError(err)) + '</p>' +
        '<p style="color:var(--muted);">Periksa apakah SUPABASE_URL dan SUPABASE_ANON_KEY di products-data.js sudah diisi, dan tabel "products" sudah dibuat lewat supabase-setup.sql.</p>';
    });
  }

  /* ====== DAFTAR PRODUK ====== */
  function renderList() {
    $("admin-count").textContent = products.length + " produk di katalog";
    var listEl = $("admin-list");
    if (!products.length) {
      listEl.innerHTML = '<p style="color:var(--muted);">Belum ada produk. Tambahkan lewat form di sebelah kiri.</p>';
      return;
    }
    listEl.innerHTML = products.map(function (p, i) {
      var out = (p.stock || 0) <= 0;
      var thumb = p.image
        ? '<img src="' + esc(p.image) + '" alt="" class="admin-thumb" onerror="this.style.visibility=\'hidden\'">'
        : '<div class="admin-thumb admin-thumb-empty"></div>';
      return '<div class="admin-row ' + (out ? "out" : "") + '">' +
        '<div class="admin-row-main">' +
          thumb +
          '<div class="admin-row-text">' +
            '<strong>' + esc(p.name) + '</strong>' +
            '<span class="muted">' + esc(OD.CAT_BY_ID[p.cat] ? OD.CAT_BY_ID[p.cat].name : p.cat) + ' &middot; ' + esc(p.tag) + ' &middot; ' + rp(p.price) + '</span>' +
            '<span class="muted">Stok: ' + (p.stock || 0) + (out ? " (habis)" : "") + ' &middot; ' + esc(fitSummary(p.fits)) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="admin-row-actions">' +
          '<button class="btn ghost sm" type="button" data-edit="' + i + '">Edit</button>' +
          '<button class="btn danger sm" type="button" data-del="' + i + '">Hapus</button>' +
        '</div></div>';
    }).join("");
  }

  $("admin-list").addEventListener("click", function (e) {
    var editBtn = e.target.closest("[data-edit]");
    var delBtn = e.target.closest("[data-del]");
    if (editBtn) {
      fillFormForEdit(parseInt(editBtn.dataset.edit, 10));
    } else if (delBtn) {
      var i = parseInt(delBtn.dataset.del, 10);
      var p = products[i];
      if (!confirm('Hapus produk "' + p.name + '" dari katalog? Ini akan langsung terhapus untuk semua pengunjung.')) return;
      delBtn.disabled = true;
      delBtn.textContent = "Menghapus…";
      OD.deleteProduct(p.id).then(function () {
        products.splice(i, 1);
        toast("Produk dihapus");
        resetForm();
        renderList();
      }).catch(function (err) {
        console.error(err);
        toast("Gagal menghapus: " + friendlyError(err));
        delBtn.disabled = false;
        delBtn.textContent = "Hapus";
      });
    }
  });
})();