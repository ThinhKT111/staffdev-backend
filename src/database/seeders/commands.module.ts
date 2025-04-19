// src/database/seeders/commands.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SeedCommand } from './seed.command';
import { SeedModule } from './seed.module';
import { DataSource, DataSourceOptions } from 'typeorm';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const options: DataSourceOptions = {
          type: 'postgres',
          host: configService.get('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get('DB_USERNAME', 'postgres'),
          password: configService.get('DB_PASSWORD', 'password'),
          database: configService.get('DB_NAME', 'staffdev'),
          entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
          synchronize: configService.get('NODE_ENV') !== 'production',
        };
        return options;
      },
      dataSourceFactory: async (options) => {
        if (!options) {
          throw new Error('Invalid DataSource options');
        }
        return new DataSource(options).initialize();
      },
    }),
    SeedModule,
  ],
  providers: [SeedCommand],
})
export class CommandsModule {}