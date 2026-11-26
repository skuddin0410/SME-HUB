import "server-only";

/**
 * Update 26: a PDF the browser uploaded to the member's own folder in post-pdfs.
 * The server downloads it again and checks the file itself (not its name) before it is attached to a post:
 * a real PDF header, at most 25 MB, no password. It also reads the page count when it can.
 */
export const PDF_MAX = 25 * 1024 * 1024;

type Storage = { storage: { from: (b: string) => { download: (p: string) => Promise<{ data: Blob | null; error: { message: string } | null }> } } };

export type CheckedPdf = { pdf_path: string; pdf_name: string; pdf_size: number; pdf_pages: number | null };

export function cleanPdfName(raw: string): string {
  let name = raw.trim().replace(/[\u0000-\u001f\\/]/g, "") || "document.pdf";
  if (!/\.pdf$/i.test(name)) name += ".pdf";
  if (name.length > 200) name = name.slice(0, 196) + ".pdf";
  if (name.length < 5) name = "document.pdf";
  return name;
}

/** Pages: the largest /Count of a /Pages node, or the number of /Page objects; null when the file hides them in compressed streams. */
export function countPages(text: string): number | null {
  let best = 0;
  for (const m of text.matchAll(/\/Type\s*\/Pages\b[^]*?\/Count\s+(\d+)/g)) best = Math.max(best, Number(m[1]));
  for (const m of text.matchAll(/\/Count\s+(\d+)[^]{0,200}?\/Type\s*\/Pages\b/g)) best = Math.max(best, Number(m[1]));
  if (!best) best = (text.match(/\/Type\s*\/Page(?![a-zA-Z])/g) ?? []).length;
  return best >= 1 && best <= 5000 ? best : null;
}

export async function checkPdf(supabase: Storage, userId: string, path: string, rawName: string): Promise<CheckedPdf | { error: string }> {
  if (!new RegExp(`^${userId}/pdf-[0-9a-f-]{36}\\.pdf$`).test(path)) return { error: "That PDF cannot be used." };
  const { data, error } = await supabase.storage.from("post-pdfs").download(path);
  if (error || !data) return { error: "We could not read that PDF. Try uploading it again." };
  if (data.size > PDF_MAX) return { error: `PDFs can be up to 25 MB.` };
  const bytes = new Uint8Array(await data.arrayBuffer());
  const text = Buffer.from(bytes).toString("latin1");
  if (!text.startsWith("%PDF-")) return { error: "That file isn’t a PDF. Choose a .pdf file." };
  if (/\/Encrypt\s*(\d+\s+\d+\s+R|<<)/.test(text)) return { error: "That PDF is password-protected. Remove the password and try again." };
  return { pdf_path: path, pdf_name: cleanPdfName(rawName), pdf_size: data.size, pdf_pages: countPages(text) };
}
