/**
 * 统一响应格式工具
 */

/**
 * 成功响应
 * @param {*} data 响应数据
 * @param {string} message 响应消息
 * @param {number} code 响应码
 * @returns {Object}
 */
function successResponse(data = null, message = '操作成功', code = 200) {
  return {
    code,
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  }
}

/**
 * 错误响应
 * @param {string} message 错误消息
 * @param {number} code 错误码
 * @param {*} data 错误数据
 * @returns {Object}
 */
function errorResponse(message = '操作失败', code = 500, data = null) {
  return {
    code,
    success: false,
    message,
    data,
    timestamp: new Date().toISOString()
  }
}

/**
 * 分页响应
 * @param {Array} data 数据列表
 * @param {Object} pagination 分页信息
 * @param {string} message 响应消息
 * @returns {Object}
 */
function paginatedResponse(data, pagination, message = '获取数据成功') {
  return successResponse({
    list: data,
    pagination
  }, message)
}

/**
 * 验证错误响应
 * @param {Array} errors 验证错误列表
 * @returns {Object}
 */
function validationErrorResponse(errors) {
  return errorResponse('参数验证失败', 400, {
    errors
  })
}

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse,
  validationErrorResponse
}