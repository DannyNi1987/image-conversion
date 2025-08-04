// 水印添加模块
class WatermarkProcessor {
    constructor() {
        this.watermarkImage = null;
        this.fonts = [
            'Arial, sans-serif',
            'Helvetica, sans-serif',
            'Times New Roman, serif',
            'Georgia, serif',
            'Verdana, sans-serif',
            'Tahoma, sans-serif'
        ];
    }

    // 添加水印到单张图片
    async addWatermark(file, options = {}) {
        try {
            // 验证文件
            imageUtils.validateFile(file);

            const {
                type = 'text',
                text = '水印文字',
                image = null,
                fontSize = 24,
                fontFamily = 'Arial, sans-serif',
                color = '#ffffff',
                opacity = 0.5,
                rotation = -45,
                position = 'bottom-right',
                padding = 20
            } = options;

            // 创建图片元素
            const img = await imageUtils.createImageElement(URL.createObjectURL(file));
            
            // 创建Canvas
            const canvas = imageUtils.createCanvas(img.naturalWidth, img.naturalHeight);
            const ctx = canvas.getContext('2d');

            // 绘制原图
            ctx.drawImage(img, 0, 0);

            // 添加水印
            if (type === 'text') {
                await this.addTextWatermark(ctx, canvas.width, canvas.height, {
                    text,
                    fontSize,
                    fontFamily,
                    color,
                    opacity,
                    rotation,
                    position,
                    padding
                });
            } else if (type === 'image' && image) {
                await this.addImageWatermark(ctx, canvas.width, canvas.height, {
                    image,
                    opacity,
                    rotation,
                    position,
                    padding
                });
            }

            // 转换为Blob
            const blob = await imageUtils.canvasToBlob(canvas, file.type);

            // 生成新文件名
            const newFileName = imageUtils.generateFileName(file.name, file.type, '_watermarked');

            return {
                blob,
                filename: newFileName,
                type: file.type,
                originalSize: file.size,
                newSize: blob.size,
                width: img.naturalWidth,
                height: img.naturalHeight
            };

        } catch (error) {
            throw new Error(`添加水印失败: ${error.message}`);
        }
    }

    // 添加文字水印
    async addTextWatermark(ctx, canvasWidth, canvasHeight, options) {
        const {
            text,
            fontSize,
            fontFamily,
            color,
            opacity,
            rotation,
            position,
            padding
        } = options;

        // 设置字体
        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.fillStyle = color;
        ctx.globalAlpha = opacity;

        // 获取文字尺寸
        const textMetrics = ctx.measureText(text);
        const textWidth = textMetrics.width;
        const textHeight = fontSize;

        // 计算水印位置
        const positionCoords = this.calculatePosition(canvasWidth, canvasHeight, textWidth, textHeight, position, padding);

        // 保存当前状态
        ctx.save();

        // 移动到水印位置
        ctx.translate(positionCoords.x, positionCoords.y);

        // 旋转
        ctx.rotate(rotation * Math.PI / 180);

        // 绘制文字
        ctx.fillText(text, 0, 0);

        // 恢复状态
        ctx.restore();
        ctx.globalAlpha = 1;
    }

    // 添加图片水印
    async addImageWatermark(ctx, canvasWidth, canvasHeight, options) {
        const {
            image,
            opacity,
            rotation,
            position,
            padding
        } = options;

        // 创建水印图片元素
        const watermarkImg = await imageUtils.createImageElement(URL.createObjectURL(image));
        
        // 计算水印尺寸（限制最大尺寸为原图的1/4）
        const maxWatermarkSize = Math.min(canvasWidth, canvasHeight) / 4;
        const watermarkAspectRatio = watermarkImg.naturalWidth / watermarkImg.naturalHeight;
        
        let watermarkWidth, watermarkHeight;
        if (watermarkAspectRatio > 1) {
            watermarkWidth = Math.min(maxWatermarkSize, watermarkImg.naturalWidth);
            watermarkHeight = watermarkWidth / watermarkAspectRatio;
        } else {
            watermarkHeight = Math.min(maxWatermarkSize, watermarkImg.naturalHeight);
            watermarkWidth = watermarkHeight * watermarkAspectRatio;
        }

        // 计算水印位置
        const positionCoords = this.calculatePosition(canvasWidth, canvasHeight, watermarkWidth, watermarkHeight, position, padding);

        // 保存当前状态
        ctx.save();

        // 设置透明度
        ctx.globalAlpha = opacity;

        // 移动到水印位置
        ctx.translate(positionCoords.x, positionCoords.y);

        // 旋转
        ctx.rotate(rotation * Math.PI / 180);

        // 绘制水印图片
        ctx.drawImage(watermarkImg, 0, 0, watermarkWidth, watermarkHeight);

        // 恢复状态
        ctx.restore();
        ctx.globalAlpha = 1;
    }

