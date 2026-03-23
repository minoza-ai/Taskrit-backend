import multer from 'multer';
import path from 'path';

// Define the maximum file size (50MB) 
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Use memory storage to allow processing or validation before saving
const storage = multer.memoryStorage();

// File filter (Allow zip, code, images, docs)
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow all for now as assets can be anything, or restrict to safe types
  cb(null, true);
};

export const uploadAsset = multer({
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: fileFilter,
});