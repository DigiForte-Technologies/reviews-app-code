document.addEventListener('DOMContentLoaded', async () => {
    document.querySelectorAll('.star-rating').forEach(async root => {
      const pid          = root.dataset.productId;
      const shop         = root.dataset.shop;
      const fallback     = parseFloat(root.dataset.fallbackRating) || 0;
      const fallbackText = root.dataset.fallbackText;
  
      // fetch live summary
      let avg = fallback, total = 0;
      try {
        const res = await fetch(
          `/apps/steenbergecom-reviews?productId=${pid}&shop=${shop}&summary=true`
        );
        if (res.ok) {
          const data = await res.json();
          avg   = parseFloat(data.average)   || avg;
          total = parseInt(data.totalReviews, 10) || 0;
        }
      } catch (e) {
        console.warn('Star-rating fetch failed', e);
      }
  
      // decide full/half/empty
      const full = Math.floor(avg);
      const half = (avg - full) >= 0.5;
  
      // Loox‐style icon template
// after:
const tpl = (fill) => {
    // `fill` will be "full", "half" or "empty", we ignore that now
    // and insert our exact hex from the root dataset:
    const starCol = root.dataset.starColor || '#EBBF20';
    return `
      <svg class="loox-icon" viewBox="0 0 24 24" fill="${starCol}">
        <use href="#looxicons-rating-icon"></use>
      </svg>
    `.trim();
  };
  
  
      const stars = [];
      for (let i = 1; i <= 5; i++) {
        if (i <= full)                       stars.push(tpl('full'));
        else if (i === full + 1 && half)     stars.push(tpl('half'));
        else                                 stars.push(tpl('empty'));
      }
  
      root.querySelector('.stars').innerHTML = stars.join('');
      const label = root.querySelector('.label');
      label.textContent = total > 0
        ? `(${total.toLocaleString()})`
        : fallbackText;
  
      const title = `${avg.toFixed(1)} rating (${total.toLocaleString()} votes)`;
      root.setAttribute('aria-label', title);
      root.setAttribute('title', title);
    });
  });
  