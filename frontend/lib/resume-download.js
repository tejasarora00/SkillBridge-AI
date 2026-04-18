export function downloadResumeFile(uploadedResume) {
  if (!uploadedResume?.dataBase64 || !uploadedResume?.mimeType) {
    return;
  }

  const byteCharacters = atob(uploadedResume.dataBase64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let index = 0; index < byteCharacters.length; index += 1) {
    byteNumbers[index] = byteCharacters.charCodeAt(index);
  }

  const blob = new Blob([new Uint8Array(byteNumbers)], {
    type: uploadedResume.mimeType,
  });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = uploadedResume.fileName || "resume";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}

export function viewResumeFile(uploadedResume) {
  if (!uploadedResume?.dataBase64 || !uploadedResume?.mimeType) {
    return;
  }

  const byteCharacters = atob(uploadedResume.dataBase64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let index = 0; index < byteCharacters.length; index += 1) {
    byteNumbers[index] = byteCharacters.charCodeAt(index);
  }

  const blob = new Blob([new Uint8Array(byteNumbers)], {
    type: uploadedResume.mimeType,
  });
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, "_blank", "noopener,noreferrer");

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 60_000);
}

export function downloadResumeFromDataUrl({ dataUrl, fileName = "resume" }) {
  if (!dataUrl) {
    return;
  }

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
