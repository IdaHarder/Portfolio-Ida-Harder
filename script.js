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

  function pagesForCurrentView() {
    if (window.innerWidth <= 768) {
      return [currentStartPage];
    }

    if (currentStartPage === 1) {
      return [1];
    }

    return [currentStartPage, currentStartPage + 1].filter(
      (pageNumber) => pageNumber <= pdf.numPages
    );
  }

  async function renderPage(pageNumber) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.className = "pdf-page";

    /* Sichtbare Größe im Layout */
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    /* Höhere interne Auflösung für scharfe Linien und Text */
    canvas.width = Math.floor(viewport.width * pixelRatio);
    canvas.height = Math.floor(viewport.height * pixelRatio);

    await page.render({
      canvasContext: context,
      viewport: viewport,
      transform:
        pixelRatio !== 1
          ? [pixelRatio, 0, 0, pixelRatio, 0, 0]
          : null,
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

    if (window.innerWidth <= 768) {
      nextButton.disabled = currentStartPage >= pdf.numPages;
    } else {
      const nextStartPage =
        currentStartPage === 1 ? 2 : currentStartPage + 2;

      nextButton.disabled = nextStartPage > pdf.numPages;
    }

    isRendering = false;
  }

  function previous() {
    if (!pdf || isRendering || currentStartPage === 1) return;

    if (window.innerWidth <= 768) {
      showSpread(currentStartPage - 1);
      return;
    }

    if (currentStartPage <= 2) {
      showSpread(1);
      return;
    }

    showSpread(currentStartPage - 2);
  }

  function next() {
    if (!pdf || isRendering) return;

    if (window.innerWidth <= 768) {
      if (currentStartPage < pdf.numPages) {
        showSpread(currentStartPage + 1);
      }
      return;
    }

    const nextStartPage =
      currentStartPage === 1 ? 2 : currentStartPage + 2;

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

  let previousWidth = window.innerWidth;

  window.addEventListener("resize", () => {
    const wasDesktop = previousWidth > 768;
    const isDesktop = window.innerWidth > 768;

    if (wasDesktop !== isDesktop && pdf) {
      if (
        isDesktop &&
        currentStartPage > 1 &&
        currentStartPage % 2 !== 0
      ) {
        currentStartPage -= 1;
      }

      showSpread(currentStartPage);
    }

    previousWidth = window.innerWidth;
  });
})();
