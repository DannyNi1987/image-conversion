// 图片裁剪模块
class ImageCropper {
    constructor() {
        this.currentImage = null;
        this.cropCanvas = null;
        this.cropCtx = null;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.cropBox = { x: 0, y: 0, width: 0, height: 0 };
        this.aspectRatio = null;
        this.originalImage = null;
    }

    // 初始化裁剪功能
    async initCrop(file) {
        try {
            // 验证文件
            imageUtils.validateFile(file);

            // 创建图片元素
            this.originalImage = await imageUtils.createImageElement(URL.createObjectURL(file));
            
            // 获取Canvas元素
            this.cropCanvas = document.getElementById('cropCanvas');
            if (!this.cropCanvas) {
                throw new Error('找不到裁剪Canvas元素');
            }

            this.cropCtx = this.cropCanvas.getContext('2d');

            // 设置Canvas尺寸
            const maxWidth = 600;
            const maxHeight = 400;
            const { width, height } = imageUtils.calculateResizedDimensions(
                this.originalImage.naturalWidth,
                this.originalImage.naturalHeight,
                maxWidth,
                maxHeight,
                true
            );

            this.cropCanvas.width = width;
            this.cropCanvas.height = height;

            // 绘制图片
            this.drawImage();

            // 初始化裁剪框
            this.initCropBox();

            // 绑定事件
            this.bindEvents();

            // 更新控制面板
            this.updateControls();

        } catch (error) {
            throw new Error(`初始化裁剪失败: ${error.message}`);
        }
    }

    // 绘制图片
    drawImage() {
        if (!this.cropCtx || !this.originalImage) return;

        this.cropCtx.clearRect(0, 0, this.cropCanvas.width, this.cropCanvas.height);
        this.cropCtx.drawImage(this.originalImage, 0, 0, this.cropCanvas.width, this.cropCanvas.height);
    }

    // 初始化裁剪框
    initCropBox() {
        const canvasWidth = this.cropCanvas.width;
        const canvasHeight = this.cropCanvas.height;

        // 默认裁剪框为图片的80%
        this.cropBox = {
            x: canvasWidth * 0.1,
            y: canvasHeight * 0.1,
            width: canvasWidth * 0.8,
            height: canvasHeight * 0.8
        };

        this.drawCropBox();
    }

    // 绘制裁剪框
    drawCropBox() {
        if (!this.cropCtx) return;

        // 绘制半透明遮罩
        this.cropCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.cropCtx.fillRect(0, 0, this.cropCanvas.width, this.cropCanvas.height);

        // 清除裁剪区域
        this.cropCtx.globalCompositeOperation = 'destination-out';
        this.cropCtx.fillRect(this.cropBox.x, this.cropBox.y, this.cropBox.width, this.cropBox.height);
        this.cropCtx.globalCompositeOperation = 'source-over';

        // 绘制裁剪框边框
        this.cropCtx.strokeStyle = '#fff';
        this.cropCtx.lineWidth = 2;
        this.cropCtx.strokeRect(this.cropBox.x, this.cropBox.y, this.cropBox.width, this.cropBox.height);

        // 绘制控制点
        this.drawControlPoints();
    }

    // 绘制控制点
    drawControlPoints() {
        if (!this.cropCtx) return;

        const points = [
            { x: this.cropBox.x, y: this.cropBox.y }, // 左上
            { x: this.cropBox.x + this.cropBox.width, y: this.cropBox.y }, // 右上
            { x: this.cropBox.x, y: this.cropBox.y + this.cropBox.height }, // 左下
            { x: this.cropBox.x + this.cropBox.width, y: this.cropBox.y + this.cropBox.height } // 右下
        ];

        this.cropCtx.fillStyle = '#fff';
        this.cropCtx.strokeStyle = '#333';
        this.cropCtx.lineWidth = 1;

        points.forEach(point => {
            this.cropCtx.beginPath();
            this.cropCtx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
            this.cropCtx.fill();
            this.cropCtx.stroke();
        });
    }

    // 绑定事件
    bindEvents() {
        if (!this.cropCanvas) return;

        this.cropCanvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.cropCanvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.cropCanvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.cropCanvas.addEventListener('touchstart', this.onTouchStart.bind(this));
        this.cropCanvas.addEventListener('touchmove', this.onTouchMove.bind(this));
        this.cropCanvas.addEventListener('touchend', this.onTouchEnd.bind(this));
    }

