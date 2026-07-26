/* =========================================================
   community.js — Headgear Community Pages Logic
   Backend: Supabase (Postgres REST API via fetch)
   ========================================================= */

/* ─── Supabase Config ────────────────────────────────────── */
const SUPABASE_URL     = 'https://krqeprvecnjstgghbmzd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DezBt-qxLT3oaVqaJD9tlw_zMtcLYVs';

/* ─── Supabase REST Helpers ──────────────────────────────── */
const SB_HDR = {
    'apikey':        SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type':  'application/json'
};

async function sbGet(path) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: SB_HDR });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

async function sbInsert(table, body) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method:  'POST',
        headers: { ...SB_HDR, 'Prefer': 'return=representation' },
        body:    JSON.stringify(body)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json(); // returns array of inserted rows
}

async function sbRpc(fn, params = {}) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
        method:  'POST',
        headers: SB_HDR,
        body:    JSON.stringify(params)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.status === 204 ? null : res.json();
}

/* ─── Edit Key Helpers ───────────────────────────────────── */
function genEditKey() {
    const arr = new Uint8Array(18);
    crypto.getRandomValues(arr);
    return btoa(String.fromCharCode(...arr)).replace(/[+/=]/g, c => ({'+':'-','/':'_','=':''}[c]));
}

function saveEditKey(postId, key) {
    sessionStorage.setItem(`hg_ekey_${postId}`, key);
}

function getEditKey(postId) {
    return sessionStorage.getItem(`hg_ekey_${postId}`);
}

