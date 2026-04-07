(function () {
  "use strict";

  var navToggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".site-nav");

  if (navToggle && nav) {
    navToggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");

      if (!open) {
        closeDropdowns();
      }
    });
  }

  var dropdownButtons = document.querySelectorAll(".dropbtn");

  function closeDropdowns() {
    document.querySelectorAll(".dropdown-content.show").forEach(function (menu) {
      menu.classList.remove("show");
    });

    dropdownButtons.forEach(function (button) {
      button.setAttribute("aria-expanded", "false");
    });
  }

  dropdownButtons.forEach(function (button) {
    var parent = button.closest(".dropdown");
    if (!parent) return;

    var menu = parent.querySelector(".dropdown-content");
    if (!menu) return;

    button.addEventListener("click", function (event) {
      event.stopPropagation();
      var isOpen = menu.classList.contains("show");

      closeDropdowns();

      if (!isOpen) {
        menu.classList.add("show");
        button.setAttribute("aria-expanded", "true");
      }
    });

    menu.addEventListener("click", function (event) {
      event.stopPropagation();
    });
  });

  document.addEventListener("click", function () {
    closeDropdowns();
  });

  document.querySelectorAll('.site-nav a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function () {
      closeDropdowns();

      if (nav && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        if (navToggle) navToggle.setAttribute("aria-expanded", "false");
      }
    });
  });
})();
