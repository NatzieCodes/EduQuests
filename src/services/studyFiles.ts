const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_EXTRACTED_CHARACTERS = 50_000;
const MAX_PDF_PAGES = 300;

export async function extractStudyText(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension !== 'pdf' && extension !== 'txt') {
    throw new Error('Unsupported file. Upload a PDF or .txt file, or paste your notes.');
  }
  if (file.size === 0 || file.size > MAX_FILE_BYTES) {
    throw new Error('Choose a non-empty PDF or text file smaller than 20 MB.');
  }

  if (extension === 'txt') {
    if (file.type && file.type !== 'text/plain') {
      throw new Error('The selected .txt file is not a supported text file.');
    }
    const text = (await file.text()).trim();
    if (!text) throw new Error('This text file is empty.');
    if (text.length > MAX_EXTRACTED_CHARACTERS) {
      throw new Error('This text file exceeds 50,000 characters. Split it into smaller study materials.');
    }
    return text;
  }

  if (file.type && file.type !== 'application/pdf') {
    throw new Error('The selected file is not a supported PDF.');
  }
  try {
    const [{ getDocument, GlobalWorkerOptions }, workerSrc] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]);
    GlobalWorkerOptions.workerSrc = workerSrc.default;
    const loadingTask = getDocument({ data: await file.arrayBuffer() });
    try {
      const pdf = await loadingTask.promise;
      if (pdf.numPages > MAX_PDF_PAGES) {
        throw new Error(`This PDF has ${pdf.numPages} pages. Split it into files with no more than ${MAX_PDF_PAGES} pages.`);
      }
      const pages: string[] = [];
      let characterCount = 0;
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const pageText = content.items
          .filter((item) => 'str' in item)
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ');
        characterCount += pageText.length;
        if (characterCount > MAX_EXTRACTED_CHARACTERS) {
          throw new Error('This PDF contains more than 50,000 characters. Split it into smaller study materials.');
        }
        pages.push(pageText);
      }
      const text = pages.join('\n').trim();
      if (!text) {
        throw new Error('No selectable text was found in this PDF. It may be scanned; paste its text or use a text-based PDF.');
      }
      return text;
    } finally {
      await loadingTask.destroy();
    }
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.startsWith('No selectable text') ||
        error.message.startsWith('This PDF has') ||
        error.message.startsWith('This PDF contains'))
    ) throw error;
    throw new Error('Could not read this PDF. Check that the file is valid and not password-protected.');
  }
}
