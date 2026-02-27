import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

type UploadOptions = {
  folder?: string;
  publicId?: string;
  transformation?: object[];
};

export async function uploadFile(
  file: string, // base64 or URL
  options: UploadOptions = {}
) {
  const result = await cloudinary.uploader.upload(file, {
    folder: options.folder ?? "hrms",
    public_id: options.publicId,
    resource_type: "auto",
    transformation: options.transformation,
  });

  return {
    url:      result.secure_url,
    publicId: result.public_id,
    format:   result.format,
    size:     result.bytes,
  };
}

export async function deleteFile(publicId: string) {
  return cloudinary.uploader.destroy(publicId);
}

export async function uploadAvatar(file: string, employeeId: string) {
  return uploadFile(file, {
    folder:   "hrms/avatars",
    publicId: `avatar_${employeeId}`,
    transformation: [
      { width: 400, height: 400, crop: "fill", gravity: "face" },
    ],
  });
}

export async function uploadDocument(file: string, employeeId: string, type: string) {
  return uploadFile(file, {
    folder:   `hrms/documents/${employeeId}`,
    publicId: `${type}_${Date.now()}`,
  });
}

export async function uploadPayslip(file: string, employeeId: string, month: number, year: number) {
  return uploadFile(file, {
    folder:   `hrms/payslips/${employeeId}`,
    publicId: `payslip_${year}_${month}`,
  });
}
