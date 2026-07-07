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
    "hs-blog": "Writing · the top shelf",
    "hs-resources": "Client resources · the middle shelf",
    "hs-contact": "Contact · the calendar",
    "hs-cat": "Boston (do not disturb)",
    "hs-paper-1": "A crumpled note",
    "hs-paper-2": "A crumpled note",
    "hs-paper-3": "A crumpled note",
    "bird": "A little visitor",
    "hs-yinyang": "The center of things",
  };
  const PANEL_FOR = {
    "hs-welcome": "welcome",
    "hs-about": "about",
    "hs-services": "services",
    "hs-blog": "blog",
    "hs-resources": "resources",
    "hs-contact": "contact",
    "hs-cat": "cat",
  };

  /* hover labels removed by request — stubs keep the call sites simple;
     LABELS still feeds the aria-labels for assistive tech */
  function showLabel() {}
  function hideLabel() {}

  function activate(hs) {
    if (portalRunning) return;
    if (hs.id === "hs-window") cycleWindow();
    else if (hs.id === "hs-cat") catClick(hs);
    else if (hs.id === "bird") birdClick();
    else if (hs.id === "hs-yinyang") yinyangClick();
    else if (hs.id.startsWith("hs-paper-")) openPaper(hs.id.slice(-1), hs);
    else openPanel(PANEL_FOR[hs.id]);
  }

  document.querySelectorAll(".hotspot").forEach((hs) => {
    hs.addEventListener("click", () => activate(hs));
    hs.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activate(hs);
      }
    });
  });

  /* ---------------- loose papers & wastebasket ----------------
     each paper opens a quote; "Tidy up" tosses it in the basket,
     which fills by thirds until all three papers are cleared */
  const PAPER_QUOTES = {
    1: { quote: "When I let go of what I am, I become what I might be.", by: "Lao Tzu" },
    2: { quote: "The wound is the place where the light enters you.", by: "Rumi" },
    3: { quote: "You can't stop the waves, but you can learn to surf.", by: "Jon Kabat-Zinn" },
  };
  let tidied = 0;

  function openPaper(n, hs) {
    const q = PAPER_QUOTES[n];
    if (!q) return;
    lastFocus = document.activeElement;
    content.innerHTML =
      '<h2 id="overlay-title">A crumpled note</h2>' +
      '<blockquote class="paper-quote">“' + q.quote + '”</blockquote>' +
      '<p class="quote-by">— ' + q.by + "</p>" +
      '<div class="welcome-actions"><button class="btn-primary" id="tidy-btn">Tidy up</button></div>';
    content.querySelector("#tidy-btn").addEventListener("click", () => {
      hs.parentElement.style.display = "none";
      tidied += 1;
      const ball = document.getElementById("basket-ball-" + tidied);
      if (ball) ball.classList.add("in-basket");
      closePanel();
    });
    const hint = document.getElementById("room-hint");
    if (hint) hint.classList.add("hidden");
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    card.focus();
    hideLabel();
  }

  /* ---------------- Boston's moods ----------------
     click 1: eyes open · click 2: tail swish · click 3: moves to
     the couch · after that, clicks open his introduction */
  let catState = 0;
  function catClick(hs) {
    if (birdState >= 1) {
      // Boston is mid-chase — he has no time for the state machine
      openPanel("cat");
      return;
    }
    if (catState === 0) {
      catState = 1;
      hs.classList.add("cat-awake");
      LABELS["hs-cat"] = "Boston is awake";
    } else if (catState === 1) {
      catState = 2;
      hs.classList.add("cat-swish");
      setTimeout(() => hs.classList.remove("cat-swish"), 3500);
      LABELS["hs-cat"] = "Boston approves";
    } else if (catState === 2) {
      catState = 3;
      document.getElementById("cat-pos").classList.add("on-couch");
      LABELS["hs-cat"] = "Boston · couch privileges";
    } else {
      openPanel("cat");
      return;
    }
    hs.setAttribute("aria-label", LABELS["hs-cat"]);
    showLabel(hs);
  }

  /* ---------------- window easter egg ----------------
     click 1: curtains open (daylight brightens the room by day)
     click 2: sashes open, a bird flies in, the cat wakes up
     click 3: everything closes again */
  let windowState = 0;
  let closingWindow = false;
  const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  function cycleWindow() {
    if (closingWindow) return;
    const next = (windowState + 1) % 3;
    if (next === 0 && birdState < 2) {
      // the bird gets a head start: it flies out, then the window closes
      closingWindow = true;
      clearTimeout(landTimer);
      document.body.classList.remove("bird-here");
      const birdPos = document.getElementById("bird-pos");
      birdPos.classList.remove("bird-shelf");
      birdPos.classList.add("bird-out");
      setTimeout(() => {
        closingWindow = false;
        applyWindowState(0);
      }, reducedMotion() ? 0 : 1300);
      return;
    }
    applyWindowState(next);
  }

  function applyWindowState(s) {
    windowState = s;
    document.body.classList.toggle("curtains-open", s >= 1);
    document.body.classList.toggle("window-open", s === 2);
    if (s === 2) birdArrives();
    if (s === 0) windowClosedReset();
    LABELS["hs-window"] =
      s === 0 ? "Open the curtains" : s === 1 ? "Open the window" : "Close it all up";
    const hs = document.getElementById("hs-window");
    hs.setAttribute("aria-label", "The window — click to " + LABELS["hs-window"].toLowerCase());
    showLabel(hs);
  }

  /* ---------------- the bird chase ----------------
     bird arrives: a sleeping Boston opens his eyes; an already-awake
     Boston turns to face the bird. click the bird → it hops to the
     bookshelf, Boston follows to the right of the sofa. click again →
     it flies out the window, Boston claims the bookshelf. closing the
     window after a chase sends Boston back to the rug, asleep. */
  let birdState = 0; // 0 perched on couch · 1 on bookshelf · 2 flown out
  let birdLanded = false;
  let landTimer = null;

  function birdArrives() {
    birdState = 0;
    birdLanded = false;
    clearTimeout(landTimer);
    // Boston reacts only once the bird has actually landed:
    // eyes open (if asleep), turn toward the bird, tail swishing
    landTimer = setTimeout(() => {
      birdLanded = true;
      document.body.classList.add("bird-here");
      document.getElementById("cat-flip").classList.add("face-bird");
    }, reducedMotion() ? 0 : 2450);
  }

  function birdClick() {
    if (!document.body.classList.contains("window-open") || closingWindow || !birdLanded) return;
    const birdPos = document.getElementById("bird-pos");
    const catPos = document.getElementById("cat-pos");
    const flip = document.getElementById("cat-flip");
    if (birdState === 0) {
      birdState = 1;
      birdPos.classList.add("bird-shelf");
      catPos.classList.remove("on-couch");
      catPos.classList.add("chase-sofa");
      flip.classList.add("face-bird");
      document.getElementById("hs-cat").classList.add("cat-awake");
      LABELS["bird"] = "Almost caught it";
      showLabel(document.getElementById("bird"));
    } else if (birdState === 1) {
      birdState = 2;
      document.body.classList.remove("bird-here");
      birdPos.classList.remove("bird-shelf");
      birdPos.classList.add("bird-out");
      catPos.classList.remove("chase-sofa");
      catPos.classList.add("chase-shelf");
      flip.classList.remove("face-bird");
      hideLabel();
    }
  }

  function resetCat() {
    // Boston returns to the rug and dozes off
    catState = 0;
    document.getElementById("cat-pos").classList.remove("on-couch", "chase-sofa", "chase-shelf");
    const cat = document.getElementById("hs-cat");
    cat.classList.remove("cat-awake", "cat-swish");
    document.getElementById("cat-flip").classList.remove("face-bird");
    LABELS["hs-cat"] = "Boston (do not disturb)";
    cat.setAttribute("aria-label", "Boston the cat, asleep on the rug");
  }

  function windowClosedReset() {
    clearTimeout(landTimer);
    birdLanded = false;
    document.body.classList.remove("bird-here");
    document.getElementById("cat-flip").classList.remove("face-bird");
    if (birdState >= 1) resetCat(); // the chase happened
    birdState = 0;
    document.getElementById("bird-pos").classList.remove("bird-shelf", "bird-out");
    LABELS["bird"] = "A little visitor";
  }

  /* ---------------- the yin-yang portal ----------------
     eight patient clicks on the rug's center: the vortex spins,
     the room darkens, days streak past the window, Boston rides
     it out under the couch — then it all settles back to normal. */
  let yyClicks = 0;
  let portalRunning = false;

  function yinyangClick() {
    yyClicks += 1;
    if (yyClicks >= 8) {
      yyClicks = 0;
      runPortal();
      return;
    }
    if (yyClicks >= 5) {
      // clicks 5–7: a small ember of the portal, a little brighter each time
      const ember = document.getElementById("yy-ember");
      ember.style.setProperty("--ember", (0.35 + (yyClicks - 4) * 0.2).toFixed(2));
      ember.classList.remove("ember");
      void ember.getBoundingClientRect(); // restart the one-shot animation
      ember.classList.add("ember");
      setTimeout(() => ember.classList.remove("ember"), 1000);
    }
  }

  function runPortal() {
    portalRunning = true;
    hideLabel();
    document.body.classList.add("portal-active");
    const T = reducedMotion() ? 0.35 : 1;
    // the portal closes on its own; every element glides back to
    // exactly its pre-portal state via its normal transitions
    setTimeout(() => {
      document.body.classList.remove("portal-active");
      portalRunning = false;
    }, 6800 * T);
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

  /* contact form: composes the email and opens the visitor's mail app
     addressed to the practice — nothing is stored or sent to a server */
  content.addEventListener("submit", (e) => {
    if (e.target.id !== "contact-form") return;
    e.preventDefault();
    const val = (id) => (content.querySelector(id)?.value || "").trim();
    const name = val("#cf-name");
    const kind = val("#cf-kind");
    const subject = "Website inquiry — " + kind.toLowerCase() + " therapy" + (name ? " — " + name : "");
    const body =
      "Name: " + (name || "—") +
      "\nEmail: " + val("#cf-email") +
      "\nPhone: " + (val("#cf-phone") || "—") +
      "\nKind of therapy: " + kind +
      "\n\n" + val("#cf-msg");
    window.location.href =
      "mailto:hello@artxutherapy.com?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);
    const btn = e.target.querySelector("button[type=submit]");
    btn.textContent = "Opening your email app…";
    setTimeout(() => (btn.textContent = "Send"), 4000);
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