/* ─── Utilities ──────────────────────────────────────────── */
function fmt(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function initials(name) {
    const parts = String(name || 'AN').trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return String(name).slice(0, 2).toUpperCase();
}

function escHtml(str) {
    return String(str)
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;')
        .replace(/'/g,  '&#039;');
}

function validate(form) {
    let ok = true;
    form.querySelectorAll('[data-required]').forEach(field => {
        const err = field.parentElement.querySelector('.field-error');
        if (!field.value.trim()) {
            field.classList.add('invalid');
            if (err) err.classList.add('visible');
            ok = false;
        } else {
            field.classList.remove('invalid');
            if (err) err.classList.remove('visible');
        }
    });
    const emailField = form.querySelector('[type="email"]');
    if (emailField && emailField.value.trim()) {
        const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailField.value.trim());
        const err   = emailField.parentElement.querySelector('.field-error');
        if (!valid) {
            emailField.classList.add('invalid');
            if (err) { err.textContent = 'Please enter a valid email.'; err.classList.add('visible'); }
            ok = false;
        }
    }
    return ok;
}

function showConfirm(panelId, msgId) {
    const panel = document.getElementById(panelId);
    const msg   = document.getElementById(msgId);
    if (panel) panel.style.display = 'none';
    if (msg)   msg.classList.add('visible');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setBtnLoading(btn, loading, loadText = 'Saving…') {
    if (!btn) return;
    if (loading) {
        btn.dataset.origText = btn.textContent;
        btn.textContent = loadText;
        btn.disabled = true;
    } else {
        btn.textContent = btn.dataset.origText || btn.textContent;
        btn.disabled = false;
    }
}

function showInlineError(container, msg) {
    let el = container.querySelector('.sb-error');
    if (!el) {
        el = document.createElement('p');
        el.className = 'sb-error';
        container.appendChild(el);
    }
    el.textContent = msg;
}

function clearInlineError(container) {
    const el = container.querySelector('.sb-error');
    if (el) el.remove();
}

/* ─── Blog: Comment Renderer ─────────────────────────────── */
function renderComments(comments) {
    if (!comments || !comments.length) {
        return '<p class="no-comments">No comments yet. Say something.</p>';
    }
    return [...comments]
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .map(c => `
            <div class="comment-item">
                <div class="comment-avatar">${initials(c.author)}</div>
                <div class="comment-bubble">
                    <div class="comment-author-line">
                        <span class="comment-author">${escHtml(c.author)}</span>
                        <span class="comment-date">${fmt(c.created_at)}</span>
                    </div>
                    <p class="comment-text">${escHtml(c.text)}</p>
                </div>
            </div>
        `).join('');
}

/* ─── Blog: Feed Renderer ────────────────────────────────── */
async function renderBlogFeed() {
    const feed = document.getElementById('blog-feed');
    if (!feed) return;

    // Show loading dots
    feed.innerHTML = `
        <div class="blog-loading">
            <span class="loading-dot"></span>
            <span class="loading-dot"></span>
            <span class="loading-dot"></span>
        </div>`;

    let posts;
    try {
        // Fetch posts with embedded comments via PostgREST FK embed
        posts = await sbGet('blog_posts?select=*,comments(*)&order=created_at.desc');
    } catch (err) {
        feed.innerHTML = '<div class="blog-empty">Could not load posts. Please refresh and try again.</div>';
        console.error('[Headgear] Blog fetch error:', err);
        return;
    }

    feed.innerHTML = '';

    if (!posts.length) {
        feed.innerHTML = '<div class="blog-empty">No posts yet. Be the first.</div>';
        return;
    }

    posts.forEach(post => {
        const card = document.createElement('article');
        card.className  = 'blog-post-card';
        card.id         = `post-${post.id}`;

        const commentCount = (post.comments || []).length;
        const likeCount    = post.likes || 0;
        const likedKey     = `hg_liked_${post.id}`;
        const alreadyLiked = !!sessionStorage.getItem(likedKey);
        const myEditKey    = getEditKey(post.id);
        const isOwner      = !!myEditKey;

        card.innerHTML = `
            <div class="blog-post-header">
                <h2 class="blog-post-title" id="title-${post.id}">${escHtml(post.title)}</h2>
                <div class="blog-post-meta">
                    <span class="blog-post-author">${escHtml(post.author)}</span>
                    <span class="blog-post-date">${fmt(post.created_at)}</span>
                    ${isOwner ? `
                    <span class="owner-actions">
                        <button class="btn-owner-edit" id="btn-edit-${post.id}" aria-label="Edit post">✏️ Edit</button>
                        <button class="btn-owner-delete" id="btn-delete-${post.id}" aria-label="Delete post">🗑 Delete</button>
                    </span>` : ''}
                </div>
            </div>
            <p class="blog-post-body" id="body-${post.id}">${escHtml(post.body)}</p>

            ${isOwner ? `
            <div class="edit-form-wrap" id="edit-wrap-${post.id}" hidden>
                <form class="edit-form" id="edit-form-${post.id}">
                    <div class="edit-form-field">
                        <label for="ef-title-${post.id}">Title</label>
                        <input type="text" id="ef-title-${post.id}" value="${escHtml(post.title)}" required />
                    </div>
                    <div class="edit-form-field">
                        <label for="ef-body-${post.id}">Body</label>
                        <textarea id="ef-body-${post.id}" rows="8" required>${escHtml(post.body)}</textarea>
                    </div>
                    <div class="edit-form-actions">
                        <button type="submit" class="btn-edit-save" id="ef-save-${post.id}">Save Changes</button>
                        <button type="button" class="btn-edit-cancel" id="ef-cancel-${post.id}">Cancel</button>
                    </div>
                </form>
            </div>` : ''}

            <div class="blog-post-actions">
                <button class="btn-like ${alreadyLiked ? 'liked' : ''}"
                    data-id="${post.id}" id="like-${post.id}" aria-label="Like this post">
                    <span>♥</span> <span class="like-count">${likeCount}</span>
                </button>
                <button class="btn-toggle-comments" data-id="${post.id}" aria-expanded="false">
                    💬 ${commentCount} comment${commentCount !== 1 ? 's' : ''}
                </button>
            </div>
            <div class="comment-section" id="comments-${post.id}">
                <div class="comment-list" id="comment-list-${post.id}">
                    ${renderComments(post.comments)}
                </div>
                <form class="comment-form" id="comment-form-${post.id}" data-post="${post.id}">
                    <div class="comment-form-row">
                        <input type="text" placeholder="Your name (optional)"
                            id="cn-name-${post.id}" autocomplete="off" />
                    </div>
                    <textarea placeholder="Write a comment..." rows="3"
                        id="cn-text-${post.id}" required></textarea>
                    <div style="display:flex;justify-content:flex-end;">
                        <button type="submit" class="btn-post-comment"
                            id="cn-submit-${post.id}">Post Comment</button>
                    </div>
                </form>
            </div>
        `;

        feed.appendChild(card);

        /* Like button ───────────────────────────────────────── */
        card.querySelector(`#like-${post.id}`).addEventListener('click', async function () {
            if (sessionStorage.getItem(likedKey)) return;
            this.disabled = true;
            try {
                await sbRpc('increment_post_likes', { p_id: post.id });
                sessionStorage.setItem(likedKey, '1');
                this.classList.add('liked');
                const countEl = this.querySelector('.like-count');
                countEl.textContent = parseInt(countEl.textContent, 10) + 1;
            } catch (err) {
                console.error('[Headgear] Like error:', err);
            } finally {
                this.disabled = false;
            }
        });

        /* Toggle comments ───────────────────────────────────── */
        card.querySelector('.btn-toggle-comments').addEventListener('click', function () {
            const section = document.getElementById(`comments-${post.id}`);
            const open = section.classList.toggle('open');
            this.setAttribute('aria-expanded', String(open));
        });

        /* Comment submit ─────────────────────────────────────── */
        card.querySelector(`#comment-form-${post.id}`).addEventListener('submit', async e => {
            e.preventDefault();
            const nameEl    = document.getElementById(`cn-name-${post.id}`);
            const textEl    = document.getElementById(`cn-text-${post.id}`);
            const submitBtn = document.getElementById(`cn-submit-${post.id}`);
            const text      = textEl.value.trim();
            if (!text) { textEl.focus(); return; }

            setBtnLoading(submitBtn, true, 'Posting…');
            clearInlineError(e.target);

            try {
                const [newComment] = await sbInsert('comments', {
                    post_id: post.id,
                    author:  nameEl.value.trim() || 'Anonymous',
                    text
                });
                const list   = document.getElementById(`comment-list-${post.id}`);
                const noMsg  = list.querySelector('.no-comments');
                if (noMsg) noMsg.remove();
                list.insertAdjacentHTML('beforeend', renderComments([newComment]));
                const toggleBtn = card.querySelector('.btn-toggle-comments');
                const newCount  = list.querySelectorAll('.comment-item').length;
                toggleBtn.textContent = `💬 ${newCount} comment${newCount !== 1 ? 's' : ''}`;
                nameEl.value = '';
                textEl.value = '';
            } catch (err) {
                console.error('[Headgear] Comment error:', err);
                showInlineError(e.target, 'Could not post comment — please try again.');
            } finally {
                setBtnLoading(submitBtn, false);
            }
        });

        /* Edit button ───────────────────────────────────────── */
        if (isOwner) {
            const editBtn   = card.querySelector(`#btn-edit-${post.id}`);
            const deleteBtn = card.querySelector(`#btn-delete-${post.id}`);
            const editWrap  = card.querySelector(`#edit-wrap-${post.id}`);
            const editForm  = card.querySelector(`#edit-form-${post.id}`);
            const titleEl   = card.querySelector(`#title-${post.id}`);
            const bodyEl    = card.querySelector(`#body-${post.id}`);

            editBtn.addEventListener('click', () => {
                const open = editWrap.hidden;
                editWrap.hidden = !open;
                editBtn.classList.toggle('active', open);
                if (open) {
                    card.querySelector(`#ef-title-${post.id}`).value = titleEl.textContent;
                    card.querySelector(`#ef-body-${post.id}`).value  = bodyEl.textContent;
                    card.querySelector(`#ef-title-${post.id}`).focus();
                }
            });

            card.querySelector(`#ef-cancel-${post.id}`).addEventListener('click', () => {
                editWrap.hidden = true;
                editBtn.classList.remove('active');
            });

            editForm.addEventListener('submit', async e => {
                e.preventDefault();
                const newTitle = card.querySelector(`#ef-title-${post.id}`).value.trim();
                const newBody  = card.querySelector(`#ef-body-${post.id}`).value.trim();
                if (!newTitle || !newBody) return;

                const saveBtn = card.querySelector(`#ef-save-${post.id}`);
                setBtnLoading(saveBtn, true, 'Saving…');
                clearInlineError(editForm);

                try {
                    const ok = await sbRpc('update_blog_post', {
                        p_id: post.id, p_key: myEditKey,
                        p_title: newTitle, p_body: newBody
                    });
                    if (!ok) throw new Error('Key mismatch');
                    titleEl.textContent = newTitle;
                    bodyEl.textContent  = newBody;
                    editWrap.hidden = true;
                    editBtn.classList.remove('active');
                } catch (err) {
                    console.error('[Headgear] Edit error:', err);
                    showInlineError(editForm, 'Could not save changes — please try again.');
                } finally {
                    setBtnLoading(saveBtn, false);
                }
            });

            /* Delete button ─────────────────────────────────── */
            deleteBtn.addEventListener('click', () => {
                showDeleteConfirm(post.id, myEditKey, card);
            });
        }
    });
}

/* ─── Blog: Delete Confirm Modal ────────────────────────── */
function showDeleteConfirm(postId, editKey, card) {
    // Remove any existing modal
    document.getElementById('hg-delete-modal')?.remove();

    const modal = document.createElement('div');
    modal.id        = 'hg-delete-modal';
    modal.className = 'delete-modal-overlay';
    modal.innerHTML = `
        <div class="delete-modal" role="dialog" aria-modal="true" aria-labelledby="del-modal-title">
            <p class="delete-modal-icon">🗑</p>
            <h3 id="del-modal-title">Delete this post?</h3>
            <p class="delete-modal-sub">This can't be undone. Comments will also be removed.</p>
            <div class="delete-modal-actions">
                <button class="btn-confirm-delete" id="del-confirm-btn">Yes, delete it</button>
                <button class="btn-cancel-delete" id="del-cancel-btn">Never mind</button>
            </div>
            <p class="sb-error delete-modal-err" id="del-error" style="display:none;"></p>
        </div>
    `;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('open'));

    const close = () => {
        modal.classList.remove('open');
        modal.addEventListener('transitionend', () => modal.remove(), { once: true });
    };

    modal.querySelector('#del-cancel-btn').addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });

    modal.querySelector('#del-confirm-btn').addEventListener('click', async function () {
        this.disabled = true;
        this.textContent = 'Deleting…';
        const errEl = modal.querySelector('#del-error');
        errEl.style.display = 'none';

        try {
            const ok = await sbRpc('delete_blog_post', { p_id: postId, p_key: editKey });
            if (!ok) throw new Error('Key mismatch');
            sessionStorage.removeItem(`hg_ekey_${postId}`);
            close();
            card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            card.style.opacity    = '0';
            card.style.transform  = 'translateY(-8px)';
            card.addEventListener('transitionend', () => card.remove(), { once: true });
        } catch (err) {
            console.error('[Headgear] Delete error:', err);
            errEl.textContent    = 'Could not delete — please try again.';
            errEl.style.display  = 'block';
            this.disabled        = false;
            this.textContent     = 'Yes, delete it';
        }
    });
}

