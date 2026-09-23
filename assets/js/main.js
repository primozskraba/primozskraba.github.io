(function () {
  const pubs = window.PUBLICATIONS || [];
  const TYPE_LABEL = { journal: "Journal", conference: "Conference", preprint: "Preprint", other: "Other" };
  const ME = /(P\. [SŠ]kraba)/;

  function el(tag, attrs, children) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") n.className = v;
      else n.setAttribute(k, v);
    }
    for (const c of [].concat(children || [])) {
      if (c != null) n.append(c);
    }
    return n;
  }

  function link(href, text) {
    return el("a", { href, target: "_blank", rel: "noopener" }, text);
  }

  function mainUrl(p) {
    if (p.doi) return "https://doi.org/" + p.doi;
    if (p.url) return p.url;
    if (p.arxiv) return "https://arxiv.org/abs/" + p.arxiv;
    return p.pdf || null;
  }

  function authorsNode(authors) {
    const span = el("div", { class: "pub-authors" });
    authors.split(ME).forEach((part) => {
      if (ME.test(part)) span.append(el("span", { class: "me" }, part));
      else if (part) span.append(part);
    });
    return span;
  }

  function renderPub(p) {
    const url = mainUrl(p);
    const title = el("div", { class: "pub-title" }, url ? link(url, p.title) : p.title);
    const venue = p.venue && !["Preprint", "Manuscript"].includes(p.venue) ? el("div", { class: "pub-venue" }, p.venue) : null;

    const links = el("div", { class: "pub-links" }, [
      el("span", { class: "tag " + p.type }, p.venue === "Manuscript" ? "Manuscript" : TYPE_LABEL[p.type]),
    ]);
    if (p.arxiv) links.append(link("https://arxiv.org/abs/" + p.arxiv, "arXiv"));
    if (p.pdf) links.append(link(encodeURI(p.pdf), "PDF"));
    if (p.doi) links.append(link("https://doi.org/" + p.doi, "DOI"));
    if (p.bibtex) {
      const btn = el("button", { type: "button", class: "bib-btn" }, "BibTeX");
      btn.addEventListener("click", () => openBib(p));
      links.append(btn);
    }

    return el("li", { class: "pub" }, [title, authorsNode(p.authors), venue, links]);
  }

  const bibDialog = document.getElementById("bib-dialog");
  const bibText = document.getElementById("bib-text");
  const bibCopy = document.getElementById("bib-copy");

  function selectBib() {
    const range = document.createRange();
    range.selectNodeContents(bibText);
    getSelection().removeAllRanges();
    getSelection().addRange(range);
  }

  function openBib(p) {
    bibText.textContent = p.bibtex.trim();
    bibCopy.textContent = "Copy";
    bibDialog.showModal();
    selectBib();
  }

  bibCopy.addEventListener("click", () => {
    selectBib();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) {}
    if (ok) { bibCopy.textContent = "Copied"; return; }
    navigator.clipboard.writeText(bibText.textContent).then(
      () => (bibCopy.textContent = "Copied"),
      () => (bibCopy.textContent = "Press ⌘C / Ctrl+C")
    );
  });
  bibDialog.addEventListener("click", (e) => {
    if (e.target === bibDialog) bibDialog.close();
  });

  // Latest papers (hero)
  const latest = document.getElementById("latest-list");
  if (latest) {
    pubs.slice(0, 4).forEach((p) => {
      const url = mainUrl(p);
      latest.append(
        el("li", {}, [
          url ? link(url, p.title) : el("strong", {}, p.title),
          el("div", { class: "meta" }, `with ${p.authors.split(", ").filter((a) => !ME.test(a)).join(", ")} · ${p.year}`),
        ])
      );
    });
  }

  // Publication list
  const list = document.getElementById("pub-list");
  const empty = document.getElementById("pub-empty");
  const search = document.getElementById("pub-search");
  const chips = document.querySelectorAll(".chip");
  let activeType = "all";

  chips.forEach((c) => {
    const t = c.dataset.type;
    c.querySelector(".count").textContent = t === "all" ? pubs.length : pubs.filter((p) => p.type === t).length;
  });

  function normalize(s) {
    return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function renderList() {
    const words = normalize(search.value).split(/\s+/).filter(Boolean);
    const shown = pubs.filter((p) => {
      if (activeType !== "all" && p.type !== activeType) return false;
      const hay = normalize(`${p.title} ${p.authors} ${p.venue} ${p.year}`);
      return words.every((w) => hay.includes(w));
    });

    list.replaceChildren();
    const byYear = new Map();
    shown.forEach((p) => {
      if (!byYear.has(p.year)) byYear.set(p.year, []);
      byYear.get(p.year).push(p);
    });
    for (const [year, items] of [...byYear].sort((a, b) => b[0] - a[0])) {
      list.append(
        el("div", { class: "year-group" }, [
          el("div", { class: "year-label" }, String(year)),
          el("ul", { class: "pub-items" }, items.map(renderPub)),
        ])
      );
    }
    empty.hidden = shown.length > 0;
    typeset(list);
  }

  function typeset(node) {
    if (window.MathJax && MathJax.typesetPromise) {
      MathJax.typesetPromise([node]).catch(() => {});
    }
  }

  chips.forEach((c) =>
    c.addEventListener("click", () => {
      activeType = c.dataset.type;
      chips.forEach((x) => x.setAttribute("aria-pressed", String(x === c)));
      renderList();
    })
  );
  search.addEventListener("input", renderList);
  renderList();
  if (latest) typeset(latest);

  // Active nav link
  const navLinks = [...document.querySelectorAll(".nav-links a")];
  const sections = navLinks.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  sections.forEach((s) => observer.observe(s));

  // Theme toggle
  const root = document.documentElement;
  const toggle = document.querySelector(".theme-toggle");
  const icon = toggle.querySelector("i");
  const isDark = () =>
    root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  const syncIcon = () => (icon.className = isDark() ? "fa-solid fa-sun" : "fa-solid fa-moon");
  syncIcon();
  toggle.addEventListener("click", () => {
    root.dataset.theme = isDark() ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
    syncIcon();
  });

  // Streamlit viewer: load on demand (the app sleeps and is slow to wake)
  const loadBtn = document.getElementById("viewer-load");
  loadBtn.addEventListener("click", () => {
    const frame = document.getElementById("viewer-frame");
    frame.classList.add("loaded");
    frame.replaceChildren(
      el("iframe", { src: "https://cycleview-persistence.streamlit.app?embed=true", title: "Persistent cycle viewer", allow: "fullscreen" })
    );
  });

  document.getElementById("year").textContent = new Date().getFullYear();
})();
