import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { BroadcastDto } from './admin.dto';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Tablas con `userId` + `createdAt` que cuentan como "uso" de una función. */
const FEATURE_TABLES = [
  { key: 'concerts', table: 'Concert' },
  { key: 'photos', table: 'ConcertPhoto' },
  { key: 'comments', table: 'ConcertComment' },
  { key: 'wantToAttend', table: 'WantToAttend' },
  { key: 'records', table: 'Record' },
  { key: 'discogs', table: 'DiscogsConnection' },
] as const;

/** Columnas por las que se agrupa el ranking (lista cerrada → sin inyección SQL). */
type RankColumn = 'artist' | 'city' | 'genre';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Estadísticas ───────────────────────────────────────────────────────────

  async getStats() {
    const now = Date.now();
    const since7 = new Date(now - 7 * DAY_MS);
    const since30 = new Date(now - 30 * DAY_MS);
    const since14 = new Date(now - 14 * DAY_MS);

    const dbStart = Date.now();
    await this.prisma.$queryRaw`SELECT 1`;
    const dbMs = Date.now() - dbStart;

    const [
      totalUsers,
      newUsers7,
      newUsers30,
      proUsers,
      adminUsers,
      usersWithPush,
      devices,
      friendships,
      totalConcerts,
      ratingAgg,
      active7,
      active30,
      features,
      topArtists,
      topCities,
      topGenres,
      signupsByDay,
      concertsByDay,
      versions,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: since7 } } }),
      this.prisma.user.count({ where: { createdAt: { gte: since30 } } }),
      this.prisma.user.count({ where: { isPro: true } }),
      this.prisma.user.count({ where: { isAdmin: true } }),
      this.prisma.deviceToken
        .findMany({ distinct: ['userId'], select: { userId: true } })
        .then((r) => r.length),
      this.prisma.deviceToken.count(),
      this.prisma.friendship.count({ where: { status: 'ACCEPTED' } }),
      this.prisma.concert.count(),
      this.prisma.concert.aggregate({
        _avg: { rating: true },
        where: { rating: { gt: 0 } },
      }),
      this.activeUsersSince(since7),
      this.activeUsersSince(since30),
      Promise.all(
        FEATURE_TABLES.map((f) => this.featureUsage(f.key, f.table, since30)),
      ),
      this.ranking('artist'),
      this.ranking('city'),
      this.ranking('genre'),
      this.dailyCounts('User', since14),
      this.dailyCounts('Concert', since14),
      this.getVersions(),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      users: {
        total: totalUsers,
        new7d: newUsers7,
        new30d: newUsers30,
        pro: proUsers,
        admins: adminUsers,
        active7d: active7,
        active30d: active30,
      },
      push: { usersWithPush, devices },
      versions,
      content: {
        concerts: totalConcerts,
        friendships,
        avgRating: ratingAgg._avg.rating ?? 0,
      },
      features,
      topArtists,
      topCities,
      topGenres,
      activity: {
        signups: this.fillDays(signupsByDay, 14),
        concerts: this.fillDays(concertsByDay, 14),
      },
      health: {
        dbMs,
        uptimeSec: Math.round(process.uptime()),
        env: process.env.NODE_ENV ?? 'development',
      },
    };
  }

  /** Usuarios distintos que han creado algo desde `since`. */
  private async activeUsersSince(since: Date): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM (
        SELECT "userId" FROM "Concert" WHERE "createdAt" >= ${since}
        UNION SELECT "userId" FROM "ConcertComment" WHERE "createdAt" >= ${since}
        UNION SELECT "userId" FROM "ConcertPhoto" WHERE "createdAt" >= ${since} AND "userId" IS NOT NULL
        UNION SELECT "userId" FROM "WantToAttend" WHERE "createdAt" >= ${since}
        UNION SELECT "userId" FROM "Record" WHERE "createdAt" >= ${since}
      ) t`;
    return rows[0]?.n ?? 0;
  }

  private async featureUsage(key: string, table: string, since30: Date) {
    const rows = await this.prisma.$queryRaw<
      { total: number; users: number; last30: number }[]
    >`SELECT count(*)::int AS total,
             count(DISTINCT "userId")::int AS users,
             (count(*) FILTER (WHERE "createdAt" >= ${since30}))::int AS last30
      FROM ${Prisma.raw(`"${table}"`)}`;
    const r = rows[0] ?? { total: 0, users: 0, last30: 0 };
    return { key, total: r.total, users: r.users, last30: r.last30 };
  }

  private async ranking(column: RankColumn) {
    const col = Prisma.raw(`"${column}"`);
    return this.prisma.$queryRaw<
      { name: string; count: number; users: number }[]
    >`SELECT min(${col}) AS name,
             count(*)::int AS count,
             count(DISTINCT "userId")::int AS users
      FROM "Concert"
      WHERE ${col} IS NOT NULL AND trim(${col}) <> ''
      GROUP BY lower(trim(${col}))
      ORDER BY count DESC, name ASC
      LIMIT 8`;
  }

  private async dailyCounts(table: 'User' | 'Concert', since: Date) {
    return this.prisma.$queryRaw<{ day: string; count: number }[]>`
      SELECT to_char("createdAt", 'YYYY-MM-DD') AS day, count(*)::int AS count
      FROM ${Prisma.raw(`"${table}"`)}
      WHERE "createdAt" >= ${since}
      GROUP BY 1`;
  }

  /** Rellena con 0 los días sin datos para que la gráfica sea continua. */
  private fillDays(rows: { day: string; count: number }[], days: number) {
    const byDay = new Map(rows.map((r) => [r.day, r.count]));
    const out: { day: string; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date(Date.now() - i * DAY_MS).toISOString().slice(0, 10);
      out.push({ day, count: byDay.get(day) ?? 0 });
    }
    return out;
  }

  // ── Avisos ─────────────────────────────────────────────────────────────────

  /** Dispositivos agrupados por versión instalada (build null = sin reportar). */
  async getVersions() {
    const rows = await this.prisma.deviceToken.groupBy({
      by: ['appVersion', 'appBuild'],
      _count: { _all: true },
    });
    return rows
      .map((r) => ({
        version: r.appVersion,
        build: r.appBuild,
        devices: r._count._all,
      }))
      .sort((a, b) => (b.build ?? -1) - (a.build ?? -1));
  }

  /** Calcula a quién llegaría un aviso, sin enviar nada. */
  private async resolveTargets(
    audience: BroadcastDto['audience'],
    maxBuild?: number,
  ) {
    const userWhere: Prisma.UserWhereInput =
      audience === 'pro'
        ? { isPro: true }
        : audience === 'free'
          ? { isPro: false }
          : {};

    if (maxBuild == null) {
      const [users, devices] = await Promise.all([
        this.prisma.user.findMany({ where: userWhere, select: { id: true } }),
        this.prisma.deviceToken.count({ where: { user: userWhere } }),
      ]);
      return {
        userIds: users.map((u) => u.id),
        devices,
        onlyTokens: undefined as string[] | undefined,
      };
    }

    const tokens = await this.prisma.deviceToken.findMany({
      where: {
        user: userWhere,
        OR: [{ appBuild: null }, { appBuild: { lt: maxBuild } }],
      },
      select: { token: true, userId: true },
    });
    return {
      userIds: [...new Set(tokens.map((t) => t.userId))],
      devices: tokens.length,
      onlyTokens: tokens.map((t) => t.token),
    };
  }

  /** Vista previa para el panel: cuántos usuarios y dispositivos alcanzaría. */
  async previewBroadcast(
    audience: BroadcastDto['audience'],
    maxBuild?: number,
  ) {
    const t = await this.resolveTargets(audience, maxBuild);
    return { recipients: t.userIds.length, devices: t.devices };
  }

  async broadcast(adminId: string, dto: BroadcastDto) {
    const targets = await this.resolveTargets(dto.audience, dto.maxBuild);

    const result = await this.notifications.broadcast({
      senderId: adminId,
      userIds: targets.userIds,
      title: dto.title.trim(),
      body: dto.body.trim(),
      inApp: dto.inApp ?? true,
      onlyTokens: targets.onlyTokens,
      data: dto.target ? { target: dto.target } : undefined,
    });
    this.logger.log(
      `Aviso de ${adminId} (${dto.audience}, build<${dto.maxBuild ?? 'todas'}): ${result.recipients} usuarios, ${result.devices} dispositivos`,
    );
    return result;
  }

  // ── Usuarios ───────────────────────────────────────────────────────────────

  async listUsers(q?: string, skip = 0, take = 20) {
    const term = q?.trim();
    const where: Prisma.UserWhereInput = term
      ? {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { email: { contains: term, mode: 'insensitive' } },
          ],
        }
      : {};

    const [total, items] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          isPro: true,
          isAdmin: true,
          createdAt: true,
          _count: { select: { concerts: true } },
        },
      }),
    ]);

    return {
      total,
      items: items.map(({ _count, ...u }) => ({
        ...u,
        concertCount: _count.concerts,
      })),
    };
  }

  async setPro(adminId: string, userId: string, isPro: boolean) {
    const exists = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Usuario no encontrado');

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isPro },
      select: { id: true, isPro: true },
    });
    this.logger.log(`Admin ${adminId} pone isPro=${isPro} a ${userId}`);
    return user;
  }
}
