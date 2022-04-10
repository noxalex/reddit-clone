import { MyContext } from '../types';
import {
  Resolver,
  Mutation,
  Field,
  Arg,
  Ctx,
  InputType,
  ObjectType,
  Query,
} from 'type-graphql';
import { User } from '../entities/User';
import argon2 from 'argon2';

@InputType()
class UsernamePasswordInput {
  @Field()
  username: string;
  @Field()
  password: string;
}

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
  @Query(() => User, { nullable: true })
  async me(@Ctx() { req, em }: MyContext): Promise<User | null> {
    // you are not logged in
    if (!req.session.userId) {
      return null;
    }

    const user = await em.findOne(User, { id: req.session.userId });
    return user;
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg('options') options: UsernamePasswordInput,
    @Ctx() { em, req }: MyContext,
  ): Promise<UserResponse> {
    if (options.username.length <= 2) {
      return {
        errors: [
          {
            field: 'username',
            message: 'username requires at least 2 characters',
          },
        ],
      };
    }

    if (options.password.length <= 3) {
      return {
        errors: [
          {
            field: 'password',
            message: 'password requires at least 3 characters',
          },
        ],
      };
    }

    const hashedPassword = await argon2.hash(options.password);
    const user = em.create(User, {
      username: options.username,
      password: hashedPassword,
    });

    try {
      await em.persistAndFlush(user);
    } catch (err) {
      if (err.name === 'UniqueConstraintViolationException') {
        return {
          errors: [
            {
              field: 'username',
              message: `username '${options.username}' already taken`,
            },
          ],
        };
      } else {
        console.log(`message: (unhandled error) ${err.message}`);
      }
    }

    // (if it doesnt work in graphql devtools just try "request.credentials": "same-origin" or "include")

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
    @Arg('options') options: UsernamePasswordInput,
    @Ctx() { em, req }: MyContext,
  ): Promise<UserResponse> {
    const user = await em.findOne(User, { username: options.username });
    if (!user) {
      return {
        errors: [
          {
            field: 'username',
            message: "that username doesn't exist",
          },
        ],
      };
    }

    const validPassword = await argon2.verify(user.password, options.password);
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
    console.log('session:', req.session);
    return {
      user,
    };
  }
}
