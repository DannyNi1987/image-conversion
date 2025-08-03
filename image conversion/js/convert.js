// 图片格式转换模块
class ImageConverter {
    constructor() {
        this.supportedFormats = {
            'image/jpeg': { extension: 'jpg', quality: 0.85 },
            'image/png': { extension: 'png', quality: 1.0 },
            'image/webp': { extension: 'webp', quality: 0.85 },
            'image/avif': { extension: 'avif', quality: 0.85 }
        };
    }

    // 转换单张图片
    async convertImage(file, targetFormat, options = {}) {
        try {
            // 验证文件
            imageUtils.validateFile(file);

            // 获取转换参数
            const {
                maxWidth = null,
                maxHeight = null,
                quality = this.supportedFormats[targetFormat]?.quality || 0.85,
                keepAspectRatio = true
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

            // 转换为目标格式
            const blob = await imageUtils.canvasToBlob(canvas, targetFormat, quality);

            // 生成新文件名
            const newFileName = imageUtils.generateFileName(file.name, targetFormat, '_converted');

            return {
                blob,
                filename: newFileName,
                type: targetFormat,
                originalSize: file.size,
                newSize: blob.size,
                width,
                height
            };

        } catch (error) {
            throw new Error(`转换失败: ${error.message}`);
        }
    }

    // 批量转换图片
    async convertImages(files, targetFormat, options = {}) {
        const results = [];
        const errors = [];

        for (let i = 0; i < files.length; i++) {
            try {
                const result = await this.convertImage(files[i], targetFormat, options);
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
            console.warn('部分文件转换失败:', errors);
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

    // 检查格式支持
    checkFormatSupport(format) {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        
        try {
            const dataURL = canvas.toDataURL(format);
            return dataURL.indexOf(`data:${format}`) === 0;
        } catch (error) {
            return false;
        }
    }

    // 获取支持的格式列表
    getSupportedFormats() {
        const formats = [];
        
        for (const [mimeType, info] of Object.entries(this.supportedFormats)) {
            if (this.checkFormatSupport(mimeType)) {
                formats.push({
                    mimeType,
                    extension: info.extension,
                    quality: info.quality
                });
            }
        }
        
        return formats;
    }

    // 优化转换参数
    optimizeConversionParams(originalFormat, targetFormat, originalSize) {
        const params = {
            quality: this.supportedFormats[targetFormat]?.quality || 0.85
        };

        // 根据原始格式和目标格式调整质量
        if (originalFormat === 'image/png' && targetFormat === 'image/jpeg') {
            // PNG转JPEG时，如果原图较大，适当降低质量
            if (originalSize > 1024 * 1024) { // 1MB
                params.quality = 0.8;
            }
        }

        // WebP和AVIF通常可以获得更好的压缩效果
        if (targetFormat === 'image/webp' || targetFormat === 'image/avif') {
            params.quality = Math.min(params.quality + 0.1, 0.95);
        }

        return params;
    }

    // 智能格式推荐
    recommendFormat(originalFormat, useCase = 'general') {
        const recommendations = {
            'web': {
                'image/jpeg': 'image/webp',
                'image/png': 'image/webp',
                'image/gif': 'image/webp'
            },
            'print': {
                'image/jpeg': 'image/png',
                'image/webp': 'image/png',
                'image/avif': 'image/png'
            },
            'archive': {
                'image/jpeg': 'image/jpeg',
                'image/png': 'image/png',
                'image/webp': 'image/webp'
            }
        };

        return recommendations[useCase]?.[originalFormat] || originalFormat;
    }
}

// 全局转换器实例
window.imageConverter = new ImageConverter();

// 处理转换功能
async function processConvert() {
    const files = window.selectedFiles;
    if (!files || files.length === 0) {
        imageUtils.showNotification('请先选择图片文件', 'warning');
        return;
    }

    const targetFormat = document.getElementById('targetFormat').value;
    const maxWidth = parseInt(document.getElementById('maxWidth').value) || null;
    const maxHeight = parseInt(document.getElementById('maxHeight').value) || null;
    const quality = parseInt(document.getElementById('jpegQuality').value) / 100;

    const processBtn = document.querySelector('#convert .process-btn');
    const stopLoading = imageUtils.showLoading(processBtn, '转换中...');

    try {
        // 检查格式支持
        if (!imageConverter.checkFormatSupport(targetFormat)) {
            throw new Error(`当前浏览器不支持 ${targetFormat} 格式`);
        }

        const options = {
            maxWidth,
            maxHeight,
            quality,
            keepAspectRatio: true
        };

        const result = await imageConverter.convertImages(files, targetFormat, options);

        if (result.success > 0) {
            // 显示结果
            displayResults(result.results);
            imageUtils.showNotification(`成功转换 ${result.success} 张图片`, 'success');
        }

        if (result.failed > 0) {
            imageUtils.showNotification(`${result.failed} 张图片转换失败`, 'warning');
        }

    } catch (error) {
        imageUtils.showNotification(error.message, 'error');
        console.error('转换错误:', error);
    } finally {
        stopLoading();
    }
}

// 显示转换结果
function displayResults(results) {
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
        const sizeReduction = ((result.originalSize - result.newSize) / result.originalSize * 100).toFixed(1);
        fileSize.textContent = `${imageUtils.formatFileSize(result.newSize)} (减少 ${sizeReduction}%)`;
        
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

// 批量下载所有转换结果
async function downloadAll() {
    const results = window.processedResults;
    if (!results || results.length === 0) {
        imageUtils.showNotification('没有可下载的文件', 'warning');
        return;
    }

    for (const result of results) {
        imageUtils.downloadFile(result.blob, result.filename);
        // 添加延迟避免浏览器阻止多个下载
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

// 打包下载ZIP
async function downloadZip() {
    const results = window.processedResults;
    if (!results || results.length === 0) {
        imageUtils.showNotification('没有可下载的文件', 'warning');
        return;
    }

    try {
        const files = results.map(result => ({
            blob: result.blob,
            filename: result.filename,
            type: result.type
        }));
        
        await imageUtils.downloadAsZip(files, 'converted_images.zip');
        imageUtils.showNotification('ZIP文件下载成功', 'success');
    } catch (error) {
        imageUtils.showNotification('ZIP文件创建失败', 'error');
        console.error('ZIP错误:', error);
    }
}

// 更新质量显示
document.addEventListener('DOMContentLoaded', function() {
    const qualitySlider = document.getElementById('jpegQuality');
    const qualityValue = document.getElementById('qualityValue');
    
    if (qualitySlider && qualityValue) {
        qualitySlider.addEventListener('input', function() {
            qualityValue.textContent = this.value + '%';
        });
    }
}); 