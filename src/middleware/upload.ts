import multer from 'multer';
import path from 'path';

// Define the maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Configure storage
const storage = multer.memoryStorage(); // Store in memory to process with sharp

// File filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

export const upload = multer({
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: fileFilter,
});
