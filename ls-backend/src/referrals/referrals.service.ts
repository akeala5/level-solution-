import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReferralsService {
  constructor(private prisma: PrismaService) {}

  async getMyStats(userId: string) {
    const allReferrals = await this.prisma.referral.findMany({
      where: { inviterId: userId },
      include: {
        invitee: { select: { firstName: true, lastName: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // The user's own code is stored as inviteeId === userId (self-referral record)
    const myCodeRecord = allReferrals.find((r) => r.inviteeId === userId && !r.isConverted)
      ?? allReferrals.find((r) => r.inviteeId === userId);

    // Converted referrals = people who registered using this user's code
    const converted = allReferrals.filter((r) => r.isConverted && r.inviteeId !== userId);

    const totalRewards = converted.reduce((sum, r) => sum + (r.reward ?? 0), 0);

    const siteUrl = 'https://shop.lsgrouptogo.com';

    return {
      code: myCodeRecord?.code ?? null,
      referralLink: myCodeRecord
        ? `${siteUrl}/auth/register?ref=${myCodeRecord.code}`
        : null,
      totalReferrals: converted.length,
      totalRewards,
      referrals: converted.map((r) => ({
        id: r.id,
        firstName: r.invitee.firstName,
        lastName: r.invitee.lastName,
        joinedAt: r.invitee.createdAt,
        reward: r.reward,
      })),
    };
  }
}
