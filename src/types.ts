import { EntityManager, IDatabaseDriver, Connection } from '@mikro-orm/core';
import { Request, Response } from 'express';
import { Session } from 'express-session';

interface MySession extends Session {
  [key: string]: any;
}

export type MyContext = {
  em: EntityManager<any> & EntityManager<IDatabaseDriver<Connection>>;
  req: Request & { session: MySession };
  res: Response;
};
