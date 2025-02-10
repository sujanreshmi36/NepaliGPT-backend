import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { CreateBotDto, CreateSuperAdminDto } from './dto/create-super-admin.dto';
import { UpdateSuperAdminDto } from './dto/update-super-admin.dto';
import { CreateAuthDto } from '../auth/dto/create-auth.dto';
import { DataSource, Repository } from 'typeorm';
import { authEntity } from 'src/model/auth.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { RestaurantStatus, roleType } from 'src/helper/types/index.type';
import { hash } from 'src/helper/utils/hash';
import { packageEntity } from 'src/model/package.entity';
import { UUID } from 'crypto';
import { superAdminEntity } from 'src/model/superAdmin.entity';
import { CreatePackageDto, UpdatePackageDto } from './dto/package.dto';
import { PaginationDto } from 'src/helper/utils/pagination.dto';
import { botEntity } from 'src/model/bot.entity';

@Injectable()
export class SuperAdminService {
  constructor(
    @InjectRepository(authEntity)
    private readonly authRepository: Repository<authEntity>,

    @InjectRepository(packageEntity)
    private readonly packageRepository: Repository<packageEntity>,
    @InjectRepository(botEntity)
    private readonly botRepository: Repository<botEntity>,
    // @InjectRepository(superAdminEntity)
    // private readonly superAdminRepo: Repository<superAdminEntity>,
    private hash: hash,
    private dataSource: DataSource
  ) { }

  async createSuperAdmin(createSuperAdmin: CreateSuperAdminDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const { email, password, name } = createSuperAdmin;
      const hashedPassword = await this.hash.value(password);
      const auth = new authEntity();
      auth.email = email;
      (auth.password = hashedPassword), (auth.role = roleType.superAdmin);
      await queryRunner.manager.save(auth);

      const admin = new superAdminEntity();
      admin.name = name;
      admin.photo = 'https://img.freepik.com/free-photo/young-woman-working-laptop-isolated-white-background_231208-1838.jpg?t=st=1738736255~exp=1738739855~hmac=a3d7e9b01ac341e40793841139b99a7f72f742376109d5a036ad0fcfef6782cc&w=996';
      admin.auth = auth;
      await queryRunner.manager.save(admin);
      await queryRunner.commitTransaction();
      return true;
    } catch (error) {
      console.log(error);
      await queryRunner.rollbackTransaction();
      throw new ForbiddenException(error.errorResponse);
    } finally {
      await queryRunner.release();
    }
  }

  async createBot(createBotDto: CreateBotDto, photo: string) {
    try {
      const { role, name, instructions } = createBotDto;
      const bot = new botEntity();
      bot.name = name;
      bot.role = role;
      bot.instructions = instructions;
      bot.photo = photo;
      return await this.botRepository.save(bot)
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async getBots() {
    try {
      return await this.botRepository.find();
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async updateAvatar(id: string, photo: string) {
    try {
      const bot = await this.botRepository.findOne({ where: { id } });
      bot.photo = photo;
      await this.botRepository.save(bot);
      return true
    } catch (e) {
      throw new BadRequestException(e.message);
    }

  }
  // async deleteSuperAdmin(id: UUID): Promise<authEntity> {
  //   const existingAdminAll = await this.authRepository.find();
  //   if (existingAdminAll.length === 1) {
  //     throw new ForbiddenException('Super Admin can not delete');
  //   }
  //   const existingAdmin = await this.authRepository.findOne({ where: { id } });
  //   return await this.authRepository.remove(existingAdmin);
  // }


  // async deleteRestaurant(id: UUID): Promise<restaurantEntity> {
  //   const existingRestaurant = await this.restaurantRepository.findOne({ where: { id } });
  //   return await this.restaurantRepository.remove(existingRestaurant);
  // }

  async findAllUser(paginationDto?: PaginationDto) {
    try {
      const { page, pageSize } = paginationDto || {};

      const queryBuilder = this.authRepository
        .createQueryBuilder('auth')
        .leftJoinAndSelect('auth.user', 'user')
        .leftJoinAndSelect('user.subscription', 'subscription')
        .leftJoinAndSelect('subscription.package', 'package')
        .where('auth.role = :role', { role: roleType.customer })
        .select([
          'auth.email',
          'auth.createdAt',
          'user.name',
          'user.isActive',
          'user.photo',
          'package.name',
        ]);

      // Apply pagination only if page & pageSize are provided
      if (page && pageSize) {
        queryBuilder.skip((page - 1) * pageSize).take(pageSize);
      }

      const [pagedUsers, count] = await queryBuilder.getManyAndCount();

      return {
        total: count,
        pagedUsers,
      };
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }


  async createPackage(createPackageDto: CreatePackageDto): Promise<packageEntity> {
    const newPackage = this.packageRepository.create(createPackageDto);
    return await this.packageRepository.save(newPackage);
  }

  // async findAllPackageById(id: UUID): Promise<packageEntity> {
  //   return await this.packageRepository.findOne({ where: { id: id } });
  // }

  async findAllPackage(): Promise<packageEntity[]> {
    return await this.packageRepository.find();
  }

  async updatePackage(id: string, updatePackageDto: UpdatePackageDto): Promise<packageEntity> {
    const existingPackage = await this.packageRepository.findOne({ where: { id } });
    const updatedPackage = Object.assign(existingPackage, updatePackageDto);
    return await this.packageRepository.save(updatedPackage);
  }

  async deletePackage(id: UUID): Promise<packageEntity> {
    const existingPackage = await this.packageRepository.findOne({ where: { id } });
    return await this.packageRepository.remove(existingPackage);
  }

}
