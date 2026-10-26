import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "users" })
export class UserEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "text", unique: true })
  email!: string;

  @Column({ name: "display_name", type: "text" })
  displayName!: string;

  @Column({ name: "password_hash", type: "text" })
  passwordHash!: string;

  @Column({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
