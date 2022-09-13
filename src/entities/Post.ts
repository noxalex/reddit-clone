import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
} from 'typeorm';
import { ObjectType, Field } from 'type-graphql';

// with decorators we are turning that class into graphql type Post
@ObjectType()
// Entity -> tells ORM that it's db table
@Entity()
export class Post extends BaseEntity {
  // to expose that field in graphql schema
  @Field()
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date;

  @Field()
  @Column()
  title!: string;
}
