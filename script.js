(async function () {
  const url = "Portfolio.pdf";

  const loadingTask = pdfjsLib.getDocument(url);
  const pdf = await loadingTask.promise;

  const container = document.getElementById("pdfContainer");
  const scale = 1.2;
  const numPages = pdf.numPages;

  async function renderPage(pageNumber) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.className = "pdf-page";
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: canvas.getContext("2d"),
      viewport: viewport,
    }).promise;

    return canvas;
  }

  function createSpread() {
    const spread = document.createElement("section");
    spread.className = "spread";
    return spread;
  }

  // 1. Seite: Deckblatt allein und mittig
  const coverSpread = createSpread();
  coverSpread.classList.add("cover-spread");

  const cover = await renderPage(1);
  coverSpread.appendChild(cover);

  container.appendChild(coverSpread);

  // Ab Seite 2: stets zwei Seiten nebeneinander
  for (let i = 2; i <= numPages; i += 2) {
    const spread = createSpread();

    const leftPage = await renderPage(i);
    spread.appendChild(leftPage);

    if (i + 1 <= numPages) {
      const rightPage = await renderPage(i + 1);
      spread.appendChild(rightPage);
    }

    container.appendChild(spread);
  }
})();
