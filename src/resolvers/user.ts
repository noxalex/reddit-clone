import { MyContext } from '../types';
import {
  Resolver,
  Mutation,
  Field,
  Arg,
  Ctx,
  ObjectType,
  Query,
} from 'type-graphql';
import { User } from '../entities/User';
import argon2 from 'argon2';
import { COOKIE_NAME, FORGET_PASSWORD_PREFIX } from '../constants';
import { UsernamePasswordInput } from './UsernamePasswordInput';
import { validateRegister } from '../utils/validateRegister';
import { sendEmail } from '../utils/sendEmail';
import { v4 } from 'uuid';

@ObjectType()
class FieldError {
  @Field()
  field: string;
  @Field()
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export class UserResolver {
  @Mutation(() => UserResponse)
  async changePassword(
    @Arg('token') token: string,
    @Arg('newPassword') newPassword: string,
    @Ctx() { req, redis }: MyContext,
  ): Promise<UserResponse> {
    if (newPassword.length < 3) {
      return {
        errors: [
          {
            field: 'newPassword',
            message: 'password requires at least 3 characters',
          },
        ],
      };
    }
    const redisKey = FORGET_PASSWORD_PREFIX + token;
    const userId = await redis.get(redisKey);
    if (!userId) {
      return {
        errors: [
          {
            field: 'token',
            message: 'token expired',
          },
        ],
      };
    }

    const user = await User.findOne({ where: { id: +userId } });
    if (!user) {
      return {
        errors: [
          {
            field: 'token',
            message: 'user no longer exists',
          },
        ],
      };
    }

    await User.update(+userId, {
      password: await argon2.hash(newPassword),
    });

    await redis.del(redisKey);

    // log in user after change password
    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg('email') email: string,
    @Ctx() { redis }: MyContext,
  ) {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      // the email is not in db
      return true;
    }

    const token = v4();
    redis.set(
      FORGET_PASSWORD_PREFIX + token,
      user.id,
      'EX',
      1000 * 60 * 60 * 24 * 3,
    ); // 3 days

    await sendEmail(
      email,
      `<a href="http://localhost:3000/change-password/${token}">reset password</a>`,
    );
    return true;
  }

  @Query(() => User, { nullable: true })
  me(@Ctx() { req }: MyContext) {
    // you are not logged in
    if (!req.session.userId) {
      return null;
    }

    return User.findOne({ where: { id: req.session.userId } });
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg('options') options: UsernamePasswordInput,
    @Ctx() { req }: MyContext,
  ): Promise<UserResponse> {
    const hashedPassword = await argon2.hash(options.password);

    const errors = validateRegister(options);
    if (errors) {
      return {
        errors,
      };
    }

    const user = User.create({
      email: options.email,
      username: options.username,
      password: hashedPassword,
    });

    try {
      await user.save();
      console.log('user', user);
      // via query builder
      // await dataSource
      //   .createQueryBuilder()
      //   .insert()
      //   .into(User)
      //   .values({
      //    username: options.username,
      //    email: options.email,
      //    password: hashedPassword
      //   })
      //   .returning('*')
      //   .execute();
      // user = result.raw[0];
    } catch (err) {
      console.log('err: ', err.name);
      if (err.code === '23505') {
        if (err.detail.includes('username')) {
          return {
            errors: [
              {
                field: 'username',
                message: `username '${options.username}' already taken`,
              },
            ],
          };
        }
        if (err.detail.includes('email')) {
          return {
            errors: [
              {
                field: 'email',
                message: `email '${options.email}' already taken`,
              },
            ],
          };
        }
      } else {
        console.log(`message: (unhandled error) ${err.message}`);
      }
    }

    // (if it doesnt work in graphql devtools just try
    // "request.credentials": "same-origin" or "include")

    // store user id session
    // this will set a cookie on the user
    // keep them logged in after registration

    req.session.userId = user.id;

    return {
      user,
    };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg('usernameOrEmail') usernameOrEmail: string,
    @Arg('password') password: string,
    @Ctx() { req }: MyContext,
  ): Promise<UserResponse> {
    // I stopped here
    const user = await User.findOne(
      usernameOrEmail.includes('@')
        ? { where: { email: usernameOrEmail } }
        : { where: { username: usernameOrEmail } },
    );
    if (!user) {
      return {
        errors: [
          {
            field: 'usernameOrEmail',
            message: "that user doesn't exist",
          },
        ],
      };
    }

    const validPassword = await argon2.verify(user.password, password);
    if (!validPassword) {
      return {
        errors: [
          {
            field: 'password',
            message: 'incorrect password',
          },
        ],
      };
    }

    // 1. storing data in redis  "sses:qwelqkwnekqjwjke24234 -> { userId: 1 }"
    // 2. express-session MW will set a cookie in the browser
    // cookie: "2329e8s7d8f7y2xn878327x283" -> encrypted version of key in redis
    // 3. when user makes a request cookie is being sent to the server
    // 4. decrypt cookie with secret key and get key for redis
    // 5. make a request to redis

    req.session.hello = 'hello from cookie';
    req.session.userId = user.id;

    return {
      user,
    };
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: MyContext) {
    return new Promise((resolve) =>
      req.session.destroy((err) => {
        if (err) {
          console.log(err);
          resolve(false);
        }
        res.clearCookie(COOKIE_NAME);
        resolve(true);
      }),
    );
  }
}
