/**
 * posts.js — Blog post data management module
 * Loads posts from data/posts.json and exposes helper functions
 */

// ─── Post Store ──────────────────────────────────────────────
let ALL_POSTS = [];

/**
 * Load posts from JSON file.
 * Returns a Promise that resolves to the posts array.
 */
async function loadPosts() {
  if (ALL_POSTS.length > 0) return ALL_POSTS; // cached

  try {
    // 1. Load static posts from JSON
    const response = await fetch('data/posts.json');
    if (!response.ok) throw new Error('Failed to load local posts');
    const staticPosts = await response.json();

    // 2. Load dynamic posts from Firestore
    let dynamicPosts = [];
    try {
      const { db, collection, getDocs, query, orderBy } = await import('./auth.js');
      const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        dynamicPosts.push({ id: doc.id, ...doc.data() });
      });
    } catch (firebaseErr) {
      console.warn('Firestore load failed (likely not initialized yet):', firebaseErr);
    }

    // Combine and set globally
    ALL_POSTS = [...dynamicPosts, ...staticPosts];
    return ALL_POSTS;
  } catch (err) {
    console.error('Error loading posts:', err);
    return [];
  }
}

/**
 * Get a single post by its ID (supports numeric local IDs and string Firestore IDs).
 * @param {number|string} id
 */
function getPostById(id) {
  // Try exact match first (works for Firestore strings and matching types)
  let post = ALL_POSTS.find(p => p.id === id);
  if (post) return post;

  // Fallback: Try numeric conversion for static JSON posts
  return ALL_POSTS.find(p => String(p.id) === String(id)) || null;
}

/**
 * Get all posts matching a given category (case-insensitive).
 * @param {string} category — pass 'all' to return everything
 */
function getPostsByCategory(category) {
  if (!category || category.toLowerCase() === 'all') return ALL_POSTS;
  return ALL_POSTS.filter(p => p.category.toLowerCase() === category.toLowerCase());
}

/**
 * Get the N most recent posts, excluding a specific post ID.
 * @param {number} n
 * @param {number} excludeId
 */
function getRecentPosts(n = 5, excludeId = null) {
  return ALL_POSTS
    .filter(p => String(p.id) !== String(excludeId))
    .sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO))
    .slice(0, n);
}

/**
 * Get featured posts.
 */
function getFeaturedPosts() {
  return ALL_POSTS.filter(p => p.featured);
}

/**
 * Get all unique categories with post counts.
 * Returns: [{ name, count }]
 */
function getCategoryCounts() {
  const counts = {};
  ALL_POSTS.forEach(p => {
    counts[p.category] = (counts[p.category] || 0) + 1;
  });
  return Object.entries(counts).map(([name, count]) => ({ name, count }));
}

/**
 * Get all unique tags across all posts.
 */
function getAllTags() {
  const tagSet = new Set();
  ALL_POSTS.forEach(p => p.tags?.forEach(t => tagSet.add(t)));
  return [...tagSet];
}

/**
 * Paginate an array of posts.
 * @param {Array} posts
 * @param {number} page — 1-indexed
 * @param {number} perPage
 */
function paginatePosts(posts, page = 1, perPage = 6) {
  const start = (page - 1) * perPage;
  return {
    posts: posts.slice(start, start + perPage),
    totalPages: Math.ceil(posts.length / perPage),
    currentPage: page,
    total: posts.length,
  };
}

/**
 * Render a post card HTML string.
 * @param {Object} post
 * @param {boolean} wide — if true, renders as the wide first card
 */
function renderPostCard(post) {
  const catClass = post.category.toLowerCase();
  return `
    <article class="post-card fade-in" onclick="window.location='post.html?id=${post.id}'" role="link" tabindex="0"
      aria-label="Read: ${post.title}" onkeypress="if(event.key==='Enter')window.location='post.html?id=${post.id}'">
      <div class="post-card-image">
        <img src="${post.image}" alt="${post.title}" loading="lazy" width="800" height="450">
        <div class="card-badges">
          <span class="post-card-badge badge badge-${catClass}">${post.category}</span>
          ${post.isPremium ? `<span class="post-card-badge badge-premium"><i data-lucide="lock" style="width:12px;height:12px"></i> Members Only</span>` : ''}
        </div>
      </div>
      <div class="post-card-body">
        <div class="post-card-meta">
          <time datetime="${post.dateISO}">${post.date}</time>
          <span class="meta-sep">·</span>
          <span>${post.readTime}</span>
        </div>
        <h2 class="post-card-title">${post.title}</h2>
        <p class="post-card-excerpt">${post.excerpt}</p>
        <div class="post-card-footer">
          <div class="author-mini">
            <img src="${post.authorAvatar}" alt="${post.author}" width="28" height="28" loading="lazy">
            <span>${post.author}</span>
          </div>
          <span class="read-more-link">Read more →</span>
        </div>
      </div>
    </article>`;
}

/**
 * Render sidebar recent post list item.
 */
function renderRecentPostItem(post) {
  return `
    <div class="recent-post-item" onclick="window.location='post.html?id=${post.id}'" role="link" tabindex="0"
      aria-label="Read: ${post.title}" onkeypress="if(event.key==='Enter')window.location='post.html?id=${post.id}'">
      <img src="${post.image}" alt="${post.title}" class="recent-post-thumb" loading="lazy" width="64" height="64">
      <div class="recent-post-info">
        <h4 class="recent-post-title">${post.title}</h4>
        <span class="recent-post-date">${post.date}</span>
      </div>
    </div>`;
}

/**
 * Render pagination controls.
 * @param {number} currentPage
 * @param {number} totalPages
 * @param {Function} onPage — callback(pageNum)
 */
function renderPagination(currentPage, totalPages, onPage) {
  if (totalPages <= 1) return '';

  let html = '<nav class="pagination" aria-label="Page navigation">';

  // ← Previous
  html += `<button class="page-btn ${currentPage === 1 ? 'disabled' : ''}" 
    ${currentPage > 1 ? `onclick="(${onPage.toString()})(${currentPage - 1})"` : ''}
    aria-label="Previous page">‹</button>`;

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 || i === totalPages ||
      (i >= currentPage - 1 && i <= currentPage + 1)
    ) {
      html += `<button class="page-btn ${i === currentPage ? 'active' : ''}"
        onclick="(${onPage.toString()})(${i})" aria-label="Page ${i}" ${i === currentPage ? 'aria-current="page"' : ''}>${i}</button>`;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      html += `<span class="page-btn" style="pointer-events:none">…</span>`;
    }
  }

  // → Next
  html += `<button class="page-btn ${currentPage === totalPages ? 'disabled' : ''}"
    ${currentPage < totalPages ? `onclick="(${onPage.toString()})(${currentPage + 1})"` : ''}
    aria-label="Next page">›</button>`;

  html += '</nav>';
  return html;
}
