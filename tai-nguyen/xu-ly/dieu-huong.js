// Điều hướng giữa các màn hình. Dùng script thông thường để mở được bằng file://.
const content = document.querySelector('#content');
function notify() {
  document.querySelector('#preview-notice').hidden = false;
}
function render() {
  const page = location.hash === '#home' ? 'home' : location.hash === '#register' ? 'register' : 'login';
  document.body.classList.toggle('auth-mode', page !== 'home');
  content.innerHTML = page === 'home' ? homeMarkup : authMarkup(page === 'register');
  document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = svg(el.dataset.icon));
  if (page === 'home') initHome();
  else initAuth(page);
}
window.addEventListener('hashchange', render);
render();
