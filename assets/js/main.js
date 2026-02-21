/**
 * main.js — Core application logic
 * Handles: header behaviour, mobile nav, scroll effects,
 *           lazy loading, animations, newsletter form, etc.
 */

/* ─── DOM Utilities ─────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

/* ─── Mobile Navigation ─────────────────────────────────────── */
function initMobileNav() {
    const toggle = $('mobile-toggle');
    const mobileNav = $('mobile-nav');
    if (!toggle || !mobileNav) return;

    toggle.addEventListener('click', () => {
        const isOpen = mobileNav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', isOpen);
        toggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    });

    // Close when clicking outside
    document.addEventListener('click', e => {
        if (!toggle.contains(e.target) && !mobileNav.contains(e.target)) {
            mobileNav.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
        }
    });
}

/* ─── Scroll to Top Button ──────────────────────────────────── */
function initScrollTop() {
    const btn = $('scroll-top');
    if (!btn) return;

    const toggle = () => {
        btn.classList.toggle('visible', window.scrollY > 400);
    };

    window.addEventListener('scroll', toggle, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ─── Reading Progress Bar (post.html only) ─────────────────── */
function initReadingProgress() {
    const bar = $('reading-progress');
    if (!bar) return;

    window.addEventListener('scroll', () => {
        const docH = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const pct = docH > 0 ? (window.scrollY / docH) * 100 : 0;
        bar.style.width = pct + '%';
    }, { passive: true });
}

/* ─── Scroll-reveal Animations ──────────────────────────────── */
function initFadeIn() {
    const obs = new IntersectionObserver(
        entries => {
            entries.forEach(el => {
                if (el.isIntersecting) {
                    el.target.classList.add('visible');
                    obs.unobserve(el.target);
                }
            });
        },
        { threshold: 0.06, rootMargin: '0px 0px -30px 0px' }
    );
    $$('.fade-in').forEach(el => obs.observe(el));
}

/* Observe newly added dynamic elements */
function observeNewElements() {
    $$('.fade-in:not(.observed)').forEach(el => {
        el.classList.add('observed');
        // Force reflow so transition fires
        requestAnimationFrame(() => {
            el.classList.add('visible');
        });
    });
}

/* ─── Active Navigation Link ────────────────────────────────── */
function setActiveNav() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    $$('.nav-links a, .mobile-nav a').forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.includes(path)) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        }
    });
}

/* ─── Newsletter Form ───────────────────────────────────────── */
function initNewsletterForms() {
    $$('.newsletter-form').forEach(form => {
        form.addEventListener('submit', e => {
            e.preventDefault();
            const emailInput = form.querySelector('input[type="email"]');
            const btn = form.querySelector('button');
            if (!emailInput?.value.trim()) return;

            // Simulate async submission
            btn.textContent = 'Subscribing…';
            btn.disabled = true;

            setTimeout(() => {
                btn.textContent = '✓ Subscribed!';
                btn.style.background = '#D1FAE5';
                btn.style.color = '#065F46';
                emailInput.value = '';
                setTimeout(() => {
                    btn.textContent = 'Subscribe →';
                    btn.disabled = false;
                    btn.style.background = '';
                    btn.style.color = '';
                }, 3000);
            }, 1000);
        });
    });
}

/* ─── Contact Form ──────────────────────────────────────────── */
function initContactForm() {
    const form = $('contact-form');
    const success = $('form-success');
    if (!form) return;

    form.addEventListener('submit', e => {
        e.preventDefault();
        const submitBtn = form.querySelector('[type="submit"]');
        submitBtn.textContent = 'Sending…';
        submitBtn.disabled = true;

        setTimeout(() => {
            if (success) success.classList.add('show');
            form.reset();
            submitBtn.textContent = 'Send Message';
            submitBtn.disabled = false;
        }, 1200);
    });
}

/* ─── Copy Link (Share bar) ─────────────────────────────────── */
function initShareBar() {
    const copyBtn = $('share-copy');
    if (!copyBtn) return;

    copyBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            copyBtn.textContent = '✓';
            copyBtn.title = 'Copied!';
            setTimeout(() => {
                copyBtn.innerHTML = '🔗';
                copyBtn.title = 'Copy link';
            }, 2000);
        } catch {
            copyBtn.title = 'Could not copy';
        }
    });
}

/* ─── Header Shadow on Scroll ───────────────────────────────── */
function initHeaderScroll() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    window.addEventListener('scroll', () => {
        header.style.boxShadow = window.scrollY > 10
            ? '0 2px 20px rgba(0,0,0,.08)'
            : 'var(--shadow-sm)';
    }, { passive: true });
}

