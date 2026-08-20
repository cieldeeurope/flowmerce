import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway(3443, {
  cors: { origin: '*' },
})
export class UpdateGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: any) {
  }

  handleDisconnect(client: any) {
  }

  // ✅ 상품 업데이트 완료 이벤트 전송
  sendProductUpdate(goodsNo: string, payload: any) {
    console.log(`📡 상품 업데이트 전송: ${goodsNo}`);
    this.server.emit(`productUpdate:${goodsNo}`, payload);
    const parts = String(goodsNo).split(':');
    if (parts.length === 3) {
      const legacyGoodsNo = parts[2]?.trim();
      if (legacyGoodsNo) {
        this.server.emit(`productUpdate:${legacyGoodsNo}`, payload);
      }
    }
  }


}
