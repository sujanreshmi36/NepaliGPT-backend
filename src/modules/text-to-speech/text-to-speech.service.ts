import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { CreateSpeechToTextDto } from '../speech-to-text/dto/create-speech-to-text.dto';
import { CreateTextToSpeechDto } from './dto/create-text-to-speech.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ttsEntity } from 'src/model/tts.entity';
import { Repository } from 'typeorm';
import { userEntity } from 'src/model/user.entity';
import { SpeechTone } from 'src/helper/types/index.type';

@Injectable()
export class TextToSpeechService {
  private openai: OpenAI;

  constructor(private configService: ConfigService,
    @InjectRepository(ttsEntity)
    private readonly ttsRepository: Repository<ttsEntity>
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY'),
    });

    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
    });
  }

  async generateSpeech(createTextToSpeech: CreateTextToSpeechDto, id: string) {
    try {
      const { tone, text } = createTextToSpeech;
      const voiceMapping = {
        neutral: 'alloy',
        professional: 'onyx',
        storytelling: 'fable',
        friendly: 'nova',
        robotic: 'echo',
        relaxing: 'shimmer'
      } as const;

      // Get the corresponding voice from the mapping
      const selectedVoice = voiceMapping[tone] || 'alloy'; // Default to Alloy if not found
      console.log(selectedVoice);


      const speechFilePath = path.resolve('./speech.mp3');

      const mp3 = await this.openai.audio.speech.create({
        model: 'tts-1',
        voice: selectedVoice,
        input: text,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      await fs.promises.writeFile(speechFilePath, buffer);
      const Audio = await this.uploadToCloudinary(speechFilePath);
      const tts = new ttsEntity();
      tts.audio = Audio;
      tts.text = text;
      tts.user = { id } as userEntity;
      return await this.ttsRepository.save(tts);
    } catch (error) {
      console.error('Error generating speech:', error);
      throw new Error('Failed to generate speech');
    }
  }

  async uploadToCloudinary(filePath: string): Promise<string> {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        resource_type: 'video', // Use 'video' for audio files
      });

      return result.secure_url;
    } catch (error) {
      console.error('Cloudinary upload failed:', error);
      throw new Error('Failed to upload file');
    } finally {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath); // Clean up local file after upload
      }
    }
  }

  async findAll(id: string) {
    try {
      return await this.ttsRepository.find({ where: { user: { id } } });
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async updateStatus(id: string, userId: string) {
    try {
      const tts = await this.ttsRepository.findOne({ where: { id } });
      if (!tts) {
        throw new NotFoundException("Speech not found");
      }

      if (tts.status === true) {
        throw new BadRequestException("Speech has already been saved.");
      }

      tts.status = true;

      return await this.ttsRepository.save(tts);
    } catch (e) {
      throw e instanceof NotFoundException || e instanceof BadRequestException
        ? e
        : new BadRequestException(e.message);
    }
  }

  async unsave(id: string) {
    try {
      const tts = await this.ttsRepository.findOne({ where: { id } });
      if (!tts) {
        throw new NotFoundException("Speech not found");
      }

      if (tts.status === false) {
        throw new BadRequestException("Speech has already been removed.");
      }

      tts.status = false;

      return await this.ttsRepository.save(tts);
    } catch (e) {
      throw e instanceof NotFoundException || e instanceof BadRequestException
        ? e
        : new BadRequestException(e.message);
    }
  }

}

