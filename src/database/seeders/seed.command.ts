// src/database/seeders/seed.command.ts
import { Command, CommandRunner, Option } from 'nest-commander';
import { SeedService } from './seed.service';

interface SeedCommandOptions {
  force?: boolean;
}

@Command({ name: 'seed', description: 'Seed the database with initial data' })
export class SeedCommand extends CommandRunner {
  constructor(private readonly seedService: SeedService) {
    super();
  }

  async run(passedParams: string[], options?: SeedCommandOptions): Promise<void> {
    try {
      await this.seedService.seed(options?.force || false);
      process.exit(0);
    } catch (error) {
      console.error('Seeding error:', error);
      process.exit(1);
    }
  }
  
  @Option({
    flags: '-f, --force [force]',
    description: 'Force reseed (clear existing data)',
  })
  parseForce(val: string | boolean): boolean {
    return val === 'true' || val === true || val === '';
  }
}