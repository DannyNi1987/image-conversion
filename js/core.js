// 核心控制模块
class ImageProcessorApp {
    constructor() {
        this.selectedFiles = [];
        this.currentTab = 'convert';
        this.isProcessing = false;
        this.init();
    }

    // 初始化应用
    init() {
        this.bindEvents();
        this.checkBrowserSupport();
        this.setupDragAndDrop();
        this.updateUI();
    }

    // 绑定事件
    bindEvents() {
        // 文件选择事件
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelection(e.target.files);
            });
        }

        // 选项卡切换事件
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // 水印类型切换
        const watermarkTypeSelect = document.getElementById('watermarkType');
        if (watermarkTypeSelect) {
            watermarkTypeSelect.addEventListener('change', (e) => {
                this.toggleWatermarkOptions(e.target.value);
            });
        }

        // 范围滑块事件
        this.bindRangeSliders();

        // 窗口大小变化事件
        window.addEventListener('resize', this.debounce(() => {
            this.updateUI();
        }, 250));
    }

    // 绑定范围滑块
    bindRangeSliders() {
        const sliders = [
            { id: 'jpegQuality', valueId: 'qualityValue', suffix: '%' },
            { id: 'compressQuality', valueId: 'compressQualityValue', suffix: '%' },
            { id: 'watermarkSize', valueId: 'watermarkSizeValue', suffix: 'px' },
            { id: 'watermarkOpacity', valueId: 'watermarkOpacityValue', suffix: '%' },
            { id: 'watermarkRotation', valueId: 'watermarkRotationValue', suffix: '°' },
            { id: 'gifQuality', valueId: 'gifQualityValue', suffix: '%' }
        ];

        sliders.forEach(slider => {
            const sliderElement = document.getElementById(slider.id);
            const valueElement = document.getElementById(slider.valueId);
            
            if (sliderElement && valueElement) {
                sliderElement.addEventListener('input', (e) => {
                    valueElement.textContent = e.target.value + slider.suffix;
                });
            }
        });
    }

    // 设置拖拽上传
    setupDragAndDrop() {
        const uploadArea = document.getElementById('uploadArea');
        if (!uploadArea) return;

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = Array.from(e.dataTransfer.files);
            this.handleFileSelection(files);
        });

        // 点击上传区域触发文件选择
        uploadArea.addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
    }

    // 处理文件选择
    handleFileSelection(files) {
        if (!files || files.length === 0) return;

        const validFiles = Array.from(files).filter(file => {
            try {
                imageUtils.validateFile(file);
                return true;
            } catch (error) {
                imageUtils.showNotification(`${file.name}: ${error.message}`, 'error');
                return false;
            }
        });

        if (validFiles.length === 0) {
            imageUtils.showNotification('没有有效的图片文件', 'warning');
            return;
        }

        this.selectedFiles = validFiles;
        window.selectedFiles = validFiles; // 全局变量供其他模块使用
        
        this.displayFileList();
        this.updateUI();
        
        imageUtils.showNotification(`已选择 ${validFiles.length} 个文件`, 'success');
    }

    // 显示文件列表
    displayFileList() {
        const fileList = document.getElementById('fileList');
        if (!fileList) return;

        fileList.innerHTML = '';

        this.selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';

            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.alt = file.name;

            const fileName = document.createElement('div');
            fileName.className = 'file-name';
            fileName.textContent = file.name;

            const fileSize = document.createElement('div');
            fileSize.className = 'file-size';
            fileSize.textContent = imageUtils.formatFileSize(file.size);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-file-btn';
            removeBtn.textContent = '×';
            removeBtn.style.cssText = `
                position: absolute;
                top: 5px;
                right: 5px;
                background: #dc3545;
                color: white;
                border: none;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                cursor: pointer;
                font-size: 12px;
                line-height: 1;
            `;
            removeBtn.onclick = () => this.removeFile(index);

            fileItem.appendChild(img);
            fileItem.appendChild(fileName);
            fileItem.appendChild(fileSize);
            fileItem.appendChild(removeBtn);

            fileList.appendChild(fileItem);
        });
    }

    // 移除文件
    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        window.selectedFiles = this.selectedFiles;
        this.displayFileList();
        this.updateUI();
        
        if (this.selectedFiles.length === 0) {
            imageUtils.showNotification('已清空文件列表', 'info');
        }
    }

    // 切换选项卡
    switchTab(tabName) {
        // 移除所有活动状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // 激活选中的选项卡
        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        const activeContent = document.getElementById(tabName);
        
        if (activeBtn) activeBtn.classList.add('active');
        if (activeContent) activeContent.classList.add('active');

        this.currentTab = tabName;
        this.updateUI();
    }

    // 切换水印选项
    toggleWatermarkOptions(type) {
        const textOptions = document.getElementById('textWatermarkOptions');
        const imageOptions = document.getElementById('imageWatermarkOptions');

        if (type === 'text') {
            textOptions.style.display = 'block';
            imageOptions.style.display = 'none';
        } else {
            textOptions.style.display = 'none';
            imageOptions.style.display = 'block';
        }
    }

    // 检查浏览器支持
    checkBrowserSupport() {
        const support = imageUtils.checkBrowserSupport();
        
        if (!support.canvas) {
            imageUtils.showNotification('您的浏览器不支持Canvas，部分功能可能无法使用', 'warning');
        }

        if (!support.webp) {
            imageUtils.showNotification('您的浏览器不支持WebP格式', 'info');
        }

        if (!support.avif) {
            imageUtils.showNotification('您的浏览器不支持AVIF格式', 'info');
        }

        // 更新格式选择器
        this.updateFormatOptions(support);
    }

    // 更新格式选项
    updateFormatOptions(support) {
        const targetFormat = document.getElementById('targetFormat');
        if (!targetFormat) return;

        // 移除不支持的格式
        const options = targetFormat.querySelectorAll('option');
        options.forEach(option => {
            const format = option.value;
            if (format === 'image/webp' && !support.webp) {
                option.disabled = true;
                option.textContent += ' (不支持)';
            } else if (format === 'image/avif' && !support.avif) {
                option.disabled = true;
                option.textContent += ' (不支持)';
            }
        });
    }

    // 更新UI状态
    updateUI() {
        const hasFiles = this.selectedFiles.length > 0;
        
        // 更新处理按钮状态
        const processButtons = document.querySelectorAll('.process-btn');
        processButtons.forEach(btn => {
            btn.disabled = !hasFiles || this.isProcessing;
        });

        // 更新文件列表显示
        const fileList = document.getElementById('fileList');
        if (fileList) {
            fileList.style.display = hasFiles ? 'grid' : 'none';
        }

        // 更新结果区域
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection && !window.processedResults) {
            resultsSection.style.display = 'none';
        }
    }

    // 清空所有文件
    clearAllFiles() {
        this.selectedFiles = [];
        window.selectedFiles = [];
        this.displayFileList();
        this.updateUI();
        
        // 清空结果区域
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            resultsSection.style.display = 'none';
        }
        window.processedResults = null;
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

    // 获取应用状态
    getAppState() {
        return {
            selectedFiles: this.selectedFiles.length,
            currentTab: this.currentTab,
            isProcessing: this.isProcessing
        };
    }

    // 设置处理状态
    setProcessingState(processing) {
        this.isProcessing = processing;
        this.updateUI();
    }
}

