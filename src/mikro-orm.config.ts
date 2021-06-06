import { Post } from './entities/Post';
import { User } from './entities/User';
import { __prod__ } from './constants';
import { MikroORM } from '@mikro-orm/core';
import path from 'path';

// separate config file is added to acces this via cli
export default {
  migrations: {
    path: path.join(__dirname, './migrations'),
    pattern: /^[\w-]+\d+\.[tj]s$/,
  },
  entities: [Post, User],
  dbName: 'reddit-clone',
  type: 'postgresql',
  user: 'aleksandr.panko',
  password: '',
  debug: !__prod__, // log what sql is being executed
} as Parameters<typeof MikroORM.init>[0]; // to get the type that MikroORM.init expects as a first parameter
