// EXIF信息读取模块
class EXIFProcessor {
    constructor() {
        this.supportedTags = {
            // 基本信息
            Make: '相机品牌',
            Model: '相机型号',
            Software: '软件信息',
            DateTime: '拍摄时间',
            DateTimeOriginal: '原始拍摄时间',
            DateTimeDigitized: '数字化时间',
            
            // 技术参数
            ExposureTime: '曝光时间',
            FNumber: '光圈值',
            ISO: 'ISO感光度',
            FocalLength: '焦距',
            Flash: '闪光灯',
            WhiteBalance: '白平衡',
            ExposureMode: '曝光模式',
            ExposureProgram: '曝光程序',
            
            // 位置信息
            GPSLatitude: 'GPS纬度',
            GPSLongitude: 'GPS经度',
            GPSAltitude: 'GPS海拔',
            GPSLatitudeRef: '纬度参考',
            GPSLongitudeRef: '经度参考',
            
            // 图像信息
            ImageWidth: '图像宽度',
            ImageLength: '图像高度',
            Orientation: '方向',
            XResolution: 'X分辨率',
            YResolution: 'Y分辨率',
            ResolutionUnit: '分辨率单位',
            
            // 其他信息
            Artist: '作者',
            Copyright: '版权信息',
            UserComment: '用户注释',
            ImageDescription: '图像描述'
        };
    }

    // 读取EXIF信息
    async readEXIF(file) {
        try {
            // 验证文件
            if (!file || !file.type.startsWith('image/')) {
                throw new Error('请选择有效的图片文件');
            }

            return new Promise((resolve, reject) => {
                EXIF.getData(file, function() {
                    try {
                        const exifData = EXIF.getAllTags(this);
                        const processedData = this.processEXIFData(exifData);
                        resolve(processedData);
                    } catch (error) {
                        reject(new Error(`EXIF读取失败: ${error.message}`));
                    }
                }.bind(this));
            });

        } catch (error) {
            throw new Error(`EXIF处理失败: ${error.message}`);
        }
    }

    // 处理EXIF数据
    processEXIFData(rawData) {
        const processedData = {
            basic: {},
            technical: {},
            location: {},
            image: {},
            other: {},
            raw: rawData
        };

        for (const [tag, value] of Object.entries(rawData)) {
            const processedValue = this.processTagValue(tag, value);
            
            if (this.supportedTags[tag]) {
                const category = this.getTagCategory(tag);
                processedData[category][tag] = {
                    label: this.supportedTags[tag],
                    value: processedValue,
                    raw: value
                };
            }
        }

        return processedData;
    }

    // 处理标签值
    processTagValue(tag, value) {
        if (value === undefined || value === null) {
            return '未知';
        }

        switch (tag) {
            case 'DateTime':
            case 'DateTimeOriginal':
            case 'DateTimeDigitized':
                return this.formatDateTime(value);
            
            case 'ExposureTime':
                return this.formatExposureTime(value);
            
            case 'FNumber':
                return `f/${value}`;
            
            case 'FocalLength':
                return `${value}mm`;
            
            case 'Flash':
                return this.formatFlash(value);
            
            case 'GPSLatitude':
            case 'GPSLongitude':
                return this.formatGPS(value);
            
            case 'Orientation':
                return this.formatOrientation(value);
            
            case 'XResolution':
            case 'YResolution':
                return `${value} DPI`;
            
            case 'ResolutionUnit':
                return this.formatResolutionUnit(value);
            
            default:
                return String(value);
        }
    }

