import multer from 'multer';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const storage = multer.memoryStorage();

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Submission artifacts can be code, docs, archives, media, etc.
  cb(null, true);
};

export const uploadSubmission = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});
