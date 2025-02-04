import { Column, Entity, ManyToOne } from "typeorm";
import { parentEntity } from ".";
import { userEntity } from "./user.entity";

@Entity('image')
export class imageEntity extends parentEntity {
    @Column()
    prompt: string;

    @Column()
    image: string;

    @ManyToOne(() => userEntity, (user) => user.image)
    user: userEntity;

}