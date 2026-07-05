/* A Quiet Room by the Bay — interactions */
(function () {
  "use strict";

  /* ---------------- time-of-day sky ---------------- */
  function setTimeOfDay() {
    const h = new Date().getHours();
    let t = "day";
    if (h >= 5 && h < 8) t = "dawn";
    else if (h >= 8 && h < 17) t = "day";
    else if (h >= 17 && h < 20) t = "dusk";
    else t = "night";
    document.body.dataset.time = t;
  }
  setTimeOfDay();
  setInterval(setTimeOfDay, 5 * 60 * 1000);

  document.getElementById("year").textContent = new Date().getFullYear();

  /* the wall calendar shows the visitor's actual month, with today circled */
  function setCalendar() {
    const now = new Date();
    const month = now
      .toLocaleDateString(undefined, { month: "long" })
      .toUpperCase();
    const monthEl = document.getElementById("cal-month");
    monthEl.textContent = month;
    monthEl.setAttribute("font-size", month.length > 7 ? "11" : "15");
    monthEl.setAttribute("letter-spacing", month.length > 7 ? "1.5" : "3");
    // map today's date onto the 5x3 grid of squares (cells start at 570,308; 21px x 24px pitch)
    const d = now.getDate() - 1;
    const col = d % 5;
    const row = Math.floor(d / 5) % 3;
    const today = document.getElementById("cal-today");
    today.setAttribute("cx", 570 + col * 21 + 7);
    today.setAttribute("cy", 308 + row * 24 + 7);
  }
  setCalendar();

  /* ---------------- hotspot labels ---------------- */
  const LABELS = {
    "hs-window": "Open the curtains",
    "hs-welcome": "Welcome · have a seat",
    "hs-about": "About me · the diploma",
    "hs-services": "Services & fees · the plant shelf",
    "hs-blog": "Writing · the bookshelf",
    "hs-contact": "Contact · the calendar",
    "hs-cat": "Boston (do not disturb)",
  };
  const PANEL_FOR = {
    "hs-welcome": "welcome",
    "hs-about": "about",
    "hs-services": "services",
    "hs-blog": "blog",
    "hs-contact": "contact",
    "hs-cat": "cat",
  };

  const label = document.getElementById("hotspot-label");
  const frame = document.getElementById("room-frame");

  function showLabel(hotspot) {
    const text = LABELS[hotspot.id];
    if (!text) return;
    const hb = hotspot.getBoundingClientRect();
    const fb = frame.getBoundingClientRect();
    label.textContent = text;
    const half = label.offsetWidth / 2 || 60;
    const x = hb.left - fb.left + hb.width / 2;
    label.style.left = Math.min(Math.max(x, half + 6), fb.width - half - 6) + "px";
    const above = hb.top - fb.top - 38;
    label.style.top = Math.max(8, above) + "px";
    label.classList.add("show");
  }
  function hideLabel() {
    label.classList.remove("show");
  }

  function activate(hs) {
    if (hs.id === "hs-window") cycleWindow();
    else openPanel(PANEL_FOR[hs.id]);
  }

  document.querySelectorAll(".hotspot").forEach((hs) => {
    hs.addEventListener("mouseenter", () => showLabel(hs));
    hs.addEventListener("mouseleave", hideLabel);
    hs.addEventListener("focus", () => showLabel(hs));
    hs.addEventListener("blur", hideLabel);
    hs.addEventListener("click", () => activate(hs));
    hs.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activate(hs);
      }
    });
  });

  /* ---------------- window easter egg ----------------
     click 1: curtains open (daylight brightens the room by day)
     click 2: sashes open, a bird flies in, the cat wakes up
     click 3: everything closes again */
  let windowState = 0;
  function cycleWindow() {
    windowState = (windowState + 1) % 3;
    document.body.classList.toggle("curtains-open", windowState >= 1);
    document.body.classList.toggle("window-open", windowState === 2);
    LABELS["hs-window"] =
      windowState === 0
        ? "Open the curtains"
        : windowState === 1
          ? "Open the window"
          : "Close it all up";
    const hs = document.getElementById("hs-window");
    hs.setAttribute("aria-label", "The window — click to " + LABELS["hs-window"].toLowerCase());
    showLabel(hs);
  }

  /* ---------------- overlay ---------------- */
  const overlay = document.getElementById("overlay");
  const card = document.getElementById("overlay-card");
  const content = document.getElementById("overlay-content");
  const closeBtn = document.getElementById("overlay-close");
  let lastFocus = null;

  function openPanel(name) {
    const tpl = document.getElementById("panel-" + name);
    if (!tpl) return;
    lastFocus = document.activeElement;
    content.replaceChildren(tpl.content.cloneNode(true));
    const hint = document.getElementById("room-hint");
    if (hint) hint.classList.add("hidden");
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    card.focus();
    hideLabel();
    if (name === "blog") initBlog();
  }
  function closePanel() {
    overlay.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }

  closeBtn.addEventListener("click", closePanel);
  document.getElementById("overlay-scrim").addEventListener("click", closePanel);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) closePanel();
  });

  /* icon nav */
  document.querySelectorAll("#icon-nav button").forEach((btn) => {
    btn.addEventListener("click", () => openPanel(btn.dataset.panel));
  });

  /* buttons inside overlay content (e.g. welcome panel actions) */
  content.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-panel]");
    if (btn) openPanel(btn.dataset.panel);
  });

  /* ---------------- blog: markdown posts ----------------
     To publish a new article: drop a .md file in posts/ and add
     one entry to posts/posts.json. No code changes needed.
     Note: articles load over HTTP, so view the site through a
     web server or its hosted URL (file:// blocks fetch). */
  let postsIndex = null;

  async function initBlog() {
    const list = content.querySelector("#blog-list");
    try {
      if (!postsIndex) {
        const res = await fetch("posts/posts.json");
        if (!res.ok) throw new Error(res.status);
        postsIndex = await res.json();
      }
      renderPostList(list);
    } catch {
      list.innerHTML =
        location.protocol === "file:"
          ? '<p class="muted">Articles can’t load when the page is opened straight from disk — they’ll appear when the site is viewed through a web server or its hosted address.</p>'
          : '<p class="muted">Articles are unavailable right now.</p>';
    }
  }

  function renderPostList(list) {
    list.replaceChildren();
    postsIndex.forEach((post) => {
      const btn = document.createElement("button");
      btn.className = "post-link";
      btn.innerHTML =
        '<span class="post-title"></span><span class="post-meta"></span><p class="post-summary"></p>';
      btn.querySelector(".post-title").textContent = post.title;
      btn.querySelector(".post-meta").textContent = formatDate(post.date);
      btn.querySelector(".post-summary").textContent = post.summary;
      btn.addEventListener("click", () => openPost(post));
      list.appendChild(btn);
    });
  }

  async function openPost(post) {
    const list = content.querySelector("#blog-list");
    const article = content.querySelector("#blog-article");
    const body = content.querySelector("#blog-article-body");
    try {
      const res = await fetch("posts/" + post.slug + ".md");
      if (!res.ok) throw new Error(res.status);
      const md = await res.text();
      body.innerHTML =
        '<div class="article-date">' + formatDate(post.date) + "</div>" + renderMarkdown(md);
    } catch {
      body.innerHTML = '<p class="muted">Couldn’t load this article.</p>';
    }
    list.hidden = true;
    article.hidden = false;
    content.querySelector("#blog-back").addEventListener("click", () => {
      article.hidden = true;
      list.hidden = false;
    });
  }

  function formatDate(iso) {
    return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  /* minimal markdown renderer: headings, bold, italic,
     links, blockquotes, lists, paragraphs */
  function renderMarkdown(md) {
    const esc = (s) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const inline = (s) =>
      s
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(
          /\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g,
          '<a href="$2" target="_blank" rel="noopener">$1</a>'
        );

    const lines = md.split(/\r?\n/);
    const out = [];
    let para = [];
    let inList = false;

    const flushPara = () => {
      if (para.length) {
        out.push("<p>" + inline(esc(para.join(" "))) + "</p>");
        para = [];
      }
    };
    const closeList = () => {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
    };

    for (const raw of lines) {
      const line = raw.trimEnd();
      const h = line.match(/^(#{1,3})\s+(.*)/);
      if (h) {
        flushPara();
        closeList();
        const lvl = h[1].length;
        out.push("<h" + lvl + ">" + inline(esc(h[2])) + "</h" + lvl + ">");
      } else if (/^>\s?/.test(line)) {
        flushPara();
        closeList();
        out.push("<blockquote><p>" + inline(esc(line.replace(/^>\s?/, ""))) + "</p></blockquote>");
      } else if (/^[-*]\s+/.test(line)) {
        flushPara();
        if (!inList) {
          out.push("<ul>");
          inList = true;
        }
        out.push("<li>" + inline(esc(line.replace(/^[-*]\s+/, ""))) + "</li>");
      } else if (line === "") {
        flushPara();
        closeList();
      } else {
        para.push(line);
      }
    }
    flushPara();
    closeList();
    return out.join("\n");
  }
})();
