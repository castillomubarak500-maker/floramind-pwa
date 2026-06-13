const revealEls = Array.from(document.querySelectorAll(".reveal"));

function createIcons() {
  if (window.lucide) window.lucide.createIcons();
}

function setupReveal() {
  if (!("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("in-view"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("in-view");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });

  revealEls.forEach((el) => observer.observe(el));
}

function setupHeaderDepth() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const update = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 20);
  };
  update();
  window.addEventListener("scroll", update, { passive: true });
}

function init() {
  createIcons();
  setupReveal();
  setupHeaderDepth();
}

document.addEventListener("DOMContentLoaded", init);
