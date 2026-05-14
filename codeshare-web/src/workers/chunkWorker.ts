/**
 * Web Worker for non-blocking string chunking.
 * This ensures that slicing 1MB+ strings doesn't freeze the UI.
 */

self.onmessage = (e: MessageEvent<{ code: string; chunkSize: number }>) => {
  const { code, chunkSize } = e.data;
  const chunks: string[] = [];
  
  const totalLength = code.length;
  let offset = 0;
  
  while (offset < totalLength) {
    const end = Math.min(offset + chunkSize, totalLength);
    chunks.push(code.slice(offset, end));
    offset = end;
    
    // Optional: report progress back if needed
    if (offset % (chunkSize * 10) === 0) {
      self.postMessage({ type: 'progress', progress: (offset / totalLength) * 100 });
    }
  }
  
  self.postMessage({ type: 'done', chunks });
};