// 全局应用实例
window.app = new ImageProcessorApp();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 检查必要的库是否加载
    if (typeof JSZip === 'undefined') {
        console.warn('JSZip库未加载，ZIP下载功能将不可用');
    }
    
    if (typeof EXIF === 'undefined') {
        console.warn('EXIF.js库未加载，EXIF读取功能将不可用');
    }

    // 添加键盘快捷键
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + O 打开文件
        if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
            e.preventDefault();
            document.getElementById('fileInput').click();
        }
        
        // Delete 键删除选中的文件
        if (e.key === 'Delete' && window.selectedFiles && window.selectedFiles.length > 0) {
            window.app.clearAllFiles();
        }
    });

    // 添加右键菜单
    document.addEventListener('contextmenu', function(e) {
        // 可以在这里添加自定义右键菜单
    });

    // 添加页面可见性变化处理
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            // 页面隐藏时的处理
            console.log('页面已隐藏');
        } else {
            // 页面显示时的处理
            console.log('页面已显示');
        }
    });

    // 添加错误处理
    window.addEventListener('error', function(e) {
        console.error('应用错误:', e.error);
        imageUtils.showNotification('应用发生错误，请刷新页面重试', 'error');
    });

    // 添加未处理的Promise拒绝处理
    window.addEventListener('unhandledrejection', function(e) {
        console.error('未处理的Promise拒绝:', e.reason);
        imageUtils.showNotification('操作失败，请重试', 'error');
    });
});

// 导出全局函数供HTML调用
window.processConvert = processConvert;
window.processCompress = processCompress;
window.processCrop = processCrop;
window.processWatermark = processWatermark;
window.processGIF = processGIF;
window.processVideo = processVideo;
window.readEXIF = readEXIF;
window.downloadAll = downloadAll;
window.downloadZip = downloadZip; 