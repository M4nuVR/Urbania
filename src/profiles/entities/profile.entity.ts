import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';

// Perfil opcional: un usuario puede existir sin fila en "profiles".
@Entity({ name: 'profiles' })
@Index('uq_profiles_user_id', ['userId'], { unique: true })
export class Profile {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  // Profile es el propietario de la relación; al borrar el usuario se borra
  // su perfil. Sin cascadas hacia User.
  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  bio: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
