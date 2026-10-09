// Konfigurasi API dengan Fallback Aman
const CONFIG = window.CONFIG || {
  API_BASE_URL: 'http://localhost/stockopname/api'
};

// State Aplikasi Menu Cafe Sederhana
let state = {
  menuList: [],
  filteredList: [],
  categories: [],
  activeCategory: 'all',
  searchQuery: '',
  cart: {}, // { [kode_menu]: { item, qty } }
  isLoading: true
};

// Fallback Icon Emoji berdasarkan kategori / nama menu
function getCategoryIcon(kategori, nama = '') {
  const n = (nama + ' ' + kategori).toLowerCase();
  if (n.includes('kopi') || n.includes('espresso') || n.includes('latte') || n.includes('macchiato')) return '☕';
  if (n.includes('matcha') || n.includes('tea') || n.includes('teh')) return '🍵';
  if (kategori === 'minuman') return '🥤';
  if (n.includes('nasi') || n.includes('curry') || n.includes('ayam') || n.includes('katsu')) return '🍛';
  if (kategori === 'makanan') return '🍽️';
  if (n.includes('fries') || n.includes('kentang') || kategori === 'snack') return '🍟';
  if (n.includes('croissant') || n.includes('cake') || kategori === 'dessert') return '🥐';
  return '✨';
}

// Inisialisasi Aplikasi
document.addEventListener('DOMContentLoaded', () => {
  loadSavedCart();
  fetchCategories();
  fetchMenu();
  setupEventListeners();
});

// 1. Ambil Kategori dari API
async function fetchCategories() {
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/kategori`);
    if (res.ok) {
      const data = await res.json();
      state.categories = data.data || [];
      renderCategoryBar();
    }
  } catch (err) {
    state.categories = [
      { id: 'all', nama: 'Semua' },
      { id: 'minuman', nama: 'Minuman' },
      { id: 'makanan', nama: 'Makanan' },
      { id: 'snack', nama: 'Snack' },
      { id: 'dessert', nama: 'Dessert' }
    ];
    renderCategoryBar();
  }
}

// Render Tombol Kategori
function renderCategoryBar() {
  const container = document.getElementById('category-bar');
  container.innerHTML = '';

  state.categories.forEach(cat => {
    const pill = document.createElement('button');
    pill.className = `cat-pill ${state.activeCategory === cat.id ? 'active' : ''}`;
    pill.dataset.cat = cat.id;

    let icon = '🍴';
    if (cat.id === 'all') icon = '⭐';
    else if (cat.id === 'minuman') icon = '☕';
    else if (cat.id === 'makanan') icon = '🍛';
    else if (cat.id === 'snack') icon = '🍟';
    else if (cat.id === 'dessert') icon = '🥐';

    pill.innerHTML = `<span>${icon}</span> <span>${cat.nama}</span>`;
    pill.addEventListener('click', () => {
      state.activeCategory = cat.id;
      renderCategoryBar();
      filterMenu();
    });
    container.appendChild(pill);
  });
}

// 2. Ambil Menu dari Backend API
async function fetchMenu() {
  state.isLoading = true;
  renderLoadingSkeleton();

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/menu`);
    if (!res.ok) throw new Error('Network error');
    const json = await res.json();
    state.menuList = json.data || [];
  } catch (err) {
    console.error('Error fetching menu:', err);
    showApiErrorBanner();
  } finally {
    state.isLoading = false;
    filterMenu();
  }
}

function renderLoadingSkeleton() {
  const container = document.getElementById('menu-container');
  container.innerHTML = `
    <div style="background:#fff; height:240px; border-radius:16px; margin-bottom:16px; opacity:0.6; animation:pulse 1.5s infinite;"></div>
    <div style="background:#fff; height:240px; border-radius:16px; opacity:0.6; animation:pulse 1.5s infinite;"></div>
  `;
}

function showApiErrorBanner() {
  const container = document.getElementById('menu-container');
  container.innerHTML = `
    <div style="text-align: center; padding: 40px 20px; background: #fff; border-radius: 16px; border: 1px dashed #e2dcd5;">
      <div style="font-size: 2.5rem; margin-bottom: 10px;">⚠️</div>
      <h3 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 6px;">Koneksi ke Server Terputus</h3>
      <p style="font-size: 0.85rem; color: #78716c; margin-bottom: 16px;">
        Pastikan backend CodeIgniter 3 aktif di <code>${CONFIG.API_BASE_URL}</code>.
      </p>
      <button onclick="fetchMenu()" style="background: var(--primary); color: #fff; border: none; padding: 8px 20px; border-radius: 99px; font-weight: 700; cursor: pointer;">
        Muat Ulang Menu
      </button>
    </div>
  `;
}

