document.addEventListener('DOMContentLoaded', function() {
  const GRID_DEBUG_CLASS = 'grid-debug';
  const columnCount = 18;

  // Grid debug overlay
  document.querySelectorAll('[data-grid-outline]').forEach(function(container) {
    const overlay = document.createElement('div');
    overlay.className = 'grid-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    for (let i = 1; i <= columnCount; i++) {
      const column = document.createElement('div');
      column.className = 'grid-overlay__col';
      const label = document.createElement('span');
      label.className = 'grid-overlay__label';
      label.textContent = i;
      column.appendChild(label);
      overlay.appendChild(column);
    }
    container.appendChild(overlay);
  });

  document.addEventListener('keydown', function(event) {
    const is_modifier = event.ctrlKey || event.metaKey;
    if (is_modifier && event.shiftKey && event.key.toLowerCase() === 'g') {
      document.body.classList.toggle(GRID_DEBUG_CLASS);
    }
  });

  // Hero visibility for header reveal
  const hero = document.querySelector('.hero-section');
  if (hero) {
    const observer = new IntersectionObserver(function(entries) {
      document.body.classList.toggle('hero-visible', entries[0].isIntersecting);
    });
    observer.observe(hero);
  }

  // Notification pop-in on first scroll
  const notification = document.querySelector('.notification');
  if (notification) {
    let initial_scroll = window.scrollY || window.pageYOffset || 0;
    let has_triggered = false;

    function trigger_notification() {
      const current_scroll = window.scrollY || window.pageYOffset || 0;

      if (!has_triggered && current_scroll !== initial_scroll) {
        has_triggered = true;
        notification.classList.add('show');
        window.removeEventListener('scroll', trigger_notification);
      }
    }

    window.addEventListener('scroll', trigger_notification);
  }
});
