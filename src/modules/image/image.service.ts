import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GenerateImageDto } from './dto/create-image.dto';
import OpenAI from "openai"
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { imageEntity } from 'src/model/image.entity';
import { userEntity } from 'src/model/user.entity';
import { Images } from 'openai/resources';
import { UploadService } from 'src/helper/utils/files_upload';
@Injectable()
export class ImageService {
  constructor(
    private openai: OpenAI,
    @InjectRepository(imageEntity)
    private imageRepository: Repository<imageEntity>,
    private uploadService: UploadService
  ) {
    // Initialize OpenAI API client
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  async generateImage(generateImageDto: GenerateImageDto, id?: string) {

    const { title, artStyle, lightingStyle, moodStyle, imageSize, negative_keywords } = generateImageDto;
    console.log(generateImageDto);

    // Define valid sizes for DALL-E 2 and DALL-E 3
    const dallE2Sizes = ['256x256', '512x512'];
    const dallE3Sizes = ['1024x1024', '1792x1024', '1024x1792'];

    // Check if the image size is valid for either DALL-E 2 or DALL-E 3
    if (![...dallE2Sizes, ...dallE3Sizes].includes(imageSize)) {
      throw new BadRequestException('The size is not supported.');
    }

    // Select model based on image size
    let model = '';
    if (dallE3Sizes.includes(imageSize)) {
      model = 'dall-e-3'; // DALL-E 3 for larger sizes
    } else if (dallE2Sizes.includes(imageSize)) {
      model = 'dall-e-2'; // DALL-E 2 for smaller sizes
    }

    let fullPrompt = title;
    if (artStyle) fullPrompt += `, in the style of ${artStyle}`;
    if (lightingStyle) fullPrompt += `, with ${lightingStyle} lighting`;
    if (moodStyle) fullPrompt += `, evoking a ${moodStyle} mood`;
    if (negative_keywords) fullPrompt += `, avoiding: ${negative_keywords}`;
    try {
      const response = await this.openai.images.generate({

        model: model,
        prompt: fullPrompt,
        n: 1,
        size: imageSize
      });

      // Get the URL of the generated image
      const imageUrl = response.data[0].url;
      const savedImage = await this.uploadService.upload(imageUrl);
      if (savedImage && id) {
        const Images = new imageEntity();
        Images.image = savedImage;
        Images.prompt = fullPrompt;
        Images.user = { id } as userEntity;
        const savedImages = await this.imageRepository.save(Images);
        return {
          id: savedImages.id,
          image: savedImages.image, // Return the image URL
          success: true
        };

      }


    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async findAll(id: string) {
    try {
      const images = await this.imageRepository.find({ where: { user: { id } }, select: { id: true, createdAt: true, image: true } });
      return images;
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} image`;
  }

  // update(id: number, updateImageDto: UpdateImageDto) {
  //   return `This action updates a #${id} image`;
  // }

  //update status as true for saving
  async updateStatus(id: string, userId: string) {
    try {
      const image = await this.imageRepository.findOne({ where: { id } });
      if (!image) {
        throw new NotFoundException("Image not found");
      }
      if (image.status === true) {
        return new BadRequestException("Image have already been saved");
      }
      image.status = true;
      return await this.imageRepository.save(image);
    } catch (e) {
      throw e instanceof NotFoundException || e instanceof BadRequestException
        ? e
        : new BadRequestException(e.message);
    }
  }

  async unsave(id: string) {
    try {
      const image = await this.imageRepository.findOne({ where: { id } });
      if (!image) {
        throw new NotFoundException("Image not found");
      }
      if (image.status === false) {
        return new BadRequestException("Image have already been removed");
      }
      image.status = false;
      return await this.imageRepository.save(image);
    } catch (e) {
      throw e instanceof NotFoundException || e instanceof BadRequestException
        ? e
        : new BadRequestException(e.message);
    }
  }




  remove(id: number) {
    return `This action removes a #${id} image`;
  }
}
