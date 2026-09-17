CREATE TABLE `simulation_datasets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`sourceFileName` varchar(255),
	`sourceDescription` text,
	`schemaVersion` varchar(32) NOT NULL DEFAULT 'events-v1',
	`rowCount` int NOT NULL DEFAULT 0,
	`validRowCount` int NOT NULL DEFAULT 0,
	`invalidRowCount` int NOT NULL DEFAULT 0,
	`status` enum('validated','partial','rejected') NOT NULL DEFAULT 'validated',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `simulation_datasets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `simulation_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`datasetId` int NOT NULL,
	`rowNumber` int NOT NULL,
	`eventId` varchar(180) NOT NULL,
	`teamA` varchar(180) NOT NULL,
	`teamB` varchar(180) NOT NULL,
	`sport` varchar(24) NOT NULL,
	`location` varchar(255) NOT NULL,
	`latitude` varchar(32),
	`longitude` varchar(32),
	`startTime` timestamp NOT NULL,
	`actualWinner` varchar(8),
	`validationStatus` enum('valid','invalid') NOT NULL DEFAULT 'valid',
	`validationError` text,
	CONSTRAINT `simulation_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `simulation_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runId` int NOT NULL,
	`eventId` int NOT NULL,
	`status` enum('complete','failed') NOT NULL,
	`outputJson` text,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `simulation_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `simulation_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`datasetId` int NOT NULL,
	`status` enum('queued','running','complete','partial','failed') NOT NULL DEFAULT 'queued',
	`totalEvents` int NOT NULL DEFAULT 0,
	`completedEvents` int NOT NULL DEFAULT 0,
	`failedEvents` int NOT NULL DEFAULT 0,
	`summaryJson` text,
	`startedAt` timestamp,
	`finishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `simulation_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
