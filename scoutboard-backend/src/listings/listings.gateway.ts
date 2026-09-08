import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { corsOriginDelegate } from '../common/cors';

@WebSocketGateway({ cors: { origin: corsOriginDelegate } })
export class ListingsGateway {
  @WebSocketServer()
  server: Server;

  broadcastListingUpdate(listing: unknown) {
    this.server.emit('listingUpdate', listing);
  }
}
