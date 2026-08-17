// nav.js - Shared mobile navigation menu, used across every public page
document.addEventListener('DOMContentLoaded', function() {
  const menuToggle = document.getElementById('mobileMenuToggle');
  const navLinks = document.getElementById('navLinks');
  const menuIcon = menuToggle ? menuToggle.querySelector('i') : null;
  if (!menuToggle || !navLinks) return;

  function openMenu() {
    navLinks.classList.add('active');
    menuToggle.setAttribute('aria-expanded', 'true');
    if (menuIcon) { menuIcon.classList.remove('fa-bars'); menuIcon.classList.add('fa-xmark'); }
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    navLinks.classList.remove('active');
    menuToggle.setAttribute('aria-expanded', 'false');
    if (menuIcon) { menuIcon.classList.remove('fa-xmark'); menuIcon.classList.add('fa-bars'); }
    document.body.style.overflow = '';
  }

  menuToggle.addEventListener('click', function(e) {
    e.stopPropagation();
    navLinks.classList.contains('active') ? closeMenu() : openMenu();
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('click', function(e) {
    if (navLinks.classList.contains('active') && !navLinks.contains(e.target) && e.target !== menuToggle) {
      closeMenu();
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && navLinks.classList.contains('active')) closeMenu();
  });

  window.addEventListener('resize', function() {
    if (window.innerWidth > 992 && navLinks.classList.contains('active')) closeMenu();
  });
});
