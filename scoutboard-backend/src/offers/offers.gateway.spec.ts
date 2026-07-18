import { OffersGateway } from './offers.gateway';
import type { Server } from 'socket.io';

describe('OffersGateway', () => {
  let gateway: OffersGateway;
  let emit: jest.Mock;

  beforeEach(() => {
    gateway = new OffersGateway();
    emit = jest.fn();
    // The @WebSocketServer() property is injected by Nest at runtime; stub it.
    gateway.server = { emit } as unknown as Server;
  });

  it('broadcastOfferUpdate emits an "offerUpdate" event with the offer payload', () => {
    const offer = { _id: 'offer1', amount: 5000 };

    gateway.broadcastOfferUpdate(offer);

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('offerUpdate', offer);
  });
});
