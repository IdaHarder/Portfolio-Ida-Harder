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

  try {
    const loadingTask = pdfjsLib.getDocument(url);
    pdf = await loadingTask.promise;
    await showSpread(1);
  } catch (error) {
    console.error(error);
    container.innerHTML =
      "<p>Das Portfolio konnte nicht geladen werden.</p>";
    pageIndicator.textContent = "Fehler beim Laden";
  }

  function isMobile() {
    return window.innerWidth <= 768;
  }

  function pagesForCurrentView() {
    if (isMobile()) {
      return [currentStartPage];
    }

    if (currentStartPage === 1) {
      return [1];
    }

    return [currentStartPage, currentStartPage + 1].filter(
      (pageNumber) => pageNumber <= pdf.numPages
    );
  }

  function nextStartPage() {
    if (isMobile()) {
      return currentStartPage + 1;
    }

    return currentStartPage === 1
      ? 2
      : currentStartPage + 2;
  }

  async function renderPage(pageNumber) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    const outputScale = Math.min(
      window.devicePixelRatio || 1,
      2
    );

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.className = "pdf-page";

    /* Sichtbare CSS-Größe */
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    /* Tatsächliche Pixelauflösung */
    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);

    const transform = outputScale !== 1
      ? [outputScale, 0, 0, outputScale, 0, 0]
      : null;

    await page.render({
      canvasContext: context,
      viewport,
      transform,
    }).promise;

    return canvas;
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

      const visiblePages = pagesForCurrentView();

      for (const pageNumber of visiblePages) {
        const canvas = await renderPage(pageNumber);
        spread.appendChild(canvas);
      }

      container.appendChild(spread);

      if (visiblePages.length === 1) {
        pageIndicator.textContent =
          `Seite ${visiblePages[0]} von ${pdf.numPages}`;
      } else {
        pageIndicator.textContent =
          `Seiten ${visiblePages[0]}–${visiblePages[1]} von ${pdf.numPages}`;
      }

      previousButton.disabled = currentStartPage === 1;
      nextButton.disabled = nextStartPage() > pdf.numPages;
    } catch (error) {
      console.error(error);
      container.innerHTML =
        "<p>Diese Seiten konnten nicht geladen werden.</p>";
      pageIndicator.textContent = "Fehler beim Laden";
    } finally {
      isRendering = false;
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

    const nextPage = nextStartPage();

    if (nextPage <= pdf.numPages) {
      showSpread(nextPage);
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
    const currentMobileState = isMobile();

    if (currentMobileState !== previousMobileState && pdf) {
      if (
        !currentMobileState &&
        currentStartPage > 1 &&
        currentStartPage % 2 !== 0
      ) {
        currentStartPage -= 1;
      }

      showSpread(currentStartPage);
    }

    previousMobileState = currentMobileState;
  });
})();
