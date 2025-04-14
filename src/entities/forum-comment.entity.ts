// src/entities/forum-comment.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { ForumPost } from './forum-post.entity';

@Entity('forum_comments')
export class ForumComment {
  @PrimaryGeneratedColumn('increment')
  comment_id: number;

  @Column()
  post_id: number;

  @ManyToOne(() => ForumPost)
  @JoinColumn({ name: 'post_id' })
  post: ForumPost;

  @Column()
  user_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}