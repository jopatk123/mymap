class ConfigBroadcaster {
  constructor(options = {}) {
    this.wss = options.wss || null;
    this.logger = options.logger;
  }

  attach(wss) {
    this.wss = wss;
  }

  detach() {
    this.wss = null;
  }

  broadcastInitialView(initialView) {
    if (!this.wss || !initialView) return { sent: 0 };
    const payload = {
      type: 'initial-view-updated',
      data: initialView,
      _t: Date.now(),
    };

    const text = JSON.stringify(payload);
    let sent = 0;
    this.wss.clients.forEach((client) => {
      try {
        if (client.readyState === 1) {
          client.send(text);
          sent += 1;
        }
      } catch (error) {
        if (this.logger && typeof this.logger.warn === 'function') {
          this.logger.warn('[ConfigBroadcaster] Failed to send update', error);
        }
      }
    });

    if (this.logger && typeof this.logger.info === 'function') {
      this.logger.info(`初始显示设置已广播到 ${sent} 个WebSocket客户端`);
    }

    return { sent };
  }
}

module.exports = ConfigBroadcaster;
