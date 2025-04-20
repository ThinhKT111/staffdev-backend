// src/cli.ts
import { CommandFactory } from 'nest-commander';
import { CommandsModule } from './src/database/seeders/commands.module';

async function bootstrap() {
  await CommandFactory.run(CommandsModule, ['log', 'error']);
}

bootstrap();