    // 格式化日期时间
    formatDateTime(dateTimeStr) {
        if (!dateTimeStr) return '未知';
        
        try {
            const date = new Date(
                dateTimeStr.replace(/(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')
            );
            return date.toLocaleString('zh-CN');
        } catch (error) {
            return dateTimeStr;
        }
    }

    // 格式化曝光时间
    formatExposureTime(value) {
        if (typeof value === 'number') {
            if (value >= 1) {
                return `${value}秒`;
            } else {
                return `1/${Math.round(1/value)}秒`;
            }
        }
        return String(value);
    }

    // 格式化闪光灯信息
    formatFlash(value) {
        const flashMap = {
            0: '未使用',
            1: '已使用',
            5: '已使用，未检测到回闪',
            7: '已使用，检测到回闪',
            9: '强制闪光',
            13: '强制闪光，未检测到回闪',
            15: '强制闪光，检测到回闪',
            16: '未使用，强制关闭',
            24: '未使用，自动模式',
            25: '已使用，自动模式',
            29: '已使用，自动模式，未检测到回闪',
            31: '已使用，自动模式，检测到回闪'
        };
        
        return flashMap[value] || `代码: ${value}`;
    }

    // 格式化GPS坐标
    formatGPS(value) {
        if (Array.isArray(value) && value.length === 3) {
            const degrees = value[0];
            const minutes = value[1];
            const seconds = value[2];
            return `${degrees}° ${minutes}' ${seconds}"`;
        }
        return String(value);
    }

    // 格式化方向
    formatOrientation(value) {
        const orientationMap = {
            1: '正常',
            2: '水平翻转',
            3: '旋转180°',
            4: '垂直翻转',
            5: '水平翻转并逆时针旋转90°',
            6: '顺时针旋转90°',
            7: '水平翻转并顺时针旋转90°',
            8: '逆时针旋转90°'
        };
        
        return orientationMap[value] || `代码: ${value}`;
    }

    // 格式化分辨率单位
    formatResolutionUnit(value) {
        const unitMap = {
            1: '无单位',
            2: '英寸',
            3: '厘米'
        };
        
        return unitMap[value] || `代码: ${value}`;
    }

    // 获取标签分类
    getTagCategory(tag) {
        if (['Make', 'Model', 'Software', 'DateTime', 'DateTimeOriginal', 'DateTimeDigitized'].includes(tag)) {
            return 'basic';
        } else if (['ExposureTime', 'FNumber', 'ISO', 'FocalLength', 'Flash', 'WhiteBalance', 'ExposureMode', 'ExposureProgram'].includes(tag)) {
            return 'technical';
        } else if (tag.startsWith('GPS')) {
            return 'location';
        } else if (['ImageWidth', 'ImageLength', 'Orientation', 'XResolution', 'YResolution', 'ResolutionUnit'].includes(tag)) {
            return 'image';
        } else {
            return 'other';
        }
    }

    // 批量读取EXIF
    async readMultipleEXIF(files) {
        const results = [];
        const errors = [];

        for (let i = 0; i < files.length; i++) {
            try {
                const exifData = await this.readEXIF(files[i]);
                results.push({
                    file: files[i],
                    exif: exifData
                });
                
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
            console.warn('部分文件EXIF读取失败:', errors);
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

    // 导出EXIF数据为JSON
    exportEXIFAsJSON(exifData, filename = 'exif_data.json') {
        const jsonString = JSON.stringify(exifData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        imageUtils.downloadFile(blob, filename);
    }

    // 检查是否有GPS信息
    hasGPSInfo(exifData) {
        return exifData.location && Object.keys(exifData.location).length > 0;
    }

    // 获取GPS坐标
    getGPSCoordinates(exifData) {
        if (!this.hasGPSInfo(exifData)) {
            return null;
        }

        const lat = exifData.location.GPSLatitude;
        const lng = exifData.location.GPSLongitude;
        const latRef = exifData.location.GPSLatitudeRef;
        const lngRef = exifData.location.GPSLongitudeRef;

        if (lat && lng) {
            const latitude = this.convertDMSToDD(lat.value, latRef?.value);
            const longitude = this.convertDMSToDD(lng.value, lngRef?.value);
            
            return { latitude, longitude };
        }

        return null;
    }

    // 将度分秒转换为十进制度数
    convertDMSToDD(dms, ref) {
        if (!Array.isArray(dms) || dms.length !== 3) {
            return null;
        }

        const degrees = dms[0];
        const minutes = dms[1];
        const seconds = dms[2];

        let dd = degrees + minutes / 60 + seconds / 3600;

        if (ref === 'S' || ref === 'W') {
            dd = -dd;
        }

        return dd;
    }
}

// 全局EXIF处理器实例
window.exifProcessor = new EXIFProcessor();

// 读取EXIF功能
async function readEXIF() {
    const files = window.selectedFiles;
    if (!files || files.length === 0) {
        imageUtils.showNotification('请先选择图片文件', 'warning');
        return;
    }

    const processBtn = document.querySelector('#exif .process-btn');
    const stopLoading = imageUtils.showLoading(processBtn, '读取EXIF中...');

    try {
        const result = await exifProcessor.readMultipleEXIF(files);

        if (result.success > 0) {
            // 显示结果
            displayEXIFResults(result.results);
            imageUtils.showNotification(`成功读取 ${result.success} 张图片的EXIF信息`, 'success');
        }

        if (result.failed > 0) {
            imageUtils.showNotification(`${result.failed} 张图片EXIF读取失败`, 'warning');
        }

    } catch (error) {
        imageUtils.showNotification(error.message, 'error');
        console.error('EXIF读取错误:', error);
    } finally {
        stopLoading();
    }
}

// 显示EXIF结果
function displayEXIFResults(results) {
    const exifDisplay = document.getElementById('exifDisplay');
    
    if (results.length === 0) {
        exifDisplay.innerHTML = '<p>没有找到EXIF信息</p>';
        return;
    }

    let html = '';
    
    results.forEach((result, index) => {
        const { file, exif } = result;
        
        html += `<div class="exif-file-section">`;
        html += `<h4>${file.name}</h4>`;
        
        // 基本信息
        if (Object.keys(exif.basic).length > 0) {
            html += `<div class="exif-category">`;
            html += `<h5>基本信息</h5>`;
            html += `<div class="exif-info">`;
            for (const [tag, data] of Object.entries(exif.basic)) {
                html += `<div class="exif-item">`;
                html += `<div class="label">${data.label}:</div>`;
                html += `<div class="value">${data.value}</div>`;
                html += `</div>`;
            }
            html += `</div></div>`;
        }

        // 技术参数
        if (Object.keys(exif.technical).length > 0) {
            html += `<div class="exif-category">`;
            html += `<h5>技术参数</h5>`;
            html += `<div class="exif-info">`;
            for (const [tag, data] of Object.entries(exif.technical)) {
                html += `<div class="exif-item">`;
                html += `<div class="label">${data.label}:</div>`;
                html += `<div class="value">${data.value}</div>`;
                html += `</div>`;
            }
            html += `</div></div>`;
        }

        // 位置信息
        if (Object.keys(exif.location).length > 0) {
            html += `<div class="exif-category">`;
            html += `<h5>位置信息</h5>`;
            html += `<div class="exif-info">`;
            for (const [tag, data] of Object.entries(exif.location)) {
                html += `<div class="exif-item">`;
                html += `<div class="label">${data.label}:</div>`;
                html += `<div class="value">${data.value}</div>`;
                html += `</div>`;
            }
            html += `</div></div>`;
        }

        // 图像信息
        if (Object.keys(exif.image).length > 0) {
            html += `<div class="exif-category">`;
            html += `<h5>图像信息</h5>`;
            html += `<div class="exif-info">`;
            for (const [tag, data] of Object.entries(exif.image)) {
                html += `<div class="exif-item">`;
                html += `<div class="label">${data.label}:</div>`;
                html += `<div class="value">${data.value}</div>`;
                html += `</div>`;
            }
            html += `</div></div>`;
        }

        // 其他信息
        if (Object.keys(exif.other).length > 0) {
            html += `<div class="exif-category">`;
            html += `<h5>其他信息</h5>`;
            html += `<div class="exif-info">`;
            for (const [tag, data] of Object.entries(exif.other)) {
                html += `<div class="exif-item">`;
                html += `<div class="label">${data.label}:</div>`;
                html += `<div class="value">${data.value}</div>`;
                html += `</div>`;
            }
            html += `</div></div>`;
        }

        html += `</div>`;
    });

    exifDisplay.innerHTML = html;
} 