import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { ObjectType, Field } from 'type-graphql';

// with decorators we are turning that class into graphql type Post
@ObjectType()
// Entity -> tells mikroORM that it's db table
@Entity()
export class Post {
  // to expose that field in graphql schema
  @Field()
  @PrimaryKey()
  id!: number;

  @Field(() => String)
  @Property({ type: 'date' }) // Property - regular column
  createdAt = new Date();

  @Field(() => String)
  @Property({ type: 'date', onUpdate: () => new Date() })
  updatedAt = new Date();

  @Field()
  @Property({ type: 'text' })
  title!: string;
}
