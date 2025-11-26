CREATE TABLE IF NOT EXISTS `participants` (
    `participant_id` int(11)       NOT NULL auto_increment    COMMENT 'unique identifier for each participant',
    `event_id`       int(11)       NOT NULL                   COMMENT 'event this participant belongs to',
    `user_id`        int(11)                                  COMMENT 'linked user account (if exists)',
    `email`          varchar(100)  NOT NULL                   COMMENT 'participant email (required for invitations)',
    `has_joined`     boolean       NOT NULL DEFAULT FALSE     COMMENT 'whether the participant has accessed the event',
    PRIMARY KEY (`participant_id`),
    FOREIGN KEY (`event_id`) REFERENCES `events`(`event_id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL,
    UNIQUE KEY `unique_event_email` (`event_id`, `email`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT="Contains event participants, including invitees";