/* ─── Blog: Init ─────────────────────────────────────────── */
async function initBlog() {
    await renderBlogFeed();

    const form = document.getElementById('blog-post-form');
    if (!form) return;

    form.addEventListener('submit', async e => {
        e.preventDefault();
        if (!validate(form)) return;

        const submitBtn = form.querySelector('#blog-submit');
        setBtnLoading(submitBtn, true, 'Publishing…');
        clearInlineError(form);

        try {
            const editKey = genEditKey();
            const [inserted] = await sbInsert('blog_posts', {
                title:    form.querySelector('#bp-title').value.trim(),
                author:   form.querySelector('#bp-name')?.value.trim() || 'Anonymous',
                body:     form.querySelector('#bp-body').value.trim(),
                edit_key: editKey
            });
            saveEditKey(inserted.id, editKey);

            form.reset();
            showConfirm('blog-post-panel', 'blog-post-confirm');
            await renderBlogFeed();
        } catch (err) {
            console.error('[Headgear] Post submit error:', err);
            showInlineError(form, 'Could not publish post — please try again.');
            setBtnLoading(submitBtn, false);
        }
    });
}

/* ─── Contact Form ───────────────────────────────────────── */
function initContact() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', async e => {
        e.preventDefault();
        if (!validate(form)) return;

        const submitBtn = form.querySelector('#contact-submit');
        setBtnLoading(submitBtn, true, 'Sending…');
        clearInlineError(form);

        try {
            await sbInsert('contact_submissions', {
                name:     form.querySelector('#c-name')?.value.trim()     || null,
                email:    form.querySelector('#c-email').value.trim(),
                phone:    form.querySelector('#c-phone')?.value.trim()    || null,
                about:    form.querySelector('#c-about')?.value.trim()    || null,
                links:    form.querySelector('#c-links')?.value.trim()    || null,
                location: form.querySelector('#c-location')?.value.trim() || null
            });

            showConfirm('contact-panel', 'contact-confirm');
        } catch (err) {
            console.error('[Headgear] Contact error:', err);
            showInlineError(form, 'Could not send message — please try again.');
            setBtnLoading(submitBtn, false);
        }
    });
}

