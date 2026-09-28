import jsPDF from "jspdf";

export function exportReportToPDF(analysis, meta = {}) {
  const doc = new jsPDF();
  const margin = 15;
  let y = margin;

  function addLine(text, size = 11, bold = false) {
    doc.setFontSize(size);
    doc.setFont(undefined, bold ? "bold" : "normal");
    const lines = doc.splitTextToSize(text, 180);
    doc.text(lines, margin, y);
    y += lines.length * (size / 2.2) + 4;
    if (y > 280) {
      doc.addPage();
      y = margin;
    }
  }

  addLine("Job Scam Guardian - Analysis Report", 16, true);
  addLine(new Date().toLocaleString(), 10);
  y += 4;

  if (meta.companyName) addLine(`Company: ${meta.companyName}`, 11, true);
  if (meta.senderDomain) addLine(`Sender domain: ${meta.senderDomain}`, 11, true);

  y += 2;
  addLine(`Risk Score: ${analysis.riskScore}/100`, 13, true);
  addLine(`Risk Level: ${analysis.riskLevel?.toUpperCase()}`, 13, true);

  y += 4;
  addLine("Summary", 13, true);
  addLine(analysis.summary || "No summary provided.");

  y += 4;

  const detectedFlags = analysis.flags?.filter((f) => f.detected) || [];

  if (detectedFlags.length > 0) {
    addLine("Warning Signs Detected", 13, true);

    detectedFlags.forEach((flag) => {
      addLine(flag.category, 11, true);
      if (flag.evidence) {
        addLine(`Evidence: "${flag.evidence}"`, 10);
      }
      y += 2;
    });
  } else {
    addLine("No warning signs detected.", 11);
  }

  y += 6;
  addLine(
    "This tool provides an educational risk assessment. A high or low score does not prove whether a job offer or company is legitimate. Always verify the employer independently before sharing personal information or sending money.",
    9
  );

  doc.save("job-scam-guardian-report.pdf");
}