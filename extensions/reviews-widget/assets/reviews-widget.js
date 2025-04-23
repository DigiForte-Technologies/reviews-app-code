// reviews-widget.js
// ---------------------------------------------
// Loox Clone Reviews front‑end widget script
// ---------------------------------------------

/***********************************************
 * reviews-widget.js
 ***********************************************/
document.addEventListener("DOMContentLoaded", () => {
  console.log("🟢 DOMContentLoaded triggered");

  const container = document.getElementById("loox-clone-reviews");
  if (!container) return;

  // Adjust these based on your runtime or templating
  const productId = container.dataset.productId;
  const shop      = window.Shopify ? window.Shopify.shop : null;
  if (!productId || !shop) return;

  let page  = 1;
  const limit = 20;

  // Fetch page “page” of reviews, then render or append
  async function fetchPage() {
    const url = `/apps/steenbergecom-reviews?productId=${productId}&shop=${shop}&page=${page}&limit=${limit}`;
    console.log("📡 Fetching reviews from:", url);

    try {
      const res = await fetch(url);
      const data = await res.json();
      const reviews = data.reviews || [];
      const hasMore = data.hasMore;

      // on first page, bail early if no reviews
      if (page === 1 && reviews.length === 0) {
        container.innerHTML = `<p>No reviews yet.</p>`;
        return;
      }

      // on first page, build skeleton
      if (page === 1) {
        container.innerHTML = `
          <div class="loox-reviews-list" id="reviews-list"></div>
          <div class="show-more-wrapper" id="show-more-wrapper" style="text-align:center; margin-top:20px;"></div>
        `;
      }

      // append fetched reviews
      const list = document.getElementById("reviews-list");
      reviews.forEach(r => list.insertAdjacentHTML("beforeend", renderReview(r)));

      // bind click handlers for newly inserted cards
      document.querySelectorAll('.loox-reviews-list .grid-item-wrap').forEach(card => {
        if (!card._bound) {
          card._bound = true;
          card.addEventListener("click", function() {
            const reviewData = this.getAttribute("data-review");
            if (reviewData) {
              const review = JSON.parse(decodeURIComponent(reviewData));
              openReviewPopup(review);
            }
          });
        }
      });

      // Show or hide “Show more” button
      const wrapper = document.getElementById("show-more-wrapper");
      wrapper.innerHTML = "";
      if (hasMore) {
        wrapper.innerHTML = `<button id="show-more-reviews" class="show-more-btn">Show more reviews</button>`;
        document.getElementById("show-more-reviews").onclick = () => {
          page++;
          fetchPage();
        };
      }
    } catch (err) {
      console.error("❌ Failed to load reviews:", err);
      if (page === 1) container.innerHTML = `<p>Failed to load reviews.</p>`;
    }
  }

  // initial load
  fetchPage();
});


/**
 * Render a star rating as an HTML string of SVG icons.
 * Updated to use 16×16 dimensions and a new fill color.
 */
function renderStars(count) {
  const filled = `
    <svg viewBox="0 0 20 20" width="16" height="16" fill="#FFC200">
      <path d="M10 15l-5.878 3.09 1.123-6.545L.49 6.91l6.561-.954L10 0l2.949 5.956 6.561.954-4.755 4.635 1.123 6.545z"/>
    </svg>
  `;
  return new Array(count).fill(filled).join('');
}

/**
 * Format a date string into "Month DD, YYYY" 
 * (unused below, but you can use it if your reviews have date fields)
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Render the thumbnail listing of a single review.
 * Uses the new verified icon snippet with black fill.
 */
function renderReview(r) {
  // Encode the entire review object for the popup
  const reviewDataAttr = encodeURIComponent(JSON.stringify(r));

  return `
    <div class="grid-item-wrap" data-id="${r.id}" data-review="${reviewDataAttr}">
      <div class="item-img" style="position: relative;">
        ${
          r.image_url
            ? `<img src="${r.image_url}" alt="${r.reviewer_name} review"
                   loading="lazy" 
                   onerror="this.parentElement.removeChild(this)" />`
            : ''
        }
      </div>
      <div class="main">
        <div class="block title">
          ${r.reviewer_name || "Anonymous"}
          ${
            r.verified
              ? `
                <span style="display: flex; align-items: center; gap: 4px"
                      class="verified-badge-and-text">
                  <svg viewBox="0 0 24 24" aria-label="Verified purchase" 
                       role="img" class="loox-icon loox-verified-badge" 
                       style="width: 1.2em; height: 1.2em; vertical-align: middle; flex-shrink: 0; fill: #000;">
                    <use href="#loox-ic-verified-icon"></use>
                  </svg>
                  <span style="font-style: normal; font-weight: 400; font-size: 12px; line-height: 18px; white-space: nowrap;">Verified</span>
                </span>
              `
              : ''
          }
        </div>
        <div class="block stars">${renderStars(r.rating)}</div>
        <div class="block">
          <div class="pre-wrap main-text">${r.review_text}</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render the full-screen popup:
 * - Uses a side-by-side layout (image on the left, text on the right)
 * - Removes the extra notification text.
 */
function renderPopup(r) {
  return `
    <div class="popup-content">
      <!-- Left side: image -->
      <div class="popup-img-wrapper">
        ${
          r.image_url
            ? `<img src="${r.image_url}" alt="${r.reviewer_name} review" 
                     onerror="this.parentElement.removeChild(this)" 
                     class="popup-img" />`
            : ''
        }
      </div>
      <!-- Right side: details and close button -->
      <div class="popup-details">
        <button class="close-btn" aria-label="Close popup" onclick="closeReviewPopup()">×</button>
        <h3 class="popup-reviewer-name">${r.reviewer_name || "Anonymous"}</h3>
        <div class="popup-stars">${renderStars(r.rating)}</div>
        ${
          r.verified
            ? `
              <div style="display: flex; align-items: center; gap: 4px; margin: 4px 0;"
                   class="verified-badge-and-text">
                <svg viewBox="0 0 24 24" aria-label="Verified purchase" 
                     role="img" class="loox-icon loox-verified-badge"
                     style="width: 1.2em; height: 1.2em; vertical-align: middle; flex-shrink: 0; fill: #000;">
                  <use href="#loox-ic-verified-icon"></use>
                </svg>
                <span style="font-size: 14px;">Verified purchase</span>
              </div>
            `
            : ''
        }
        <p class="popup-review-text">${r.review_text}</p>
      </div>
    </div>
  `;
}

/**
 * Insert a popup overlay into the DOM with the given review.
 */
function openReviewPopup(review) {
  // Build overlay container
  const overlay = document.createElement("div");
  overlay.className = "popup-overlay";

  // Insert the styled popup into the overlay
  overlay.innerHTML = renderPopup(review);

  document.body.appendChild(overlay);
  document.body.classList.add("popup-open");
}

/**
 * Remove the popup overlay from the DOM.
 */
function closeReviewPopup() {
  const popupOverlay = document.querySelector(".popup-overlay");
  if (popupOverlay) {
    popupOverlay.remove();
  }
  document.body.classList.remove("popup-open");
}
