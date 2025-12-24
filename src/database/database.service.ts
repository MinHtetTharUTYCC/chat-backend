import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'generated/prisma';
import * as pg from 'pg';

@Injectable()
export class DatabaseService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy
{
    constructor() {
        // instantiate the driver instance
        const connectionString = process.env.DATABASE_URL!;
        const pool = new pg.Pool({connectionString})
        const adapter = new PrismaPg(pool);

        super({adapter});
    }
    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
