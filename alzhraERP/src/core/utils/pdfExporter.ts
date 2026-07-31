
export const exportToPDF = async (element: HTMLElement, fileName: string) => {
  if (!element) {
    console.error(`Export element not provided`);
    return;
  }

  try {
    // Dynamic Import: Load heavy libraries ONLY when function is called
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');

    // 1. Capture the element as a high-res canvas
    const canvas = await html2canvas(element, {
      scale: 2, // Increase scale for better quality
      useCORS: true, // Allow loading cross-origin images
      logging: false,
      backgroundColor: '#ffffff', // Ensure white background
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight
    });

    const imgData = canvas.toDataURL('image/png');

    // 2. Initialize PDF (A4 size)
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // 3. Calculate ratio to fit width
    const ratio = pdfWidth / imgWidth;
    const scaledHeight = imgHeight * ratio;

    // 4. Handle PDF generation
    if (scaledHeight <= pdfHeight) {
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, scaledHeight);
    } else {
      const customPdf = new jsPDF('p', 'mm', [pdfWidth, (scaledHeight * 25.4) / 96 + 20]);
      customPdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, scaledHeight);
      customPdf.save(`${fileName}.pdf`);
      return;
    }

    pdf.save(`${fileName}.pdf`);
  } catch (error) {
    console.error('PDF Export Failed:', error);
    throw error;
  }
};
