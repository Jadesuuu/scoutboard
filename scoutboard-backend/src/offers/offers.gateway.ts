import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: 'http://localhost:3001' } })
export class OffersGateway {
  @WebSocketServer()
  server: Server;

  broadcastOfferUpdate(offer: unknown) {
    this.server.emit('offerUpdate', offer);
  }
}
