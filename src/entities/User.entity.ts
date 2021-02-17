import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from "typeorm";

// See https://github.com/typeorm/typeorm/issues/2797 to understand why
//   I added " | undefined" to the type annotations though the typeorm docs
//   don't mention it

@Entity("users")
@Unique(["phoneCountryCode", "phone"])
export default class User {
  @PrimaryGeneratedColumn()
  id: number | undefined;

  @Column({ type: "varchar", name: "first_name" })
  firstName: string | undefined;

  @Column({ type: "varchar", name: "last_name" })
  lastName: string | undefined;

  @Column({ type: "varchar", unique: true, nullable: true })
  email: string | undefined;

  @Column({ type: "boolean", name: "email_verified", default: false })
  emailVerified: boolean | undefined;

  @Column({ type: "varchar", nullable: true, name: "phone_country_code" })
  phoneCountryCode: string | undefined;

  @Column({ type: "varchar", nullable: true })
  phone: string | undefined;

  @Column({ type: "boolean", name: "phone_verified", default: false })
  phoneVerified: boolean | undefined;

  @Column({ type: "varchar", nullable: true })
  password: string | undefined;

  @Column({ type: "varchar", name: "profile_pic_url", nullable: true })
  profilePicUrl: string | undefined;

  @Column({ type: "varchar", default: "student" })
  role: string | undefined;

  @CreateDateColumn({ type: "timestamp", name: "created_at" })
  createdAt: string | undefined;

  @UpdateDateColumn({ type: "timestamp", name: "updated_at" })
  updatedAt: string | undefined;
}
