// 图片压缩模块
class ImageCompressor {
    constructor() {
        this.compressionLevels = {
            low: { quality: 0.9, maxWidth: 1920, maxHeight: 1080 },
            medium: { quality: 0.8, maxWidth: 1280, maxHeight: 720 },
            high: { quality: 0.6, maxWidth: 800, maxHeight: 600 },
            extreme: { quality: 0.4, maxWidth: 640, maxHeight: 480 }
        };
    }

    // 压缩单张图片
    async compressImage(file, options = {}) {
        try {
            // 验证文件
            imageUtils.validateFile(file);

            const {
                quality = 0.8,
                maxWidth = null,
                maxHeight = null,
                maxFileSize = 0,
                keepAspectRatio = true,
                progressive = true
            } = options;

            // 创建图片元素
            const img = await imageUtils.createImageElement(URL.createObjectURL(file));
            
            // 计算新尺寸
            const { width, height } = imageUtils.calculateResizedDimensions(
                img.naturalWidth,
                img.naturalHeight,
                maxWidth,
                maxHeight,
                keepAspectRatio
            );

            // 创建Canvas
            const canvas = imageUtils.createCanvas(width, height);
            
            // 绘制图片
            imageUtils.drawImageToCanvas(img, canvas, 0, 0, width, height);

            // 转换为Blob
            let blob = await imageUtils.canvasToBlob(canvas, file.type, quality);

            // 如果设置了最大文件大小限制，进行迭代压缩
            if (maxFileSize > 0 && blob.size > maxFileSize * 1024) {
                blob = await this.iterateCompression(canvas, file.type, maxFileSize * 1024, quality);
            }

            // 生成新文件名
            const newFileName = imageUtils.generateFileName(file.name, file.type, '_compressed');

            return {
                blob,
                filename: newFileName,
                type: file.type,
                originalSize: file.size,
                newSize: blob.size,
                originalWidth: img.naturalWidth,
                originalHeight: img.naturalHeight,
                newWidth: width,
                newHeight: height,
                compressionRatio: ((file.size - blob.size) / file.size * 100).toFixed(1)
            };

        } catch (error) {
            throw new Error(`压缩失败: ${error.message}`);
        }
    }

    // 迭代压缩直到达到目标大小
    async iterateCompression(canvas, format, targetSize, initialQuality) {
        let quality = initialQuality;
        let blob = await imageUtils.canvasToBlob(canvas, format, quality);
        
        // 如果第一次压缩就达到目标，直接返回
        if (blob.size <= targetSize) {
            return blob;
        }

        // 二分查找最佳质量值
        let minQuality = 0.1;
        let maxQuality = quality;
        let bestBlob = blob;
        let bestQuality = quality;

        while (maxQuality - minQuality > 0.05) {
            quality = (minQuality + maxQuality) / 2;
            blob = await imageUtils.canvasToBlob(canvas, format, quality);
            
            if (blob.size <= targetSize) {
                bestBlob = blob;
                bestQuality = quality;
                maxQuality = quality;
            } else {
                minQuality = quality;
            }
        }

        // 如果仍然无法达到目标大小，尝试缩小尺寸
        if (bestBlob.size > targetSize) {
            return await this.compressByResizing(canvas, format, targetSize, bestQuality);
        }

        return bestBlob;
    }

    // 通过缩小尺寸来压缩
    async compressByResizing(canvas, format, targetSize, quality) {
        let currentCanvas = canvas;
        let scale = 0.9;
        
        while (scale > 0.3) {
            const newWidth = Math.round(currentCanvas.width * scale);
            const newHeight = Math.round(currentCanvas.height * scale);
            
            const newCanvas = imageUtils.createCanvas(newWidth, newHeight);
            imageUtils.drawImageToCanvas(currentCanvas, newCanvas, 0, 0, newWidth, newHeight);
            
            const blob = await imageUtils.canvasToBlob(newCanvas, format, quality);
            
            if (blob.size <= targetSize) {
                return blob;
            }
            
            currentCanvas = newCanvas;
            scale *= 0.9;
        }
        
        // 如果还是无法达到目标，返回最小质量的版本
        return await imageUtils.canvasToBlob(currentCanvas, format, 0.1);
    }

    // 批量压缩图片
    async compressImages(files, options = {}) {
        const results = [];
        const errors = [];

        for (let i = 0; i < files.length; i++) {
            try {
                const result = await this.compressImage(files[i], options);
                results.push(result);
                
                // 显示进度
                this.updateProgress(i + 1, files.length);
                
            } catch (error) {
                errors.push({
                    file: files[i].name,
                    error: error.message
                });
            }
        }

        if (errors.length > 0) {
            console.warn('部分文件压缩失败:', errors);
        }

        return {
            results,
            errors,
            total: files.length,
            success: results.length,
            failed: errors.length
        };
    }

    // 更新进度显示
    updateProgress(current, total) {
        const progress = Math.round((current / total) * 100);
        const progressElement = document.getElementById('progress');
        
        if (progressElement) {
            progressElement.style.width = `${progress}%`;
            progressElement.textContent = `${current}/${total} (${progress}%)`;
        }
    }