    // 鼠标按下事件
    onMouseDown(e) {
        e.preventDefault();
        this.isDragging = true;
        const rect = this.cropCanvas.getBoundingClientRect();
        this.dragStart = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    // 鼠标移动事件
    onMouseMove(e) {
        if (!this.isDragging) return;
        e.preventDefault();

        const rect = this.cropCanvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;

        const deltaX = currentX - this.dragStart.x;
        const deltaY = currentY - this.dragStart.y;

        this.moveCropBox(deltaX, deltaY);
        this.dragStart = { x: currentX, y: currentY };
    }

    // 鼠标释放事件
    onMouseUp(e) {
        this.isDragging = false;
    }

    // 触摸开始事件
    onTouchStart(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            this.isDragging = true;
            const rect = this.cropCanvas.getBoundingClientRect();
            this.dragStart = {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }
    }

    // 触摸移动事件
    onTouchMove(e) {
        if (!this.isDragging) return;
        e.preventDefault();

        if (e.touches.length === 1) {
            const rect = this.cropCanvas.getBoundingClientRect();
            const currentX = e.touches[0].clientX - rect.left;
            const currentY = e.touches[0].clientY - rect.top;

            const deltaX = currentX - this.dragStart.x;
            const deltaY = currentY - this.dragStart.y;

            this.moveCropBox(deltaX, deltaY);
            this.dragStart = { x: currentX, y: currentY };
        }
    }

    // 触摸结束事件
    onTouchEnd(e) {
        this.isDragging = false;
    }

    // 移动裁剪框
    moveCropBox(deltaX, deltaY) {
        const newX = this.cropBox.x + deltaX;
        const newY = this.cropBox.y + deltaY;

        // 边界检查
        if (newX >= 0 && newX + this.cropBox.width <= this.cropCanvas.width) {
            this.cropBox.x = newX;
        }
        if (newY >= 0 && newY + this.cropBox.height <= this.cropCanvas.height) {
            this.cropBox.y = newY;
        }

        this.redraw();
        this.updateControls();
    }

    // 重新绘制
    redraw() {
        this.drawImage();
        this.drawCropBox();
    }

    // 更新控制面板
    updateControls() {
        const xInput = document.getElementById('cropX');
        const yInput = document.getElementById('cropY');
        const widthInput = document.getElementById('cropWidth');
        const heightInput = document.getElementById('cropHeight');

        if (xInput) xInput.value = Math.round(this.cropBox.x);
        if (yInput) yInput.value = Math.round(this.cropBox.y);
        if (widthInput) widthInput.value = Math.round(this.cropBox.width);
        if (heightInput) heightInput.value = Math.round(this.cropBox.height);
    }

    // 设置裁剪比例
    setAspectRatio(ratio) {
        this.aspectRatio = ratio;
        
        if (ratio === 'free') {
            this.aspectRatio = null;
            return;
        }

        const ratios = {
            '1:1': 1,
            '4:3': 4/3,
            '16:9': 16/9,
            '3:2': 3/2
        };

        const targetRatio = ratios[ratio];
        if (targetRatio) {
            this.cropBox.height = this.cropBox.width / targetRatio;
            this.redraw();
            this.updateControls();
        }
    }

    // 应用裁剪
    async applyCrop() {
        if (!this.originalImage || !this.cropBox) {
            throw new Error('没有可裁剪的图片');
        }

        // 计算原始图片上的裁剪区域
        const scaleX = this.originalImage.naturalWidth / this.cropCanvas.width;
        const scaleY = this.originalImage.naturalHeight / this.cropCanvas.height;

        const cropX = Math.round(this.cropBox.x * scaleX);
        const cropY = Math.round(this.cropBox.y * scaleY);
        const cropWidth = Math.round(this.cropBox.width * scaleX);
        const cropHeight = Math.round(this.cropBox.height * scaleY);

        // 创建新的Canvas
        const canvas = imageUtils.createCanvas(cropWidth, cropHeight);
        const ctx = canvas.getContext('2d');

        // 绘制裁剪区域
        ctx.drawImage(
            this.originalImage,
            cropX, cropY, cropWidth, cropHeight,
            0, 0, cropWidth, cropHeight
        );

        // 转换为Blob
        const blob = await imageUtils.canvasToBlob(canvas, this.originalImage.type || 'image/jpeg');

        return {
            blob,
            width: cropWidth,
            height: cropHeight
        };
    }

    // 重置裁剪框
    resetCrop() {
        this.initCropBox();
        this.redraw();
        this.updateControls();
    }

    // 全选裁剪
    selectAll() {
        this.cropBox = {
            x: 0,
            y: 0,
            width: this.cropCanvas.width,
            height: this.cropCanvas.height
        };
        this.redraw();
        this.updateControls();
    }
}

// 全局裁剪器实例
window.imageCropper = new ImageCropper();

// 处理裁剪功能
async function processCrop() {
    const files = window.selectedFiles;
    if (!files || files.length === 0) {
        imageUtils.showNotification('请先选择图片文件', 'warning');
        return;
    }

    // 目前只处理第一张图片
    const file = files[0];
    const processBtn = document.querySelector('#crop .process-btn');
    const stopLoading = imageUtils.showLoading(processBtn, '裁剪中...');

    try {
        // 初始化裁剪器
        await imageCropper.initCrop(file);

        // 应用裁剪
        const result = await imageCropper.applyCrop();

        // 生成新文件名
        const newFileName = imageUtils.generateFileName(file.name, file.type, '_cropped');

        const cropResult = {
            blob: result.blob,
            filename: newFileName,
            type: file.type,
            originalSize: file.size,
            newSize: result.blob.size,
            width: result.width,
            height: result.height
        };

        // 显示结果
        displayCropResults([cropResult]);
        imageUtils.showNotification('裁剪完成', 'success');

    } catch (error) {
        imageUtils.showNotification(error.message, 'error');
        console.error('裁剪错误:', error);
    } finally {
        stopLoading();
    }
}

// 显示裁剪结果
function displayCropResults(results) {
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

// 绑定裁剪控制事件
document.addEventListener('DOMContentLoaded', function() {
    // 裁剪比例选择
    const cropRatioSelect = document.getElementById('cropRatio');
    if (cropRatioSelect) {
        cropRatioSelect.addEventListener('change', function() {
            if (window.imageCropper) {
                window.imageCropper.setAspectRatio(this.value);
            }
        });
    }

    // 裁剪框位置和尺寸输入
    const cropInputs = ['cropX', 'cropY', 'cropWidth', 'cropHeight'];
    cropInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('change', function() {
                if (window.imageCropper) {
                    const value = parseInt(this.value) || 0;
                    switch (id) {
                        case 'cropX':
                            window.imageCropper.cropBox.x = value;
                            break;
                        case 'cropY':
                            window.imageCropper.cropBox.y = value;
                            break;
                        case 'cropWidth':
                            window.imageCropper.cropBox.width = value;
                            break;
                        case 'cropHeight':
                            window.imageCropper.cropBox.height = value;
                            break;
                    }
                    window.imageCropper.redraw();
                }
            });
        }
    });
}); 