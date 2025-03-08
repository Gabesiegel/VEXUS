/**
 * Image Optimizer Module for VExUS
 * Provides functions to optimize images before sending them to prediction endpoints
 */

import sharp from 'sharp';
import fs from 'fs/promises';

/**
 * Optimize an image from a file path
 * @param {string} filePath - Path to the image file
 * @param {Object} options - Optimization options
 * @param {number} options.maxWidth - Maximum width in pixels (maintains aspect ratio)
 * @param {number} options.quality - JPEG/PNG quality (1-100)
 * @param {string} options.format - Output format ('jpeg', 'png', 'webp')
 * @returns {Promise<Object>} - The optimized image info with buffer and metadata
 */
export async function optimizeImageFile(filePath, options = {}) {
    try {
        const imageBuffer = await fs.readFile(filePath);
        return optimizeImageBuffer(imageBuffer, options);
    } catch (error) {
        console.error(`Error optimizing image file: ${error.message}`);
        throw error;
    }
}

/**
 * Optimize an image from a buffer
 * @param {Buffer} imageBuffer - The image buffer
 * @param {Object} options - Optimization options
 * @param {number} options.maxWidth - Maximum width in pixels (maintains aspect ratio)
 * @param {number} options.quality - JPEG/PNG quality (1-100)
 * @param {string} options.format - Output format ('jpeg', 'png', 'webp')
 * @returns {Promise<Object>} - The optimized image info with buffer and metadata
 */
export async function optimizeImageBuffer(imageBuffer, options = {}) {
    try {
        const {
            maxWidth = 800,
            quality = 80,
            format = 'jpeg'
        } = options;
        
        // Get image metadata
        const metadata = await sharp(imageBuffer).metadata();
        
        // Create a sharp instance for processing
        let sharpInstance = sharp(imageBuffer);
        
        // Resize if needed
        if (metadata.width > maxWidth) {
            sharpInstance = sharpInstance.resize({
                width: maxWidth,
                fit: 'inside',
                withoutEnlargement: true
            });
        }
        
        // Set format and quality
        if (format === 'jpeg') {
            sharpInstance = sharpInstance.jpeg({ quality });
        } else if (format === 'png') {
            sharpInstance = sharpInstance.png({ quality });
        } else if (format === 'webp') {
            sharpInstance = sharpInstance.webp({ quality });
        }
        
        // Get the optimized buffer
        const optimizedBuffer = await sharpInstance.toBuffer();
        
        // Get metadata of optimized image
        const optimizedMetadata = await sharp(optimizedBuffer).metadata();
        
        // Calculate compression ratio
        const compressionRatio = imageBuffer.length / optimizedBuffer.length;
        
        return {
            buffer: optimizedBuffer,
            originalSize: imageBuffer.length,
            optimizedSize: optimizedBuffer.length,
            compressionRatio,
            width: optimizedMetadata.width,
            height: optimizedMetadata.height,
            format: optimizedMetadata.format,
            contentType: `image/${optimizedMetadata.format}`
        };
    } catch (error) {
        console.error(`Error optimizing image buffer: ${error.message}`);
        // Return original buffer if optimization fails
        return {
            buffer: imageBuffer,
            originalSize: imageBuffer.length,
            optimizedSize: imageBuffer.length,
            compressionRatio: 1,
            contentType: 'image/jpeg' // Fallback content type
        };
    }
}

/**
 * Get base64 representation of an optimized image
 * @param {string} filePath - Path to the image file
 * @param {Object} options - Optimization options
 * @returns {Promise<Object>} - Object containing base64 string and metadata
 */
export async function getOptimizedBase64(filePath, options = {}) {
    try {
        const imageInfo = await optimizeImageFile(filePath, options);
        const base64String = imageInfo.buffer.toString('base64');
        
        return {
            base64: base64String,
            size: base64String.length,
            sizeInMB: (base64String.length / 1024 / 1024).toFixed(2),
            width: imageInfo.width,
            height: imageInfo.height,
            format: imageInfo.format,
            compressionRatio: imageInfo.compressionRatio,
            contentType: imageInfo.contentType
        };
    } catch (error) {
        console.error(`Error creating optimized base64: ${error.message}`);
        throw error;
    }
} 