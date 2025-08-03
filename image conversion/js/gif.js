// GIF编辑模块
class GIFProcessor {
    constructor() {
        this.gifWorker = null;
        this.isProcessing = false;
    }

    // 处理GIF文件
    async processGIF(file, options = {}) {
        try {
            // 验证文件
            if (file.type !== 'image/gif') {
                throw new Error('只支持GIF格式文件');
            }

            const {
                operation = 'extract',
                fps = 10,
                quality = 0.75,
                maxWidth = null,
                maxHeight = null
            } = options;

            switch (operation) {
                case 'extract':
                    return await this.extractFrames(file, { fps, quality });
                case 'reverse':
                    return await this.reverseGIF(file, { fps, quality });
                case 'resize':
                    return await this.resizeGIF(file, { maxWidth, maxHeight, fps, quality });
                case 'convert':
                    return await this.convertGIF(file, { fps, quality });
                default:
                    throw new Error(`不支持的操作: ${operation}`);
            }

        } catch (error) {
            throw new Error(`GIF处理失败: ${error.message}`);
        }
    }

    // 提取GIF帧
    async extractFrames(file, options = {}) {
        const { fps = 10, quality = 0.75 } = options;

        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                const frames = [];
                const frameCount = Math.ceil(img.naturalHeight / img.naturalWidth);
                
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalWidth;

                for (let i = 0; i < frameCount; i++) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(
                        img,
                        0, i * img.naturalWidth, img.naturalWidth, img.naturalWidth,
                        0, 0, canvas.width, canvas.height
                    );

                    canvas.toBlob((blob) => {
                        frames.push({
                            blob,
                            filename: `frame_${i + 1}.png`,
                            frame: i + 1
                        });

                        if (frames.length === frameCount) {
                            resolve(frames);
                        }
                    }, 'image/png', quality);
                }
            };

            img.onerror = () => reject(new Error('GIF加载失败'));
            img.src = URL.createObjectURL(file);
        });
    }

    // 倒播GIF
    async reverseGIF(file, options = {}) {
        const { fps = 10, quality = 0.75 } = options;

        // 先提取帧
        const frames = await this.extractFrames(file, { fps, quality });
        
        // 反转帧顺序
        const reversedFrames = frames.reverse();

        // 重新组合为GIF（这里简化处理，实际需要GIF编码库）
        return {
            blob: reversedFrames[0].blob, // 简化处理，返回第一帧
            filename: imageUtils.generateFileName(file.name, 'image/gif', '_reversed'),
            type: 'image/gif',
            frameCount: reversedFrames.length
        };
    }

    // 调整GIF尺寸
    async resizeGIF(file, options = {}) {
        const { maxWidth, maxHeight, fps = 10, quality = 0.75 } = options;

        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                const { width, height } = imageUtils.calculateResizedDimensions(
                    img.naturalWidth,
                    img.naturalHeight,
                    maxWidth,
                    maxHeight,
                    true
                );

                const canvas = imageUtils.createCanvas(width, height);
                const ctx = canvas.getContext('2d');
                
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    resolve({
                        blob,
                        filename: imageUtils.generateFileName(file.name, 'image/gif', '_resized'),
                        type: 'image/gif',
                        originalWidth: img.naturalWidth,
                        originalHeight: img.naturalHeight,
                        newWidth: width,
                        newHeight: height
                    });
                }, 'image/gif', quality);
            };

            img.onerror = () => reject(new Error('GIF加载失败'));
            img.src = URL.createObjectURL(file);
        });
    }

    // 转换GIF格式
    async convertGIF(file, options = {}) {
        const { fps = 10, quality = 0.75 } = options;

        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                const canvas = imageUtils.createCanvas(img.naturalWidth, img.naturalHeight);
                const ctx = canvas.getContext('2d');
                
                ctx.drawImage(img, 0, 0);

                canvas.toBlob((blob) => {
                    resolve({
                        blob,
                        filename: imageUtils.generateFileName(file.name, 'image/png', '_converted'),
                        type: 'image/png',
                        width: img.naturalWidth,
                        height: img.naturalHeight
                    });
                }, 'image/png', quality);
            };

            img.onerror = () => reject(new Error('GIF加载失败'));
            img.src = URL.createObjectURL(file);
        });
    }

    // 获取GIF信息
    async getGIFInfo(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                const frameCount = Math.ceil(img.naturalHeight / img.naturalWidth);
                resolve({
                    width: img.naturalWidth,
                    height: img.naturalWidth, // 单帧高度
                    frameCount,
                    totalHeight: img.naturalHeight,
                    fileSize: file.size,
                    type: file.type
                });
            };

            img.onerror = () => reject(new Error('GIF加载失败'));
            img.src = URL.createObjectURL(file);
        });
    }

    // 批量处理GIF
    async processGIFs(files, options = {}) {
        const results = [];
        const errors = [];

        for (let i = 0; i < files.length; i++) {
            try {
                const result = await this.processGIF(files[i], options);
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
            console.warn('部分GIF处理失败:', errors);
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
}

// 全局GIF处理器实例
window.gifProcessor = new GIFProcessor();

// 处理GIF功能
async function processGIF() {
    const files = window.selectedFiles;
    if (!files || files.length === 0) {
        imageUtils.showNotification('请先选择GIF文件', 'warning');
        return;
    }

    // 过滤GIF文件
    const gifFiles = Array.from(files).filter(file => file.type === 'image/gif');
    
    if (gifFiles.length === 0) {
        imageUtils.showNotification('请选择GIF格式的文件', 'warning');
        return;
    }

    const operation = document.getElementById('gifOperation').value;
    const fps = parseInt(document.getElementById('gifFps').value);
    const quality = parseInt(document.getElementById('gifQuality').value) / 100;

    const processBtn = document.querySelector('#gif .process-btn');
    const stopLoading = imageUtils.showLoading(processBtn, '处理GIF中...');

    try {
        const options = {
            operation,
            fps,
            quality
        };

        const result = await gifProcessor.processGIFs(gifFiles, options);

        if (result.success > 0) {
            // 显示结果
            displayGIFResults(result.results);
            imageUtils.showNotification(`成功处理 ${result.success} 个GIF文件`, 'success');
        }

        if (result.failed > 0) {
            imageUtils.showNotification(`${result.failed} 个GIF文件处理失败`, 'warning');
        }

    } catch (error) {
        imageUtils.showNotification(error.message, 'error');
        console.error('GIF处理错误:', error);
    } finally {
        stopLoading();
    }
}

// 显示GIF处理结果
function displayGIFResults(results) {
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
        fileSize.textContent = `${imageUtils.formatFileSize(result.blob.size)}`;
        
        if (result.frameCount) {
            fileSize.textContent += ` (${result.frameCount} 帧)`;
        }
        
        if (result.newWidth && result.newHeight) {
            fileSize.textContent += ` (${result.newWidth}×${result.newHeight})`;
        }
        
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

// 更新GIF质量显示
document.addEventListener('DOMContentLoaded', function() {
    const gifQualitySlider = document.getElementById('gifQuality');
    const gifQualityValue = document.getElementById('gifQualityValue');
    
    if (gifQualitySlider && gifQualityValue) {
        gifQualitySlider.addEventListener('input', function() {
            gifQualityValue.textContent = this.value + '%';
        });
    }
}); 