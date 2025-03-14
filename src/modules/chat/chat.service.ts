import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateChatDto, SessionId } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from "openai"
import { chatEntity } from 'src/model/chat.entity';
import { userEntity } from 'src/model/user.entity';
import { sessionEntity } from 'src/model/session.entity';
@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(chatEntity)
    private readonly chatRepository: Repository<chatEntity>,
    @InjectRepository(sessionEntity)
    private readonly sessionRepository: Repository<sessionEntity>,
    private openai: OpenAI,
  ) {
    // Initialize OpenAI API client
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY, // Ensure this is set in your .env
    });
  }

  async chat(createChatDto: CreateChatDto, id: string, sessionDto?: SessionId): Promise<string> {
    try {
      const { prompt } = createChatDto;
      const { sessionId } = sessionDto;
      let session: sessionEntity;

      // If no sessionId is provided, create a new session
      if (!sessionId) {
        session = new sessionEntity();
        session.user = { id } as userEntity;
        session.title = prompt.substring(0, 30); // Set default title as first 30 chars of the first message
        session = await this.sessionRepository.save(session);
      } else {
        session = await this.sessionRepository.findOne({ where: { id: sessionId } });
        if (!session) throw new Error('Session not found');
      }
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 400
      });
      const answer = response.choices[0]?.message?.content || "No response from AI.";
      if (answer) {
        const chat = new chatEntity();
        chat.prompt = prompt;
        chat.response = answer;
        chat.session = session;
        chat.user = { id } as userEntity;
        await this.chatRepository.save(chat);
      }
      return answer;
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async getChatSessions(userId: string): Promise<sessionEntity[]> {
    return await this.sessionRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' }
    });
  }

  async getChatHistory(sessionId: string, userId: string): Promise<chatEntity[]> {
    return await this.chatRepository.find({
      where: { session: { id: sessionId }, user: { id: userId } },
      order: { createdAt: 'ASC' }, // Oldest messages first
    });
  }


  async renameSessionTitle(sessionId: string, newTitle: string): Promise<sessionEntity> {
    const session = await this.sessionRepository.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');

    session.title = newTitle;
    return await this.sessionRepository.save(session);
  }

  findOne(id: number) {
    return `This action returns a #${id} chat`;
  }

  update(id: number, updateChatDto: UpdateChatDto) {
    return `This action updates a #${id} chat`;
  }


}