/* ─── Custom Request ─────────────────────────────────────── */
function initCustomRequest() {
    const form = document.getElementById('custom-form');
    if (!form) return;

    // Budget slider live display
    const slider  = document.getElementById('cr-budget');
    const display = document.getElementById('budget-display');
    if (slider && display) {
        const updateBudget = () => {
            const v = parseInt(slider.value, 10);
            display.textContent = v >= 2000 ? '$2000+' : `$${v}`;
        };
        slider.addEventListener('input', updateBudget);
        updateBudget();
    }

    form.addEventListener('submit', async e => {
        e.preventDefault();
        if (!validate(form)) return;

        const submitBtn  = form.querySelector('#custom-submit');
        const selectedType = form.querySelector('input[name="product-type"]:checked');
        const budgetVal  = slider
            ? (parseInt(slider.value, 10) >= 2000 ? '2000+' : slider.value)
            : null;

        setBtnLoading(submitBtn, true, 'Submitting…');
        clearInlineError(form);

        try {
            await sbInsert('custom_requests', {
                product_type: selectedType?.value || null,
                description:  form.querySelector('#cr-description').value.trim(),
                dimensions:   form.querySelector('#cr-dimensions')?.value.trim()  || null,
                budget:       budgetVal,
                ref_links:    form.querySelector('#cr-references')?.value.trim()  || null,
                name:         form.querySelector('#cr-name')?.value.trim()        || null,
                email:        form.querySelector('#cr-email').value.trim()
            });

            showConfirm('custom-panel', 'custom-confirm');
        } catch (err) {
            console.error('[Headgear] Custom request error:', err);
            showInlineError(form, 'Could not submit request — please try again.');
            setBtnLoading(submitBtn, false);
        }
    });
}

/* ─── Boot ───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    initContact();
    initBlog();
    initCustomRequest();
});
