import { fitWithin, MAX_EDGE } from "@/infra/client/core/image";

export const shrink = async (file: File): Promise<File> => {
  try {
    const bitmap = await createImageBitmap(file);
    const size = fitWithin(bitmap.width, bitmap.height, MAX_EDGE);

    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;

    const brush = canvas.getContext("2d");
    if (brush === null) return file;

    brush.drawImage(bitmap, 0, 0, size.width, size.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((done) => {
      canvas.toBlob(done, "image/jpeg", 0.85);
    });
    if (blob === null || blob.size === 0) return file;

    return new File([blob], "receipt.jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
};
