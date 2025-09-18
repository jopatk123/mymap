import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import * as XLSX from 'xlsx';

export function useExcelProcessor() {
  const validationResult = ref(null);
  const previewData = ref([]);

  // 必需的列名（支持多种变体）
  const REQUIRED_COLUMNS = {
    name: ['点位名称', '名称', '标题', 'name', 'title', '地名'],
    longitude: ['经度', 'lng', 'lon', 'longitude', 'x', '东经'],
    latitude: ['纬度', 'lat', 'latitude', 'y', '北纬']
  };

  // 可选的列名
  const OPTIONAL_COLUMNS = {
    description: ['备注', '描述', '说明', 'description', 'note', 'remark', 'desc']
  };

  // 读取Excel文件
  const readExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          resolve(workbook);
        } catch (error) {
          reject(new Error('读取Excel文件失败: ' + error.message));
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsArrayBuffer(file);
    });
  };

  // 查找匹配的列名
  const findColumnIndex = (headers, possibleNames) => {
    const normalizedHeaders = headers.map(h => (h || '').toString().trim());
    
    for (let i = 0; i < possibleNames.length; i++) {
      const index = normalizedHeaders.findIndex(header => 
        header === possibleNames[i] || 
        header.toLowerCase() === possibleNames[i].toLowerCase()
      );
      if (index !== -1) {
        return { index, name: normalizedHeaders[index] };
      }
    }
    return null;
  };

  // 验证Excel文件结构
  const validateExcelStructure = (worksheet) => {
    try {
      // 获取工作表范围
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
      if (range.e.r < 1) {
        return { valid: false, error: 'Excel文件至少需要包含表头和一行数据' };
      }

      // 读取第一行作为表头
      const headers = [];
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        const cell = worksheet[cellAddress];
        headers.push(cell ? cell.v : '');
      }

      // 检查必需的列
      const columnMapping = {};
      const missingColumns = [];

      // 检查点位名称
      const nameCol = findColumnIndex(headers, REQUIRED_COLUMNS.name);
      if (nameCol) {
        columnMapping.name = nameCol;
      } else {
        missingColumns.push('点位名称');
      }

      // 检查经度
      const lngCol = findColumnIndex(headers, REQUIRED_COLUMNS.longitude);
      if (lngCol) {
        columnMapping.longitude = lngCol;
      } else {
        missingColumns.push('经度');
      }

      // 检查纬度
      const latCol = findColumnIndex(headers, REQUIRED_COLUMNS.latitude);
      if (latCol) {
        columnMapping.latitude = latCol;
      } else {
        missingColumns.push('纬度');
      }

      // 检查可选的备注列
      const descCol = findColumnIndex(headers, OPTIONAL_COLUMNS.description);
      if (descCol) {
        columnMapping.description = descCol;
      }

      if (missingColumns.length > 0) {
        return {
          valid: false,
          error: `缺少必需的列: ${missingColumns.join('、')}。请确保Excel文件包含以下列名之一：\n` +
                 `• 点位名称: ${REQUIRED_COLUMNS.name.join('、')}\n` +
                 `• 经度: ${REQUIRED_COLUMNS.longitude.join('、')}\n` +
                 `• 纬度: ${REQUIRED_COLUMNS.latitude.join('、')}\n` +
                 `• 备注(可选): ${OPTIONAL_COLUMNS.description.join('、')}`
        };
      }

      return {
        valid: true,
        columnMapping,
        headers,
        range
      };
    } catch (error) {
      return {
        valid: false,
        error: '解析Excel文件结构失败: ' + error.message
      };
    }
  };

  // 解析Excel数据
  const parseExcelData = (worksheet, validation, fileName) => {
    const { columnMapping, range } = validation;
    const points = [];
    const errors = [];

    // 从第二行开始读取数据（跳过表头）
    for (let row = 1; row <= range.e.r; row++) {
      try {
        // 获取各列的值
        const nameCell = worksheet[XLSX.utils.encode_cell({ r: row, c: columnMapping.name.index })];
        const lngCell = worksheet[XLSX.utils.encode_cell({ r: row, c: columnMapping.longitude.index })];
        const latCell = worksheet[XLSX.utils.encode_cell({ r: row, c: columnMapping.latitude.index })];
        const descCell = columnMapping.description ? 
          worksheet[XLSX.utils.encode_cell({ r: row, c: columnMapping.description.index })] : null;

        const name = nameCell ? String(nameCell.v).trim() : '';
        const lngStr = lngCell ? String(lngCell.v).trim() : '';
        const latStr = latCell ? String(latCell.v).trim() : '';
        const description = descCell ? String(descCell.v).trim() : '';

        // 跳过空行
        if (!name && !lngStr && !latStr) {
          continue;
        }

        // 验证必需字段
        if (!name) {
          errors.push(`第${row + 1}行: 点位名称不能为空`);
          continue;
        }

        // 验证经纬度
        const longitude = parseFloat(lngStr);
        const latitude = parseFloat(latStr);

        if (isNaN(longitude) || isNaN(latitude)) {
          errors.push(`第${row + 1}行: 经纬度格式错误 (经度: ${lngStr}, 纬度: ${latStr})`);
          continue;
        }

        // 验证经纬度范围
        if (longitude < -180 || longitude > 180) {
          errors.push(`第${row + 1}行: 经度超出有效范围(-180~180): ${longitude}`);
          continue;
        }

        if (latitude < -90 || latitude > 90) {
          errors.push(`第${row + 1}行: 纬度超出有效范围(-90~90): ${latitude}`);
          continue;
        }

        // 添加点位数据
        points.push({
          name,
          longitude,
          latitude,
          description: description || fileName || '从Excel文件导入',
          pointType: 'Point'
        });

      } catch (error) {
        errors.push(`第${row + 1}行: 数据解析错误 - ${error.message}`);
      }
    }

    return { points, errors };
  };

  // 验证Excel文件
  const validateExcelFile = async (file) => {
    try {
      validationResult.value = null;
      previewData.value = [];

      // 检查文件对象
      if (!file || !(file instanceof File || file instanceof Blob)) {
        throw new Error('无效的文件对象');
      }

      const workbook = await readExcelFile(file);
      
      // 获取第一个工作表
      const sheetNames = workbook.SheetNames;
      if (sheetNames.length === 0) {
        const error = 'Excel文件中没有找到工作表';
        validationResult.value = { valid: false, error };
        ElMessage.error(error);
        return { valid: false, error };
      }

      const worksheet = workbook.Sheets[sheetNames[0]];
      
      // 验证文件结构
      const structureValidation = validateExcelStructure(worksheet);
      if (!structureValidation.valid) {
        validationResult.value = structureValidation;
        ElMessage.error(structureValidation.error);
        return structureValidation;
      }

      // 解析数据
      const fileName = file.name.replace(/\.[^/.]+$/, '');
      const { points, errors } = parseExcelData(worksheet, structureValidation, fileName);

      if (errors.length > 0 && points.length === 0) {
        const error = '没有找到有效的点位数据:\n' + errors.slice(0, 5).join('\n');
        validationResult.value = { valid: false, error };
        ElMessage.error(error);
        return { valid: false, error };
      }

      // 设置预览数据
      previewData.value = points.slice(0, 10);

      const result = {
        valid: true,
        pointCount: points.length,
        points: points,
        previewPoints: previewData.value,
        errors: errors.slice(0, 10), // 只显示前10个错误
        columnMapping: structureValidation.columnMapping
      };

      validationResult.value = result;

      // 显示成功消息
      let message = `Excel文件验证成功，共解析到 ${points.length} 个有效点位`;
      if (errors.length > 0) {
        message += `，${errors.length} 个数据行有问题已跳过`;
      }
      ElMessage.success(message);

      return result;

    } catch (error) {
      const errorMsg = 'Excel文件解析失败: ' + (error?.message || error);
      validationResult.value = { valid: false, error: errorMsg };
      ElMessage.error(errorMsg);
      return { valid: false, error: errorMsg };
    }
  };

  // 处理文件
  const processFile = async (file, form = null) => {
    if (form && !form.title && file?.name) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      form.title = nameWithoutExt;
    }

    return await validateExcelFile(file);
  };

  // 验证文件类型
  const validateFile = (file) => {
    if (!file || !(file instanceof File || file instanceof Blob)) {
      ElMessage.error('文件对象无效!');
      return false;
    }

    if (!file.name || !file.type || !file.size) {
      ElMessage.error('文件信息不完整!');
      return false;
    }

    // 检查文件扩展名和MIME类型（临时支持CSV用于测试）
    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || 
                   fileName.endsWith('.xls') || 
                   fileName.endsWith('.csv') ||
                   file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                   file.type === 'application/vnd.ms-excel' ||
                   file.type === 'text/csv';

    if (!isExcel) {
      ElMessage.error('只能上传Excel文件(.xlsx, .xls, .csv)!');
      return false;
    }

    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      ElMessage.error('Excel文件大小不能超过 10MB!');
      return false;
    }

    return true;
  };

  return {
    validationResult,
    previewData,
    validateFile,
    processFile,
    validateExcelFile
  };
}