/* ─── Lazy Load Images (native + fallback) ──────────────────── */
function initLazyImages() {
    if ('loading' in HTMLImageElement.prototype) return; // native support

    const lazyImages = $$('img[loading="lazy"]');
    if (!lazyImages.length) return;

    const obs = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) { img.src = img.dataset.src; }
                obs.unobserve(img);
            }
        });
    }, { rootMargin: '200px 0px' });

    lazyImages.forEach(img => obs.observe(img));
}

/* ─── Index page: Render posts grid ────────────────────────── */
async function renderPostsGrid() {
    const grid = $('posts-grid');
    if (!grid) return;

    // Show loading state
    grid.innerHTML = '<div class="no-results"><div class="icon">⌛</div><h3>Loading posts…</h3></div>';

    await loadPosts();

    const filtered = filterPosts(ALL_POSTS);
    const { posts, totalPages, currentPage } = paginatePosts(
        filtered,
        SearchState.currentPage,
        SearchState.postsPerPage
    );

    if (posts.length === 0) {
        grid.innerHTML = `
      <div class="no-results">
        <div class="icon">🔍</div>
        <h3>No posts found</h3>
        <p>Try a different keyword or category.</p>
      </div>`;
        $('pagination-wrap').innerHTML = '';
        return;
    }

    grid.innerHTML = posts.map(renderPostCard).join('');

    // Pagination
    const paginationWrap = $('pagination-wrap');
    if (paginationWrap) {
        paginationWrap.innerHTML = renderPagination(currentPage, totalPages, page => {
            SearchState.currentPage = page;
            renderPostsGrid();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Animate cards in
    observeNewElements();

    // Initialize icons
    if (window.lucide) lucide.createIcons();
}

/* ─── Index page: Render sidebar ───────────────────────────── */
async function renderSidebar() {
    await loadPosts();

    // Recent posts
    const recentList = $('sidebar-recent');
    if (recentList) {
        const recent = getRecentPosts(5);
        recentList.innerHTML = recent.map(renderRecentPostItem).join('');
    }

    // Category counts
    const catList = $('sidebar-cats');
    if (catList) {
        const cats = getCategoryCounts();
        const allCount = ALL_POSTS.length;
        catList.innerHTML = `
      <div class="cat-pill" onclick="filterByCategory('all')">
        <span>All Posts</span>
        <span class="cat-count">${allCount}</span>
      </div>` +
            cats.map(c => `
      <div class="cat-pill" onclick="filterByCategory('${c.name}')">
        <span>${c.name}</span>
        <span class="cat-count">${c.count}</span>
      </div>`).join('');
    }

    // Tags cloud
    const tagsWrap = $('sidebar-tags');
    if (tagsWrap) {
        const tags = getAllTags();
        tagsWrap.innerHTML = tags.map(t =>
            `<span class="tag-chip" onclick="filterByTag('${t}')">${t}</span>`
        ).join('');
    }

    // Initialize icons
    if (window.lucide) lucide.createIcons();
}

/* Helper called from sidebar category click */
function filterByCategory(cat) {
    SearchState.category = cat;
    SearchState.currentPage = 1;
    // Update active state on category buttons
    $$('.cat-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.cat === cat);
    });
    renderPostsGrid();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* Helper called from tag chip click */
function filterByTag(tag) {
    SearchState.query = tag;
    SearchState.currentPage = 1;
    const input = document.querySelector('.header-search input');
    if (input) input.value = tag;
    renderPostsGrid();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ─── Hero featured post (index.html) ──────────────────────── */
async function renderHeroFeatured() {
    const card = $('hero-featured');
    if (!card) return;
    await loadPosts();
    const featured = getFeaturedPosts()[0] || ALL_POSTS[0];
    if (!featured) return;

    card.innerHTML = `
    <div class="hero-featured-card" onclick="window.location='post.html?id=${featured.id}'"
      role="link" tabindex="0" aria-label="Read: ${featured.title}">
      <img src="${featured.image}" alt="${featured.title}" loading="lazy" width="800" height="280">
      <div class="hero-card-body">
        <div class="hero-card-meta">
          <span class="badge badge-${featured.category.toLowerCase()}">${featured.category}</span>
          <span>${featured.date}</span>
          <span>·</span>
          <span>${featured.readTime}</span>
        </div>
        <h3 class="hero-card-title">${featured.title}</h3>
      </div>
    </div>`;

    // Initialize icons
    if (window.lucide) lucide.createIcons();
}

/* ─── Single post page (post.html) ─────────────────────────── */
async function renderSinglePost() {
    const postContent = $('post-content');
    if (!postContent) return;

    await loadPosts();
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const post = getPostById(id);

    if (!post) {
        window.location.href = '404.html';
        return;
    }

    // Update <title> and meta
    document.title = `${post.title} | The Pulse Blog`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = post.excerpt;

    // OG tags
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', post.title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', post.excerpt);
    document.querySelector('meta[property="og:image"]')?.setAttribute('content', post.imageFull);

    const catClass = post.category.toLowerCase();

    // Check if current user is the author
    let adminHtml = '';
    const { auth, db, doc, deleteDoc } = await import('./auth.js');
    if (auth.currentUser && String(auth.currentUser.uid) === String(post.authorId)) {
        adminHtml = `
            <div class="admin-actions">
                <a href="create-post.html?edit=${post.id}" class="btn btn-edit"><i data-lucide="edit-3"></i> Edit Post</a>
                <button class="btn btn-delete" id="delete-post-btn"><i data-lucide="trash-2"></i> Delete Post</button>
            </div>
        `;
    }

    postContent.innerHTML = `
    <!-- Admin Actions -->
    ${adminHtml}
    
    <!-- Breadcrumb -->
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="index.html">Home</a>
      <span class="breadcrumb-sep"><i data-lucide="chevron-right"></i></span>
      <a href="index.html?cat=${post.category}">${post.category}</a>
      <span class="breadcrumb-sep"><i data-lucide="chevron-right"></i></span>
      <span>${post.title}</span>
    </nav>

    <header class="post-header">
      <span class="badge badge-${catClass}">${post.category}</span>
      <h1 class="post-main-title">${post.title}</h1>
      <div class="post-meta-bar">
        <div class="author-meta">
          <img src="${post.authorAvatar}" alt="${post.author}" width="40" height="40">
          <div>
            <strong>${post.author}</strong>
          </div>
        </div>
        <span class="meta-sep">·</span>
        <time datetime="${post.dateISO}">${post.date}</time>
        <span class="meta-sep">·</span>
        <span class="read-time"><i data-lucide="clock"></i> ${post.readTime}</span>
      </div>
    </header>

    <figure class="post-cover">
      <img src="${post.imageFull || post.image}" alt="${post.title}" loading="eager" width="1200" height="600">
    </figure>

    <div class="article-body">
      ${post.content}
    </div>

    <div class="post-tags">
      <h4 class="post-tag-label">Tags:</h4>
      <div class="tags-cloud">
        ${(post.tags || []).map(t => `<span class="tag-chip">${t}</span>`).join('')}
      </div>
    </div>

    <div class="share-bar">
      <span class="share-label">Share this article:</span>
      <a class="share-btn" href="https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(post.title)}" target="_blank" rel="noopener noreferrer" aria-label="Share on Twitter"><i data-lucide="twitter"></i></a>
      <a class="share-btn" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}" target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook"><i data-lucide="facebook"></i></a>
      <a class="share-btn" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}" target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn"><i data-lucide="linkedin"></i></a>
      <button class="share-btn" id="share-copy" aria-label="Copy link"><i data-lucide="link"></i></button>
    </div>

    <!-- Author Card -->
    <div class="author-card">
      <img src="${post.authorAvatar}" alt="${post.author}" class="author-avatar-large">
      <div class="author-details">
        <h3>About ${post.author}</h3>
        <p>A passionate writer and expert in ${post.category}. Bringing you the latest insights and deep-dives from around the world.</p>
        <div class="author-socials">
          <a href="#"><i data-lucide="globe"></i></a>
          <a href="#"><i data-lucide="twitter"></i></a>
          <a href="#"><i data-lucide="mail"></i></a>
        </div>
      </div>
    </div>
    `;

    // Render sidebar recent posts
    const sidebarRecent = $('post-sidebar-recent');
    if (sidebarRecent) {
        const recent = getRecentPosts(5, post.id);
        sidebarRecent.innerHTML = recent.map(renderRecentPostItem).join('');
    }

    // Init share functionality
    initShareBar();
    observeNewElements();

    // Delete post logic
    const deleteBtn = document.getElementById('delete-post-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete this post? This cannot be undone.')) {
                try {
                    const { db, doc, deleteDoc } = await import('./auth.js');
                    await deleteDoc(doc(db, 'posts', post.id));
                    alert('Post deleted successfully.');
                    window.location.href = 'index.html';
                } catch (err) {
                    console.error('Delete failed:', err);
                    alert('Failed to delete post.');
                }
            }
        });
    }

    // Initialize icons
    if (window.lucide) lucide.createIcons();
}

/* ─── App Init ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
    // Universal inits
    initMobileNav();
    initScrollTop();
    initReadingProgress();
    initFadeIn();
    setActiveNav();
    initNewsletterForms();
    initContactForm();
    initHeaderScroll();
    initLazyImages();
    if (typeof initSearchOverlay === 'function') initSearchOverlay();
    if (typeof initIndexFilters === 'function') initIndexFilters();

    // Page-specific inits
    const page = window.location.pathname.split('/').pop() || 'index.html';

    if (page === 'index.html' || page === '' || page === '/') {
        await Promise.all([
            renderHeroFeatured(),
            renderPostsGrid(),
            renderSidebar(),
        ]);
    }

    if (page === 'post.html') {
        await renderSinglePost();
    }
});
