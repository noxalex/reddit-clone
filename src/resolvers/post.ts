import { sleep } from '../utils/sleep';
import { Resolver, Query, Mutation, Arg } from 'type-graphql';
import { Post } from '../entities/Post';

@Resolver()
export class PostResolver {
  @Query(() => [Post]) // we need to set graphql type & typescript type for function
  // typescript type
  posts(): Promise<Post[]> {
    sleep(3000);
    return Post.find();
    // here we want to query posts from db and return them, and to do that,
    // we need to setup our ctx object to access orm object from resolver
  }

  @Query(() => Post, { nullable: true })
  post(@Arg('id') id: number): Promise<Post | null> {
    return Post.findOne({ where: { id } });
  }

  @Mutation(() => Post)
  createPost(
    // we are not setting graphql type,
    // type-graphql can infere type based on ts type
    @Arg('title') title: string,
  ): Promise<Post> {
    return Post.create({ title }).save();

    // const post = em.create(Post, { title });
    // await em.persistAndFlush(post);
    // return post;
  }

  @Mutation(() => Post, { nullable: true })
  async updatePost(
    @Arg('id') id: number,
    @Arg('title', () => String, { nullable: true }) title: string,
  ): Promise<Post | null> {
    const post = await Post.findOne({ where: { id } });

    if (!post) {
      return null;
    }
    if (typeof title !== 'undefined') {
      await Post.update(id, { title });
    }

    return post;
  }

  @Mutation(() => Boolean)
  async deletePost(@Arg('id') id: number): Promise<boolean> {
    await Post.delete(id);

    return true;
  }
}
