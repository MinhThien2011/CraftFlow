import cloudinary from "../config/Cloudinary.js";
import multer from "multer";
import streamifier from "streamifier";
import sharp from "sharp";

const fileFilter = (req, file, cb) => {
    const allowImageTypes = ['image/jpg', 'image/png', 'image/jpeg', 'image/webp'];
    if (!allowImageTypes.includes(file.mimetype)) {
        cb(new Error('Only image files are allowed!'), false);
    } else {
        cb(null, true);
    }
}
const uploader = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 1024 * 1024 * 20,
        files: 1,
    },
    fileFilter,
}).fields([{ name: 'image', maxCount: 1 }]);

const uploadImageToCloudinary = (buffer, folder = 'avatar') => {
    return new Promise(async (resolve, reject) => {
        try {
            const optimizedBuffer = await sharp(buffer)
                .resize(400, 400, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .jpeg({ quality: 85, progressive: true })
                .toBuffer();

            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: folder,
                    resource_type: 'image',
                    transformation: [
                        { quality: 'auto:good' },
                        { fetch_format: 'auto' }
                    ],
                },
                (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve({
                            url: result.secure_url,
                            publicId: result.public_id,
                            width: result.width,
                            height: result.height,
                            format: result.format,
                            bytes: result.bytes
                        });
                    }
                }
            );

            streamifier.createReadStream(optimizedBuffer).pipe(stream);
        } catch (error) {
            reject(error);
        }
    });
};
export const imageUploader = (folder = 'avatars') => {
    return (req, res, next) => {
        uploader(req, res, async (err) => {
            if (err) {
                console.log('[Multer Error]:', err);
                if (err instanceof multer.MulterError) {
                    let errorMessage = err.message;
                    let detailMessage = '';

                    if (err.code === 'LIMIT_FILE_SIZE') {
                        errorMessage = 'File size too large.';
                        detailMessage = 'Maximum allowed size is 20MB.';
                    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                        errorMessage = `Unexpected field '${err.field}'.`;
                        detailMessage = "Please use the field name 'image' for file uploads.";
                    } else if (err.code === 'LIMIT_FILE_COUNT') {
                        errorMessage = 'Too many files.';
                        detailMessage = 'You can only upload 1 file at a time.';
                    } else {
                        errorMessage = 'Upload error.';
                        detailMessage = 'Please check the file type and size.';
                    }
                    return res.status(400).json({
                        success: false,
                        error: errorMessage,
                        message: detailMessage || err.message
                    });
                }
                return res.status(400).json({
                    success: false,
                    error: 'Upload error',
                    message: err.message
                });
            }

            try {
                if (req.files && req.files.image && req.files.image[0]) {
                    const imageBuffer = req.files.image[0].buffer;
                    const uploadResult = await uploadImageToCloudinary(imageBuffer, folder || 'avatars');
                    if (uploadResult) {
                        req.imageUrl = uploadResult.url;
                    }
                }
                next();
            } catch (error) {
                console.log('[Cloudinary] Upload Error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to upload image.',
                    error: error.message
                });
            }
        });
    }
}

export const deleteImageFromCloudinary = async (publicIds) => {
    try {
        const deletePromises = publicIds.map(({ publicId, resourceType = 'image' }) => {
            return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
        });
        await Promise.all(deletePromises);
        return true;
    } catch (error) {
        console.log('Error deleting files from Cloudinary:', error);
        return false;
    }
};