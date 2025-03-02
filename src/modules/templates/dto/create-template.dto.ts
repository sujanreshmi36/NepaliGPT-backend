import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsEnum, IsNumber, IsObject, IsString, ValidateNested } from "class-validator";
import { AccessType } from "src/helper/types/index.type";

export class FieldDto {
    @IsString()
    @ApiProperty()
    name: string;

    @IsString()
    @ApiProperty()
    type: string;
}

export class CreateTemplateDto {

    @IsString()
    @ApiProperty()
    name: string;

    @IsString()
    @ApiProperty()
    description: string;

    @IsEnum(AccessType)
    @ApiProperty()
    pricing: AccessType;

    @IsString()
    @ApiProperty()
    category: string; // e.g., 'Blog', 'Text', 'Social'

    @ValidateNested({ each: true })
    @Type(() => FieldDto)
    fields: FieldDto[];

    @IsString()
    @ApiProperty()
    promptTemplate: string;



}
export class generateDto {

    @IsObject()
    @ApiProperty()
    userInputs: Record<string, string>; // User-provided values for dynamic fields

    @IsString()
    @ApiProperty()
    creativity: string;

    @IsNumber()
    @ApiProperty()
    maxToken: number;

    @IsString()
    @ApiProperty()
    language: string;

}

