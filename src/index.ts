import 'reflect-metadata';
import Redis from 'ioredis';
import session from 'express-session';
import connectRedis from 'connect-redis';
import { __prod__, COOKIE_NAME } from './constants';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from 'type-graphql';
import { HelloResolver } from './resolvers/hello';
import { PostResolver } from './resolvers/post';
import { UserResolver } from './resolvers/user';
import { MyContext } from './types';
import cors from 'cors';
import { DataSource } from 'typeorm';
import { Post } from './entities/Post';
import { User } from './entities/User';

const main = async () => {
  const dataSource = new DataSource({
    type: 'postgres',
    database: 'reddit-clone2',
    username: 'aleksandr.panko',
    password: '',
    logging: true,
    synchronize: true,
    entities: [Post, User],
  });

  await dataSource.initialize();

  const app = express();

  // order matters
  // first express should run session MW then ApolloMW
  // so we can use session MW inside Apollo

  const RedisStore = connectRedis(session);
  const redis = new Redis();

  // cors is going to apply on all routes
  app.use(
    cors({
      origin: 'http://localhost:3000',
      credentials: true,
    }),
  );

  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({
        client: redis,
        disableTouch: true,
      }), // tell express session that we are using redis
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
        httpOnly: true, // no acces from frontend
        sameSite: 'lax', // csrf
        secure: __prod__, // cookie only works in https
      },
      saveUninitialized: false, // it will create session
      // by default even if we don't store any data in it, we don't need empty sessions
      secret: 'qweqwejkldjqoiweuowieujfow',
      resave: false,
    }),
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    // Apollo is giving us access to session inside resolvers by passing 'req' and 'res' objects
    context: ({ req, res }): MyContext => ({ req, res, redis }),
  });

  apolloServer.applyMiddleware({
    app,
    cors: false,
  }); // create graphql endpoint on express

  app.listen(4000, () => {
    console.log('server started on localhost:4000');
  });
};

main();
