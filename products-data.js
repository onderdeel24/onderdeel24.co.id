/* ====== DATA BERSAMA: kategori, merek, dan produk ======
   Dipakai oleh script.js (etalase) dan admin.js (panel admin).

   PENTING: produk sekarang disimpan di database Supabase (bukan
   localStorage lagi), jadi perubahan yang dibuat admin akan langsung
   terlihat oleh SEMUA pengunjung situs, di perangkat mana pun.

   ====== WAJIB DIISI SEBELUM DIPAKAI ======
   1. Buat project gratis di https://supabase.com
   2. Buka SQL Editor di project itu, jalankan isi file supabase-setup.sql
      yang satu paket dengan file ini (bikin tabel "products").
   3. Buka Project Settings -> API, salin "Project URL" dan key
      "anon public", lalu tempel di dua variabel di bawah ini.
   Selengkapnya ada di CARA-SETUP-SUPABASE.md. */
(function (global) {
  "use strict";

  var SUPABASE_URL = "https://wmisvmqhwzobqafjrwka.supabase.co";
  var SUPABASE_ANON_KEY = "sb_publishable_L5BC0VjiI_NgxMeFBLAvYQ_zuJzRh8V";

  var TABLE = "products";
  var IMAGE_BUCKET = "product-images"; // bucket Supabase Storage (dibuat lewat supabase-foto-eksternal.sql)
  var supabase = null;

  function isConfigured() {
    return SUPABASE_URL.indexOf("GANTI_DENGAN") === -1 &&
           SUPABASE_ANON_KEY.indexOf("GANTI_DENGAN") === -1;
  }

  if (global.supabase && isConfigured()) {
    supabase = global.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else if (!global.supabase) {
    console.error("[ONDERDEEL24] Library Supabase belum termuat. Pastikan tag <script> supabase-js ada SEBELUM products-data.js di file HTML.");
  } else {
    console.warn("[ONDERDEEL24] Supabase belum dikonfigurasi. Isi SUPABASE_URL dan SUPABASE_ANON_KEY di bagian atas products-data.js.");
  }

  var CATS = [
    { id: "rem",                 name: "Rem"},
    { id: "oli",                 name: "Oli dan cairan" },
    { id: "filter",              name: "Filter" },
    { id: "kelistrikan",         name: "Aki dan lampu" },
    { id: "kampas",              name: "Kampas" },
    { id: "pengapian",           name: "Busi" },
    { id: "kopling",             name: "Kopling" }
  ];
  var CAT_BY_ID = {};
  CATS.forEach(function (c) { CAT_BY_ID[c.id] = c; });

  var MAKES = {
    "Toyota":     ["Avanza", "Kijang Innova", "Agya", "Rush"],
    "Daihatsu":   ["Xenia", "Sigra", "Ayla", "Terios"],
    "Honda":      ["Brio", "Jazz", "Mobilio"],
    "Mitsubishi": ["Xpander", "Pajero Sport"],
    "Suzuki":     ["Ertiga", "XL7"]
  };

  function notReady() {
    var err = new Error(
      !global.supabase
        ? "Library Supabase belum termuat."
        : "Supabase belum dikonfigurasi (isi SUPABASE_URL & SUPABASE_ANON_KEY di products-data.js)."
    );
    err.od24NotConfigured = true;
    return err;
  }

  /* Ambil semua produk dari Supabase, urut dari yang paling lama ditambahkan. */
  function fetchProducts() {
    if (!supabase) return Promise.reject(notReady());
    return supabase.from(TABLE).select("*").order("id", { ascending: true })
      .then(function (res) {
        if (res.error) throw res.error;
        return res.data || [];
      });
  }

  /* Tambah produk baru. data: {name, cat, tag, price, stock, fits} (tanpa id). */
  function addProduct(data) {
    if (!supabase) return Promise.reject(notReady());
    return supabase.from(TABLE).insert([data]).select().single()
      .then(function (res) {
        if (res.error) throw res.error;
        return res.data;
      });
  }

  /* Ubah produk yang sudah ada, dicari lewat id. */
  function updateProduct(id, data) {
    if (!supabase) return Promise.reject(notReady());
    return supabase.from(TABLE).update(data).eq("id", id).select().single()
      .then(function (res) {
        if (res.error) throw res.error;
        return res.data;
      });
  }

  /* Hapus produk lewat id. */
  function deleteProduct(id) {
    if (!supabase) return Promise.reject(notReady());
    return supabase.from(TABLE).delete().eq("id", id)
      .then(function (res) {
        if (res.error) throw res.error;
        return true;
      });
  }

  /* ====== UNGGAH FOTO PRODUK (penyimpanan eksternal: Supabase Storage) ======
     Foto TIDAK disimpan di folder situs. File diunggah ke bucket publik
     "product-images", lalu yang disimpan di kolom "image" produk hanyalah
     URL publiknya (https://...supabase.co/storage/v1/object/public/...).
     Mengembalikan Promise<string> berisi URL foto. */
  function uploadProductImage(file) {
    if (!supabase) return Promise.reject(notReady());
    var ext = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" })[file.type] || "jpg";
    var name = "produk/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
    return supabase.storage.from(IMAGE_BUCKET)
      .upload(name, file, { contentType: file.type, cacheControl: "31536000", upsert: false })
      .then(function (res) {
        if (res.error) throw res.error;
        var pub = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(name);
        return pub.data.publicUrl;
      });
  }

  /* ====== AUTENTIKASI ADMIN (Supabase Auth) ======
     Login sungguhan: hanya akun yang login lewat sini yang diizinkan
     database (lewat RLS policy di supabase-setup.sql) untuk menambah,
     mengubah, atau menghapus produk. Buat akunnya di dashboard Supabase,
     lihat CARA-SETUP-SUPABASE.md. */
  function signIn(email, password) {
    if (!supabase) return Promise.reject(notReady());
    return supabase.auth.signInWithPassword({ email: email, password: password })
      .then(function (res) {
        if (res.error) throw res.error;
        return res.data.session;
      });
  }

  function signOut() {
    if (!supabase) return Promise.resolve();
    return supabase.auth.signOut().then(function () { return true; });
  }

  /* Sesi yang sedang aktif (null kalau belum login). */
  function getSession() {
    if (!supabase) return Promise.resolve(null);
    return supabase.auth.getSession().then(function (res) { return res.data.session; });
  }

  /* cb dipanggil setiap kali status login berubah (login, logout, token diperbarui). */
  function onAuthChange(cb) {
    if (!supabase) return { unsubscribe: function () {} };
    var sub = supabase.auth.onAuthStateChange(function (_event, session) { cb(session); });
    return sub.data.subscription;
  }

  global.OD24_DATA = {
    CATS: CATS,
    CAT_BY_ID: CAT_BY_ID,
    MAKES: MAKES,
    isConfigured: isConfigured,
    fetchProducts: fetchProducts,
    addProduct: addProduct,
    updateProduct: updateProduct,
    deleteProduct: deleteProduct,
    uploadProductImage: uploadProductImage,
    signIn: signIn,
    signOut: signOut,
    getSession: getSession,
    onAuthChange: onAuthChange
  };
})(window);
