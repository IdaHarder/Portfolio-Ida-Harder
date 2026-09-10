(async function () {
  const url = "Portfolio.pdf";
  const scale = 1.35;

  const container = document.getElementById("pdfContainer");
  const previousButton = document.getElementById("previousButton");
  const nextButton = document.getElementById("nextButton");
  const pageIndicator = document.getElementById("pageIndicator");

  let pdf;
  let currentStartPage = 1;
  let isRendering = false;
  const pageCache = new Map();

  try {
    const loadingTask = pdfjsLib.getDocument(url);
    pdf = await loadingTask.promise;
    await showSpread(1);
  } catch (error) {
    console.error(error);
    container.innerHTML = "<p>Das Portfolio konnte nicht geladen werden.</p>";
    pageIndicator.textContent = "Fehler beim Laden";
  }

  function isMobile() {
    return window.innerWidth <= 768;
  }

  function pagesFor(startPage) {
    if (isMobile() || startPage === 1) {
      return [startPage];
    }

    return [startPage, startPage + 1].filter(
      (pageNumber) => pageNumber <= pdf.numPages
    );
  }

  function nextStartAfter(startPage) {
    if (isMobile()) {
      return startPage + 1;
    }

    return startPage === 1 ? 2 : startPage + 2;
  }

  async function getPageData(pageNumber) {
    if (!pageCache.has(pageNumber)) {
      const job = (async () => {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale });
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);

        await page.render({
          canvasContext: context,
          viewport,
          transform: pixelRatio !== 1
            ? [pixelRatio, 0, 0, pixelRatio, 0, 0]
            : null,
        }).promise;

        return {
          bitmap: await createImageBitmap(canvas),
          width: canvas.width,
          height: canvas.height,
          cssWidth: `${viewport.width}px`,
          cssHeight: `${viewport.height}px`,
        };
      })();

      pageCache.set(pageNumber, job);
    }

    return pageCache.get(pageNumber);
  }

  async function renderPage(pageNumber) {
    const data = await getPageData(pageNumber);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.className = "pdf-page";
    canvas.width = data.width;
    canvas.height = data.height;
    canvas.style.width = data.cssWidth;
    canvas.style.height = data.cssHeight;

    context.drawImage(data.bitmap, 0, 0);
    return canvas;
  }

  async function preloadNextSpread() {
    const nextStartPage = nextStartAfter(currentStartPage);

    if (!pdf || nextStartPage > pdf.numPages) return;

    try {
      await Promise.all(pagesFor(nextStartPage).map(getPageData));
    } catch (error) {
      console.warn("Nächste Seiten konnten nicht vorgeladen werden.", error);
    }
  }

  async function showSpread(startPage) {
    if (!pdf || isRendering) return;

    isRendering = true;
    currentStartPage = startPage;
    previousButton.disabled = true;
    nextButton.disabled = true;
    pageIndicator.textContent = "Lade Seiten …";
    container.innerHTML = "";

    try {
      const spread = document.createElement("section");
      spread.className = "spread";

      if (currentStartPage === 1) {
        spread.classList.add("cover-spread");
      }

      const visiblePages = pagesFor(currentStartPage);
      const canvases = await Promise.all(visiblePages.map(renderPage));
      canvases.forEach((canvas) => spread.appendChild(canvas));
      container.appendChild(spread);

      if (visiblePages.length === 1) {
        pageIndicator.textContent = `Seite ${visiblePages[0]} von ${pdf.numPages}`;
      } else {
        pageIndicator.textContent = `Seiten ${visiblePages[0]}–${visiblePages[1]} von ${pdf.numPages}`;
      }

      previousButton.disabled = currentStartPage === 1;
      nextButton.disabled = nextStartAfter(currentStartPage) > pdf.numPages;
    } catch (error) {
      console.error(error);
      container.innerHTML = "<p>Diese Seiten konnten nicht geladen werden.</p>";
      pageIndicator.textContent = "Fehler beim Laden";
    } finally {
      isRendering = false;
      window.setTimeout(preloadNextSpread, 150);
    }
  }

  function previous() {
    if (!pdf || isRendering || currentStartPage === 1) return;

    if (isMobile()) {
      showSpread(currentStartPage - 1);
    } else if (currentStartPage <= 2) {
      showSpread(1);
    } else {
      showSpread(currentStartPage - 2);
    }
  }

  function next() {
    if (!pdf || isRendering) return;

    const nextStartPage = nextStartAfter(currentStartPage);
    if (nextStartPage <= pdf.numPages) {
      showSpread(nextStartPage);
    }
  }

  previousButton.addEventListener("click", previous);
  nextButton.addEventListener("click", next);

  window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") previous();
    if (event.key === "ArrowRight") next();
  });

  let previousMobileState = isMobile();

  window.addEventListener("resize", () => {
    const nowMobile = isMobile();

    if (nowMobile !== previousMobileState && pdf) {
      if (!nowMobile && currentStartPage > 1 && currentStartPage % 2 !== 0) {
        currentStartPage -= 1;
      }

      showSpread(currentStartPage);
    }

    previousMobileState = nowMobile;
  });
})();
