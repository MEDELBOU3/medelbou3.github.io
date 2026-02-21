/**
 * search.js — Front-end search & category filtering module
 * Handles live search filtering of blog posts without page reload.
 * Works on index.html where the posts grid is rendered.
 */

// ─── State ────────────────────────────────────────────────────
const SearchState = {
    query: '',
    category: 'all',
    tag: '', // New property for tag filtering
    currentPage: 1,
    postsPerPage: 6,
};

/**
 * Normalize a string for fuzzy matching (lowercase, trim, collapse whitespace).
 */
function normalizeStr(s) {
    return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Score a post against the search query.
 * Returns a numeric relevance score (0 = no match).
 */
function scorePost(post, query) {
    if (!query) return 1; // everything matches with no query
    const q = normalizeStr(query);

    let score = 0;
    if (normalizeStr(post.title).includes(q)) score += 10;
    if (normalizeStr(post.excerpt).includes(q)) score += 5;
    if (normalizeStr(post.category).includes(q)) score += 8;
    if (post.tags?.some(t => normalizeStr(t).includes(q))) score += 6;
    if (normalizeStr(post.author).includes(q)) score += 3;

    return score;
}

/**
 * Filter and rank posts based on current SearchState.
 * @param {Array} posts — all posts
 * @returns {Array} filtered and sorted posts
 */
function filterPosts(posts) {
    let results = posts.filter(post => {
        // Category filter
        const catMatch =
            SearchState.category === 'all' ||
            post.category.toLowerCase() === SearchState.category.toLowerCase();
        if (!catMatch) return false;

        // Tag filter (exact match)
        if (SearchState.tag) {
            const hasTag = (post.tags || []).some(t => t.toLowerCase() === SearchState.tag.toLowerCase());
            if (!hasTag) return false;
        }

        // Query filter
        if (SearchState.query) {
            return scorePost(post, SearchState.query) > 0;
        }
        return true;
    });

    // Sort by relevance if there's a query, otherwise by date
    if (SearchState.query) {
        results.sort(
            (a, b) => scorePost(b, SearchState.query) - scorePost(a, SearchState.query)
        );
    } else {
        results.sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));
    }

    return results;
}

/**
 * Initialize the search overlay (keyboard shortcut + close button).
 */
function initSearchOverlay() {
    const overlay = document.getElementById('search-overlay');
    const overlayInput = document.getElementById('search-overlay-input');
    const closeBtn = document.getElementById('search-close');
    const searchResultsList = document.getElementById('search-results-list');
    const indexSearch = document.getElementById('hero-search');

    if (!overlay) return;

    // Open overlay
    function openSearch() {
        overlay.classList.add('open');
        setTimeout(() => overlayInput?.focus(), 80);
    }

    // Close overlay
    function closeSearch() {
        overlay.classList.remove('open');
        if (overlayInput) overlayInput.value = '';
        if (searchResultsList) searchResultsList.innerHTML = '';
    }

    // Trigger from header search icon
    document.querySelectorAll('.js-open-search').forEach(el => {
        el.addEventListener('click', e => { e.preventDefault(); openSearch(); });
    });

    // Keyboard shortcut: Ctrl+K / Cmd+K
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            openSearch();
        }
        if (e.key === 'Escape') closeSearch();
    });

    // Close button
    if (closeBtn) closeBtn.addEventListener('click', closeSearch);

    // Clicking backdrop
    overlay.addEventListener('click', e => {
        if (e.target === overlay) closeSearch();
    });

    // Live search in overlay
    if (overlayInput && searchResultsList) {
        overlayInput.addEventListener('input', () => {
            const q = overlayInput.value.trim();
            if (!q) { searchResultsList.innerHTML = ''; return; }

            const matches = ALL_POSTS
                .map(p => ({ post: p, score: scorePost(p, q) }))
                .filter(r => r.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, 6);

            if (matches.length === 0) {
                searchResultsList.innerHTML = `<p style="padding:12px;color:var(--color-text-muted);font-size:.875rem;">No posts found for "<strong>${q}</strong>"</p>`;
                return;
            }

            searchResultsList.innerHTML = matches.map(({ post }) => `
        <a class="search-result-item" href="post.html?id=${post.id}">
          <img src="${post.image}" alt="${post.title}" loading="lazy" width="60" height="48">
          <div class="search-result-info">
            <h4>${highlightMatch(post.title, q)}</h4>
            <p>${post.category} · ${post.date}</p>
          </div>
        </a>`).join('');
        });
    }
}

/**
 * Wrap search query matches in the text with <mark> tags.
 */
function highlightMatch(text, query) {
    if (!query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(${escaped})`, 'gi');
    return text.replace(re, '<mark style="background:rgba(37,99,235,.15);color:var(--color-primary);border-radius:2px;padding:0 2px">$1</mark>');
}

/**
 * Initialize category button filtering and search input on index.html.
 * Requires: renderPostsGrid() and renderSidebar() to be defined in main.js
 */
function initIndexFilters() {
    // Category buttons
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            SearchState.category = btn.dataset.cat;
            SearchState.tag = ''; // Clear tag when category is clicked
            SearchState.query = ''; // Clear query when category is clicked
            SearchState.currentPage = 1;
            if (typeof renderPostsGrid === 'function') renderPostsGrid();
        });
    });

    // Header search → redirect to index with param (simple UX)
    const headerInput = document.querySelector('.header-search input');
    if (headerInput) {
        headerInput.addEventListener('keydown', e => {
            if (e.key === 'Enter' && e.target.value.trim()) {
                const q = e.target.value.trim();
                // If already on index, filter inline
                if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
                    SearchState.query = q;
                    SearchState.tag = ''; // Clear tag when searching
                    SearchState.currentPage = 1;
                    if (typeof renderPostsGrid === 'function') renderPostsGrid();
                    headerInput.blur();
                } else {
                    window.location.href = `index.html?q=${encodeURIComponent(q)}`;
                }
            }
        });
    }

    // Mobile search input
    const mobileSearch = document.querySelector('.mobile-search');
    if (mobileSearch) {
        mobileSearch.addEventListener('keydown', e => {
            if (e.key === 'Enter' && e.target.value.trim()) {
                SearchState.query = e.target.value.trim();
                SearchState.currentPage = 1;
                if (typeof renderPostsGrid === 'function') renderPostsGrid();
                document.getElementById('mobile-nav')?.classList.remove('open');
            }
        });
    }

    // Handle ?q= param on page load
    const urlParams = new URLSearchParams(window.location.search);
    const qParam = urlParams.get('q');
    if (qParam) {
        SearchState.query = qParam;
        const headerInputEl = document.querySelector('.header-search input');
        if (headerInputEl) headerInputEl.value = qParam;
    }

    // Handle ?tag= param on page load
    const tagParam = urlParams.get('tag');
    if (tagParam) {
        SearchState.tag = tagParam;
        SearchState.category = 'all'; // Usually tags bypass category restricted views
    }
}
