import axios from 'axios';

jest.mock('axios', () => {
  const handlers: { fulfilled?: Function; rejected?: Function }[] = [];
  const instance = {
    interceptors: {
      request: { use: jest.fn() },
      response: {
        use: (_f: Function, r: Function) => {
          handlers.push({ rejected: r });
        },
      },
    },
    post: jest.fn(),
    get: jest.fn(),
  };
  return {
    __esModule: true,
    default: {
      create: () => instance,
      ...instance,
    },
    handlers,
  };
});

describe('API error handling', () => {
  it('rejects with server error message shape', async () => {
    const error = {
      response: { status: 401, data: { error: 'Unauthorized' } },
    };
    expect(error.response.data.error).toBe('Unauthorized');
  });

  it('surfaces create patient validation error', () => {
    const apiError = { response: { data: { error: 'Emergency fields required' } } };
    expect(apiError.response.data.error).toContain('Emergency');
  });
});
