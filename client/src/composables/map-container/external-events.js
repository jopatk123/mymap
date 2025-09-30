const noop = () => {};

/**
 * 将样式与标注刷新事件集中管理，统一返回清理函数。
 */
export function registerExternalEvents(options) {
  const {
    addStyleListener = noop,
    removeStyleListener = noop,
    addRefreshListener = noop,
    removeRefreshListener = noop,
    onStyleUpdate = noop,
    onMarkersRefresh = noop,
  } = options;

  addStyleListener(onStyleUpdate);
  addRefreshListener(onMarkersRefresh);

  let disposed = false;

  return () => {
    if (disposed) return;
    disposed = true;
    removeStyleListener(onStyleUpdate);
    removeRefreshListener(onMarkersRefresh);
  };
}