    // 智能压缩
    async smartCompress(file, targetSize = null) {
        const info = await imageUtils.getImageInfo(file);
        
        // 根据图片大小和类型选择压缩策略
        let options = {};
        
        if (info.size > 5 * 1024 * 1024) { // 5MB以上
            options = this.compressionLevels.high;
        } else if (info.size > 2 * 1024 * 1024) { // 2-5MB
            options = this.compressionLevels.medium;
        } else if (info.size > 1024 * 1024) { // 1-2MB
            options = this.compressionLevels.low;
        } else {
            options = { quality: 0.95, maxWidth: info.width, maxHeight: info.height };
        }

        if (targetSize) {
            options.maxFileSize = targetSize;
        }

        return await this.compressImage(file, options);
    }

    // 获取压缩建议
    getCompressionSuggestion(fileSize, useCase = 'web') {
        const suggestions = {
            web: {
                small: { quality: 0.9, maxWidth: 800 },
                medium: { quality: 0.8, maxWidth: 1200 },
                large: { quality: 0.7, maxWidth: 1920 }
            },
            mobile: {
                small: { quality: 0.8, maxWidth: 400 },
                medium: { quality: 0.7, maxWidth: 600 },
                large: { quality: 0.6, maxWidth: 800 }
            },
            print: {
                small: { quality: 0.95, maxWidth: 1200 },
                medium: { quality: 0.9, maxWidth: 1800 },
                large: { quality: 0.85, maxWidth: 2400 }
            }
        };

        let size;
        if (fileSize < 1024 * 1024) size = 'small';
        else if (fileSize < 5 * 1024 * 1024) size = 'medium';
        else size = 'large';

        return suggestions[useCase]?.[size] || suggestions.web.medium;
    }

    // 分析压缩效果
    analyzeCompression(originalSize, compressedSize, originalWidth, originalHeight, newWidth, newHeight) {
        const sizeReduction = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
        const dimensionReduction = ((originalWidth * originalHeight - newWidth * newHeight) / (originalWidth * originalHeight) * 100).toFixed(1);
        
        return {
            sizeReduction: parseFloat(sizeReduction),
            dimensionReduction: parseFloat(dimensionReduction),
            compressionEfficiency: (sizeReduction / dimensionReduction).toFixed(2),
            quality: sizeReduction > 50 ? 'high' : sizeReduction > 30 ? 'medium' : 'low'
        };
    }
}

// 全局压缩器实例
window.imageCompressor = new ImageCompressor();

// 处理压缩功能
async function processCompress() {
    const files = window.selectedFiles;
    if (!files || files.length === 0) {
        imageUtils.showNotification('请先选择图片文件', 'warning');
        return;
    }

    const quality = parseInt(document.getElementById('compressQuality').value) / 100;
    const maxFileSize = parseInt(document.getElementById('maxFileSize').value) || 0;
    const keepAspectRatio = document.getElementById('keepAspectRatio').checked;

    const processBtn = document.querySelector('#compress .process-btn');
    const stopLoading = imageUtils.showLoading(processBtn, '压缩中...');

    try {
        const options = {
            quality,
            maxFileSize,
            keepAspectRatio,
            progressive: true
        };

        const result = await imageCompressor.compressImages(files, options);

        if (result.success > 0) {
            // 显示结果
            displayCompressResults(result.results);
            imageUtils.showNotification(`成功压缩 ${result.success} 张图片`, 'success');
        }

        if (result.failed > 0) {
            imageUtils.showNotification(`${result.failed} 张图片压缩失败`, 'warning');
        }

    } catch (error) {
        imageUtils.showNotification(error.message, 'error');
        console.error('压缩错误:', error);
    } finally {
        stopLoading();
    }
}

// 显示压缩结果
function displayCompressResults(results) {
    const resultsSection = document.getElementById('resultsSection');
    const resultsGrid = document.getElementById('resultsGrid');
    
    resultsGrid.innerHTML = '';
    
    results.forEach((result, index) => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        
        const img = document.createElement('img');
        img.src = URL.createObjectURL(result.blob);
        img.alt = result.filename;
        
        const fileName = document.createElement('div');
        fileName.className = 'file-name';
        fileName.textContent = result.filename;
        
        const fileSize = document.createElement('div');
        fileSize.className = 'file-size';
        fileSize.textContent = `${imageUtils.formatFileSize(result.newSize)} (减少 ${result.compressionRatio}%)`;
        
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'download-single';
        downloadBtn.textContent = '下载';
        downloadBtn.onclick = () => imageUtils.downloadFile(result.blob, result.filename);
        
        resultItem.appendChild(img);
        resultItem.appendChild(fileName);
        resultItem.appendChild(fileSize);
        resultItem.appendChild(downloadBtn);
        
        resultsGrid.appendChild(resultItem);
    });
    
    resultsSection.style.display = 'block';
    
    // 存储结果用于批量下载
    window.processedResults = results;
}

// 更新压缩质量显示
document.addEventListener('DOMContentLoaded', function() {
    const compressQualitySlider = document.getElementById('compressQuality');
    const compressQualityValue = document.getElementById('compressQualityValue');
    
    if (compressQualitySlider && compressQualityValue) {
        compressQualitySlider.addEventListener('input', function() {
            compressQualityValue.textContent = this.value + '%';
        });
    }
}); 