    // 计算水印位置
    calculatePosition(canvasWidth, canvasHeight, watermarkWidth, watermarkHeight, position, padding) {
        let x, y;

        switch (position) {
            case 'top-left':
                x = padding;
                y = padding + watermarkHeight;
                break;
            case 'top-right':
                x = canvasWidth - watermarkWidth - padding;
                y = padding + watermarkHeight;
                break;
            case 'bottom-left':
                x = padding;
                y = canvasHeight - padding;
                break;
            case 'bottom-right':
                x = canvasWidth - watermarkWidth - padding;
                y = canvasHeight - padding;
                break;
            case 'center':
                x = (canvasWidth - watermarkWidth) / 2;
                y = (canvasHeight + watermarkHeight) / 2;
                break;
            default:
                x = canvasWidth - watermarkWidth - padding;
                y = canvasHeight - padding;
        }

        return { x, y };
    }

    // 批量添加水印
    async addWatermarks(files, options = {}) {
        const results = [];
        const errors = [];

        for (let i = 0; i < files.length; i++) {
            try {
                const result = await this.addWatermark(files[i], options);
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
            console.warn('部分文件添加水印失败:', errors);
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

    // 预览水印效果
    async previewWatermark(file, options) {
        try {
            const result = await this.addWatermark(file, options);
            return result.blob;
        } catch (error) {
            throw new Error(`预览失败: ${error.message}`);
        }
    }

    // 获取可用字体列表
    getAvailableFonts() {
        return this.fonts;
    }

    // 生成随机水印文字
    generateRandomText() {
        const texts = [
            '水印文字',
            '版权所有',
            '请勿盗用',
            'Sample Text',
            'Watermark',
            'Confidential'
        ];
        return texts[Math.floor(Math.random() * texts.length)];
    }

    // 创建重复水印
    async createRepeatingWatermark(file, options = {}) {
        const {
            text = '水印',
            fontSize = 16,
            opacity = 0.3,
            spacing = 100
        } = options;

        // 创建图片元素
        const img = await imageUtils.createImageElement(URL.createObjectURL(file));
        
        // 创建Canvas
        const canvas = imageUtils.createCanvas(img.naturalWidth, img.naturalHeight);
        const ctx = canvas.getContext('2d');

        // 绘制原图
        ctx.drawImage(img, 0, 0);

        // 设置字体
        ctx.font = `${fontSize}px Arial, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = opacity;

        // 创建重复水印
        for (let y = 0; y < canvas.height; y += spacing) {
            for (let x = 0; x < canvas.width; x += spacing) {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(-45 * Math.PI / 180);
                ctx.fillText(text, 0, 0);
                ctx.restore();
            }
        }

        ctx.globalAlpha = 1;

        // 转换为Blob
        const blob = await imageUtils.canvasToBlob(canvas, file.type);

        return {
            blob,
            filename: imageUtils.generateFileName(file.name, file.type, '_repeating_watermark'),
            type: file.type
        };
    }
}

// 全局水印处理器实例
window.watermarkProcessor = new WatermarkProcessor();

// 处理水印功能
async function processWatermark() {
    const files = window.selectedFiles;
    if (!files || files.length === 0) {
        imageUtils.showNotification('请先选择图片文件', 'warning');
        return;
    }

    const watermarkType = document.getElementById('watermarkType').value;
    const watermarkText = document.getElementById('watermarkText').value;
    const watermarkImage = document.getElementById('watermarkImage').files[0];
    const fontSize = parseInt(document.getElementById('watermarkSize').value);
    const opacity = parseInt(document.getElementById('watermarkOpacity').value) / 100;
    const rotation = parseInt(document.getElementById('watermarkRotation').value);
    const position = document.getElementById('watermarkPosition').value;

    // 验证输入
    if (watermarkType === 'text' && !watermarkText.trim()) {
        imageUtils.showNotification('请输入水印文字', 'warning');
        return;
    }

    if (watermarkType === 'image' && !watermarkImage) {
        imageUtils.showNotification('请选择水印图片', 'warning');
        return;
    }

    const processBtn = document.querySelector('#watermark .process-btn');
    const stopLoading = imageUtils.showLoading(processBtn, '添加水印中...');

    try {
        const options = {
            type: watermarkType,
            text: watermarkText,
            image: watermarkImage,
            fontSize,
            fontFamily: 'Arial, sans-serif',
            color: '#ffffff',
            opacity,
            rotation,
            position
        };

        const result = await watermarkProcessor.addWatermarks(files, options);

        if (result.success > 0) {
            // 显示结果
            displayWatermarkResults(result.results);
            imageUtils.showNotification(`成功添加水印到 ${result.success} 张图片`, 'success');
        }

        if (result.failed > 0) {
            imageUtils.showNotification(`${result.failed} 张图片添加水印失败`, 'warning');
        }

    } catch (error) {
        imageUtils.showNotification(error.message, 'error');
        console.error('水印错误:', error);
    } finally {
        stopLoading();
    }
}

// 显示水印结果
function displayWatermarkResults(results) {
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
        fileSize.textContent = `${imageUtils.formatFileSize(result.newSize)} (${result.width}×${result.height})`;
        
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

// 绑定水印控制事件
document.addEventListener('DOMContentLoaded', function() {
    // 水印类型切换
    const watermarkTypeSelect = document.getElementById('watermarkType');
    const textOptions = document.getElementById('textWatermarkOptions');
    const imageOptions = document.getElementById('imageWatermarkOptions');

    if (watermarkTypeSelect) {
        watermarkTypeSelect.addEventListener('change', function() {
            if (this.value === 'text') {
                textOptions.style.display = 'block';
                imageOptions.style.display = 'none';
            } else {
                textOptions.style.display = 'none';
                imageOptions.style.display = 'block';
            }
        });
    }

    // 水印大小滑块
    const watermarkSizeSlider = document.getElementById('watermarkSize');
    const watermarkSizeValue = document.getElementById('watermarkSizeValue');
    
    if (watermarkSizeSlider && watermarkSizeValue) {
        watermarkSizeSlider.addEventListener('input', function() {
            watermarkSizeValue.textContent = this.value + 'px';
        });
    }

    // 水印透明度滑块
    const watermarkOpacitySlider = document.getElementById('watermarkOpacity');
    const watermarkOpacityValue = document.getElementById('watermarkOpacityValue');
    
    if (watermarkOpacitySlider && watermarkOpacityValue) {
        watermarkOpacitySlider.addEventListener('input', function() {
            watermarkOpacityValue.textContent = this.value + '%';
        });
    }

    // 水印旋转角度滑块
    const watermarkRotationSlider = document.getElementById('watermarkRotation');
    const watermarkRotationValue = document.getElementById('watermarkRotationValue');
    
    if (watermarkRotationSlider && watermarkRotationValue) {
        watermarkRotationSlider.addEventListener('input', function() {
            watermarkRotationValue.textContent = this.value + '°';
        });
    }

    // 随机水印文字按钮
    const randomTextBtn = document.createElement('button');
    randomTextBtn.textContent = '随机文字';
    randomTextBtn.className = 'random-text-btn';
    randomTextBtn.style.cssText = `
        background: #6c757d;
        color: white;
        border: none;
        padding: 5px 10px;
        border-radius: 4px;
        font-size: 0.9rem;
        cursor: pointer;
        margin-left: 10px;
    `;
    randomTextBtn.onclick = function() {
        const textInput = document.getElementById('watermarkText');
        if (textInput) {
            textInput.value = watermarkProcessor.generateRandomText();
        }
    };

    // 将随机文字按钮添加到文字输入框旁边
    const textInputContainer = document.getElementById('textWatermarkOptions');
    if (textInputContainer) {
        const textInput = textInputContainer.querySelector('input');
        if (textInput) {
            textInput.parentNode.insertBefore(randomTextBtn, textInput.nextSibling);
        }
    }
}); 