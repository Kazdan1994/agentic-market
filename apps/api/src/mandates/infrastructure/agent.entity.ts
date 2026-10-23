import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "agents" })
export class AgentEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({ type: "text" })
  name!: string;

  @Column({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
