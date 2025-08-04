// 工具函数模块
class ImageUtils {
    constructor() {
        this.supportedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
        this.maxFileSize = 50 * 1024 * 1024; // 50MB
    }

    // 格式化文件大小
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 获取文件扩展名
    getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }

    // 生成新的文件名
    generateFileName(originalName, format, suffix = '') {
        const name = originalName.replace(/\.[^/.]+$/, '');
        const extension = this.getFormatExtension(format);
        return `${name}${suffix}.${extension}`;
    }

    // 获取格式对应的扩展名
    getFormatExtension(format) {
        const formatMap = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
            'image/avif': 'avif',
            'image/gif': 'gif'
        };
        return formatMap[format] || 'jpg';
    }

    // 验证文件类型
    validateFile(file) {
        if (!this.supportedFormats.includes(file.type)) {
            throw new Error(`不支持的文件格式: ${file.type}`);
        }
        if (file.size > this.maxFileSize) {
            throw new Error(`文件过大: ${this.formatFileSize(file.size)}`);
        }
        return true;
    }

    // 创建图片元素
    createImageElement(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('图片加载失败'));
            img.src = src;
        });
    }

    // 创建Canvas元素
    createCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }

    // 计算调整后的尺寸
    calculateResizedDimensions(originalWidth, originalHeight, maxWidth, maxHeight, keepAspectRatio = true) {
        if (!maxWidth && !maxHeight) {
            return { width: originalWidth, height: originalHeight };
        }

        let width = originalWidth;
        let height = originalHeight;

        if (keepAspectRatio) {
            const aspectRatio = originalWidth / originalHeight;

            if (maxWidth && maxHeight) {
                if (width > maxWidth) {
                    width = maxWidth;
                    height = width / aspectRatio;
                }
                if (height > maxHeight) {
                    height = maxHeight;
                    width = height * aspectRatio;
                }
            } else if (maxWidth) {
                if (width > maxWidth) {
                    width = maxWidth;
                    height = width / aspectRatio;
                }
            } else if (maxHeight) {
                if (height > maxHeight) {
                    height = maxHeight;
                    width = height * aspectRatio;
                }
            }
        } else {
            if (maxWidth) width = Math.min(width, maxWidth);
            if (maxHeight) height = Math.min(height, maxHeight);
        }

        return {
            width: Math.round(width),
            height: Math.round(height)
        };
    }

    // 绘制图片到Canvas
    drawImageToCanvas(img, canvas, x = 0, y = 0, width = null, height = null) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (width && height) {
            ctx.drawImage(img, x, y, width, height);
        } else {
            ctx.drawImage(img, x, y);
        }
    }

    // Canvas转Blob
    canvasToBlob(canvas, format = 'image/jpeg', quality = 0.85) {
        return new Promise((resolve) => {
            canvas.toBlob(resolve, format, quality);
        });
    }

    // 下载文件
    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // 批量下载ZIP
    async downloadAsZip(files, zipName = 'processed_images.zip') {
        if (typeof JSZip === 'undefined') {
            throw new Error('JSZip库未加载');
        }

        const zip = new JSZip();
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const filename = file.filename || `image_${i + 1}.${this.getFormatExtension(file.type)}`;
            zip.file(filename, file.blob);
        }

        const content = await zip.generateAsync({ type: 'blob' });
        this.downloadFile(content, zipName);
    }

    // 显示通知
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // 添加样式
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            max-width: 300px;
        `;

        // 根据类型设置背景色
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        document.body.appendChild(notification);

        // 3秒后自动移除
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // 显示加载状态
    showLoading(element, text = '处理中...') {
        const originalText = element.textContent;
        element.disabled = true;
        element.innerHTML = `<span class="loading"></span> ${text}`;
        return () => {
            element.disabled = false;
            element.textContent = originalText;
        };
    }

    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 节流函数
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // 获取图片的EXIF数据
    async getImageEXIF(file) {
        return new Promise((resolve, reject) => {
            EXIF.getData(file, function() {
                const exifData = EXIF.getAllTags(this);
                resolve(exifData);
            });
        });
    }

    // 检查浏览器支持
    checkBrowserSupport() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const support = {
            canvas: !!canvas.getContext,
            webp: false,
            avif: false,
            fileReader: !!window.FileReader,
            dragAndDrop: 'draggable' in document.createElement('span'),
            webWorkers: !!window.Worker
        };

        // 检查WebP支持
        canvas.width = 1;
        canvas.height = 1;
        support.webp = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;

        // 检查AVIF支持
        support.avif = canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;

        return support;
    }

    // 获取图片信息
    async getImageInfo(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                resolve({
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    size: file.size,
                    type: file.type,
                    name: file.name
                });
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }
}

// 全局工具实例
window.imageUtils = new ImageUtils();

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style); 