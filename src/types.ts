import { Request, Response } from 'express';
import { Session } from 'express-session';
import { Redis } from 'ioredis';

interface MySession extends Session {
  [key: string]: any;
}

export type MyContext = {
  req: Request & { session: MySession };
  res: Response;
  redis: Redis;
};
