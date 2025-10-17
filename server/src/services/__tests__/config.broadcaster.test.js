const ConfigBroadcaster = require('../config/config.broadcaster');

describe('ConfigBroadcaster', () => {
  const makeClient = ({ readyState = 1, shouldThrow = false } = {}) => {
    return {
      readyState,
      send: jest.fn(() => {
        if (shouldThrow) {
          throw new Error('send failed');
        }
      }),
    };
  };

  it('skips broadcast when no WebSocket server attached', () => {
    const broadcaster = new ConfigBroadcaster();
    expect(broadcaster.broadcastInitialView({ any: 'thing' })).toEqual({ sent: 0 });
  });

  it('sends payload to connected clients and reports count', () => {
    const logger = { info: jest.fn(), warn: jest.fn() };
    const clients = [makeClient(), makeClient({ readyState: 0 }), makeClient()];
    const wss = { clients: new Set(clients) };
    const broadcaster = new ConfigBroadcaster({ logger });

    broadcaster.attach(wss);
    const result = broadcaster.broadcastInitialView({ enabled: true });

    expect(result).toEqual({ sent: 2 });
    expect(clients[0].send).toHaveBeenCalledTimes(1);
    expect(clients[1].send).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('初始显示设置已广播到 2 个WebSocket客户端');
  });

  it('warns when client send throws', () => {
    const logger = { info: jest.fn(), warn: jest.fn() };
    const faultyClient = makeClient({ shouldThrow: true });
    const wss = { clients: new Set([faultyClient]) };
    const broadcaster = new ConfigBroadcaster({ logger });

    broadcaster.attach(wss);
    const result = broadcaster.broadcastInitialView({ enabled: false });

    expect(result).toEqual({ sent: 0 });
    expect(logger.warn).toHaveBeenCalledWith(
      '[ConfigBroadcaster] Failed to send update',
      expect.any(Error)
    );
  });
});
