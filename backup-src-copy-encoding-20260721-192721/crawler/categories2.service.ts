import { Injectable } from '@nestjs/common';

@Injectable()
export class CategoriesService {
  private farfetchCategories: any[] = [];
  private godoMallCategories: any[] = [];

  // 카테고리 데이터를 설정하는 메서드
  setCategories(farfetch: any[], godoMall: any[]) {
    // console.log('setCategories 호출됨');
    // console.log('파페치 카테고리:', farfetch);
    // console.log('고도몰 카테고리:', godoMall);

    this.farfetchCategories = farfetch;
    this.godoMallCategories = godoMall;

    // console.log('카테고리 데이터 저장 완료');
  }

  // 파페치 카테고리 반환 메서드
  getFarfetchCategories() {
    return this.farfetchCategories;
  }

  // 고도몰 카테고리 반환 메서드
  getGodoMallCategories() {
    return this.godoMallCategories;
  }
}
