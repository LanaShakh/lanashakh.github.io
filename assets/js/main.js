const defaultLang = localStorage.getItem("portfolioLang") || "ru";

function applyLanguage(lang) {
  const available = ["ru", "en"];
  const target = available.includes(lang) ? lang : "ru";

  document.querySelectorAll("[data-lang]").forEach((node) => {
    node.classList.toggle("is-visible", node.dataset.lang === target);
  });

  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.setLang === target);
  });

  document.documentElement.lang = target;
  localStorage.setItem("portfolioLang", target);
}

function setupLanguageSwitcher() {
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      applyLanguage(btn.dataset.setLang);
    });
  });

  applyLanguage(defaultLang);
}

function setupCaseFilters() {
  const filterButtons = document.querySelectorAll("[data-filter-btn]");
  const caseCards = document.querySelectorAll("[data-case-card]");

  if (!filterButtons.length || !caseCards.length) {
    return;
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filterBtn;

      filterButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      caseCards.forEach((card) => {
        const tags = card.dataset.caseTags || "";
        const isVisible = filter === "all" || tags.includes(filter);
        card.style.display = isVisible ? "block" : "none";
      });
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupLanguageSwitcher();
  setupCaseFilters();
});
