(function applyStoredLangEarly() {
  try {
    var stored = localStorage.getItem("portfolioLang");
    var lang = stored === "en" ? "en" : "ru";
    document.documentElement.setAttribute("data-lang-active", lang);
    document.documentElement.lang = lang;
  } catch (e) {
    document.documentElement.setAttribute("data-lang-active", "ru");
  }
})();

function applyLanguage(lang) {
  var target = lang === "en" ? "en" : "ru";

  document.documentElement.setAttribute("data-lang-active", target);
  document.documentElement.lang = target;

  document.querySelectorAll(".lang-btn").forEach(function (btn) {
    btn.classList.toggle("active", btn.dataset.setLang === target);
  });

  try {
    localStorage.setItem("portfolioLang", target);
  } catch (e) {}
}

function setupLanguageSwitcher() {
  document.querySelectorAll(".lang-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      applyLanguage(btn.dataset.setLang);
    });
  });

  var current = document.documentElement.getAttribute("data-lang-active") || "ru";
  applyLanguage(current);
}

function setupCaseFilters() {
  var filterButtons = document.querySelectorAll("[data-filter-btn]");
  var caseCards = document.querySelectorAll("[data-case-card]");

  if (!filterButtons.length || !caseCards.length) {
    return;
  }

  filterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      var filter = button.dataset.filterBtn;

      filterButtons.forEach(function (btn) {
        btn.classList.remove("active");
      });
      button.classList.add("active");

      caseCards.forEach(function (card) {
        var tags = card.dataset.caseTags || "";
        var isVisible = filter === "all" || tags.indexOf(filter) !== -1;
        card.style.display = isVisible ? "" : "none";
      });
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () {
    setupLanguageSwitcher();
    setupCaseFilters();
  });
} else {
  setupLanguageSwitcher();
  setupCaseFilters();
}
