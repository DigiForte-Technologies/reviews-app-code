/***********************************************
 * header-review.js
 * Dynamically updates the header review bar using data fetched from backend
 ***********************************************/
document.addEventListener("DOMContentLoaded", async () => {
  // grab productId from Shopify or a data attribute
  const productId =
    window?.Shopify?.product?.id ||
    document.querySelector("[data-product-id]")?.dataset.productId;
  const shop = window.Shopify ? window.Shopify.shop : null;

  if (!productId || !shop) {
    console.warn("Missing productId or shop domain");
    return;
  }

  // call your summary endpoint
  const url = `/apps/steenbergecom-reviews?productId=${productId}&shop=${shop}&summary=true`;


  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();

    // 1) update the “121 Reviews” text
    const countEl = document.querySelector(".reviews-count");
    if (countEl) {
      countEl.textContent = `${data.totalReviews} Reviews`;
    }

    // 2) update the big average number
    const ratingValEl = document.querySelector(".rating-value");
    if (ratingValEl) {
      ratingValEl.textContent = data.average.toFixed(1);
    }

    // 3) fill in each bar’s width and count
  // 3) fill in each bar’s width and count by walking the DOM
  document.querySelectorAll('.rating-bar-row').forEach(row => {
    const stars   = row.dataset.stars;
    const count   = data.ratings?.[stars] || 0;
    const percent = data.totalReviews
                      ? (count / data.totalReviews) * 100
                      : 0;
  
    console.log(`⭐ row[stars=${stars}] → count=${count}, percent=${percent.toFixed(1)}%`);
  
    const fill  = row.querySelector('.progress-fill');
    const label = row.querySelector('.count');
  
    if (!fill)  console.warn(`⚠️ no .progress-fill for stars=${stars}`);
    if (!label) console.warn(`⚠️ no .count for stars=${stars}`);
  
    if (fill)  fill.style.width = percent.toFixed(1) + '%';
    if (label) label.textContent = `(${count})`;
  });
  
  } catch (err) {
    console.error("❌ Failed to fetch header review data:", err);
  }
});
