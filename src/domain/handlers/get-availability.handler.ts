import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import {
  ClubWithAvailability,
  GetAvailabilityQuery,
} from '../commands/get-availaiblity.query';
import {
  ALQUILA_TU_CANCHA_CLIENT,
  AlquilaTuCanchaClient,
} from '../ports/aquila-tu-cancha.client';
import { CacheService } from 'src/shared/cache/cache.service';

@QueryHandler(GetAvailabilityQuery)
export class GetAvailabilityHandler
  implements IQueryHandler<GetAvailabilityQuery>
{
  constructor(
    @Inject(ALQUILA_TU_CANCHA_CLIENT)
    private alquilaTuCanchaClient : AlquilaTuCanchaClient,
    private readonly cache: CacheService,
  ) {}

  async execute(query: GetAvailabilityQuery): Promise<ClubWithAvailability[]> {
    const clubs_with_availability: ClubWithAvailability[] = [];

    const clubs = await this.getClubsCached(query.placeId);
    for (const club of clubs) {

      const courts = await this.getCourtsCached(club.id);
      const courts_with_availability: ClubWithAvailability['courts'] = [];
      for (const court of courts) {
        const slots = await this.alquilaTuCanchaClient.getAvailableSlots(
          club.id,
          court.id,
          query.date,
        );
        courts_with_availability.push({
          ...court,
          available: slots,
        });
      }
      clubs_with_availability.push({
        ...club,
        courts: courts_with_availability,
      });
    }
    return clubs_with_availability;
  }

  //* HELPERS PROVISIONALES

  private async getClubsCached(placeId: string) {
    const key = `clubs:${placeId}`;
    const cached = this.cache.get<any[]>(key);
    if (cached) {
      return cached;
    }

    try {
      const data = await this.alquilaTuCanchaClient.getClubs(placeId);
      if (Array.isArray(data) && data.length) {
        this.cache.set(key, data, 600); // 10 min
      }
      return data;
    } catch (err) {
      const fallback = this.cache.get<any[]>(key);
      if (fallback) {
        return fallback;
      }
      throw err;
    }
  }

  private async getCourtsCached(clubId: number) {
    const key = `courts:${clubId}`;
    const cached = this.cache.get<any[]>(key);
    if (cached) {
      return cached;
    }

    try {
      const data = await this.alquilaTuCanchaClient.getCourts(clubId);
      if (Array.isArray(data) && data.length) {
        this.cache.set(key, data, 600); // 10 min
      }
      return data;
    } catch (err) {
      const fallback = this.cache.get<any[]>(key);
      if (fallback) {
        return fallback;
      }
      throw err;
    }
  }
}


