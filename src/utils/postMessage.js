export const GARMENT_PAGE_MAP = {
  'T-SHIRT': 1,
  'SWEATSHIRT': 2,
  'HOODIE': 3,
  'ZIPPERHOODIE': 4,
  'SWEATPANTS': 5,
  'SHORTS': 6,
};

export const sendPageMessage = (garmentOrPage) => {
  const pageNum = typeof garmentOrPage === 'number' ? garmentOrPage : (GARMENT_PAGE_MAP[garmentOrPage] || 1);
  const iframes = ["preview-iframe", "preview-iframe2"];
  iframes.forEach((id) => {
    const iframe = document.getElementById(id);
    if (iframe?.contentWindow) {
      console.log(`[postMessage] Sending Page : ${pageNum}`);
      iframe.contentWindow.postMessage(`Page : ${pageNum}`, "*");
    }
  });
};

export const postToPreview = (message) => {
  const iframes = ["preview-iframe", "preview-iframe2"];
  iframes.forEach((id) => {
    const iframe = document.getElementById(id);
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(`rotate ${message}`, "*");
    }
  });
};

