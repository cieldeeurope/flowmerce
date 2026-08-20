import { Injectable } from '@nestjs/common';
import { Translate } from '@google-cloud/translate/build/src/v2';

@Injectable()
export class GoogleTranslateService {
  private translateClient: Translate;

  constructor() {
    this.translateClient = new Translate({
      key: 'AIzaSyDa_u9NzKl5NAwCS_jfeFsD8bbyIXJvM7Y', // 🔹 여기에 발급받은 API 키 입력 (cieldeeurope@gmail.com 계정)
    });
  }

  async translateText(text: string, targetLang: string = 'ko'): Promise<string> {
    if (!text) return ''; // 빈 값 예외처리
    try {
      const [translatedText] = await this.translateClient.translate(text, targetLang);
      return translatedText;
    } catch (error: any) {
      console.error(`❌ 번역 오류: ${(error as Error).message}`);
      return text; // 오류 발생 시 원본 반환
    }
  }

  // 프랑스어 > 영어 > 한글 번역 메서드
  async translateText2(text: string): Promise<string> {
    if (!text) return '';
    try {
      // 먼저 프랑스어 텍스트를 영어로 번역
      const englishText = await this.translateText(text, 'en');
      // 그 후 영어 텍스트를 한국어로 번역
      const koreanText = await this.translateText(englishText, 'ko');
      return koreanText;
    } catch (error: any) {
      console.error(`❌ translateText2 오류: ${(error as Error).message}`);
      return text;
    }
  }

  async translateTextToEnglish(text: string): Promise<string> {
    if (!text) return ''; // 빈 값 예외처리
    try {
      const [translatedText] = await this.translateClient.translate(text, 'en');
      return translatedText;
    } catch (error: any) {
      console.error(`❌ 영어 번역 오류: ${(error as Error).message}`);
      return text; // 오류 발생 시 원본 반환
    }
  }
}
