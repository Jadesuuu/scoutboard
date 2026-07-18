import { ListingsGateway } from './listings.gateway';
import type { Server } from 'socket.io';

describe('ListingsGateway', () => {
  let gateway: ListingsGateway;
  let emit: jest.Mock;

  beforeEach(() => {
    gateway = new ListingsGateway();
    emit = jest.fn();
    gateway.server = { emit } as unknown as Server;
  });

  it('broadcastListingUpdate emits a "listingUpdate" event with the listing payload', () => {
    const listing = { _id: 'listing1', title: 'Coffee Shop' };

    gateway.broadcastListingUpdate(listing);

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('listingUpdate', listing);
  });
});
