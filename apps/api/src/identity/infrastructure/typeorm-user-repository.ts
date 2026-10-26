import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { User } from "../domain/user";
import type { UserRepository } from "../domain/user-repository";
import { UserEntity } from "./user.entity";

const toDomain = (row: UserEntity): User => User.create(row);

@Injectable()
export class TypeOrmUserRepository implements UserRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.dataSource
      .getRepository(UserEntity)
      .findOneBy({ email: User.normalizeEmail(email) });
    return row ? toDomain(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.dataSource.getRepository(UserEntity).findOneBy({ id });
    return row ? toDomain(row) : null;
  }

  async save(user: User): Promise<void> {
    await this.dataSource.getRepository(UserEntity).insert({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      passwordHash: user.passwordHash,
      createdAt: user.createdAt,
    });
  }
}
