// Headgear Artwork Catalog
const artworkImages = [
    { filename: 'abstract1.png', title: 'Abstract I' },
    { filename: 'abstractlogo1.png', title: 'Abstract Logo I' },
    { filename: 'ascemichaos.png', title: 'Ascemic Chaos' },
    { filename: 'circularbleeding.png', title: 'Circular Bleeding' },
    { filename: 'concophony1.png', title: 'Concophony I' },
    { filename: 'duffystype.png', title: 'Duffy\'s Type' },
    { filename: 'foggyjoe.png', title: 'Foggy Joe' },
    { filename: 'gel1.png', title: 'Gel I' },
    { filename: 'granolabjork.png', title: 'Granola Björk' },
    { filename: 'houseparty.png', title: 'House Party' },
    { filename: 'intheweeds.png', title: 'In the Weeds' },
    { filename: 'kakistocracy.png', title: 'Kakistocracy' },
    { filename: 'longnecklady.png', title: 'Longneck Lady' },
    { filename: 'madusafilangies.png', title: 'Madusa Filangies' },
    { filename: 'manicangies.png', title: 'Manic Angies' },
    { filename: 'oldjohnny.png', title: 'Old Johnny' },
    { filename: 'pierre.png', title: 'Pierre' },
    { filename: 'pliki-print.png', title: 'Pliki Print' },
    { filename: 'portlandgirl.jpg', title: 'Portland Girl' },
    { filename: 'spyvee.png', title: 'Spyvee' },
    { filename: 'toasterdragon.png', title: 'Toaster Dragon' }
];

// DOM elements
const galleryGrid = document.getElementById('gallery-grid');
const shadowbox = document.getElementById('shadowbox');
const shadowboxImg = document.getElementById('shadowbox-img');
const shadowboxCaption = document.getElementById('shadowbox-caption');
const shadowboxCounter = document.getElementById('shadowbox-counter');
const shadowboxClose = document.getElementById('shadowbox-close');
const shadowboxPrev = document.getElementById('shadowbox-prev');
const shadowboxNext = document.getElementById('shadowbox-next');

let currentIndex = 0;

// Initialize Gallery
function initGallery() {
    if (!galleryGrid) return;
    
    // Dynamically generate thumbnail items
    artworkImages.forEach((art, index) => {
        const item = document.createElement('div');
        item.classList.add('gallery-item');
        item.setAttribute('data-index', index);
        item.setAttribute('tabindex', '0'); // Make focusable for accessibility
        
        item.innerHTML = `
            <img src="img/artwork/${art.filename}" alt="${art.title}" loading="lazy">
            <div class="gallery-item-overlay">
                <h4 class="gallery-item-title">${art.title}</h4>
            </div>
        `;
        
        // Open shadowbox on click
        item.addEventListener('click', () => {
            openShadowbox(index);
        });
        
        // Open shadowbox on pressing Enter when focused
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                openShadowbox(index);
            }
        });
        
        galleryGrid.appendChild(item);
    });
}

// Open Shadowbox
function openShadowbox(index) {
    currentIndex = index;
    updateShadowboxContent();
    shadowbox.classList.add('active');
    shadowbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    
    // Focus the modal for accessibility
    shadowbox.focus();
}

// Close Shadowbox
function closeShadowbox() {
    shadowbox.classList.remove('active');
    shadowbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = ''; // Restore background scrolling
    
    // Clear image src after transition to avoid flicker next time it opens
    setTimeout(() => {
        if (!shadowbox.classList.contains('active')) {
            shadowboxImg.src = '';
        }
    }, 350);
}

// Update image, caption, and counter
function updateShadowboxContent() {
    const art = artworkImages[currentIndex];
    if (!art) return;
    
    // Fade content out slightly during transition
    shadowboxImg.style.opacity = '0.3';
    
    // Load new image
    const tempImg = new Image();
    tempImg.src = `img/artwork/${art.filename}`;
    tempImg.onload = () => {
        shadowboxImg.src = tempImg.src;
        shadowboxImg.alt = art.title;
        shadowboxImg.style.opacity = '1';
    };
    
    shadowboxCaption.textContent = art.title;
    shadowboxCounter.textContent = `${currentIndex + 1} / ${artworkImages.length}`;
}

// Navigation functions
function showNext() {
    currentIndex = (currentIndex + 1) % artworkImages.length;
    updateShadowboxContent();
}

function showPrev() {
    currentIndex = (currentIndex - 1 + artworkImages.length) % artworkImages.length;
    updateShadowboxContent();
}

// Event Listeners
shadowboxClose.addEventListener('click', closeShadowbox);
shadowboxNext.addEventListener('click', showNext);
shadowboxPrev.addEventListener('click', showPrev);

// Close on clicking overlay backdrop (but not the image/controls)
shadowbox.addEventListener('click', (e) => {
    if (e.target === shadowbox || e.target.classList.contains('shadowbox-content')) {
        closeShadowbox();
    }
});

// Keyboard Navigation
window.addEventListener('keydown', (e) => {
    if (!shadowbox.classList.contains('active')) return;
    
    switch (e.key) {
        case 'ArrowRight':
        case 'd':
            showNext();
            break;
        case 'ArrowLeft':
        case 'a':
            showPrev();
            break;
        case 'Escape':
            closeShadowbox();
            break;
    }
});

// Run initializer
document.addEventListener('DOMContentLoaded', () => {
    initGallery();
    initHamburger();
});

// ── Hamburger Menu ──────────────────────────────────────────
function initHamburger() {
    const hamburger = document.getElementById('nav-hamburger');
    const navLinks  = document.getElementById('nav-links');
    if (!hamburger || !navLinks) return;

    function openMenu() {
        hamburger.classList.add('open');
        navLinks.classList.add('open');
        hamburger.setAttribute('aria-expanded', 'true');
    }

    function closeMenu() {
        hamburger.classList.remove('open');
        navLinks.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
    }

    hamburger.addEventListener('click', (e) => {
        e.stopPropagation();
        hamburger.classList.contains('open') ? closeMenu() : openMenu();
    });

    // Close when any nav link is clicked
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    // Close when clicking outside the nav
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.site-nav')) closeMenu();
    });
}