// 3. Filter Menu (Kategori & Pencarian)
function filterMenu() {
  let list = [...state.menuList];

  if (state.activeCategory !== 'all') {
    list = list.filter(item => item.kategori.toLowerCase() === state.activeCategory.toLowerCase());
  }

  if (state.searchQuery.trim() !== '') {
    const q = state.searchQuery.toLowerCase();
    list = list.filter(item => 
      item.nama_menu.toLowerCase().includes(q) || 
      (item.deskripsi && item.deskripsi.toLowerCase().includes(q))
    );
  }

  state.filteredList = list;
  renderMenuList();
}

// 4. Render Daftar Menu (1 Kolom dengan Gambar Besar)
function renderMenuList() {
  const container = document.getElementById('menu-container');
  const countEl = document.getElementById('menu-count');
  countEl.textContent = `${state.filteredList.length} menu`;

  if (state.filteredList.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: #78716c;">
        <div style="font-size: 2.2rem; margin-bottom: 8px;">🔍</div>
        <p style="font-weight: 700;">Menu tidak ditemukan</p>
        <small>Coba pilih kategori lain atau hapus kata pencarian</small>
      </div>
    `;
    return;
  }

  container.innerHTML = state.filteredList.map(item => {
    const isSoldOut = item.status === 'habis';
    const inCartQty = state.cart[item.kode_menu] ? state.cart[item.kode_menu].qty : 0;
    const formattedPrice = formatRupiah(item.harga);
    const fallbackIcon = getCategoryIcon(item.kategori, item.nama_menu);

    // Hero Image Besar
    let imgHeroHtml = '';
    if (item.gambar) {
      imgHeroHtml = `
        <div class="card-img-hero" onclick="openLightbox('${item.gambar}', '${escapeHtml(item.nama_menu)} - ${formattedPrice}')">
          <img src="${item.gambar}" alt="${escapeHtml(item.nama_menu)}" loading="lazy">
          <div class="category-tag-badge">${item.kategori}</div>
          <div class="zoom-hint-badge">🔍 Perbesar</div>
          ${isSoldOut ? '<div class="sold-out-overlay">Habis (Sold Out)</div>' : ''}
        </div>
      `;
    } else {
      imgHeroHtml = `
        <div class="card-img-hero" style="background: #fbf7f2;">
          <div class="card-img-fallback">${fallbackIcon}</div>
          <div class="category-tag-badge">${item.kategori}</div>
          ${isSoldOut ? '<div class="sold-out-overlay">Habis (Sold Out)</div>' : ''}
        </div>
      `;
    }

    // Tombol Tambah / Counter
    let actionBtnHtml = '';
    if (isSoldOut) {
      actionBtnHtml = `<span style="font-size: 0.8rem; color: #a8a29e; font-weight: 800;">Stok Habis</span>`;
    } else if (inCartQty > 0) {
      actionBtnHtml = `
        <div class="qty-counter-main">
          <button class="btn-step" onclick="updateCart('${item.kode_menu}', -1)">−</button>
          <span class="qty-number">${inCartQty}</span>
          <button class="btn-step" onclick="updateCart('${item.kode_menu}', 1)">+</button>
        </div>
      `;
    } else {
      actionBtnHtml = `
        <button class="btn-add-main" onclick="updateCart('${item.kode_menu}', 1)">
          <span>+</span> Tambah
        </button>
      `;
    }

    return `
      <article class="menu-card-large ${isSoldOut ? 'sold-out' : ''}">
        ${imgHeroHtml}
        <div class="card-content">
          <div class="card-title-row">
            <h3 class="card-title">${escapeHtml(item.nama_menu)}</h3>
          </div>
          ${item.deskripsi ? `<p class="card-desc">${escapeHtml(item.deskripsi)}</p>` : ''}
          <div class="card-footer">
            <div class="card-price">${formattedPrice}</div>
            <div>${actionBtnHtml}</div>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// 5. Kelola Keranjang / Daftar Pesanan
function updateCart(kode_menu, delta) {
  const item = state.menuList.find(m => m.kode_menu === kode_menu);
  if (!item || item.status === 'habis') return;

  if (!state.cart[kode_menu]) {
    if (delta > 0) {
      state.cart[kode_menu] = { ...item, qty: delta };
    }
  } else {
    state.cart[kode_menu].qty += delta;
    if (state.cart[kode_menu].qty <= 0) {
      delete state.cart[kode_menu];
    }
  }

  saveCart();
  renderMenuList();
  updateBottomBar();
  renderReceiptModal();
}

function saveCart() {
  sessionStorage.setItem('cafe_simple_cart', JSON.stringify(state.cart));
}

function loadSavedCart() {
  const saved = sessionStorage.getItem('cafe_simple_cart');
  if (saved) {
    try {
      state.cart = JSON.parse(saved);
      updateBottomBar();
    } catch(e) {}
  }
}

function resetOrder() {
  if (confirm('Kosongkan daftar pesanan dan buat baru?')) {
    state.cart = {};
    saveCart();
    renderMenuList();
    updateBottomBar();
    closeOrderModal();
  }
}

// 6. Update Sticky Bar di Bawah Layar
function updateBottomBar() {
  const bar = document.getElementById('bottom-bar');
  const countEl = document.getElementById('bar-cart-count');
  const totalEl = document.getElementById('bar-total-price');

  const items = Object.values(state.cart);
  const totalCount = items.reduce((acc, curr) => acc + curr.qty, 0);
  const totalPrice = items.reduce((acc, curr) => acc + (curr.qty * curr.harga), 0);

  if (totalCount > 0) {
    bar.classList.remove('hidden');
    countEl.textContent = totalCount;
    totalEl.textContent = formatRupiah(totalPrice);
  } else {
    bar.classList.add('hidden');
  }
}

// 7. Modal Ringkasan Pesanan untuk Kasir
function openOrderModal() {
  const modal = document.getElementById('order-modal');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Set tanggal hari ini di nota
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('receipt-date').textContent = `${dateStr} • ${timeStr}`;

  renderReceiptModal();
}

function closeOrderModal() {
  const modal = document.getElementById('order-modal');
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

function renderReceiptModal() {
  const container = document.getElementById('receipt-items-list');
  const grandTotalEl = document.getElementById('receipt-grand-total');

  const items = Object.values(state.cart);

  if (items.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:#78716c; padding:20px 0;">Belum ada menu yang dipilih.</p>';
    grandTotalEl.textContent = 'Rp 0';
    return;
  }

  let totalBayar = 0;

  container.innerHTML = items.map(item => {
    const subtotal = item.qty * item.harga;
    totalBayar += subtotal;

    return `
      <div class="receipt-item-row">
        <div>
          <div class="receipt-item-title">${escapeHtml(item.nama_menu)}</div>
          <div class="receipt-item-sub">${formatRupiah(item.harga)} × ${item.qty}</div>
        </div>
        <div class="receipt-item-right">
          <div class="qty-counter-main" style="transform: scale(0.85);">
            <button class="btn-step" onclick="updateCart('${item.kode_menu}', -1)">−</button>
            <span class="qty-number">${item.qty}</span>
            <button class="btn-step" onclick="updateCart('${item.kode_menu}', 1)">+</button>
          </div>
          <div class="receipt-item-total">${formatRupiah(subtotal)}</div>
        </div>
      </div>
    `;
  }).join('');

  grandTotalEl.textContent = formatRupiah(totalBayar);
}

// 8. Lightbox Zoom Gambar
function openLightbox(imgSrc, captionText) {
  const lightbox = document.getElementById('lightbox-modal');
  const img = document.getElementById('lightbox-img');
  const caption = document.getElementById('lightbox-caption');

  img.src = imgSrc;
  caption.textContent = captionText || '';
  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox-modal');
  lightbox.classList.remove('active');
  document.body.style.overflow = '';
}

// 9. Event Listeners
function setupEventListeners() {
  // Search Input
  const searchInput = document.getElementById('search-input');
  const clearBtn = document.getElementById('clear-search');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      if (clearBtn) {
        clearBtn.style.display = state.searchQuery ? 'flex' : 'none';
      }
      filterMenu();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      state.searchQuery = '';
      clearBtn.style.display = 'none';
      filterMenu();
    });
  }

  // Close Order Modal on Backdrop Click
  const orderModal = document.getElementById('order-modal');
  orderModal.addEventListener('click', (e) => {
    if (e.target === orderModal) closeOrderModal();
  });

  // ESC key listener for modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLightbox();
      closeOrderModal();
    }
  });
}

// Helper Format Rupiah
function formatRupiah(num) {
  return 'Rp ' + Number(num).toLocaleString('id-ID');
}

// Helper Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
