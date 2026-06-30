(function () {
  "use strict";

  var root = document.documentElement;
  var body = document.body;
  var drawer = document.querySelector("[data-kss-drawer]");
  var drawerOverlay = document.querySelector("[data-kss-drawer-overlay]");
  var drawerToggle = document.querySelector("[data-kss-drawer-toggle]");
  var drawerClose = document.querySelector("[data-kss-drawer-close]");
  var searchInput = document.querySelector("[data-kss-search]");
  var searchResults = document.querySelector("[data-kss-search-results]");
  var themeToggle = document.querySelector("[data-kss-theme-toggle]");
  var themeLabel = document.querySelector("[data-kss-theme-label]");

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getSearchIndex() {
    var source = document.getElementById("kss-search-index");

    if (!source) {
      return [];
    }

    try {
      return JSON.parse(source.textContent || "[]");
    } catch (_error) {
      return [];
    }
  }

  function setDrawer(open) {
    if (!drawer || !drawerOverlay || !drawerToggle) {
      return;
    }

    drawer.classList.toggle("-translate-x-full", !open);
    drawerOverlay.classList.toggle("hidden", !open);
    drawerToggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function currentTheme() {
    return localStorage.getItem("kss-theme") || "system";
  }

  function applyTheme(theme) {
    var resolvedTheme = theme || "system";
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var dark = resolvedTheme === "dark" || (resolvedTheme === "system" && prefersDark);

    localStorage.setItem("kss-theme", resolvedTheme);
    root.classList.toggle("dark", dark);
    root.dataset.kssTheme = resolvedTheme;

    if (themeLabel) {
      themeLabel.textContent =
        resolvedTheme === "system"
          ? "System"
          : resolvedTheme.charAt(0).toUpperCase() + resolvedTheme.slice(1);
    }

    document.querySelectorAll(".kss-theme-sun").forEach(function (node) {
      node.classList.toggle("hidden", dark);
    });
    document.querySelectorAll(".kss-theme-moon").forEach(function (node) {
      node.classList.toggle("hidden", !dark);
    });
  }

  function nextTheme(theme) {
    if (theme === "system") {
      return "light";
    }
    if (theme === "light") {
      return "dark";
    }
    return "system";
  }

  function filterCurrentPage(query) {
    var normalized = query.trim().toLowerCase();

    document.querySelectorAll("[data-kss-nav-item]").forEach(function (item) {
      var text = (item.dataset.kssNavText || item.textContent || "").toLowerCase();
      item.classList.toggle("kss-hidden-by-search", normalized && text.indexOf(normalized) === -1);
    });

    document.querySelectorAll("[data-kss-section]").forEach(function (section) {
      var text = (section.dataset.kssSectionText || section.textContent || "").toLowerCase();
      section.classList.toggle("kss-hidden-by-search", normalized && text.indexOf(normalized) === -1);
    });
  }

  function renderGlobalResults(index, query) {
    if (!searchResults) {
      return;
    }

    var normalized = query.trim().toLowerCase();

    if (!normalized) {
      searchResults.classList.add("hidden");
      searchResults.innerHTML = "";
      return;
    }

    var matches = index
      .filter(function (entry) {
        return [entry.title, entry.reference, entry.referenceNumber, entry.description]
          .join(" ")
          .toLowerCase()
          .indexOf(normalized) > -1;
      })
      .slice(0, 12);

    if (!matches.length) {
      searchResults.classList.remove("hidden");
      searchResults.innerHTML =
        '<div class="px-3 py-3 text-neutral-500 dark:text-neutral-400">No matches found.</div>';
      return;
    }

    searchResults.classList.remove("hidden");
    searchResults.innerHTML = matches
      .map(function (entry) {
        var status = entry.deprecated
          ? "Deprecated"
          : entry.experimental
            ? "Experimental"
            : entry.private
              ? "Private"
              : "Public";

        return (
          '<a class="kss-search-result" href="' +
          escapeHtml(entry.url) +
          '">' +
          '<span class="block truncate font-medium text-neutral-950 dark:text-neutral-50">' +
          escapeHtml(entry.title || entry.reference) +
          "</span>" +
          '<span class="mt-1 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">' +
          '<span class="font-mono">' +
          escapeHtml(entry.referenceNumber || "") +
          "</span>" +
          "<span>" +
          escapeHtml(status) +
          "</span>" +
          "</span>" +
          "</a>"
        );
      })
      .join("");
  }

  function copyText(text, trigger) {
    var done = function () {
      var original = trigger.getAttribute("aria-label") || "Copy";
      trigger.setAttribute("aria-label", "Copied");
      trigger.dataset.copied = "true";
      window.setTimeout(function () {
        trigger.setAttribute("aria-label", original);
        delete trigger.dataset.copied;
      }, 1200);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () {
        fallbackCopy(text);
        done();
      });
      return;
    }

    fallbackCopy(text);
    done();
  }

  function fallbackCopy(text) {
    var textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  function installScrollSpy() {
    var links = document.querySelectorAll("[data-kss-toc-link]");
    var sections = document.querySelectorAll("[data-kss-section]");

    if (!links.length || !sections.length || !("IntersectionObserver" in window)) {
      return;
    }

    var byId = {};
    links.forEach(function (link) {
      byId[link.dataset.kssTocLink] = link;
    });

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) {
            return;
          }

          links.forEach(function (link) {
            link.removeAttribute("aria-current");
          });

          if (byId[entry.target.id]) {
            byId[entry.target.id].setAttribute("aria-current", "true");
          }
        });
      },
      {
        rootMargin: "-18% 0px -72% 0px",
        threshold: 0.01,
      }
    );

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  function installPseudoStateGenerator() {
    var pseudoSelectors = [
      "hover",
      "enabled",
      "disabled",
      "active",
      "visited",
      "focus",
      "target",
      "checked",
      "empty",
      "first-of-type",
      "last-of-type",
      "first-child",
      "last-child",
    ];
    var pseudos = new RegExp("(\\:" + pseudoSelectors.join("|\\:") + ")", "g");

    try {
      Array.prototype.forEach.call(document.styleSheets, function (stylesheet) {
        if (stylesheet.href && stylesheet.href.indexOf(document.domain) === -1) {
          return;
        }

        Array.prototype.forEach.call(stylesheet.cssRules || [], function (rule) {
          if (rule.type !== CSSRule.STYLE_RULE || !pseudos.test(rule.selectorText)) {
            pseudos.lastIndex = 0;
            return;
          }

          var style = document.createElement("style");
          style.textContent = rule.cssText.replace(pseudos, function (matched) {
            return matched.replace(/\:/g, ".pseudo-class-");
          });
          document.head.appendChild(style);
          pseudos.lastIndex = 0;
        });
      });
    } catch (_error) {
      // Cross-origin stylesheets are ignored by the browser.
    }
  }

  applyTheme(currentTheme());

  if (drawerToggle) {
    drawerToggle.addEventListener("click", function () {
      setDrawer(true);
    });
  }
  if (drawerClose) {
    drawerClose.addEventListener("click", function () {
      setDrawer(false);
    });
  }
  if (drawerOverlay) {
    drawerOverlay.addEventListener("click", function () {
      setDrawer(false);
    });
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      applyTheme(nextTheme(currentTheme()));
    });
  }

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
    if (currentTheme() === "system") {
      applyTheme("system");
    }
  });

  if (searchInput) {
    var searchIndex = getSearchIndex();
    searchInput.addEventListener("input", function () {
      filterCurrentPage(searchInput.value);
      renderGlobalResults(searchIndex, searchInput.value);
    });
    searchInput.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        searchInput.value = "";
        filterCurrentPage("");
        renderGlobalResults(searchIndex, "");
      }
    });
  }

  document.addEventListener("click", function (event) {
    var copyButton = event.target.closest("[data-kss-copy-id]");
    var guidesButton = event.target.closest("[data-kss-guides-toggle]");

    if (copyButton) {
      event.preventDefault();
      event.stopPropagation();
      var target = document.getElementById(copyButton.dataset.kssCopyId);
      if (target) {
        copyText(target.textContent || "", copyButton);
      }
    }

    if (guidesButton) {
      event.preventDefault();
      body.classList.toggle("kss-guides-mode");
    }
  });

  document.addEventListener("keydown", function (event) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k" && searchInput) {
      event.preventDefault();
      searchInput.focus();
    }
    if (event.key === "Escape") {
      setDrawer(false);
    }
  });

  installScrollSpy();
  installPseudoStateGenerator();
})();
