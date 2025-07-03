declare module 'msw' {
  export interface RestRequest {
    url: URL;
    method: string;
    params: Record<string, string>;
    headers: Headers;
    cookies: Record<string, string>;
    body: any;
  }

  export interface ResponseComposition {
    status: (statusCode: number) => ResponseComposition;
    headers: (headers: Record<string, string>) => ResponseComposition;
    body: (body: any) => ResponseComposition;
    json: (data: any) => ResponseComposition;
    text: (text: string) => ResponseComposition;
  }

  export interface RestContext {
    status: (statusCode: number) => ResponseComposition;
    json: (data: any) => ResponseComposition;
    text: (text: string) => ResponseComposition;
    delay: (ms: number) => ResponseComposition;
  }

  export const rest: {
    get: (path: string, handler: (req: RestRequest, res: ResponseComposition, ctx: RestContext) => Promise<any> | any) => any;
    post: (path: string, handler: (req: RestRequest, res: ResponseComposition, ctx: RestContext) => Promise<any> | any) => any;
    put: (path: string, handler: (req: RestRequest, res: ResponseComposition, ctx: RestContext) => Promise<any> | any) => any;
    delete: (path: string, handler: (req: RestRequest, res: ResponseComposition, ctx: RestContext) => Promise<any> | any) => any;
  };

  export function setupServer(...handlers: any[]): {
    listen: () => void;
    close: () => void;
    resetHandlers: () => void;
  };
}
