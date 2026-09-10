(async function () {
  const url = "Portfolio.pdf";

  const loadingTask = pdfjsLib.getDocument(url);
  const pdf = await loadingTask.promise;

  const container = document.getElementById("pdfContainer");
  const scale = 1.2; // anpassen, je nach PDF-Größe

  const numPages = pdf.numPages;

  // Immer zwei Seiten nebeneinander rendern
  for (let i = 1; i <= numPages; i += 2) {
    const leftPageNum = i;
    const rightPageNum = i + 1;

    const leftPage = await pdf.getPage(leftPageNum);
    const leftViewport = leftPage.getViewport({ scale });

    const leftCanvas = document.createElement("canvas");
    leftCanvas.className = "pdf-page";
    leftCanvas.width = leftViewport.width;
    leftCanvas.height = leftViewport.height;

    const rightCanvas = document.createElement("canvas");
    if (rightPageNum <= numPages) {
      const rightPage = await pdf.getPage(rightPageNum);
      const rightViewport = rightPage.getViewport({ scale });

      rightCanvas.className = "pdf-page";
      rightCanvas.width = rightViewport.width;
      rightCanvas.height = rightViewport.height;

      await Promise.all([
        leftPage
          .render({
            canvasContext: leftCanvas.getContext("2d"),
            viewport: leftViewport,
          })
          .promise,
        rightPage
          .render({
            canvasContext: rightCanvas.getContext("2d"),
            viewport: rightViewport,
          })
          .promise,
      ]);
    } else {
      // Nur linke Seite (bei ungerader Seitenzahl)
      await leftPage
        .render({
          canvasContext: leftCanvas.getContext("2d"),
          viewport: leftViewport,
        })
        .promise;
    }

    container.appendChild(leftCanvas);
    if (rightPageNum <= numPages) {
      container.appendChild(rightCanvas);
    }
  }
})();
