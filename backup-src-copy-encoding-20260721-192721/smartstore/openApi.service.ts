import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';


interface IMapping {
  godoMallCategoryName?: string;
}
@Injectable()
export class OpenApiService {
  private openai: OpenAI;
  

  constructor()
  {
    this.openai = new OpenAI({
      // bcmbch499@gmail.com 계정
      apiKey: process.env.OPENAI_API_KEY,
    });
  }



  async refineMainInfo(mainInfo: string): Promise<string> {
    function safeString(str: any): string {
    if (!str) return '';
    return String(str)
      .replace(/[\u0000-\u001F]+/g, ' ')
      .replace(/"/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  const cleanMainInfo = safeString(mainInfo);
    const systemMessage = `너는 지금부터 명품 쇼핑몰의 MD이자 브랜드 담당자야.  
상품 상세페이지를 작성할 때 가장 중요한 것은 "SEO 최적화"와 "가독성 있는 줄바꿈"이야.

아래의 상품 설명을 바탕으로, 스마트스토어에 등록할 감성적이고 우아한 상세페이지를 작성해줘.  
고객이 제품의 고급스러움을 느낄 수 있도록 자연스럽고 설득력 있게 써줘.

다음 기준을 꼭 지켜줘:

0. 가장중요 **한글로 번역할 것**
1. 브랜드명, 소재, 핏, 디테일 등 주요 속성과 카테고리를 자연스럽게 녹여서 SEO에 맞게 구성할 것  
2. 광고성 표현은 쓰지 말고, 정제된 표현으로 고급스럽게 작성할 것  
3. 문장이 짧지 않게, 고객이 설득될 수 있도록 감성을 담아 풍부한 설명으로 작성할 것  
4. 문장이 끝날 때마다 ".", "!" 또는 "?" 뒤에 "<br/><br/>" 태그를 넣어 줄바꿈을 적용할 것  
5. 소재, 핏, 디테일 등은 설명 중간에도 자연스럽게 "<br/>" 태그로 구분해서 써줄 것  
6. 마지막에는 제품의 핵심 정보를 정리된 형태로 아래 형식에 맞춰 작성해줘:  
   "▪ 항목명: 값<br/>" 형식으로 각 줄에 하나씩 쓰고, 줄바꿈은 "<br/>"만 사용해줘  
7. 어떤 내용도 지어내지 말고, 반드시 제공된 정보만 활용할 것  
8. "믿고 구매할 수 있다", "정품", "안심 구매" 등의 표현을 부드럽게 한두 문장 정도 추가해도 좋아03
9. "여성용" , "남성용" 등의 단어는 쓰지 말아줘, 공용 제품에 대해 혼란이 생길 수 있어.

아래는 상품 정보야:`;

    
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",// 크레딧 끝나면 model: "gpt-3.5-turbo" 로 수정해서 가성비 UP 시키기
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: cleanMainInfo },
        ],
        temperature: 0.7,
      });

      return completion.choices[0].message?.content.trim() || mainInfo;
    } catch (error: any) {
      console.error("Error in refineMainInfo:", error);
      return mainInfo;
    }
  }

  
  
  
  async refineTitle(designer: string, productTitle: string, godoMallCategoryName: string): Promise<string> {
    const systemMessage = `
        아래 정보를 바탕으로 SEO 최적화된 상품명을 한글로 작성해줘.
        다른 대답은 하지말고 '상품명' 만 출력해.

        카테고리: ${godoMallCategoryName}
        상품명: ${productTitle}
        브랜드명: ${designer}

        [작성 규칙]
        - 상품명은 다음 순서를 따르되, 불필요한 단어는 제거해 자연스럽게 정리해줘:
          브랜드+카테고리(공백 없이) 속성(옵션) 카테고리 사이즈 시즌성 상품코드

        - 가장 앞에는 브랜드명과 카테고리를 공백 없이 결합해서 사용해 (가장중요). 예:
          - 발렌시아가바지
          - 루이비통티셔츠
          - 프라다가방

        - 상품코드는 변경하지말고 그대로 유지해.
        - 카테고리에 '기타' 가 들어가면 기타는 빼 (ex.디올기타코트 > 디올코트)

        - 가방류 카테고리는 모두 '브랜드+가방' 형태로 시작해줘. 예:
          - 프라다가방 토트백
          - 루이비통가방 숄더백

        - 카테고리명이 카드/명함지갑인 경우는 반드시 '카드지갑'으로 변환해.
        - 카테고리명이 블라우스/셔츠, 니트/스웨터 인 경우에는 적절하게 골라주고 슬래시(/)나 특수문자는 빼

        - 속성(색상, 소재 등), 사이즈, 시즌성, 상품코드는 원본에 있다면 그대로 유지해.
        - 제공된 정보 외의 내용을 생성하거나 유추해서 추가하지 마.
          반드시 전달받은 정보만으로 자연스럽고 깔끔하게 구성해줘.

        예시)
        입력:
        카테고리: 패션의류>남성의류>바지
        상품명: 발렌시아가 남성용 BB 가데로브 헐렁한 스웨트 팬츠(블랙) 813327TRVV91000

        출력:
        발렌시아가바지 남성용 BB 가데로브 헐렁한 스웨트 팬츠 블랙 813327TRVV91000

        입력:
        카테고리: 패션잡화>여성가방>토트백
        상품명: 프라다 사피아노 가죽 토트백 블랙 미듐 SS24 1BA863NZV

        출력:
        프라다가방 사피아노 가죽 토트백 블랙 미듐 SS24 1BA863NZV

        사이즈, 시즌성 등은 제공된 정보에 있을 때만 포함하고, 없을 경우 절대 생성하거나 유추해서 추가하지 마.
        **브랜드+카테고리가 가장 핵심이니까 나머지 상품명은 최대한 유지하면서 작성해줘**
        `;

    
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemMessage },
          //{ role: "user", content: productTitle },
        ],
        temperature: 0.7,
      });

      return completion.choices[0].message?.content.trim() || productTitle;
    } catch (error: any) {
      console.error("Error in refineMainInfo:", error);
      return productTitle;
    }
  }

  async refineTitle2(designer: string, productTitle: string, mainInfo: string, styleId: string): Promise<string> {
    const systemMessage = `
  너는 최신 네이버쇼핑 SEO를 가장 잘 아는 마케팅 전문가야.
  한국 소비자들이 실제로 검색하는 키워드 기반으로 상품명을 최적화하는 역할을 해. 아래 규칙을 반드시 따르도록 해.
  
  [작성 규칙]
  1. ** 브랜드명을 꼭 번역해서 가장 앞에 배치하도록해. (가장중요) **
  2. 그 다음에 상품 유형(예: 티셔츠, 가방, 목걸이 등)을 배치해.
  3. '슬림핏', '오버핏' 등 핏 정보가 있을 경우엔 상품 유형 뒤에만 자연스럽게 추가해.
  4. 제공된 정보 외에는 절대 유추하거나 생성하지 마.
  5. 상품정보에서 중요한 키워드가 있으면 상품명에 자연스럽게 포함해.
  6. 사이즈나 시즌 관련 정보는 명시된 경우에만 포함하고, 없으면 절대 넣지 마.
  7. 한국 소비자들이 자주 검색하는 용어로 자연스럽게 바꿔.
     - 예: 브레이슬릿 → 팔찌, 이어링 → 귀걸이, 네크리스 → 목걸이
  8. 특수문자, 기호, 괄호, 쉼표는 모두 제거하고, 가독성 좋게 띄어쓰기만 사용해.
  9. 상품코드(styleId)는 반드시 제목 맨 뒤에 추가한다.
  10. 코드 값만 추가하고 어떤 설명도 붙이지 않는다.
  11. "스타일 코드", "상품코드", "Reference", "코드" 같은 단어는 절대 포함하지 않는다.
  12. 상품 순위를 높이기 위한 네이버쇼핑 SEO 기준을 최대한 반영해.
  13. 상품명은 너무 길지 않게, 핵심 키워드만 포함해. 불필요한 반복이나 장황한 표현은 생략.

  최종 출력은 반드시 '상품명' 하나만 해. 설명이나 다른 문장은 절대 쓰지 마.
  `;
  
    const userPrompt = `
  [입력 정보]
  - 브랜드명: ${designer}
  - 상품명: ${productTitle}
  - 상품코드: ${styleId}
  - 상품정보: ${mainInfo}
    `;
  
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemMessage.trim() },
          { role: "user", content: userPrompt.trim() },
        ],
        temperature: 0.7,
      });
  
      return completion.choices[0].message?.content.trim() || productTitle;
    } catch (error: any) {
      console.error("Error in refineTitle2:", error);
      return productTitle;
    }
  }
  


  async refineAttribute(
    productTitle: string,
    mainInfo: string,
    attributes: { attributeSeq: number; attributeName: string; attributeClassificationType: string }[],
    attributeValues: { attributeSeq: number; attributeValueSeq: number }[]
  ): Promise<string> {
     
    const attributeList = attributes
      .map(attr => `${attr.attributeName} (${attr.attributeClassificationType})`)
      .join(', ');
  
    const groupedValues = attributes.map(attr => {
      const values = attributeValues
        .filter(v => v.attributeSeq === attr.attributeSeq)
        .map(v => v.attributeValueSeq);
      return values.length > 0
        ? `"${attr.attributeName}" (attributeSeq: ${attr.attributeSeq}): [${values.join(', ')}]`
        : null;
    }).filter(Boolean).join('\n');
  
    const systemMessage = `
  너는 스마트스토어 상품 등록을 위한 속성 매칭 도우미야.
  
  [목표]
  아래 입력된 상품명과 상품설명(mainInfo), 그리고 속성 정의 및 속성값 ID 목록을 바탕으로
  각 속성(attributeSeq)에 정확하게 대응하는 속성값(attributeValueSeq)을 추출해줘.
  
  [입력]
  상품명: ${productTitle}
  상품설명: ${mainInfo}
  
  [속성 목록]
  ${attributeList}
  
  [속성값 매핑 테이블]
  각 속성(attributeName)의 attributeSeq와 가능한 attributeValueSeq 목록은 다음과 같아.
  아래 목록을 기준으로 정확히 매핑해줘.
  
  ${groupedValues}
  
  [출력 규칙]
  - 반드시 JSON 배열 형태로 응답해.
  - 각 객체는 다음과 같은 구조여야 해:
    {
      "attributeSeq": 속성 ID (정수),
      "attributeValueSeq": 속성값 ID (정수)
    }
  - attributeValueSeq는 절대 null이 되면 안 돼.
  - attributeValueSeq는 반드시 해당 attributeSeq에 연결된 값 중에서만 골라야 해.
    위의 [속성값 매핑 테이블]에 명시된 값만 사용할 수 있어.
    명시되지 않은 값은 절대로 생성하거나 유추하지 말 것.
  - 절대로 attributeSeq와 attributeValueSeq가 동일하면 안 돼.
  - 상품속성 > 주요소재 항목은 최대 3개 까지만 선택해.
  - MULTI_SELECT 속성은 여러 개 선택 가능, SINGLE_SELECT는 하나만 골라.
  - 매칭할 수 없는 속성은 응답 배열에서 제외하거나 빈 배열로 대체해.
  - 텍스트 설명 없이, JSON 배열만 순수하게 응답해.
  
  [출력 예시]
  [
    {
      "attributeSeq": 10012483,
      "attributeValueSeq": 10614292
    },
    {
      "attributeSeq": 10012483,
      "attributeValueSeq": 10574775
    }
  ]
  `;
  
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemMessage }],
        temperature: 0.3
      });
  
      let result = completion.choices[0].message?.content.trim() || '[]';
  
      // 👉 코드블럭 제거
      result = result.replace(/```json/g, '').replace(/```/g, '').trim();
  
      return result;
    } catch (error: any) {
      console.error("❌ Error in refineAttribute:", error);
      return '[]';
    }
  } 


  async refineAttribute2(productTitle: string,mainInfo: string): Promise<string> {
    const prompt = `
    너는 고도몰 상품등록 속성 매칭 도우미야.
    아래 상품 정보들을 가지고
    상품의 속성 정보를 뽑아줘.
    최대한 정확해야 하고, 해당하지 않는 속성정보를 반환하면 절대 안돼.
    
    ${productTitle}
    ${mainInfo}
    
    속성정보는 ^ 로 구분해서 작성해줘.
    대답은 하지 말고 속성정보만 알려줘.
    [출력 예시]
    송아지가죽^램스킨^로고
      `;
  
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: prompt.trim() }],
        temperature: 0.3,
      });
  
      let result = completion.choices[0].message?.content?.trim() || '';
  
      // 코드블럭, 태그, 접두사 제거 + 공백 제거
      result = result
        .replace(/```(json)?/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/^\s*답변[:：]?\s*/gi, '')
        .trim()
        .split('^')                           // ^ 기준으로 나누고
        .map(s => s.replace(/\s+/g, ''))      // 각 속성에서 모든 공백 제거
        .filter(Boolean)                      // 빈 항목 제거
        .join('^');                           // 다시 ^로 결합
  
      return result;
    } catch (error: any) {
      console.error("❌ Error in refineAttribute2:", error);
      return '';
    }
  }
  

  async translateProductFields(data: {
    title: string;
    madeIn: string;
    color: string;
  }, from: 'en' | 'fr' | 'nl' = 'en'): Promise<{ title: string; madeIn: string; color: string }> {
    const langMap = {
      en: '영어',
      fr: '프랑스어',
      nl: '네덜란드어',
    } as const;

    const lang = langMap[from];
  
    const prompt = `다음은 쇼핑몰 상품 등록용 ${lang} 설명입니다. title, madeIn, color 를 자연스러운 한국어로 번역해주세요. 결과는 다음 형식의 JSON으로 반환하고 madeIn 와 color 는 제조,컬러 등의 부가적인 단어를 빼고 알려주세요('프랑스' 또는 '블랙'):\n\n{\n  "title": "",\n  "madeIn": "",\n  "color": ""\n}\n\n---\n${JSON.stringify(data, null, 2)}`;
  
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `너는 쇼핑몰 상품 설명을 번역하는 도우미야. 반드시 JSON 형식으로 한글로 결과만 출력(반환)해.` },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
    });
  
    const result = completion.choices[0].message.content?.trim() || '{}';
  
    try {
      return JSON.parse(result);
    } catch (e: any) {
      console.error('❌ JSON 파싱 실패:', result);
      return { title: '', madeIn: '', color: '' };
    }
  }
  
  
}