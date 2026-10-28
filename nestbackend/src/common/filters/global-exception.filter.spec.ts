import { ArgumentsHost, BadRequestException, HttpException } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

function httpHost() {
  const res = { headersSent: false, status: jest.fn().mockReturnThis(), json: jest.fn() };
  const host = {
    getType: () => 'http',
    switchToHttp: () => ({ getResponse: () => res, getRequest: () => ({ url: '/oauth/token' }) }),
  } as unknown as ArgumentsHost;
  return { host, res };
}

describe('GlobalExceptionFilter', () => {
  const filter = new GlobalExceptionFilter();
  beforeAll(() => jest.spyOn(console, 'error').mockImplementation(() => undefined));

  it('writes a JSON response for HTTP errors (requests used to hang)', () => {
    const { host, res } = httpHost();
    filter.catch(new BadRequestException('unsupported_grant_type'), host);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400, message: 'unsupported_grant_type' }));
  });

  it('masks unexpected errors as 500 without leaking internals', () => {
    const { host, res } = httpHost();
    filter.catch(new Error('password=hunter2 leaked in stack'), host);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.calls[0][0].message).toBe('Internal server error');
  });

  it('returns an HttpException for GraphQL so Apollo formats it', () => {
    const host = {
      getType: () => 'graphql',
      getArgs: () => [{}, {}, {}, { fieldName: 'login' }],
      getArgByIndex: (i: number) => [{}, {}, {}, { fieldName: 'login' }][i],
    } as unknown as ArgumentsHost;
    const out = filter.catch(new Error('db exploded'), host);
    expect(out).toBeInstanceOf(HttpException);
    expect((out as HttpException).getStatus()).toBe(500);
    expect((out as HttpException).message).toBe('Internal server error');
  });
});
