import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { corsOriginDelegate } from '../common/cors';

@WebSocketGateway({ cors: { origin: corsOriginDelegate } })
export class OffersGateway {
  @WebSocketServer()
  server: Server;

  broadcastOfferUpdate(offer: unknown) {
    this.server.emit('offerUpdate', offer);
  }
}
