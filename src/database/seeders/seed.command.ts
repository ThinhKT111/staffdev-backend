// src/database/seeders/seed.command.ts
import { Command, CommandRunner } from 'nest-commander';
import { SeedService } from './seed.service';

@Command({ name: 'seed', description: 'Seed the database with initial data' })
export class SeedCommand extends CommandRunner {
  constructor(private readonly seedService: SeedService) {
    super();
  }

  async run(): Promise<void> {
    try {
      await this.seedService.seed();
      process.exit(0);
    } catch (error) {
      console.error('Seeding error:', error);
      process.exit(1);
    }
  }
}