// 视频处理模块
class VideoProcessor {
    constructor() {
        this.videoElement = null;
        this.canvas = null;
        this.ctx = null;
        this.isProcessing = false;
    }

    // 处理视频文件
    async processVideo(file, options = {}) {
        try {
            const {
                startTime = 0,
                duration = 3,
                outputFormat = 'gif',
                fps = 10,
                quality = 0.75,
                maxWidth = 480,
                maxHeight = 360
            } = options;

            // 创建视频元素
            this.videoElement = document.createElement('video');
            this.videoElement.muted = true;
            this.videoElement.playsInline = true;

            // 创建Canvas
            this.canvas = document.createElement('canvas');
            this.ctx = this.canvas.getContext('2d');

            return new Promise((resolve, reject) => {
                this.videoElement.onloadedmetadata = () => {
                    this.processVideoFrames(file, options)
                        .then(resolve)
                        .catch(reject);
                };

                this.videoElement.onerror = () => {
                    reject(new Error('视频加载失败'));
                };

                this.videoElement.src = URL.createObjectURL(file);
            });

        } catch (error) {
            throw new Error(`视频处理失败: ${error.message}`);
        }
    }

    // 处理视频帧
    async processVideoFrames(file, options) {
        const {
            startTime = 0,
            duration = 3,
            outputFormat = 'gif',
            fps = 10,
            quality = 0.75,
            maxWidth = 480,
            maxHeight = 360
        } = options;

        return new Promise((resolve, reject) => {
            const video = this.videoElement;
            const canvas = this.canvas;
            const ctx = this.ctx;

            // 设置Canvas尺寸
            const { width, height } = imageUtils.calculateResizedDimensions(
                video.videoWidth,
                video.videoHeight,
                maxWidth,
                maxHeight,
                true
            );

            canvas.width = width;
            canvas.height = height;

            // 计算帧数
            const totalFrames = Math.floor(duration * fps);
            const frameInterval = duration / totalFrames;
            const frames = [];

            let currentFrame = 0;

            const captureFrame = () => {
                if (currentFrame >= totalFrames) {
                    // 完成所有帧的捕获
                    this.createOutput(frames, outputFormat, quality, file)
                        .then(resolve)
                        .catch(reject);
                    return;
                }

                const currentTime = startTime + (currentFrame * frameInterval);
                
                if (currentTime >= video.duration) {
                    // 视频结束，完成处理
                    this.createOutput(frames, outputFormat, quality, file)
                        .then(resolve)
                        .catch(reject);
                    return;
                }

                video.currentTime = currentTime;
            };

            video.onseeked = () => {
                // 绘制当前帧
                ctx.drawImage(video, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    frames.push(blob);
                    currentFrame++;
                    captureFrame();
                }, 'image/png', quality);
            };

            // 开始捕获帧
            captureFrame();
        });
    }

    // 创建输出文件
    async createOutput(frames, format, quality, originalFile) {
        if (frames.length === 0) {
            throw new Error('没有捕获到任何帧');
        }

        if (format === 'gif') {
            // 简化处理：返回第一帧作为静态图片
            // 实际应用中需要使用GIF编码库
            return {
                blob: frames[0],
                filename: imageUtils.generateFileName(originalFile.name, 'image/png', '_video_frame'),
                type: 'image/png',
                frameCount: frames.length
            };
        } else if (format === 'webp') {
            // 返回第一帧作为WebP
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = await imageUtils.createImageElement(URL.createObjectURL(frames[0]));
            
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);

            const blob = await imageUtils.canvasToBlob(canvas, 'image/webp', quality);

            return {
                blob,
                filename: imageUtils.generateFileName(originalFile.name, 'image/webp', '_video_frame'),
                type: 'image/webp',
                frameCount: frames.length
            };
        }

        throw new Error(`不支持的输出格式: ${format}`);
    }

    // 截取视频帧
    async captureFrame(file, time = 0) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.muted = true;
            video.playsInline = true;

            video.onloadedmetadata = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                video.onseeked = () => {
                    ctx.drawImage(video, 0, 0);
                    canvas.toBlob((blob) => {
                        resolve({
                            blob,
                            filename: imageUtils.generateFileName(file.name, 'image/png', '_frame'),
                            type: 'image/png',
                            width: video.videoWidth,
                            height: video.videoHeight,
                            time: time
                        });
                    }, 'image/png');
                };

                video.currentTime = Math.min(time, video.duration);
            };

            video.onerror = () => reject(new Error('视频加载失败'));
            video.src = URL.createObjectURL(file);
        });
    }

    // 获取视频信息
    async getVideoInfo(file) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.muted = true;
            video.playsInline = true;

            video.onloadedmetadata = () => {
                resolve({
                    width: video.videoWidth,
                    height: video.videoHeight,
                    duration: video.duration,
                    fileSize: file.size,
                    type: file.type
                });
            };

            video.onerror = () => reject(new Error('视频加载失败'));
            video.src = URL.createObjectURL(file);
        });
    }

    // 批量处理视频
    async processVideos(files, options = {}) {
        const results = [];
        const errors = [];

        for (let i = 0; i < files.length; i++) {
            try {
                const result = await this.processVideo(files[i], options);
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
            console.warn('部分视频处理失败:', errors);
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

// 全局视频处理器实例
window.videoProcessor = new VideoProcessor();

// 处理视频功能
async function processVideo() {
    const videoFile = document.getElementById('videoFile').files[0];
    if (!videoFile) {
        imageUtils.showNotification('请选择视频文件', 'warning');
        return;
    }

    const startTime = parseFloat(document.getElementById('videoStartTime').value) || 0;
    const duration = parseFloat(document.getElementById('videoDuration').value) || 3;
    const outputFormat = document.getElementById('videoOutputFormat').value;

    const processBtn = document.querySelector('#video .process-btn');
    const stopLoading = imageUtils.showLoading(processBtn, '处理视频中...');

    try {
        const options = {
            startTime,
            duration,
            outputFormat,
            fps: 10,
            quality: 0.75,
            maxWidth: 480,
            maxHeight: 360
        };

        const result = await videoProcessor.processVideo(videoFile, options);

        // 显示结果
        displayVideoResults([result]);
        imageUtils.showNotification('视频处理完成', 'success');

    } catch (error) {
        imageUtils.showNotification(error.message, 'error');
        console.error('视频处理错误:', error);
    } finally {
        stopLoading();
    }
}

// 显示视频处理结果
function displayVideoResults(results) {
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
        
        if (result.width && result.height) {
            fileSize.textContent += ` (${result.width}×${result.height})`;
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