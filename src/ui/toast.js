/**
 * Kiosk Toast Notifications
 */

export function showToast(message, durationMs = 2800) {
  let toast = document.querySelector('.kiosk-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'kiosk-toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.style.display = 'flex';

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.display = 'none';
  }, durationMs);
}
