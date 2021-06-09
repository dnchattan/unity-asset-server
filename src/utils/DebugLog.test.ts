import { debug, setLogFn } from './DebugLog';
describe('debug logger', () => {
  let logFn: jest.Mock;
  beforeEach(() => {
    logFn = jest.fn();
    setLogFn(logFn);
  });
  it('category with message', () => {
    debug('category', 'message', 'arg1');
  });
});
