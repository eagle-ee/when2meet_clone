CREATE TABLE IF NOT EXISTS `events` (
    `event_id`       int(11)       NOT NULL auto_increment    COMMENT 'unique identifier for each event',
    `title`          varchar(100)  NOT NULL                   COMMENT 'title of the event',
    `creator_id`     int(11)       NOT NULL                   COMMENT 'user who created the event',
    `start_date`     date          NOT NULL                   COMMENT 'starting date of the event availability window',
    `end_date`       date          NOT NULL                   COMMENT 'ending date of the event availability window',
    `start_time`     time          NOT NULL                   COMMENT 'earliest time slot in a day',
    `end_time`       time          NOT NULL                   COMMENT 'latest time slot in a day',
    `created_at`     timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`event_id`),
    FOREIGN KEY (`creator_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT="Contains event information";