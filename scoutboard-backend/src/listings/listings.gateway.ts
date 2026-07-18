import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: 'http://localhost:3001' } })
export class ListingsGateway {
  @WebSocketServer()
  server: Server;

  broadcastListingUpdate(listing: unknown) {
    this.server.emit('listingUpdate', listing);
  }
}
