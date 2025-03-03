import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsEnum, IsNumber, IsObject, IsString, ValidateNested } from "class-validator";
import { AccessType, category, Creativity, inputType, Language } from "src/helper/types/index.type";

export class FieldDto {

    @IsEnum(inputType)
    @ApiProperty({ enum: inputType })
    type: inputType;

    @IsString()
    @ApiProperty()
    label: string;

    @IsString()
    @ApiProperty()
    placeholder: string;
}

export class CreateTemplateDto {

    @IsString()
    @ApiProperty()
    title: string;

    @IsString()
    @ApiProperty()
    description: string;

    @IsEnum(AccessType)
    @ApiProperty()
    pricing: AccessType;

    @IsEnum(category)
    @ApiProperty({ enum: category })
    category: category;


    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => FieldDto)
    @ApiProperty({ type: [FieldDto] })
    fields: FieldDto[];

    @IsString()
    @ApiProperty()
    promptTemplate: string;



}
export class generateDto {

    @IsObject()
    @ApiProperty()
    userInputs: Record<string, string>; // User-provided values for dynamic fields

    @IsEnum(Creativity)
    @ApiProperty({ enum: Creativity })
    creativity: Creativity;

    @IsNumber()
    @ApiProperty()
    maxToken: number;

    @IsEnum(Language)
    @ApiProperty({ enum: Language })
    language: Language;

}

