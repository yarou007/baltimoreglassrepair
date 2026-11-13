(function () {
  "use strict";
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".site-nav");
  var dropdowns = document.querySelectorAll(".dropbtn");

  function closeDropdowns() {
    dropdowns.forEach(function (button) {
      button.setAttribute("aria-expanded", "false");
      var menu = document.getElementById(button.getAttribute("aria-controls"));
      if (menu) menu.classList.remove("show");
    });
  }

  function closeNavigation() {
    if (nav) nav.classList.remove("is-open");
    if (toggle) {
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open navigation");
    }
    closeDropdowns();
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") !== "true";
      closeNavigation();
      if (open) {
        nav.classList.add("is-open");
        toggle.setAttribute("aria-expanded", "true");
        toggle.setAttribute("aria-label", "Close navigation");
      }
    });
  }

  dropdowns.forEach(function (button) {
    button.addEventListener("click", function () {
      var open = button.getAttribute("aria-expanded") !== "true";
      closeDropdowns();
      var menu = document.getElementById(button.getAttribute("aria-controls"));
      if (open && menu) {
        button.setAttribute("aria-expanded", "true");
        menu.classList.add("show");
      }
    });
  });

  document.addEventListener("click", function (event) {
    if (
      nav &&
      !nav.contains(event.target) &&
      toggle &&
      !toggle.contains(event.target)
    )
      closeNavigation();
    else if (!event.target.closest(".dropdown")) closeDropdowns();
    var link = event.target.closest("a");
    if (link && nav && nav.contains(link)) closeNavigation();
    if (
      !link ||
      !link.getAttribute("href") ||
      link.getAttribute("href").indexOf("tel:") !== 0
    )
      return;
    // A click expresses call intent; it does not establish a connected call or lead.
    var detail = {
      event: "phone_click",
      phone_number: "+12026434062",
      call_location: link.getAttribute("data-call-location") || "content",
      page_path: window.location.pathname,
    };
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(detail);
    window.dispatchEvent(new CustomEvent("phone-click", { detail: detail }));
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    var activeDropdown = document.querySelector(
      '.dropbtn[aria-expanded="true"]',
    );
    var navigationOpen =
      toggle && toggle.getAttribute("aria-expanded") === "true";
    if (activeDropdown) {
      closeDropdowns();
      activeDropdown.focus();
    } else if (navigationOpen) {
      closeNavigation();
      toggle.focus();
    }
  });

  document.addEventListener("focusin", function (event) {
    if (
      nav &&
      toggle &&
      !nav.contains(event.target) &&
      !toggle.contains(event.target)
    )
      closeNavigation();
  });
  var desktop = window.matchMedia("(min-width: 901px)");
  desktop.addEventListener("change", closeNavigation);
  var year = document.getElementById("y");
  if (year) year.textContent = new Date().getFullYear();
})();
